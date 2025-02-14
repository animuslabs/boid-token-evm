# Native Fees Contract

This contract, named `feeForwarder`, is designed to work in tandem with the token bridge contract by managing fee payments required for token bridging and forwarding the bridged tokens. Below is a high-level overview of its core components and functionality:

## 1. Global Configuration

### Global Settings
The contract stores a single configuration row (with a fixed ID) that defines:
- **Fee:** The required fee amount that must be paid to initiate a bridging transaction.
- **Fee Token Details:** The contract and symbol of the token used for fees.
- **Bridge Account:** The account to which bridged tokens are ultimately forwarded.
- **EVM Memo:** A memo string (which must be a valid Ethereum address) that accompanies bridged token transfers.
- **Fee Receiver:** An account designated to receive any extra (or released) fee tokens.

**Action (`setglobal`):**  
This action is used by the contract owner to set or update these global parameters. It performs various checks to ensure the validity of the fee token, the bridge account, and the format of the EVM memo.

## 2. Bridging Token Configuration

### Token Configuration Table
A multi-index table maintains configurations for each token allowed to be bridged. For each token, it stores:
- **Token Contract:** The contract managing the token.
- **Token Symbol:** The token's symbol.
- **Minimum Bridging Amount:** The smallest amount allowed for a bridge transfer.

**Actions (`regtoken` and `deltoken`):**
- **regtoken:** Registers or updates a token's configuration.
- **deltoken:** Deletes a token configuration if needed.

Both actions are restricted to the contract owner.

## 3. Fee Management

### Fee Records Table
This table tracks fee payments made by users. Each fee record contains:
- **User:** The payer's account.
- **Amount:** The fee amount paid.
- **Token Contract:** The contract from which the fee was paid.
- **Timestamp:** When the fee was recorded, which is later used to enforce a refund expiration (e.g., 30 days).

**Action (`claimrefund`):**  
Users can claim a refund for unused fee records if they haven't been applied to a bridging transaction and if the fee hasn't expired.

## 4. Token Transfers and Notifications

### Notification Handler (`on_transfer`)
This function is triggered for every token transfer to the contract. It distinguishes between two types of transfers:

- **Bridging Token Transfers:**  
  If the token symbol is found in the bridging token configuration table, the transfer is treated as a bridging attempt.

- **Fee Token Transfers:**  
  If the token isn't recognized as a bridging token, it is assumed to be a fee payment.

#### Handling Bridging Token Transfers
When a bridging token is received:
- **Validation:** The contract checks that:
  - The global configuration is set.
  - The transferred amount meets the minimum required for that token.
  - The memo is a valid Ethereum address (42 characters with a "0x" prefix).
  - The transfer originates from the correct token contract.
- **Fee Verification:** It confirms that the user has a valid fee record (i.e., the required fee was previously paid) and that the fee amount matches the global fee.
- **Forwarding:** The bridging tokens are forwarded to the designated bridge account along with the EVM memo.
- **Cleanup:** The fee record is removed, and the contract checks for any expired fee records. It calculates any available free fee tokens and auto-forwards them to the fee receiver.

#### Handling Fee Transfers
When a fee token is received:
- **Record Check:** It ensures the user does not already have a pending fee record.
- **Global Validation:** The contract verifies that the transfer comes from the correct fee token contract and that the amount exactly matches the required fee.
- **Recording:** A new fee record is created for the user, marking that they have paid the fee required for bridging.

## Summary

In essence, the `feeForwarder` contract enforces that users pay a specific fee before initiating a token bridging transaction. It distinguishes between bridging token transfers and fee token transfers via a notification handler, ensures fee records are valid and up-to-date, and then forwards valid bridging tokens to a predetermined bridge account (which is used by the token bridge contract). Additionally, it provides a mechanism for users to reclaim their fee if it isn't used within a given timeframe, as well as functionality to manage and clean up fee records.

This design ensures a secure and automated fee-handling process that integrates seamlessly with the token bridge mechanism.