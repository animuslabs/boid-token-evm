#pragma once

using namespace std;
using namespace eosio;
using namespace evm_bridge;

namespace evm_bridge {
    //======================== eosio.evm tables =======================
      struct [[eosio::table, eosio::contract(EVM_SYSTEM_CONTRACT)]] Account {
        uint64_t index;
        eosio::checksum160 address;
        eosio::name account;
        uint64_t nonce;
        std::vector<uint8_t> code;
        bigint::checksum256 balance;

        Account () = default;
        Account (uint256_t _address): address(addressToChecksum160(_address)) {}
        uint64_t primary_key() const { return index; };

        uint64_t get_account_value() const { return account.value; };
        uint256_t get_address() const { return checksum160ToAddress(address); };
        uint256_t get_balance() const { return balance; };
        uint64_t get_nonce() const { return nonce; };
        std::vector<uint8_t> get_code() const { return code; };
        bool is_empty() const { return nonce == 0 && balance == 0 && code.size() == 0; };

        eosio::checksum256 by_address() const { return pad160(address); };

        EOSLIB_SERIALIZE(Account, (index)(address)(account)(nonce)(code)(balance));
      };
    typedef eosio::multi_index<"account"_n, Account,
        eosio::indexed_by<eosio::name("byaddress"), eosio::const_mem_fun<Account, eosio::checksum256, &Account::by_address>>,
        eosio::indexed_by<eosio::name("byaccount"), eosio::const_mem_fun<Account, uint64_t, &Account::get_account_value>>
    > account_table;

    struct [[eosio::table, eosio::contract(EVM_SYSTEM_CONTRACT)]] AccountState {
        uint64_t index;
        eosio::checksum256 key;
        bigint::checksum256 value;

        uint64_t primary_key() const { return index; };
        eosio::checksum256 by_key() const { return key; };

        EOSLIB_SERIALIZE(AccountState, (index)(key)(value));
      };

      typedef eosio::multi_index<"accountstate"_n, AccountState,
        eosio::indexed_by<eosio::name("bykey"), eosio::const_mem_fun<AccountState, eosio::checksum256, &AccountState::by_key>>
      > account_state_table;

      struct [[eosio::table, eosio::contract(EVM_SYSTEM_CONTRACT)]] EvmSysConfig {
        // A dummy PK so the table can compile
        uint64_t dummy_pk = 0;
        uint32_t trx_index;
        uint32_t last_block;
        bigint::checksum256 gas_used_block;
        bigint::checksum256 gas_price;
        uint32_t revision;

        // This forces the multi_index to store just one row at key=0
        uint64_t primary_key() const { return dummy_pk; }

        EOSLIB_SERIALIZE(EvmSysConfig, (trx_index)(last_block)(gas_used_block)(gas_price)(revision));
      };
      typedef eosio::multi_index<"config"_n, EvmSysConfig> evm_config_table;
}