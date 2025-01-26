#include <eosio/eosio.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>
#include "../include_feeForwarder/constants.hpp"
#include <map>

using namespace eosio;

namespace token {
   struct [[eosio::table]] account {
      asset balance;
      uint64_t primary_key() const { return balance.symbol.code().raw(); }
   };
   typedef eosio::multi_index<"accounts"_n, account> accounts;

   // Helper method to get balance
   static asset get_balance(name token_contract, name owner, symbol_code sym_code) {
      accounts accs(token_contract, owner.value);
      auto itr = accs.find(sym_code.raw());
      if (itr == accs.end()) {
         return asset(0, symbol(sym_code, 0)); // or however many decimals
      }
      return itr->balance;
   }
}

// FEES_CONTRACT_NAME is defined in the constants.hpp file
class [[eosio::contract(FEES_CONTRACT_NAME)]] feeForwarder : public contract {
public:
    using contract::contract;

    // Constructor
    feeForwarder(name receiver, name code, datastream<const char*> ds)
        : contract(receiver, code, ds)
        , _tokens(receiver, receiver.value)
        , _fees(receiver, receiver.value)
        , _global(receiver, receiver.value)
    {}

        //--------------------------------------------------------------------------
        // ACTION: setglobal
        //
        // Sets or updates global config:
        // - fee: How much must be paid to do bridging
        // - fee_token_contract: Which contract that fee is paid in
        // - fee_token_symbol: The symbol of the fee token
        // - bridge_account: The account to which the bridged tokens get forwarded to
        // - evm_memo: The memo to use when forwarding the bridged tokens ( this should be the Ethereum address )
        //--------------------------------------------------------------------------
        [[eosio::action]]
        void setglobal(asset fee, name fee_token_contract, symbol fee_token_symbol, name bridge_account, std::string evm_memo) {
            require_auth(get_self());

            // Basic checks
            check(is_account(fee_token_contract), "Fee token contract does not exist");
            check(fee_token_symbol == fee.symbol, "Fee token symbol does not match the fee name");
            check(is_account(bridge_account), "Bridge account does not exist");
            check(evm_memo.substr(0, 2) == "0x" && evm_memo.length() == 42, "Memo must be a valid Ethereum address (42 characters including '0x').");
            check(std::all_of(evm_memo.begin() + 2, evm_memo.end(), ::isxdigit), "Memo must contain a valid EVM address in hexadecimal format.");
            check(fee.amount > 0, "Fee must be greater than zero");

            auto it = _global.find(GLOBAL_ID);
            if (it == _global.end()) {
                // Create new config
                _global.emplace(get_self(), [&](auto& row) {
                    row.id                 = GLOBAL_ID;
                    row.fee               = fee;
                    row.fee_token_contract = fee_token_contract;
                    row.fee_token_symbol    = fee_token_symbol;
                    row.bridge_account    = bridge_account;
                    row.evm_memo          = evm_memo;
                });
            } else {
                // Modify existing config
                _global.modify(it, same_payer, [&](auto& row) {
                    row.fee               = fee;
                    row.fee_token_contract = fee_token_contract;
                    row.fee_token_symbol    = fee_token_symbol;
                    row.bridge_account    = bridge_account;
                    row.evm_memo          = evm_memo;
                });
            }
        }

        //--------------------------------------------------------------------------
        // ACTION: regtoken
        //
        // Register (or update) a bridging token config:
        // - token_contract: The contract which issues/handles this bridged token
        // - token_symbol: The token’s symbol
        // - min_amount: The minimum bridging amount
        //--------------------------------------------------------------------------
        [[eosio::action]]
        void regtoken(name token_contract, symbol token_symbol, asset min_amount) {
            require_auth(get_self());

            check(is_account(token_contract), "Token contract does not exist");
            check(min_amount.amount > 0, "Minimum bridging amount must be greater than zero");

            auto existing = _tokens.find(token_symbol.code().raw());
            if (existing == _tokens.end()) {
                // Emplace new token config
                _tokens.emplace(get_self(), [&](auto& row) {
                    row.token_symbol   = token_symbol;
                    row.token_contract = token_contract;
                    row.min_amount     = min_amount;
                });
            } else {
                // Update existing token config
                _tokens.modify(existing, same_payer, [&](auto& row) {
                    row.token_symbol   = token_symbol;
                    row.token_contract = token_contract;
                    row.min_amount     = min_amount;
                });
            }
        }

        //--------------------------------------------------------------------------
        // ACTION: deltoken
        //
        // Delete a token from the bridging tokens table.
        //--------------------------------------------------------------------------
        [[eosio::action]]
        void deltoken(symbol token_symbol) {
            require_auth(get_self()); // Only the contract owner can delete tokens

            // Find the token in the `_tokens` table
            auto existing = _tokens.find(token_symbol.code().raw());
            check(existing != _tokens.end(), "Token not found");

            // Erase the token from the table
            _tokens.erase(existing);

            print("Token ", token_symbol.code().to_string(), " deleted.");
        }


