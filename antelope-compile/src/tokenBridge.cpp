// @author Thomas Cuvillier
// @organization Telos Foundation
// @contract tokenBridge
// @version v1.0

#include <string> 
#include "../include_tokenBridge/constants.hpp"
#include "../include_tokenBridge/tokenBridge.hpp"
#include "../include_tokenBridge/evm_util.hpp"
#include <cstring>
#include <algorithm>
#include <cctype>
#include <intx/intx.hpp>
#define REQUEST_TIMEOUT 3600

namespace evm_bridge
{
   // define a type alias for its "bykey" iterator type:
   using key_iterator_t = decltype(std::declval<account_state_table>().get_index<"bykey"_n>().begin());

   struct KeyCheck {
       const char* field_name;
       key_iterator_t it;
       eosio::checksum256 raw_key;

       // explicit constructor
       KeyCheck(const char* f, key_iterator_t i, const eosio::checksum256& r)
           : field_name(f), it(i), raw_key(r) {}
   };

   template<typename IndexType>
   void checkStorageKeys(const std::vector<evm_bridge::KeyCheck>& checks, const IndexType& index) {
       std::vector<std::string> missing;
       std::string error_msg = "Missing storage keys:";

       for (const auto& check : checks) {
           if (check.it == index.end()) {
               missing.push_back(
                   std::string("\n- ") + check.field_name + 
                   " | Raw key: " + bin2hex(check.raw_key.extract_as_byte_array())
               );
           }
       }

       if (!missing.empty()) {
           for (const auto& msg : missing) error_msg += msg;
           check(false, error_msg.c_str());
       }
   }
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
        
