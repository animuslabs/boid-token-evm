#pragma once
#include <eosio/eosio.hpp>

// contract name
#define BRIDGE_CONTRACT_NAME_MACRO BRIDGE_CONTRACT_NAME
#define EVM_SYSTEM_CONTRACT_MACRO EVM_SYSTEM_CONTRACT

namespace evm_bridge
{
  static constexpr auto WORD_SIZE = 32u;
  static constexpr uint64_t SUCCESS_CB_GAS = 250000; // Todo: find exact needed gas
  static constexpr uint64_t BRIDGE_GAS = 250000; // Todo: find exact needed gas
  static constexpr auto EVM_SUCCESS_CALLBACK_SIGNATURE = "0fbc79cd"; // "requestSuccessful(uint256)"
  static constexpr auto EVM_BRIDGE_SIGNATURE = "2e5dcb4b"; // bridgeTo(address,address,uint256,bytes32)
  static constexpr auto EVM_REF_STUCK_REQ_SIGNATURE = "35a89085"; // refundStuckReq()
  static constexpr auto EVM_CLEAR_FAILED_REQUESTS_SIGNATURE = "fc9e33a5"; // clearFailedRequests()
  static constexpr auto EVM_REMOVE_REQUEST_SIGNATURE = "44786fc3"; // removeRequest(uint256)
  static constexpr uint8_t STORAGE_BRIDGE_REQUESTS_INDEX = 9;
  static constexpr uint8_t STORAGE_BRIDGE_TOKEN_CONTRACT_INDEX = 6;
  static constexpr uint8_t STORAGE_BRIDGE_TOKEN_SYMBOL_INDEX = 8;
}