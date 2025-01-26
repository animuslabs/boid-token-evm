#pragma once
#include <eosio/eosio.hpp>

// Crypto
#define MBEDTLS_ASN1_OCTET_STRING 0x04

// contract name
#define BRIDGE_CONTRACT_NAME_MACRO BRIDGE_CONTRACT_NAME
#define EVM_SYSTEM_CONTRACT_MACRO EVM_SYSTEM_CONTRACT

namespace evm_bridge
{
  static constexpr auto WORD_SIZE = 32u;
  static constexpr uint64_t SIGN_REGISTRATION_GAS = 250000; // Todo: find exact needed gas
  static constexpr uint64_t REFUND_CB_GAS = 250000; // Todo: find exact needed gas
  static constexpr uint64_t SUCCESS_CB_GAS = 250000; // Todo: find exact needed gas
  static constexpr uint64_t BRIDGE_GAS = 250000; // Todo: find exact needed gas
  static constexpr auto EVM_SUCCESS_CALLBACK_SIGNATURE = "0fbc79cd";
  static constexpr auto EVM_REFUND_CALLBACK_SIGNATURE = "dc2fdf9f";
  static constexpr auto EVM_BRIDGE_SIGNATURE = "7d056de7";
  static constexpr auto EVM_SIGN_REGISTRATION_SIGNATURE = "a1d22913";
  static constexpr uint8_t STORAGE_BRIDGE_REQUEST_INDEX = 4;
  static constexpr uint8_t STORAGE_BRIDGE_REFUND_INDEX = 5;
  static constexpr uint8_t STORAGE_REGISTER_REQUEST_INDEX = 4;
  static constexpr uint8_t STORAGE_REGISTER_PAIR_INDEX = 3;
}