        // Load the EVM system config via multi-index
        evm_config_table evmconfig(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto it = evmconfig.begin();
        check(it != evmconfig.end(), "No config row found in eosio.evm's 'config' table");
        auto evm_conf = *it;

        // Gas
        uint256_t gas_price_val = (evm_conf.gas_price * 11) / 10;
        
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

        // --------------------------------------------------------------------------------------------------------
        // --------------------------------------------------------------------------------------------------------
        // --------------------------------------------------------------------------------------------------------
        // Additional EVM state validation for antelope token info
        // Retrieve the EVM token bridge contract state using its bridge scope (from config)
        account_state_table bridge_states(eosio::name(EVM_SYSTEM_CONTRACT), conf.evm_bridge_scope);
        auto bridge_state_bykey = bridge_states.get_index<"bykey"_n>();

        uint256_t antelope_token_contract_slot = STORAGE_BRIDGE_TOKEN_CONTRACT_INDEX;
        uint256_t antelope_token_symbol_slot   = STORAGE_BRIDGE_TOKEN_SYMBOL_INDEX;

        // -----------------------------------------------------------------
        // ----- Decode antelope token contract (slot STORAGE_BRIDGE_TOKEN_CONTRACT_INDEX) -----
        // Create a temporary C-style array of 32 bytes.
        uint8_t token_contract_slot_c[32] = {0};
        intx::be::store(token_contract_slot_c, antelope_token_contract_slot);

        // Copy into a std::array (needed for functions like bin2hex).
        std::array<uint8_t, 32> token_contract_slot_raw;
        std::copy(std::begin(token_contract_slot_c), std::end(token_contract_slot_c), token_contract_slot_raw.begin());

        // Use the raw padded value directly as the key (without hashing).
        eosio::checksum256 token_contract_key;
        std::memcpy((char*)&token_contract_key, token_contract_slot_raw.data(), 32);

        // For debugging: get the expected key as hex.
        std::string expected_token_key_hex = bin2hex(token_contract_slot_raw);

        // -- Debug: Iterate over the secondary index to see what keys (and their values) are present --
        bool tokenKeyFound = false;
        std::string token_debugKeys = "";
        for (auto itr = bridge_state_bykey.begin(); itr != bridge_state_bykey.end(); ++itr) {
            auto keyArray = itr->key.extract_as_byte_array(); // returns std::array<uint8_t, 32>
            std::string storedKeyHex = bin2hex(keyArray);
            std::string storedValue = parseStringFromStorage(itr->value);
            token_debugKeys += "[" + storedKeyHex + " : " + storedValue + "] ";
            if (storedKeyHex == expected_token_key_hex) {
                tokenKeyFound = true;
            }
        }
        check(tokenKeyFound,
            ("EVM state for antelope token contract not found; expected native token contract = " +
            conf.native_token_contract.to_string() + ", expected storage key (raw padded) = " + expected_token_key_hex +
            ", scope = " + std::to_string(conf.evm_bridge_scope) +
            ", keys present: " + token_debugKeys).c_str());

        // Instead of using find(), perform a linear search for the matching token contract row.
        auto token_itr = std::find_if(bridge_state_bykey.begin(), bridge_state_bykey.end(), [&](const auto &row) {
            auto rowKeyArray = row.key.extract_as_byte_array();
            return bin2hex(rowKeyArray) == expected_token_key_hex;
        });
        check(token_itr != bridge_state_bykey.end(),
            ("EVM state for antelope token contract not found (by iteration); expected native token contract = " +
            conf.native_token_contract.to_string() + ", expected storage key (raw padded) = " + expected_token_key_hex +
            ", scope = " + std::to_string(conf.evm_bridge_scope) +
            ", keys present: " + token_debugKeys).c_str());

        // Decode the stored value using your parseStringFromStorage() function.
        std::string evm_antelope_token_contract = parseStringFromStorage(token_itr->value);

        // Normalize both strings for a case-insensitive comparison.
        std::string norm_evm_token_contract = normalizeString(evm_antelope_token_contract);
        std::string norm_native_token_contract = normalizeString(conf.native_token_contract.to_string());

        // Check for a mismatch.
        check(norm_evm_token_contract == norm_native_token_contract,
            ("Mismatch in antelope token contract: EVM value = '" + norm_evm_token_contract +
            "', Telos value = '" + norm_native_token_contract +
            "', scope = " + std::to_string(conf.evm_bridge_scope)).c_str());

        // -----------------------------------------------------------------
        // ----- Decode antelope token symbol (slot STORAGE_BRIDGE_TOKEN_SYMBOL_INDEX) -----
        // Create a temporary C-style array of 32 bytes.
        uint8_t token_symbol_slot_c[32] = {0};
        intx::be::store(token_symbol_slot_c, antelope_token_symbol_slot);

        // Copy into a std::array.
        std::array<uint8_t, 32> token_symbol_slot_raw;
        std::copy(std::begin(token_symbol_slot_c), std::end(token_symbol_slot_c), token_symbol_slot_raw.begin());

        // Use the raw padded value directly as the key.
        eosio::checksum256 token_symbol_key;
        std::memcpy((char*)&token_symbol_key, token_symbol_slot_raw.data(), 32);

        // For debugging: get the expected symbol key as hex.
        std::string expected_symbol_key_hex = bin2hex(token_symbol_slot_raw);

        // -- Debug: Iterate over the secondary index for symbol keys.
        bool symbolKeyFound = false;
        std::string symbol_debugKeys = "";
        for (auto itr = bridge_state_bykey.begin(); itr != bridge_state_bykey.end(); ++itr) {
            auto keyArray = itr->key.extract_as_byte_array();
            std::string storedKeyHex = bin2hex(keyArray);
            std::string storedValue = parseStringFromStorage(itr->value);
            symbol_debugKeys += "[" + storedKeyHex + " : " + storedValue + "] ";
            if (storedKeyHex == expected_symbol_key_hex) {
                symbolKeyFound = true;
            }
        }
        check(symbolKeyFound,
            ("EVM state for antelope token symbol not found; expected storage key (raw padded) = " +
            expected_symbol_key_hex + ", scope = " + std::to_string(conf.evm_bridge_scope) +
            ", keys present: " + symbol_debugKeys).c_str());

        // Linear search for the matching symbol row.
        auto symbol_itr = std::find_if(bridge_state_bykey.begin(), bridge_state_bykey.end(), [&](const auto &row) {
            auto rowKeyArray = row.key.extract_as_byte_array();
            return bin2hex(rowKeyArray) == expected_symbol_key_hex;
        });
        check(symbol_itr != bridge_state_bykey.end(),
            ("EVM state for antelope token symbol not found (by iteration); expected storage key (raw padded) = " +
            expected_symbol_key_hex + ", scope = " + std::to_string(conf.evm_bridge_scope) +
            ", keys present: " + symbol_debugKeys).c_str());

        // Decode the stored value.
        std::string evm_antelope_token_symbol = parseStringFromStorage(symbol_itr->value);
        std::string norm_evm_token_symbol = normalizeString(evm_antelope_token_symbol);

        // Manually build the full symbol string from the config (e.g. "4,BOID")
        std::string full_native_symbol = std::to_string(conf.native_token_symbol.precision()) + "," + conf.native_token_symbol.code().to_string();
        std::string norm_native_token_symbol = normalizeString(full_native_symbol);

        check(norm_evm_token_symbol == norm_native_token_symbol,
            ("Mismatch in antelope token symbol: EVM value = '" + norm_evm_token_symbol +
            "', Telos value = '" + norm_native_token_symbol +
            "', scope = " + std::to_string(conf.evm_bridge_scope) +
            ", keys present: " + symbol_debugKeys).c_str());

        // --------------------------------------------------------------------------------------------------------
        // --------------------------------------------------------------------------------------------------------
        // --------------------------------------------------------------------------------------------------------
        // Prepare EVM Bridge call
        auto evm_contract = conf.evm_bridge_address.extract_as_byte_array();
        std::vector<uint8_t> evm_to;
        evm_to.insert(evm_to.end(), evm_contract.begin(), evm_contract.end());

        // Prepare EVM function signature & arguments | Insert the function signature: 2e5dcb4b (bridgeTo) 4 bytes
        std::vector<uint8_t> data;
        auto fnsig = checksum256ToValue(eosio::checksum256(toBin(EVM_BRIDGE_SIGNATURE)));
        vector<uint8_t> fnsig_bs = intx::to_byte_string(fnsig);
        fnsig_bs.resize(4);
        data.insert(data.end(), fnsig_bs.begin(), fnsig_bs.end());

        // Token address | Insert the `token` address (32 bytes).
        auto token_ba = pad160(conf.evm_token_address).extract_as_byte_array();
        std::vector<uint8_t> token_addr(token_ba.begin(), token_ba.end());
        token_addr = pad(token_addr, 32, true);
        data.insert(data.end(), token_addr.begin(), token_addr.end());

        // Receiver EVM address from memo | Insert the `receiver` address (32 bytes).
        memo.replace(0, 2, ""); // remove the Ox
        auto receiver_ba = pad160(eosio::checksum160(toBin(memo))).extract_as_byte_array();
        std::vector<uint8_t> receiver(receiver_ba.begin(), receiver_ba.end());
        receiver = pad(receiver, 32, true);
        data.insert(data.end(), receiver.begin(), receiver.end());

        // Amount | Insert the `amount` (32 bytes).
        vector<uint8_t> amount_bs = pad(intx::to_byte_string(amount * pow(10, 14)), 32, true); // Assuming token has 4 decimals
        data.insert(data.end(), amount_bs.begin(), amount_bs.end());

        // Sender
        std::string sender = from.to_string();
        insertElementPositions(&data, 128); // Our string position
        insertString(&data, sender, sender.length());

        // Call TokenBridge.bridgeTo(address token, address receiver, uint amount) on EVM using eosio.evm
        uint64_t current_nonce = evm_account->nonce; // Get current nonce
        action(
            permission_level {get_self(), "active"_n},
            eosio::name(EVM_SYSTEM_CONTRACT),
            "raw"_n,
            std::make_tuple(
                get_self(),
                rlp::encode(current_nonce, gas_price_val, BRIDGE_GAS, evm_to, uint256_t(0), data, conf.evm_chain_id, 0, 0),
                false,
                std::optional<eosio::checksum160>(evm_account->address)
            )
        ).send();
    };

