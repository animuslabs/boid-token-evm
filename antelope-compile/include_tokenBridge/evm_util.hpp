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

  inline eosio::checksum256 addToChecksum256(const eosio::checksum256& base, uint8_t offset) {
      // Extract the underlying 32-byte array.
      auto arr = base.extract_as_byte_array();
      uint64_t carry = offset;
      // Add the offset to the big‑endian number (starting at the least-significant byte).
      for (int i = 31; i >= 0 && carry != 0; --i) {
          uint16_t sum = static_cast<uint16_t>(arr[i]) + (carry & 0xFF);
          arr[i] = static_cast<uint8_t>(sum & 0xFF);
          carry = (carry >> 8) + (sum >> 8);
      }
      return eosio::checksum256(arr);
  }

  inline eosio::checksum256 computeMappingKey(uint64_t req_id, uint64_t mapping_base_slot) {
      // Create a 32-byte array for req_id (all zeros)
      std::array<uint8_t, 32> reqIdBytes = {0};
      // Encode req_id into the lower 8 bytes (big-endian)
      for (uint8_t i = 0; i < 8; i++) {
          reqIdBytes[31 - i] = static_cast<uint8_t>((req_id >> (i * 8)) & 0xFF);
      }
      
      // Create a 32-byte array for mapping_base_slot (all zeros)
      std::array<uint8_t, 32> baseSlotBytes = {0};
      // Encode mapping_base_slot into the lower 8 bytes (big-endian)
      for (uint8_t i = 0; i < 8; i++) {
          baseSlotBytes[31 - i] = static_cast<uint8_t>((mapping_base_slot >> (i * 8)) & 0xFF);
      }
      
      // Concatenate the two 32-byte arrays into a 64-byte vector.
      std::vector<uint8_t> buf(64, 0);
      std::copy(reqIdBytes.begin(), reqIdBytes.end(), buf.begin());
      std::copy(baseSlotBytes.begin(), baseSlotBytes.end(), buf.begin() + 32);
      
      // Compute Keccak-256 on the 64-byte buffer.
      // (This assumes you have a keccak_256 function that accepts a std::vector<uint8_t>
      // and returns a std::array<uint8_t,32>.)
      std::array<uint8_t, 32> hash = keccak_256(buf);
      
    // Construct the raw base key.
    eosio::checksum256 base = eosio::checksum256(hash);
    
    // Add a fixed offset so that the computed key points to the actual stored data.
    return base;
  }

  // Converts a uint256_t to a 32-byte array
  inline std::array<uint8_t, 32> uint256ToBytes(const uint256_t& value) {
      std::array<uint8_t, 32> out = {0};
      // This writes the full 32 bytes in big‑endian order.
      intx::be::unsafe::store(out.data(), value);
      return out;
  }

} // namespace bridge_evm