        //--------------------------------------------------------------------------
        // ACTION: claimrefund
        //
        // The user can claim any unused fee record if they haven’t used it yet,
        // provided it hasn't expired.  
        //--------------------------------------------------------------------------
        [[eosio::action]]
        void claimrefund(name user) {
            require_auth(user);

            auto idx = _fees.get_index<"byuser"_n>();
            auto itr = idx.find(user.value);
            check(itr != idx.end(), "No refund available for this user");

            // Check for expiration (30 days here)
            time_point_sec now = time_point_sec(current_time_point());
            check(now <= itr->created_at + seconds(2592000), "Refund has expired");

            // Return the fee
            asset refund_amount     = itr->amount;
            name  refund_token_contract = itr->token_contract;

            action(
                permission_level{get_self(), "active"_n},
                refund_token_contract,
                "transfer"_n,
                std::make_tuple(get_self(), user, refund_amount, std::string("Refund from feeForwarder"))
            ).send();

            // Erase record
            idx.erase(itr);
        }

        //--------------------------------------------------------------------------
        // NOTIFY HANDLER: on_transfer
        //
        // This is triggered whenever *any* contract does a "transfer" to our contract.
        // We decide if it's a bridging token or a fee token.
        //--------------------------------------------------------------------------
        [[eosio::on_notify("*::transfer")]]
        void on_transfer(name from, name to, asset quantity, std::string memo) {
            if (from == get_self() || to != get_self()) {
                return; // Ignore outgoing transfers or anything not to this contract
            }

            // Attempt to find the symbol in the bridging tokens table
            auto tok_itr = _tokens.find(quantity.symbol.code().raw());
            if (tok_itr != _tokens.end()) {
                // This is a bridging token
                handle_bridge_token_transfer(from, quantity, memo, *tok_itr);
            } else {
                // Possibly a fee token
                handle_fee_transfer(from, quantity);
            }
        }


        //--------------------------------------------------------------------------
        // ACTION: withdrawfees
        //
        // Admin can withdraw any unencumbered fees (i.e., fees that haven't been used yet).
        // It also cleans up any expired fee records.
        //--------------------------------------------------------------------------
        [[eosio::action]]
        void withdrawfees() {
            // 1. Check global config
            auto glob_itr = _global.find(GLOBAL_ID);
            check(glob_itr != _global.end(), "Global config is not set. Please call setglobal first.");

            name   fee_contract  = glob_itr->fee_token_contract;
            symbol fee_symbol    = glob_itr->fee_token_symbol; 
            name   to_account    = glob_itr->bridge_account;
            std::string memo_str = glob_itr->evm_memo;

            // 2. Read this contract's balance of the fee token
            asset contract_balance = token::get_balance(fee_contract, get_self(), fee_symbol.code());
            // e.g. "1000.0000 TLOS"

            // 3. Sum up all unexpired fee records (that match the fee symbol).
            //    Because if a user hasn't used it yet, they can still claim a refund.
            asset total_encumbered(0, fee_symbol); // start at 0
            time_point_sec now = current_time_point();

            auto itr = _fees.begin();
            while (itr != _fees.end()) {
                if (now > itr->created_at + seconds(2592000)) {
                    itr = _fees.erase(itr);
                } else {
                    total_encumbered += itr->amount;
                    ++itr;
                }
            }

            // 4. Calculate how much is actually free to withdraw
            asset free_amount = contract_balance - total_encumbered;
            check(free_amount.amount > 0, "No unencumbered funds available to withdraw.");

            // 5. Transfer the free_amount out
            action(
                permission_level{get_self(), "active"_n},
                fee_contract,
                "transfer"_n,
                std::make_tuple(get_self(), to_account, free_amount, memo_str)
            ).send();
        }

private:
    //--------------------------------------------------------------------------
    // TABLE: global configuration
    //
    // We only store 1 row, with a known ID (e.g., 0).
    //--------------------------------------------------------------------------
    static constexpr uint64_t GLOBAL_ID = 0;

    struct [[eosio::table]] global_state {
        uint64_t id;
        asset    fee;                // Fee required to bridge
        name     fee_token_contract; // Contract that issues the fee token
        symbol   fee_token_symbol;     // Symbol of the fee token
        name     bridge_account;     // Final account to which bridged tokens go
        std::string evm_memo;            // Memo to use when forwarding bridged tokens

        uint64_t primary_key() const { return id; }
    };
    typedef multi_index<"global"_n, global_state> global_table;
    global_table _global;

    //--------------------------------------------------------------------------
    // TABLE: token configuration
    //
    // For each token we allow bridging, store:
    //  - token_symbol
    //  - token_contract
    //  - min_amount
    //--------------------------------------------------------------------------
    struct [[eosio::table]] token_config {
        symbol token_symbol;
        name   token_contract; // Where the bridging token is from
        asset  min_amount;     // Minimum bridging amount