    // Trustless bridge from tEVM
    [[eosio::action]]
    void tokenbridge::reqnotify(uint64_t req_id)
    {
        // Open config
        auto conf = config_bridge.get();

        // Load the EVM system config
        evm_config_table evmconfig(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto it_config = evmconfig.begin();
        check(it_config != evmconfig.end(), "No config row found in eosio.evm's 'config' table");
        auto evm_conf = *it_config;

        // Gas price calculation
        uint256_t gas_price_val = (evm_conf.gas_price * 11) / 10;

        // Find the EVM account of this contract
        account_table _accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaccount = _accounts.get_index<"byaccount"_n>();
        auto evm_account = accounts_byaccount.require_find(get_self().value,
            ("EVM account not found for " + std::string(BRIDGE_CONTRACT_NAME)).c_str());

        // ------------------------------------------------------------------
        // Compute the base key for the mapping entry for this request.
        eosio::checksum256 baseKey = computeMappingKey(req_id, STORAGE_BRIDGE_REQUESTS_INDEX);

        // Each Request struct occupies 9 storage slots.
        uint8_t request_property_count = 9;
        // Compute keys for each property by adding the property index as an offset.
        checksum256 key_request_id             = addToChecksum256(baseKey, 0);
        checksum256 key_sender                 = addToChecksum256(baseKey, 1);
        checksum256 key_amount                 = addToChecksum256(baseKey, 2);
        checksum256 key_requested_at           = addToChecksum256(baseKey, 3);
        checksum256 key_antelope_token_contract= addToChecksum256(baseKey, 4);
        checksum256 key_antelope_symbol        = addToChecksum256(baseKey, 5);
        checksum256 key_receiver               = addToChecksum256(baseKey, 6);
        checksum256 key_packed                 = addToChecksum256(baseKey, 7);
        checksum256 key_memo                   = addToChecksum256(baseKey, 8);
        // ------------------------------------------------------------------


        // Open the account state table.
        account_state_table bridge_account_states(name(EVM_SYSTEM_CONTRACT), conf.evm_bridge_scope);
        auto bridge_account_states_bykey = bridge_account_states.get_index<"bykey"_n>();

        // Declare variables to hold the EVM data.
        uint256_t stored_req_id = 0;
        std::string senderStr;
        uint256_t amountVal = 0;
        uint256_t requestedAtVal = 0;
        std::string evm_token_contract;
        std::string evm_token_contract_raw;
        std::string evm_token_symbol;
        std::string memoStr;
        eosio::name receiver;
        uint8_t evm_decimals = 0;
        uint8_t request_status = 0;
        uint256_t packed_value = 0;

        auto it_req_id = bridge_account_states_bykey.find(key_request_id);
        auto it_sender = bridge_account_states_bykey.find(key_sender);
        auto it_amount = bridge_account_states_bykey.find(key_amount);
        auto it_requested_at = bridge_account_states_bykey.find(key_requested_at);
        auto it_antelope_token_contract = bridge_account_states_bykey.find(key_antelope_token_contract);
        auto it_antelope_symbol = bridge_account_states_bykey.find(key_antelope_symbol);
        auto it_receiver = bridge_account_states_bykey.find(key_receiver);
        auto it_packed = bridge_account_states_bykey.find(key_packed);
        auto it_memo = bridge_account_states_bykey.find(key_memo);

        std::vector<evm_bridge::KeyCheck> key_checks = {
            evm_bridge::KeyCheck("request_id", it_req_id, key_request_id),
            evm_bridge::KeyCheck("sender", it_sender, key_sender),
            evm_bridge::KeyCheck("amount", it_amount, key_amount),
            evm_bridge::KeyCheck("requested_at", it_requested_at, key_requested_at),
            evm_bridge::KeyCheck("token_contract", it_antelope_token_contract, key_antelope_token_contract),
            evm_bridge::KeyCheck("token_symbol", it_antelope_symbol, key_antelope_symbol),
            evm_bridge::KeyCheck("receiver", it_receiver, key_receiver),
            evm_bridge::KeyCheck("packed", it_packed, key_packed),
            evm_bridge::KeyCheck("memo", it_memo, key_memo)
        };

        // Check if all keys are present
        checkStorageKeys(key_checks, bridge_account_states_bykey);

        // Extract values from the EVM state
        // Request ID
        stored_req_id = it_req_id->value;
        
        // Sender
        senderStr = "0x" + bin2hex(parseAddressFromStorage(it_sender->value));
        
        // Amount
        amountVal = it_amount->value;
        
        // Requested at
        requestedAtVal = it_requested_at->value;
        
        // Token contract
        evm_token_contract_raw = bin2hex(parseAddressFromStorage(it_antelope_token_contract->value));
        evm_token_contract = parseStringFromStorage(it_antelope_token_contract->value);
        
        // Token symbol
        evm_token_symbol = parseStringFromStorage(it_antelope_symbol->value);
        
        // Receiver
        std::string raw_receiver = parseStringFromStorage(it_receiver->value);
        std::transform(raw_receiver.begin(), raw_receiver.end(), raw_receiver.begin(), ::tolower);
        // Validate and truncate to 12 chars max for EOSIO name
        check(raw_receiver.length() <= 12, "Receiver name too long" + std::to_string(raw_receiver.length()) +
        "TokenSymbol: " + evm_token_symbol + "TokenContract: " + evm_token_contract);
        if (raw_receiver.length() > 12) {
            raw_receiver = raw_receiver.substr(0, 12);
        }
        receiver = eosio::name(raw_receiver);

        // Packed
        packed_value = it_packed->value;
        // Decimals
        evm_decimals = static_cast<uint8_t>(packed_value & 0xFF);
        // Request status
        request_status = static_cast<uint8_t>((packed_value >> 8) & 0xFF);
        check(request_status == 0, 
            "Request status must be Pending (0) to process. Current status: " + 
            std::to_string(request_status));

        // Memo
        memoStr = parseStringFromStorage(it_memo->value);

        // Check if the request is pending
        check(request_status == 0, "Request is not pending");

        std::string norm_evm_token_contract = normalizeString(evm_token_contract);
        std::string norm_native_token_contract = normalizeString(conf.native_token_contract.to_string());
        check(norm_evm_token_contract == norm_native_token_contract, "Mismatch in antelope token contract");

        // compare request id with the stored request id
        check(stored_req_id == intx::uint256(req_id),
            ("Request ID " + intx::to_string(stored_req_id) + " already exists").c_str());

        // Convert the signature hex string to a 20-byte array
        std::array<uint8_t, 20> full_sig_arr = toBin(EVM_SUCCESS_CALLBACK_SIGNATURE);
        // Then create a vector containing only the first 4 bytes (the actual selector)
        std::vector<uint8_t> fnsig_bs(full_sig_arr.begin(), full_sig_arr.begin() + 4);

        // Prepare 32-byte uint256 parameter for the request id
        std::array<uint8_t, 32> req_id_arr = uint256ToBytes(stored_req_id);
        std::vector<uint8_t> req_id_bs(req_id_arr.begin(), req_id_arr.end());

        // Build the calldata: function selector (4 bytes) + padded parameter (32 bytes)
        std::vector<uint8_t> data = fnsig_bs; // start with the 4-byte selector
        data.insert(data.end(), req_id_bs.begin(), req_id_bs.end());

        // Get the EVM contract address bytes
        auto evm_contract_bytes = conf.evm_bridge_address.extract_as_byte_array();
        std::vector<uint8_t> evm_to(evm_contract_bytes.begin(), evm_contract_bytes.end());

        // Get the current nonce and send the action
        uint64_t current_nonce = evm_account->nonce;
        action(
            permission_level{get_self(), "active"_n},
            eosio::name(EVM_SYSTEM_CONTRACT),
            "raw"_n,
            std::make_tuple(
                get_self(),
                rlp::encode(current_nonce, gas_price_val, SUCCESS_CB_GAS, evm_to,
                            uint256_t(0), data, conf.evm_chain_id, 0, 0),
                false,
                std::optional<eosio::checksum160>(evm_account->address)
            )
        ).send();

        require_recipient(eosio::name(EVM_SYSTEM_CONTRACT));

        requests_table _requests(get_self(), get_self().value);

        auto existing_request = _requests.find(static_cast<uint64_t>(stored_req_id));
        check(existing_request == _requests.end(), 
            ("Request ID " + intx::to_string(stored_req_id) + " already exists").c_str());

        uint64_t wei_scale_factor = 1000000000000000000ULL; // 1e18 for ETH decimals
        _requests.emplace(get_self(), [&](auto& r) {
            r.request_id = static_cast<uint64_t>(stored_req_id);
            
            uint64_t evm_timestamp_sec = static_cast<uint64_t>(requestedAtVal);
            r.timestamp = time_point(seconds(evm_timestamp_sec));
            
            uint64_t amount = static_cast<uint64_t>(amountVal / wei_scale_factor);
            check(amountVal == amount * wei_scale_factor, "Precision loss detected");
            r.amount = amount;
            
            r.processed = false;
            r.receiver = receiver;
            r.sender = senderStr;
            r.memo = memoStr;
        });
    }

    [[eosio::action]]
    void tokenbridge::verifytrx(uint64_t req_id) {
        auto conf = config_bridge.get();
        requests_table requests(get_self(), get_self().value);
        
        // 1. Cleanup old processed requests (older than 24h)
        auto by_time = requests.get_index<"timestamp"_n>();
        auto twenty_four_hours_ago = current_time_point() - hours(24);
        auto cleanup_cutoff = twenty_four_hours_ago.sec_since_epoch();
        
        // Iterate from oldest to newest until we hit non-expired entries
        auto itr = by_time.begin();
        while(itr != by_time.end() && itr->timestamp <= twenty_four_hours_ago) {
            if(itr->processed) {
                itr = by_time.erase(itr); // Delete processed and expired
            } else {
                ++itr; // Keep unprocessed but expired
            }
        }

        // 2. Check requested transaction
        auto itr_req = requests.require_find(req_id, "Request not found");
        check(!itr_req->processed, "Request already processed");

        // 3. Verify EVM state
        checksum256 baseKey = computeMappingKey(req_id, STORAGE_BRIDGE_REQUESTS_INDEX);

        account_state_table fresh_account_states(name(EVM_SYSTEM_CONTRACT), conf.evm_bridge_scope);
        auto fresh_states_bykey = fresh_account_states.get_index<"bykey"_n>();
        auto base_key_itr = fresh_states_bykey.find(baseKey);

        check(base_key_itr == fresh_states_bykey.end(), 
            ("Request ID " + std::to_string(req_id) + " still exists in EVM storage. Key: " + 
             bin2hex(baseKey.extract_as_byte_array())).c_str());

        // 4. Process transfer
        uint8_t decimals = conf.native_token_symbol.precision(); // Get decimals from symbol (e.g. 4)
        uint64_t scaled_amount = itr_req->amount * pow(10, decimals); // Convert whole number to asset units
        asset quantity(scaled_amount, conf.native_token_symbol);
        
        action(
            permission_level{get_self(), "active"_n},
            conf.native_token_contract,
            "transfer"_n,
            make_tuple(get_self(), itr_req->receiver, quantity, itr_req->memo)
        ).send();

        // 5. Mark processed
        requests.modify(itr_req, same_payer, [&](auto& r) {
            r.processed = true;
            r.timestamp = current_time_point(); // Update timestamp for cleanup
        });
    }

    // Remove a request from the table | ONLY FOR EMERGENCY USE
    [[eosio::action]]
    void tokenbridge::rmreq(uint64_t req_id) {
        require_auth(get_self());
        requests_table requests(get_self(), get_self().value);
        auto itr = requests.require_find(req_id, "Request not found");
        requests.erase(itr);
    }

    // calls an action on the EVM to refund Failed requests | ONLY FOR EMERGENCY USE
    [[eosio::action]] void tokenbridge::refstuckreq() {
        // Authenticate
        require_auth(get_self());
        
        // Open config
        auto conf = config_bridge.get();

        // Load the EVM system config
        evm_config_table evmconfig(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto it = evmconfig.begin();
        check(it != evmconfig.end(), "No config row found in eosio.evm's 'config' table");
        auto evm_conf = *it;

        // Gas price calculation
        uint256_t gas_price_val = (evm_conf.gas_price * 11) / 10;

        // Find the EVM account of this contract
        account_table _accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaccount = _accounts.get_index<"byaccount"_n>();
        auto evm_account = accounts_byaccount.require_find(get_self().value,
            ("EVM account not found for " + std::string(BRIDGE_CONTRACT_NAME)).c_str());

        // -----------------------------------------------------------------
        // call the refundStuckReq() function on the EVM
        auto fnsig = toBin(EVM_REF_STUCK_REQ_SIGNATURE);
        std::vector<uint8_t> data(fnsig.begin(), fnsig.begin() + 4); // Use only first 4 bytes

        // Update the RLP encoding to use correct bridge address:
        uint64_t current_nonce = evm_account->nonce; // Get current nonce
        action(
            permission_level{get_self(), "active"_n},
            eosio::name(EVM_SYSTEM_CONTRACT),
            "raw"_n,
            std::make_tuple(
                get_self(),
                rlp::encode(current_nonce, gas_price_val, SUCCESS_CB_GAS, 
                           conf.evm_bridge_address.extract_as_byte_array(), // Correct to: bridge address
                           uint256_t(0), data, conf.evm_chain_id, 0, 0),
                false,
                std::optional<eosio::checksum160>(evm_account->address)
            )
        ).send();
    };

    // calls an action on the EVM clearFailedRequests() | ONLY FOR EMERGENCY USE
    [[eosio::action]] void tokenbridge::clrfailedreq() {
        require_auth(get_self());
        
        // Open config
        auto conf = config_bridge.get();

        // Load the EVM system config
        evm_config_table evmconfig(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto it = evmconfig.begin();
        check(it != evmconfig.end(), "No config row found in eosio.evm's 'config' table");
        auto evm_conf = *it;

        // Gas price calculation
        uint256_t gas_price_val = (evm_conf.gas_price * 11) / 10;

        // Find the EVM account of this contract
        account_table _accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaccount = _accounts.get_index<"byaccount"_n>();
        auto evm_account = accounts_byaccount.require_find(get_self().value,
            ("EVM account not found for " + std::string(BRIDGE_CONTRACT_NAME)).c_str());

        // -----------------------------------------------------------------
        // call the clearFailedRequests() function on the EVM
        auto fnsig = toBin(EVM_CLEAR_FAILED_REQUESTS_SIGNATURE);
        std::vector<uint8_t> data(fnsig.begin(), fnsig.begin() + 4); // Use only first 4 bytes

        // Update the RLP encoding to use correct bridge address:
        uint64_t current_nonce = evm_account->nonce; // Get current nonce
        action(
            permission_level{get_self(), "active"_n},
            eosio::name(EVM_SYSTEM_CONTRACT),
            "raw"_n,
            std::make_tuple(
                get_self(),
                rlp::encode(current_nonce, gas_price_val, SUCCESS_CB_GAS, 
                           conf.evm_bridge_address.extract_as_byte_array(), // Correct to: bridge address
                           uint256_t(0), data, conf.evm_chain_id, 0, 0),
                false,
                std::optional<eosio::checksum160>(evm_account->address)
            )
        ).send();
    };

    // calls an action on the EVM removeRequest(uint256) | ONLY FOR EMERGENCY USE
    [[eosio::action]] void tokenbridge::rmreqonevm(uint64_t req_id) {
        require_auth(get_self());
        
        // Open config
        auto conf = config_bridge.get();

        // Load EVM config
        evm_config_table evmconfig(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto it = evmconfig.begin();
        check(it != evmconfig.end(), "No config row found in eosio.evm's 'config' table");
        auto evm_conf = *it;

        // Gas price with 10% buffer
        uint256_t gas_price_val = (evm_conf.gas_price * 11) / 10;

        // Get EVM account
        account_table _accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaccount = _accounts.get_index<"byaccount"_n>();
        auto evm_account = accounts_byaccount.require_find(get_self().value,
            ("EVM account not found for " + std::string(BRIDGE_CONTRACT_NAME)).c_str());

        // Prepare calldata: removeRequest(uint256)
        auto fnsig = toBin(EVM_REMOVE_REQUEST_SIGNATURE);
        std::vector<uint8_t> data(fnsig.begin(), fnsig.begin() + 4);
        
        // Pack request ID as uint256
        std::array<uint8_t, 32> req_id_bytes = uint256ToBytes(uint256_t(req_id));
        data.insert(data.end(), req_id_bytes.begin(), req_id_bytes.end());

        // Send EVM transaction
        uint64_t current_nonce = evm_account->nonce;
        action(
            permission_level{get_self(), "active"_n},
            eosio::name(EVM_SYSTEM_CONTRACT),
            "raw"_n,
            std::make_tuple(
                get_self(),
                rlp::encode(current_nonce, gas_price_val, SUCCESS_CB_GAS,
                          conf.evm_bridge_address.extract_as_byte_array(),
                          uint256_t(0), data, conf.evm_chain_id, 0, 0),
                false,
                std::optional<eosio::checksum160>(evm_account->address)
            )
        ).send();
    }
}