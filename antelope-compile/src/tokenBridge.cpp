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
#define REQUEST_TIMEOUT 3600

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
        
        // Load the EVM system config via multi-index
        evm_config_table evmconfig(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto it = evmconfig.begin();
        check(it != evmconfig.end(), "No config row found in eosio.evm's 'config' table");
        auto evm_conf = *it;

        // Gas
        uint256_t gas_price_val = evm_conf.gas_price * 1.2;
        
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

        uint256_t antelope_token_contract_slot = 5;
        uint256_t antelope_token_symbol_slot   = 7;

        // -----------------------------------------------------------------
        // ----- Decode antelope token contract (slot 5) -----
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
        // ----- Decode antelope token symbol (slot 7) -----
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

        // Prepare EVM function signature & arguments | Insert the function signature: c21fd05f (bridgeTo) 4 bytes
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
        action(
            permission_level {get_self(), "active"_n},
            eosio::name(EVM_SYSTEM_CONTRACT),
            "raw"_n,
            std::make_tuple(get_self(), rlp::encode(evm_account->nonce, gas_price_val, BRIDGE_GAS, evm_to, uint256_t(0), data, conf.evm_chain_id, 0, 0), false, std::optional<eosio::checksum160>(evm_account->address))
        ).send();
    };

    // Trustless bridge from tEVM
    [[eosio::action]]
    void tokenbridge::reqnotify()
    {
        // Open config
        auto conf = config_bridge.get();

        // Load the EVM system config
        evm_config_table evmconfig(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto it = evmconfig.begin();
        check(it != evmconfig.end(), "No config row found in eosio.evm's 'config' table");
        auto evm_conf = *it;

        // Gas price calculation
        uint256_t gas_price_val = evm_conf.gas_price * 1.2;

        // Find the EVM account of this contract
        account_table _accounts(eosio::name(EVM_SYSTEM_CONTRACT), eosio::name(EVM_SYSTEM_CONTRACT).value);
        auto accounts_byaccount = _accounts.get_index<"byaccount"_n>();
        auto evm_account = accounts_byaccount.require_find(get_self().value,
            ("EVM account not found for " + std::string(BRIDGE_CONTRACT_NAME)).c_str());

        // Erase old requests
        requests_table requests(get_self(), get_self().value);
        auto requests_by_timestamp = requests.get_index<"timestamp"_n>();
        auto upper = requests_by_timestamp.upper_bound(current_time_point().sec_since_epoch() - 60);
        uint64_t count = 10; // max 10 requests to remove so we never overload CPU
        for (auto itr = requests_by_timestamp.begin(); count > 0 && itr != upper; count--) {
            itr = requests_by_timestamp.erase(itr);
        }

      // The "requests" array is declared at slot 8.
      std::array<uint8_t, 32> paddedLength = {};
      paddedLength[31] = STORAGE_BRIDGE_REQUEST_INDEX;  // STORAGE_BRIDGE_REQUEST_INDEX is 8.
      checksum256 lengthKey;
      std::memcpy((char*)&lengthKey, paddedLength.data(), 32);
      std::string rawKeyHex = bin2hex(std::vector<uint8_t>(paddedLength.begin(), paddedLength.end()));

      // Open the account state table.
      account_state_table bridge_account_states(name(EVM_SYSTEM_CONTRACT), conf.evm_bridge_scope);
      auto bridge_account_states_bykey = bridge_account_states.get_index<"bykey"_n>();

      // Retrieve the requests array length from storage (key = 8).
      uint64_t requests_length = 0;
      bool found = false;
      for (auto itr = bridge_account_states_bykey.begin(); itr != bridge_account_states_bykey.end(); ++itr) {
         auto keyArray = itr->key.extract_as_byte_array();
         uint256_t keyValue = intx::be::unsafe::load<uint256_t>(keyArray.data());
         if (keyValue == STORAGE_BRIDGE_REQUEST_INDEX) {
            requests_length = static_cast<uint64_t>(itr->value);
            found = true;
            break;
         }
      }
      check(found, ("No requests found at expected length key. Expected key: " + rawKeyHex).c_str());

      // Sequential layout: Each request occupies 9 slots.
      uint8_t request_property_count = 9;

      // Process at most 2 requests.
      for (uint64_t i = 0; i < requests_length && i < 2; i++) {
         // Compute keys for each field using sequential layout.
         // call_id is the index of the request
         checksum256 key_sender                = computeDynamicDataKey(STORAGE_BRIDGE_REQUEST_INDEX, i, request_property_count, 1);
         checksum256 key_amount                = computeDynamicDataKey(STORAGE_BRIDGE_REQUEST_INDEX, i, request_property_count, 2);
         checksum256 key_requested_at          = computeDynamicDataKey(STORAGE_BRIDGE_REQUEST_INDEX, i, request_property_count, 3);
         checksum256 key_antelope_token_contract = computeDynamicDataKey(STORAGE_BRIDGE_REQUEST_INDEX, i, request_property_count, 4);
         checksum256 key_antelope_symbol       = computeDynamicDataKey(STORAGE_BRIDGE_REQUEST_INDEX, i, request_property_count, 5);
         checksum256 key_receiver              = computeDynamicDataKey(STORAGE_BRIDGE_REQUEST_INDEX, i, request_property_count, 6);
         checksum256 key_packed                = computeDynamicDataKey(STORAGE_BRIDGE_REQUEST_INDEX, i, request_property_count, 7);
         checksum256 key_memo                  = computeDynamicDataKey(STORAGE_BRIDGE_REQUEST_INDEX, i, request_property_count, 8);

         // Local variables for decoded data.
         uint256_t call_id = 0;
         std::string senderStr;
         uint256_t amount = 0;
         uint256_t requested_at = 0;
         std::string antelope_token_contract_raw;
         std::string antelope_token_contract;
         std::string antelope_token_symbol;
         std::string memoStr;
         name receiver;
         uint8_t evm_decimals = 0;
         uint8_t request_status = 0;
         uint256_t packed_value = 0;

         // Check if the key exists for sender
        auto it_sender = bridge_account_states_bykey.find(key_sender);
        check(it_sender != bridge_account_states_bykey.end(), 
            ("Missing sender at element index " + std::to_string(i)));
        senderStr = parseStringFromStorage(it_sender->value);       

         // Retrieve amount.
         {
            auto it = bridge_account_states_bykey.find(key_amount);
            check(it != bridge_account_states_bykey.end(),
                  ("Missing amount at element index " + std::to_string(i)));
            amount = it->value;
         }

         // Retrieve requested_at.
         {
            auto it = bridge_account_states_bykey.find(key_requested_at);
            check(it != bridge_account_states_bykey.end(),
                  ("Missing requested_at at element index " + std::to_string(i)));
            requested_at = it->value;
         }

         // Retrieve antelope_token_contract.
         {
            auto it = bridge_account_states_bykey.find(key_antelope_token_contract);
            check(it != bridge_account_states_bykey.end(),
                  ("Missing antelope_token_contract at element index " + std::to_string(i)).c_str());
            uint256_t rawValue = it->value;
            std::array<uint8_t, 32> arr = {};
            intx::be::unsafe::store(arr.data(), rawValue);
            antelope_token_contract_raw = bin2hex(arr);
            antelope_token_contract = parseStringFromStorage(rawValue);
         }
         // Retrieve antelope_token_symbol.
         {
            auto it = bridge_account_states_bykey.find(key_antelope_symbol);
            check(it != bridge_account_states_bykey.end(),
                  ("Missing antelope_token_symbol at element index " + std::to_string(i)));
            antelope_token_symbol = parseStringFromStorage(it->value);

         }
         // Retrieve receiver.
         {
            auto it = bridge_account_states_bykey.find(key_receiver);
            check(it != bridge_account_states_bykey.end(),
                  ("Missing receiver at element index " + std::to_string(i)));
            std::string raw_receiver = parseStringFromStorage(it->value);

            std::transform(raw_receiver.begin(), raw_receiver.end(), raw_receiver.begin(), ::tolower);
            for (char c : raw_receiver) {
               check((c >= 'a' && c <= 'z') || (c >= '1' && c <= '5') || c == '.',
                     ("Invalid character in receiver at element index " + std::to_string(i) +
                      "; Full raw string: " + raw_receiver).c_str());
            }
            receiver = name(raw_receiver);
         }
         // Retrieve packed field and extract evm_decimals and request_status.
         {
            auto it = bridge_account_states_bykey.find(key_packed);
            check(it != bridge_account_states_bykey.end(),
                  ("Missing packed field at element index " + std::to_string(i)));
            packed_value = it->value;
            evm_decimals   = static_cast<uint8_t>(packed_value & 0xFF);
            request_status = static_cast<uint8_t>((packed_value >> 8) & 0xFF);

         }

         // Retrieve memo.
         {
            auto it = bridge_account_states_bykey.find(key_memo);
            check(it != bridge_account_states_bykey.end(),
                  ("Missing memo at element index " + std::to_string(i)));
            memoStr = parseStringFromStorage(it->value);

         }

         // Validate that the antelope token contract matches the configured native token.
         std::string norm_evm_token_contract = normalizeString(antelope_token_contract);
         std::string norm_native_token_contract = normalizeString(conf.native_token_contract.to_string());
         check(norm_evm_token_contract == norm_native_token_contract, ("Mismatch in antelope token contract"));
         check(request_status == 0, ("Request is not pending"));

         // Check if this request has already been processed.
         auto requests_by_callid = requests.get_index<"callid"_n>();
         auto exists = requests_by_callid.find(toChecksum256(call_id));
         if (exists != requests_by_callid.end()) {
            // Already processed; skip.
            continue;
         }

         // Record the request locally and transfer tokens
        requests.emplace(this->get_self(), [&](auto& r) {
            r.call_id = toChecksum256(call_id);
            r.timestamp  = current_time_point();
        });

        uint8_t native_decimals = conf.native_token_symbol.precision();  // gives 4
        std::string nativeCode = conf.native_token_symbol.code().to_string(); // gives "BOID"

        // Compute the scale factor for conversion (10^(native_decimals)).
        uint64_t scale = 1;

        for (uint8_t i = 0; i < native_decimals; i++) { scale *= 10; }
        // Convert the raw amount (a uint256_t with 18 decimals) into the native token amount.
        uint256_t converted = amount * scale;       // Multiply first to preserve precision.
        converted /= 1000000000000000000ULL;          // Divide by 10^18 (EVM decimals).
        uint64_t adjusted_amount = static_cast<uint64_t>(converted);

        // Now build the asset with the adjusted amount.
        eosio::asset quantity(adjusted_amount, conf.native_token_symbol);
        action(
            permission_level{get_self(), "active"_n},
            eosio::name(conf.native_token_contract),
            "transfer"_n,
            std::make_tuple(get_self(), receiver, quantity, memoStr)
        ).send();

        // -----------------------------------------------------------------
        // Callback on EVM side to mark success: requestSuccessful(uint id)
        std::vector<uint8_t> call_id_bs = pad(intx::to_byte_string(call_id), 32, true);
        auto evm_contract_bytes = conf.evm_bridge_address.extract_as_byte_array();
        std::vector<uint8_t> evm_to(evm_contract_bytes.begin(), evm_contract_bytes.end());
        auto fnsig = toBin(EVM_SUCCESS_CALLBACK_SIGNATURE);
        std::vector<uint8_t> data;
        data.insert(data.end(), fnsig.begin(), fnsig.end());
        data.insert(data.end(), call_id_bs.begin(), call_id_bs.end());
        action(
            permission_level{get_self(), "active"_n},
            eosio::name(EVM_SYSTEM_CONTRACT),
            "raw"_n,
            std::make_tuple(
                get_self(),
                rlp::encode(evm_account->nonce + i, gas_price_val, SUCCESS_CB_GAS, evm_to,
                            uint256_t(0), data, conf.evm_chain_id, 0, 0),
                false,
                std::optional<eosio::checksum160>(evm_account->address)
            )
        ).send();

        // Final check: confirm the request is still pending
        check(request_status == 0,
            ("Request is not pending. Packed value: " + intx::to_string(packed_value)).c_str());
    } // end for
   }
}