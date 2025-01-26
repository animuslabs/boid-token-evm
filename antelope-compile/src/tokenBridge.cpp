// @author Thomas Cuvillier
// @organization Telos Foundation
// @contract tokenBridge
// @version v1.0

#include <string> 
#include "../include_tokenBridge/constants.hpp"
#include "../include_tokenBridge/tokenBridge.hpp"

namespace evm_bridge
{
    //======================== Admin actions ==========================
    // Initialize the contract
    [[eosio::action]]
    void tokenbridge::init(
        eosio::checksum160 evm_bridge_address,
        eosio::checksum160 evm_token_address,
        uint8_t evm_chain_id,
        eosio::symbol native_token_symbol,
        eosio::name native_token_contract,
        eosio::name fees_contract,
        bool is_locked
        ){
        // Authenticate
        require_auth(get_self());

        // Initialize
        auto stored = config_bridge.get_or_create(get_self(), config_row);

        // Check if the contract is locked
        check(!is_locked, "Contract is locked and cannot be reinitialized");

        // Validate
        check(evm_chain_id > 0, "Invalid evm_chain_id");
        check(evm_token_address != eosio::checksum160(), "Invalid evm_token_address");
        check(native_token_symbol.is_valid(), "Invalid native_token_symbol");
        check(native_token_contract != eosio::name(), "Invalid native_token_contract");
        check(fees_contract != eosio::name(), "Invalid fees_contract");

        stored.evm_bridge_address   = evm_bridge_address;
        stored.evm_token_address    = evm_token_address;
        stored.evm_chain_id         = evm_chain_id;
        stored.native_token_symbol   = native_token_symbol;
        stored.native_token_contract = native_token_contract;
        stored.fees_contract        = fees_contract;

        // Get the scope
        account_table accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaddress = accounts.get_index<"byaddress"_n>();
        auto account_bridge = accounts_byaddress.find(pad160(evm_bridge_address));

        stored.evm_bridge_scope = (account_bridge != accounts_byaddress.end()) ? account_bridge->index : 0;

        // Lock the contract if specified
        if (is_locked) {
            stored.is_locked = true;
        }

        config_bridge.set(stored, get_self());
    };

    //======================== Token Bridge actions ========================
    // Trustless bridge to tEVM
    [[eosio::on_notify("*::transfer")]]
    void tokenbridge::bridge(eosio::name from, eosio::name to, eosio::asset quantity, std::string memo)
    {
        // Open config singleton
        auto conf = config_bridge.get();
        auto evm_conf = evm_config.get();

        // Validate token symbol and contract
        check(quantity.symbol == conf.native_token_symbol, "Token symbol does not match configured native token");
        check(get_first_receiver() == conf.native_token_contract, "Contract does not match configured native token contract");

        // Validate
        if(from == get_self()) return; // Return so we don't stop the transfer from this contract when bridging from tEVM
        check(to == get_self(), "Recipient is not this contract");
        check(from == eosio::name(conf.fees_contract), "This account is not allowed to bridge tokens to EVM"); // Allow only fees contract to bridge tokens to EVM
        check(memo.length() == 42, "Memo needs to contain the 42 character EVM recipient address");

        // Check amount
        uint256_t amount = uint256_t(quantity.amount);
        check(amount >= 1, "Minimum amount is not reached");

        // Find the EVM account of this contract
        account_table _accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaccount = _accounts.get_index<"byaccount"_n>();
        auto evm_account = accounts_byaccount.require_find(get_self().value, ("EVM account not found for " + std::string(BRIDGE_CONTRACT_NAME)).c_str());

        // Prepare EVM Bridge call
        auto evm_contract = conf.evm_bridge_address.extract_as_byte_array();
        std::vector<uint8_t> evm_to;
        evm_to.insert(evm_to.end(), evm_contract.begin(), evm_contract.end());

        // Prepare EVM function signature & arguments
        std::vector<uint8_t> data;
        auto fnsig = checksum256ToValue(eosio::checksum256(toBin(EVM_BRIDGE_SIGNATURE)));
        vector<uint8_t> fnsig_bs = intx::to_byte_string(fnsig);
        fnsig_bs.resize(16);
        data.insert(data.end(), fnsig_bs.begin(), fnsig_bs.end());

        // Receiver EVM address from memo
        memo.replace(0, 2, ""); // remove the Ox
        auto receiver_ba = pad160(eosio::checksum160(toBin(memo))).extract_as_byte_array();
        std::vector<uint8_t> receiver(receiver_ba.begin(), receiver_ba.end());
        receiver = pad(receiver, 32, true);
        data.insert(data.end(), receiver.begin(), receiver.end());

        // Amount
        vector<uint8_t> amount_bs = pad(intx::to_byte_string(amount * pow(10, 14)), 32, true); // Assuming token has 4 decimals
        data.insert(data.end(), amount_bs.begin(), amount_bs.end());

        // Sender
        std::string sender = from.to_string();
        insertElementPositions(&data, 128); // Our string position
        insertString(&data, sender, sender.length());

        // Call TokenBridge.bridgeTo(address token, address receiver, uint amount) on EVM using eosio.evm
        action(
            permission_level {get_self(), "active"_n},
            eosio::name(EVM_SYSTEM_CONTRACT),
            "raw"_n,
            std::make_tuple(get_self(), rlp::encode(evm_account->nonce, evm_conf.gas_price, BRIDGE_GAS, evm_to, uint256_t(0), data, conf.evm_chain_id, 0, 0), false, std::optional<eosio::checksum160>(evm_account->address))
        ).send();
    };

