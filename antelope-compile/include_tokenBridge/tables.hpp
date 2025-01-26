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
        eosio::checksum256 call_id;
        time_point timestamp;

        uint64_t primary_key() const { return request_id; };
        eosio::checksum256 by_call_id() const { return call_id; };
        uint64_t by_timestamp() const {return timestamp.elapsed.to_seconds();}

        EOSLIB_SERIALIZE(requests, (request_id)(call_id)(timestamp));
    };
    typedef multi_index<name("requests"), requests,
       indexed_by<"callid"_n, eosio::const_mem_fun<requests, eosio::checksum256, &requests::by_call_id >>,
       indexed_by<"timestamp"_n, const_mem_fun<requests, uint64_t, &requests::by_timestamp >>
    >  requests_table;

    // Bridge refunds
    struct [[eosio::table, eosio::contract(BRIDGE_CONTRACT_NAME)]] refunds {
        uint64_t refund_id;
        eosio::checksum256 call_id;
        time_point timestamp;

        uint64_t primary_key() const { return refund_id; };
        eosio::checksum256 by_call_id() const { return call_id; };
        uint64_t by_timestamp() const {return timestamp.elapsed.to_seconds();}

        EOSLIB_SERIALIZE(refunds, (refund_id)(call_id)(timestamp));
    };
    typedef multi_index<name("refunds"), refunds,
       indexed_by<"callid"_n, eosio::const_mem_fun<refunds, eosio::checksum256, &refunds::by_call_id >>,
       indexed_by<"timestamp"_n, const_mem_fun<refunds, uint64_t, &refunds::by_timestamp >>
    >  refunds_table;

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

    typedef singleton<"bridgeconfig"_n, bridgeconfig> config_singleton_bridge;
}