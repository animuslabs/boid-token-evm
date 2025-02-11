#pragma once
#include <constants.hpp>

using namespace std;
using namespace eosio;
using namespace evm_bridge;

namespace evm_bridge {
    //======================== Tables ========================
    // Bridge requests
    struct [[eosio::table, eosio::contract(BRIDGE_CONTRACT_NAME)]] requests {
        uint64_t request_id;
        time_point timestamp;
        bool processed;
        uint64_t amount;
        name receiver;
        std::string sender;
        std::string memo;

        uint64_t primary_key() const { return request_id; }
        uint64_t by_processed() const { return processed; }
        uint64_t by_timestamp() const { return static_cast<uint64_t>(timestamp.elapsed.to_seconds()); }

        EOSLIB_SERIALIZE(requests, (request_id)(timestamp)(processed)
                                   (amount)(receiver)(sender)(memo));
    };
    
    // multi_index with primary key and secondary index on processed
    typedef eosio::multi_index<"requests"_n, requests,
       eosio::indexed_by<"processed"_n, eosio::const_mem_fun<requests, uint64_t, &requests::by_processed>>,
       eosio::indexed_by<"timestamp"_n, eosio::const_mem_fun<requests, uint64_t, &requests::by_timestamp>>
    > requests_table;

    // Config
    struct [[eosio::table, eosio::contract(BRIDGE_CONTRACT_NAME)]] bridgeconfig {
        eosio::checksum160 evm_bridge_address;
        uint64_t evm_bridge_scope;
        eosio::checksum160 evm_token_address;
        uint8_t evm_chain_id;
        eosio::symbol native_token_symbol;
        eosio::name native_token_contract;
        eosio::name fees_contract;
        bool is_locked = false;

        EOSLIB_SERIALIZE(bridgeconfig, (evm_bridge_address)(evm_bridge_scope)(evm_token_address)(evm_chain_id)(native_token_symbol)(native_token_contract)(fees_contract)(is_locked));
    } config_row;

    // singleton with primary key bridgeconfig
    typedef singleton<"bridgeconfig"_n, bridgeconfig> config_singleton_bridge;
}