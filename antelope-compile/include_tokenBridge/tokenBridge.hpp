// @author Thomas Cuvillier
// @organization Telos Foundation
// @contract tokenBridge
// @version v1.0

// EOSIO
#include <eosio/eosio.hpp>
#include <eosio/singleton.hpp>
#include <eosio/crypto.hpp>
#include <eosio/transaction.hpp>
#include <eosio/asset.hpp>
#include <eosio/system.hpp>

// EXTERNAL
#include <intx/base.hpp>
#include <rlp/rlp.hpp>
#include <ecc/uECC.c>
#include <keccak256/k.c>
#include <boost/multiprecision/cpp_int.hpp>

// TELOS EVM
#include <constants.hpp>
#include <evm_util.hpp>
#include <datastream.hpp>
#include <evm_tables.hpp>
#include <tables.hpp>

using namespace std;
using namespace eosio;
using namespace evm_bridge;
using namespace intx;

namespace evm_bridge
{
    class [[eosio::contract(BRIDGE_CONTRACT_NAME)]] tokenbridge : public contract {
        public:
            using contract::contract;

            config_singleton_bridge config_bridge;

            tokenbridge(name self, name code, datastream<const char*> ds)
             : contract(self, code, ds),
              config_bridge(self, self.value) { };

            ~tokenbridge() {};

            //======================== Admin actions ========================
            // intialize the contract
            [[eosio::action]] void init(
                      eosio::checksum160 evm_bridge_address,
                      eosio::checksum160 evm_token_address,
                      uint8_t evm_chain_id,
                      eosio::symbol native_token_symbol,
                      eosio::name native_token_contract,
                      eosio::name fees_contract,
                      bool is_locked = false
              );

            //======================== Token bridge actions ========================
            // Notifies Antelope of a bridge request in EVM
            [[eosio::action]] void reqnotify();

            // Bridge to EVM
            [[eosio::on_notify("*::transfer")]] void bridge(eosio::name from, eosio::name to, eosio::asset quantity, std::string memo);


    };
}
