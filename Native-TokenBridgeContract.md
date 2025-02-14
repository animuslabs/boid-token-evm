# Native Token Bridge Contract

This contract implements a token bridge between Telos Native and Telos EVM. It is built on the Antelope framework and manages the state and flow of token bridging through a series of actions and helper functions. Here's a high-level overview of its core components and functionality:

## Configuration and Storage

- **Bridge Config:**  
  A singleton table holds configuration data (such as the EVM bridge address, token address, chain ID, native token details, fee contract, and a lock flag). This configuration is initialized via the `init` action.

- **Requests Table:**  
  A multi-index table stores token bridge requests. Each request includes fields like the request ID, timestamp, processing status, amount, receiver, sender, and memo. Secondary indexes on processed status and timestamp facilitate efficient lookups and cleanups.

## Helper Functions and Structures

- **KeyCheck Structure & `checkStorageKeys` Function:**  
  These are used to validate that necessary storage keys exist in the EVM state. They help ensure that when the contract reads state from the EVM, all expected keys (like those for token contract and symbol) are present and correct.

- **Utility Functions:**  
  There are functions for encoding/decoding data (e.g., converting between binary and hex, padding addresses) and for preparing data payloads (using RLP encoding) when sending transactions to the EVM.

## Main Actions

- **`init`:**  
  Sets up the contract's configuration. It validates inputs (ensuring valid chain IDs, token symbols, etc.), stores configuration data, and can optionally lock the contract to prevent reinitialization.

- **`bridge` (on transfer notification):**  
  This action is triggered when tokens are transferred to the contract. When successful it will trigger a mint action on the EVM side. The contract:
  - Validates the token transfer (checking token symbol, amount, sender, and memo format).
  - Reads the EVM system's configuration and computes appropriate gas values.
  - Validates the corresponding token state on the EVM by checking that the expected token contract and symbol match what is stored on the EVM.
  - Prepares and sends an EVM transaction (via a low-level raw action) that calls the bridge function on the EVM side.

- **`reqnotify`:**  
  Processes notifications from the EVM when a bridging request is completed. It:
  - Reads and validates various request properties from the EVM storage.
  - Verifies that the request is pending and that the EVM state matches the expected native token contract.
  - Sends an EVM callback to confirm the success of the bridge operation.
  - Creates a corresponding request entry on the native chain to later trigger the token transfer.

- **`verifytrx`:**  
  Verifies and finalizes a bridging transaction:
  - Cleans up old, processed requests older than 24h.
  - Ensures that the request is still pending and that its corresponding state has been cleared on the EVM.
  - Triggers the transfer of native tokens to the receiver on the Antelope side.
  - Marks the request as processed in the local table.

## Emergency and Cleanup Actions

- **`rmreq`:**  
  Allows removal of a request from the table (for emergency use).

- **`refstuckreq`, `clrfailedreq`, `rmreqonevm`:**  
  These actions are provided for emergency scenarios where stuck or failed requests must be addressed. They send specific calls to the EVM (again using the low-level raw action) to refund, clear, or remove problematic requests.

## Interoperability with EVM

- The contract interacts with the EVM system contract by constructing data payloads using RLP encoding.
- It handles nonce and gas price management to ensure that cross-chain transactions are properly sequenced and costed.
- The contract frequently converts addresses and storage keys between different formats (e.g., padded, hexadecimal) to ensure consistency when reading from or writing to EVM storage.

## Summary

In summary, the contract serves as a bridge by validating token transfers on the native chain, communicating with an EVM contract to reflect these operations, and then completing the token transfer process on both sides. It includes robust error checking, state validation, and emergency measures to ensure reliability across the cross-chain token transfer process.