        uint64_t primary_key() const { return token_symbol.code().raw(); }
    };
    typedef multi_index<"tokens"_n, token_config> token_config_table;
    token_config_table _tokens;

    //--------------------------------------------------------------------------
    // TABLE: fee record
    //
    // Tracks who has paid a bridging fee (so they can do exactly one bridging).
    //--------------------------------------------------------------------------
    struct [[eosio::table]] fee_record {
        uint64_t       id;
        name           user;
        asset          amount;
        name           token_contract; // The contract of the fee token
        time_point_sec created_at;     // For expiration logic

        uint64_t primary_key() const   { return id; }
        uint64_t by_user() const       { return user.value; }
        uint64_t by_created_at() const { return created_at.utc_seconds; }
    };
    typedef multi_index<
        "fees"_n,
        fee_record,
        indexed_by<"byuser"_n, const_mem_fun<fee_record, uint64_t, &fee_record::by_user>>,
        indexed_by<"createdat"_n, const_mem_fun<fee_record, uint64_t, &fee_record::by_created_at>>
    >
    fee_record_table;
    fee_record_table _fees;

    //--------------------------------------------------------------------------
    // handle_bridge_token_transfer
    //
    // Called when a bridging token arrives. We check:
    //  - The user has previously paid the fee (and that fee matches the global fee).
    //  - The quantity >= min_amount
    //  - The memo is a valid EVM address, etc.
    //  - Then forward to the global_config.bridge_account
    //--------------------------------------------------------------------------
    void handle_bridge_token_transfer(name from, asset quantity, const std::string& memo, const token_config& config) {
        // 1. Check the global config is set
        auto glob_itr = _global.find(GLOBAL_ID);
        check(glob_itr != _global.end(), "Global config is not set. Please call setglobal first.");

        // 2. Basic bridging checks
        check(quantity.amount >= config.min_amount.amount, "Amount is below the minimum required for bridging");
        check(memo.size() == 42 && memo.substr(0, 2) == "0x", "Memo must be a valid 42-char Ethereum address with '0x' prefix.");
        check(std::all_of(memo.begin() + 2, memo.end(), ::isxdigit), "Memo must be a valid hex string (after '0x').");
        check(get_first_receiver() == config.token_contract, "Invalid token contract for this bridging token");
        check(quantity.symbol == config.token_symbol, "Mismatched token symbol for bridging token");

        // 3. Verify the user paid the bridging fee
        auto fee_idx = _fees.get_index<"byuser"_n>();
        auto fee_itr = fee_idx.find(from.value);
        check(fee_itr != fee_idx.end(), "No valid fee record found. Ensure you send the required fee before bridging.");
        check(fee_itr->amount == glob_itr->fee, "Fee record doesn't match the required bridging fee.");

        // 4. Transfer the bridging token to the configured bridge_account
        action(
            permission_level{get_self(), "active"_n},
            config.token_contract, // e.g., eosio.token or wherever
            "transfer"_n,
            std::make_tuple(get_self(), glob_itr->bridge_account, quantity, memo)
        ).send();

        // 5. Remove the fee record (it was used)
        fee_idx.erase(fee_itr);
    }

    //--------------------------------------------------------------------------
    // handle_fee_transfer
    //
    // Called when any token arrives that is NOT recognized as a bridging token.
    // We assume it might be the fee. We verify it matches the global config:
    //  - It must come from the global fee_token_contract
    //  - The amount must match the global fee exactly (no overpay)
    //--------------------------------------------------------------------------
    void handle_fee_transfer(name from, asset quantity) {
        // 1. Check if a fee record already exists
        auto fee_idx = _fees.get_index<"byuser"_n>();
        auto fee_itr = fee_idx.find(from.value);
        check(fee_itr == fee_idx.end(), "A fee is already recorded for this user. Use or claim the existing fee first.");

        // 2. Check global config
        auto glob_itr = _global.find(GLOBAL_ID);
        check(glob_itr != _global.end(), "Global config is not set. Admin must call setglobal first.");

        // 3. Verify this is the correct fee token contract + correct fee amount
        check(get_first_receiver() == glob_itr->fee_token_contract, "Invalid fee token contract.");
        check(quantity.symbol == glob_itr->fee.symbol, "Incorrect fee token symbol.");
        check(quantity == glob_itr->fee, "Fee amount is incorrect or overpayment not allowed.");

        // 4. Record the fee payment
        _fees.emplace(get_self(), [&](auto& row) {
            row.id             = _fees.available_primary_key();
            row.user           = from;
            row.amount         = quantity;
            row.token_contract = get_first_receiver();
            row.created_at     = time_point_sec(current_time_point());
        });
    }
};