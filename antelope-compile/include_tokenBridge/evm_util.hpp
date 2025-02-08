// Licensed under the MIT License..

#pragma once
#include <array>
#include <cstdint>
#include <cstring>

using namespace evm_bridge;

namespace evm_bridge
{

  /**
   * Conversions
   */
  static inline std::string bin2hex(const std::vector<uint8_t>& bin)
  {
    std::string res;
    const char hex[] = "0123456789abcdef";
    for(auto byte : bin) {
      res += hex[byte >> 4];
      res += hex[byte & 0xf];
    }

    return res;
  }

  template<unsigned N, typename T>
  static inline std::string bin2hex(const std::array<T, N>& bin)
  {
    std::string res;
    const char hex[] = "0123456789abcdef";
    for(auto byte : bin) {
      res += hex[byte >> 4];
      res += hex[byte & 0xf];
    }

    return res;
  }

  inline constexpr bool is_precompile(uint256_t address) {
    return address >= 1 && address <= 9;
  }

  inline constexpr int64_t num_words(uint64_t size_in_bytes)
  {
    return (static_cast<int64_t>(size_in_bytes) + (WORD_SIZE - 1)) / WORD_SIZE;
  }

  template <typename T>
  static T shrink(uint256_t i)
  {
    return static_cast<T>(i & std::numeric_limits<T>::max());
  }

  inline std::array<uint8_t, 32u> toBin(const Address& address)
  {
    std::array<uint8_t, 32> address_bytes = {};
    intx::be::unsafe::store(address_bytes.data(), address);
    return address_bytes;
  }

  inline uint8_t toBin(char c) {
      if (c >= '0' && c <= '9') return c - '0';
      if (c >= 'a' && c <= 'f') return c - 'a' + 10;
      if (c >= 'A' && c <= 'F') return c - 'A' + 10;
      return 0;
  }

  inline std::array<uint8_t, 20u> toBin(const std::string& input) {
      std::array<uint8_t, 20> output = {};
      auto i = input.begin();
      uint8_t* out_pos = (uint8_t*)& output;
      uint8_t* out_end = out_pos + 20;
      while (i != input.end() && out_end != out_pos) {
          *out_pos = toBin((char)(*i)) << 4;
          ++i;
          if (i != input.end()) {
              *out_pos |= toBin((char)(*i));
              ++i;
          }
          ++out_pos;
      }
      return output;
  }
  inline const std::array<uint8_t, 32u> fromChecksum160(const eosio::checksum160 input)
  {
    std::array<uint8_t, 32U> output = {};
    auto input_bytes = input.extract_as_byte_array();
    std::copy(std::begin(input_bytes), std::end(input_bytes), std::begin(output) + 12);
    return output;
  }

  inline eosio::checksum160 toChecksum160(const std::array<uint8_t, 32u>& input)
  {
    std::array<uint8_t, 20> output = {};
    std::copy(std::begin(input) + 12, std::end(input), std::begin(output));
    return eosio::checksum160(output);
  }

  inline eosio::checksum160 toChecksum160(const std::string& input)
  {
    return eosio::checksum160( toBin(input) );
  }

  inline eosio::checksum256 toChecksum256(const Address& address)
  {
    return eosio::checksum256( toBin(address) );
  }

  static inline eosio::checksum256 pad160(const eosio::checksum160 input)
  {
    return eosio::checksum256( fromChecksum160(input) );
  }

  static inline Address checksum160ToAddress(const eosio::checksum160& input) {
    const std::array<uint8_t, 32u>& checksum = fromChecksum160(input);
    return intx::be::unsafe::load<uint256_t>(checksum.data());
  }
  static inline eosio::checksum160 addressToChecksum160(const Address& input) {
    return toChecksum160( toBin(input) );
  }

  // Do not use for addresses, only key for Account States
  static inline uint256_t checksum256ToValue(const eosio::checksum256& input) {
    std::array<uint8_t, 32U> output = {};
    auto input_bytes = input.extract_as_byte_array();
    std::copy(std::begin(input_bytes), std::end(input_bytes), std::begin(output));

    return intx::be::unsafe::load<uint256_t>(output.data());
  }

  template<typename T>
  static inline std::vector<T> pad(std::vector<T> vector, uint64_t padding, bool prepend){
    if(vector.size() >= padding){
        return vector;
    }
    vector.insert(prepend ? vector.begin() : vector.end(), (padding - vector.size()), 0);
    return vector;
  }

  inline const eosio::checksum256 getArrayMemberSlot(uint256_t array_slot, uint256_t position, uint256_t property_count, uint256_t i){
        return toChecksum256(array_slot + position + (property_count * (i)));
  }


  static std::string normalizeString(const std::string& input) {
      std::string output = input;
      std::transform(output.begin(), output.end(), output.begin(), ::tolower);
      return output;
  }
  
  // Parses a string from an EVM Storage string (less than < 32bytes only)
  inline std::string parseStringFromStorage(const uint256_t& rawVal) {
    std::array<uint8_t, 32> arr = {};
    intx::be::unsafe::store(arr.data(), rawVal);
    std::string result;
    for (uint8_t b : arr) {
        if (b == 0) break;
        result.push_back(static_cast<char>(b));
    }
    return result;
  }

  inline std::string parseMemoFromStorage(const uint256_t& checksum) {
    return parseStringFromStorage(checksum);
  }

  // Parses an Antelope name from an EVM Storage string
  inline eosio::name parseNameFromStorage(const uint256_t checksum){
    return eosio::name(parseStringFromStorage(checksum)); // convert to name
  }

  // Parses an Antelope symbol code from an EVM Storage string
  inline eosio::symbol_code parseSymbolCodeFromStorage(const uint256_t checksum){
    return eosio::symbol_code(parseStringFromStorage(checksum)); // convert to symbol code
  }