    // Refunds bridge request to EVM if minting reverted on EVM
    [[eosio::action]]
    void tokenbridge::refundnotify()
    {
        // Open config singletons
        auto conf = config_bridge.get();
        auto evm_conf = evm_config.get();

        // Find the EVM account of this contract
        account_table _accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaccount = _accounts.get_index<"byaccount"_n>();
        auto account = accounts_byaccount.require_find(get_self().value, "Account not found");

        // Clean out old processed refunds
        refunds_table refunds(get_self(), get_self().value);
        auto refunds_by_timestamp = refunds.get_index<"timestamp"_n>();
        auto upper = refunds_by_timestamp.upper_bound(current_time_point().sec_since_epoch() - 60); // remove 60s so we get only requests that are at least 1mn old
        uint64_t count = 10; // max 10 refunds so we never overload CPU
        for(auto itr = refunds_by_timestamp.begin(); count > 0 && itr != upper; count--) {
            itr = refunds_by_timestamp.erase(itr);
        }

        // Define EVM Account State table with EVM bridge contract scope
        account_state_table bridge_account_states(eosio::name(EVM_SYSTEM_CONTRACT), conf.evm_bridge_scope);
        auto bridge_account_states_bykey = bridge_account_states.get_index<"bykey"_n>();

        // Get array slot to find Refund refunds[] array length
        auto refund_storage_key = toChecksum256(STORAGE_BRIDGE_REFUND_INDEX);
        auto refund_array_length = bridge_account_states_bykey.require_find(refund_storage_key, "No refunds found");
        auto refund_array_slot = checksum256ToValue(keccak_256(refund_storage_key.extract_as_byte_array()));
        uint8_t refund_property_count = 8;  // Updated for new struct layout

        // Prepare address for callback
        auto evm_contract = conf.evm_bridge_address.extract_as_byte_array();
        std::vector<uint8_t> to;
        to.insert(to.end(), evm_contract.begin(), evm_contract.end());

        const auto fnsig = toBin(EVM_REFUND_CALLBACK_SIGNATURE);
        const std::string memo = "Bridge refund";

        // Process refunds (max 2 at a time)
        for(uint64_t i = 0; i < refund_array_length->value && i < 2; i++){
            const auto refund_id_checksum = bridge_account_states_bykey.find(getArrayMemberSlot(refund_array_slot, 0, refund_property_count, i));
            const uint256_t refund_id = (refund_id_checksum != bridge_account_states_bykey.end()) ? refund_id_checksum->value : uint256_t(0); // Needed because row is not set at all if the value is 0
            const auto refund_id_bs = pad(intx::to_byte_string(refund_id), 16, true);
            const eosio::name receiver = parseNameFromStorage(bridge_account_states_bykey.find(getArrayMemberSlot(refund_array_slot, 4, refund_property_count, i))->value);
            const eosio::name parsed_token_account_name = parseNameFromStorage(bridge_account_states_bykey.find(getArrayMemberSlot(refund_array_slot, 2, refund_property_count, i))->value);
            const eosio::symbol_code parsed_antelope_symbol = parseSymbolCodeFromStorage(bridge_account_states_bykey.find(getArrayMemberSlot(refund_array_slot, 3, refund_property_count, i))->value);
            const uint64_t evm_decimals = static_cast<uint64_t>(bridge_account_states_bykey.find(getArrayMemberSlot(refund_array_slot, 5, refund_property_count, i))->value);

            // Use the token contract and symbol from the configuration
            eosio::name token_account_name = conf.native_token_contract;
            eosio::symbol antelope_symbol = conf.native_token_symbol;

            if (parsed_token_account_name != conf.native_token_contract || parsed_antelope_symbol != conf.native_token_symbol.code()) {
                token_account_name = conf.native_token_contract;
                antelope_symbol = conf.native_token_symbol;
            }

            // Ensure the token exists by checking the configuration
            check(is_account(token_account_name), "Token contract account does not exist");
            check(antelope_symbol.is_valid(), "Token symbol is not valid");

            // Get amount according to decimal places on each chain
            uint256_t amount = bridge_account_states_bykey.find(getArrayMemberSlot(refund_array_slot, 1, refund_property_count, i))->value;
            uint8_t token_precision = antelope_symbol.precision();
            if(evm_decimals < token_precision){
                const double exponent = (evm_decimals - token_precision) * 1.0;
                amount = amount / pow(10.0, exponent);
            } else {
                const double exponent = (token_precision - evm_decimals) * 1.0;
                amount = amount * pow(10.0, exponent);
            }
            const uint64_t amount_64 = static_cast<uint64_t>(amount);
            const eosio::asset quantity = asset(amount_64, antelope_symbol);

            // Check refund not already being processed
            auto refunds_by_call_id = refunds.get_index<"callid"_n>();
            auto exists = refunds_by_call_id.find(toChecksum256(refund_id));
            if(exists != refunds_by_call_id.end()){
                continue;
            }

            // Add refund
            refunds.emplace(get_self(), [&](auto& r) {
                r.refund_id = refunds.available_primary_key();
                r.call_id = toChecksum256(refund_id);
                r.timestamp = current_time_point();
            });

            // Send tokens to receiver
            action(
                permission_level{ get_self(), "active"_n },
                    eosio::name(conf.native_token_contract),
                    "transfer"_n,
                    std::make_tuple(get_self(), receiver, quantity, memo)
            ).send();

            std::vector<uint8_t> data;
            data.insert(data.end(), fnsig.begin(), fnsig.end());
            data.insert(data.end(), refund_id_bs.begin(), refund_id_bs.end());

            // Send refundSuccessful call to EVM using eosio.evm
            action(
                permission_level {get_self(), "active"_n},
                eosio::name(EVM_SYSTEM_CONTRACT),
                "raw"_n,
                std::make_tuple(get_self(), rlp::encode(account->nonce, evm_conf.gas_price, REFUND_CB_GAS, to, uint256_t(0), data, conf.evm_chain_id, 0, 0),  false, std::optional<eosio::checksum160>(account->address))
            ).send();

            // Check refund status
            const auto status = static_cast<uint8_t>(bridge_account_states_bykey.find(getArrayMemberSlot(refund_array_slot, 6, refund_property_count, i))->value);
            if (status != 0) { // 0 = Pending
                continue;  // Skip if not pending
            }
        }
    }