  // Parses an EVM address from an EVM Storage string
  inline std::vector<uint8_t> parseAddressFromStorage(const uint256_t checksum){
    std::vector<uint8_t> bs = intx::to_byte_string(checksum);
    reverse(bs.begin(),bs.end());
    bs.resize(20); // remove trailing 0
    reverse(bs.begin(),bs.end());
    return bs;
  }

  template <typename T, typename U>
  static inline void insertElementPosition(std::vector<T> *data, U position){
        std::vector<T> string_position_bs = pad(intx::to_byte_string(position), 32, true);
        data->insert(data->end(), string_position_bs.begin(), string_position_bs.end());
  }

  template <typename T, typename... Args>
  static inline void insertElementPositions(std::vector<T> *data, Args... args){
    (insertElementPosition(data, args), ...);
  }


  template <typename T>
  static inline void insertString(std::vector<T> *data, std::string value, uint64_t length){
    std::vector<T> string_size = pad(intx::to_byte_string(length), 32, true);
    std::vector<T> str(value.begin(), value.end());
    str = pad(str, 32, false);
    data->insert(data->end(), string_size.begin(), string_size.end());
    data->insert(data->end(), str.begin(), str.end());
  }

  template <typename T>
  static inline void insertName(std::vector<T> *data, uint64_t value, uint64_t length){
    insertString(data, eosio::name(value).to_string(), length);
  }

  template <typename T>
  static inline void insertName(std::vector<T> *data, eosio::name value, uint64_t length){
    insertString(data, value.to_string(), length);
  }

  /**
   * Keccak (SHA3) Functions
   */
  inline void keccak_256(
    const unsigned char* input,
    unsigned int inputByteLen,
    unsigned char* output)
  {
    // Ethereum started using Keccak and called it SHA3 before it was finalised.
    SHA3_CTX context;
    keccak_init(&context);
    keccak_update(&context, input, inputByteLen);
    keccak_final(&context, output);
  }

  using KeccakHash = std::array<uint8_t, 32u>;

  inline KeccakHash keccak_256(const uint8_t* begin, size_t byte_len)
  {
    KeccakHash h;
    keccak_256(begin, byte_len, h.data());
    return h;
  }

  inline KeccakHash keccak_256(const std::string& s)
  {
    return keccak_256((const uint8_t*)s.data(), s.size());
  }

  inline KeccakHash keccak_256(const std::vector<uint8_t>& v)
  {
    return keccak_256(v.data(), v.size());
  }

  template <size_t N>
  inline KeccakHash keccak_256(const std::array<uint8_t, N>& a)
  {
    return keccak_256(a.data(), N);
  }

  /**
   * computeDynamicDataKey
   *
   * Computes the storage key for a dynamic array element (or a field within that element)
   * as used in EVM storage layout. The algorithm is:
   *
   *   1. Represent the dynamic array's slot (where the length is stored) as a 32-byte big‑endian array.
   *   2. Compute the base address as: base = keccak256(slot_bytes)
   *   3. Add the offset: propertyOffset + (elementIndex * slotsPerElement) to the base (interpreted
   *      as a 256‑bit big‑endian integer).
   *   4. Return the result as an eosio::checksum256.
   *
   * Note: This version manually implements the conversion and addition so it can work in a
   *       restricted smart contract environment.
   */
  inline eosio::checksum256 computeDynamicDataKey(uint64_t dynamicArraySlot,
                                                    uint64_t elementIndex,
                                                    uint64_t slotsPerElement,
                                                    uint64_t propertyOffset = 0) {
    // Step 1: Convert dynamicArraySlot to a 32-byte big-endian array.
    std::array<uint8_t, 32> slotBytes = {}; // Initialized to all zeros.
    for (int i = 0; i < 8; i++) {
        // Write each byte starting at the end.
        slotBytes[31 - i] = static_cast<uint8_t>((dynamicArraySlot >> (i * 8)) & 0xFF);
    }

    // Step 2: Compute the base address using keccak256.
    // This function should accept a std::array<uint8_t,32> and return a std::array<uint8_t,32>.
    std::array<uint8_t, 32> base = evm_bridge::keccak_256(slotBytes);

    // Step 3: Compute the additional offset.
    uint64_t offset = propertyOffset + (elementIndex * slotsPerElement);

    // Step 4: Add the offset to the base (treating base as a big-endian 256-bit integer).
    // We add the offset to the low-order 8 bytes.
    std::array<uint8_t, 32> finalValue = base;
    uint64_t carry = offset;
    for (int i = 31; i >= 0 && carry != 0; --i) {
        // Sum current byte with the lowest byte of carry.
        uint16_t sum = static_cast<uint16_t>(finalValue[i]) + (carry & 0xFF);
        finalValue[i] = static_cast<uint8_t>(sum & 0xFF);
        // Update carry: shift carry by 8 bits plus any overflow from this addition.
        carry = (carry >> 8) + (sum >> 8);
    }

    // Step 5: Convert the final 32-byte array into an eosio::checksum256.
    // Many EOSIO toolchains allow constructing a checksum256 directly from a std::array.
    return eosio::checksum256(finalValue);
  }

     // Structure to hold parsed token symbol information.
   struct token_symbol_info {
      uint8_t precision;
      std::string code;
   };

   // Helper function to manually convert a string of digits to an integer.
   // Assumes that the input contains only digit characters.
   static inline uint8_t parseUint8(const std::string& numStr) {
      uint8_t value = 0;
      for (char c : numStr) {
         // Ensure character is a digit (you could also use a check here)
         eosio::check(c >= '0' && c <= '9', "Invalid character in token symbol precision");
         value = value * 10 + (c - '0');
      }
      return value;
   }
} // namespace bridge_evm