    // Trustless bridge from tEVM
    [[eosio::action]]
    void tokenbridge::reqnotify()
    {
        // Open config singletons
        auto conf = config_bridge.get();
        auto evm_conf = evm_config.get();

        // Find the EVM account of this contract
        account_table _accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaccount = _accounts.get_index<"byaccount"_n>();
        auto evm_account = accounts_byaccount.require_find(get_self().value, ("EVM account not found for " + std::string(BRIDGE_CONTRACT_NAME)).c_str());

        // Erase old requests
        requests_table requests(get_self(), get_self().value);
        auto requests_by_timestamp = requests.get_index<"timestamp"_n>();
        auto upper = requests_by_timestamp.upper_bound(current_time_point().sec_since_epoch() - 60); // remove 60s so we get only requests that are at least 1mn old
        uint64_t count = 10; // max 10 requests to remove so we never overload CPU
        for(auto itr = requests_by_timestamp.begin(); count > 0 && itr != upper; count--) {
            itr = requests_by_timestamp.erase(itr);
        }

        // Define EVM Account State table with EVM bridge contract scope
        account_state_table bridge_account_states(eosio::name(EVM_SYSTEM_CONTRACT), conf.evm_bridge_scope);
        auto bridge_account_states_bykey = bridge_account_states.get_index<"bykey"_n>();

        // Get array slot to find the TokenBridge Request[] requests array length
        auto request_storage_key = toChecksum256(STORAGE_BRIDGE_REQUEST_INDEX);
        auto request_array_length = bridge_account_states_bykey.require_find(request_storage_key, "No requests found");
        auto request_array_slot = checksum256ToValue(keccak_256(request_storage_key.extract_as_byte_array()));
        uint8_t request_property_count = 10;  // Updated for new struct layout

        // Prepare address & function signature for callback
        auto evm_contract = conf.evm_bridge_address.extract_as_byte_array();
        std::vector<uint8_t> evm_to;
        evm_to.insert(evm_to.end(), evm_contract.begin(), evm_contract.end());
        auto fnsig = toBin(EVM_SUCCESS_CALLBACK_SIGNATURE);

        // Process requests (max 2 at a time)
        for(uint64_t i = 0; i < request_array_length->value && i < 2; i++){
            const auto call_id_checksum = bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 0, request_property_count, i));
            const uint256_t call_id = (call_id_checksum != bridge_account_states_bykey.end()) ? call_id_checksum->value : uint256_t(0); // Needed because row is not set at all if the value is 0
            const vector<uint8_t> call_id_bs = pad(intx::to_byte_string(call_id), 16, true);
            const eosio::name parsed_token_account_name = parseNameFromStorage(bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 4, request_property_count, i))->value);
            const uint64_t evm_decimals = static_cast<uint64_t>(bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 7, request_property_count, i))->value);
            const eosio::name receiver = parseNameFromStorage(bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 6, request_property_count, i))->value);
            const eosio::symbol_code parsed_antelope_symbol = parseSymbolCodeFromStorage(bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 5, request_property_count, i))->value);
            const auto sender_address_checksum = bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 1, request_property_count, i));
            
            std::string memo;
            const auto memo_checksum = bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 8, request_property_count, i));
            if (memo_checksum != bridge_account_states_bykey.end()) {
                memo = parseStringFromStorage(memo_checksum->value);
            }

            // Use the token contract and symbol from the configuration
            eosio::name token_account_name = conf.native_token_contract;
            eosio::symbol antelope_symbol = conf.native_token_symbol;

            if (parsed_token_account_name != conf.native_token_contract || parsed_antelope_symbol != conf.native_token_symbol.code()) {
                token_account_name = conf.native_token_contract;
                antelope_symbol = conf.native_token_symbol;
            }

            // Ensure the token exists by checking the configuration
            check(is_account(token_account_name), "Token contract account does not exist");
            check(antelope_symbol.is_valid(), "Token symbol is not valid");

            // Get amount and convert from 18 decimals to the token's configured decimals
            uint256_t amount = bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 2, request_property_count, i))->value;
            uint8_t token_precision = antelope_symbol.precision();
            if(evm_decimals < token_precision){
                const double exponent = (evm_decimals - token_precision) * 1.0;
                amount = amount / pow(10.0, exponent);
            } else {
                const double exponent = (token_precision - evm_decimals) * 1.0;
                amount = amount * pow(10.0, exponent);
            }
            uint64_t amount_64 = static_cast<uint64_t>(amount);
            const eosio::asset quantity = asset(amount_64, antelope_symbol);

            // Check request not already being processed
            auto requests_by_call_id = requests.get_index<"callid"_n>();
            auto exists = requests_by_call_id.find(toChecksum256(call_id));
            if(exists != requests_by_call_id.end()){
                continue;
            }

            // Add request
            requests.emplace(get_self(), [&](auto& r) {
                r.request_id = requests.available_primary_key();
                r.call_id = toChecksum256(call_id);
                r.timestamp = current_time_point();
            });

            // Send tokens to receiver
            action(
                permission_level{ get_self(), "active"_n },
                eosio::name(conf.native_token_contract),
                "transfer"_n,
                std::make_tuple(get_self(), receiver, quantity, memo)
            ).send();

            // Setup success callback call so request get deleted on tEVM
            std::vector<uint8_t> data;
            data.insert(data.end(), fnsig.begin(), fnsig.end());
            data.insert(data.end(), call_id_bs.begin(), call_id_bs.end());

            // Call success callback on tEVM using eosio.evm
            action(
               permission_level {get_self(), "active"_n},
               eosio::name(EVM_SYSTEM_CONTRACT),
               "raw"_n,
               std::make_tuple(get_self(), rlp::encode(evm_account->nonce + i, evm_conf.gas_price, SUCCESS_CB_GAS, evm_to, uint256_t(0), data, conf.evm_chain_id, 0, 0),  false, std::optional<eosio::checksum160>(evm_account->address))
            ).send();

            // Check request status
            const auto status = static_cast<uint8_t>(bridge_account_states_bykey.find(getArrayMemberSlot(request_array_slot, 8, request_property_count, i))->value);
            if (status != 0) { // 0 = Pending
                continue;  // Skip if not pending
            }
        }
    }
}
