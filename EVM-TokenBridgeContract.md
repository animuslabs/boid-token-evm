# Token Bridge Smart Contract

This contract manages transfer requests of a specific token (the "approved token") between Telos EVM and Telos Native.
It relies on a complementary bridging setup on the Antelope side (called the "Antelope bridge"), which triggers mint or burn operations here through specific contract calls.

## Token Minting & Burning

The contract interacts with an IERC20Bridgeable token on the EVM side, which must support mint and burnFrom operations.
When tokens move from EVM to Antelope, the contract burns them on the EVM side.
When tokens move from Antelope to EVM, the contract mints them on the EVM side.

## Request Tracking & Statuses

All bridge operations on the EVM side are encapsulated in "requests," each with a unique, incremental request ID and status (Pending, Completed, Failed, or Refunded).
Active requests are tracked in a mapping requests and an array activeRequestIds for easy management.

# Functions
### _leftAlignToBytes32 Function

**Purpose:**  
This function converts a given string into a bytes32 value by placing the string's characters in the leftmost part of the 32-byte word. Any unused bytes on the right are padded with zeros.

**Key Points:**

- **Input Length Check:**  
  The function first ensures that the input string does not exceed 32 bytes. If it does, it reverts with an error.

- **Assembly Usage:**  
  The function uses inline assembly to efficiently load 32 bytes of data from the memory location of the string. This operation copies the string content into a bytes32 variable, ensuring the characters are left-aligned.

### bytes32ToString Function

**Purpose:**  
This function converts a bytes32 value back into a standard Solidity string.

**Key Points:**

- **Counting Characters:**  
  The function iterates over each byte in the bytes32 value, counting characters until it encounters a zero byte (indicating the end of the string) or reaches 32 bytes.

- **Creating a String:**  
  A new bytes array is allocated with the exact number of non-zero characters, and each character is copied into this array.

- **Conversion:**  
  Finally, the bytes array is converted into a string and returned.

## Setter functions
All these functions are restricted by the onlyOwner modifier, meaning only the contract owner can update these settings  

### **setFee(uint _fee)**:
Updates the fee amount that users must pay when initiating a bridge request. Only the contract owner can call this.

### **setMinAmount(uint _min_amount)**:
Sets the minimum token amount required to initiate a bridge operation. This ensures that very small transfers are not processed.

### **setMaxRequestsPerRequestor(uint8 _max_requests_per_requestor)**:
Defines the maximum number of concurrent bridge requests that a single user (requestor) can have. This helps prevent abuse by limiting pending requests.

### **setAntelopeBridgeEvmAddress(address _antelope_bridge_evm_address)**:
Changes the EVM address that represents the Antelope bridge. This address is allowed to call certain bridge finalization functions.

## **setTokenInfo(...)**:
Updates the token information used by the bridge. It sets:
- The approved token address (_evm_approvedToken) that can be bridged.
- The Antelope token contract, name, and symbol by converting the provided strings into fixed-size bytes32 values using the _leftAlignToBytes32 helper function.

---------------------
## Main functions
### **_removeRequest(uint id)**
This internal function removes a request from storage using the provided request ID. It performs the following steps:
1. Retrieves the request from storage and saves the sender's address.
2. Uses a swap-and-pop method to efficiently remove the request ID from the active request list:
    1. It swaps the request ID with the last element in the activeRequestIds array.
    2. Updates the index mapping for the swapped ID.
    3. Pops the last element to reduce the array size.
3. Deletes the request and its index mapping from storage.
4. Returns the sender's address so that the active request count for that sender can be adjusted.

### **requestSuccessful(uint id)**
This function is used by the Antelope bridge to mark a pending request as successful. It performs the following steps:
1. Retrieves the request by its ID and checks that its status is still pending.
2. Updates the request status to completed.
3. Emits an event to log the status change with relevant request details.
4. Removes the request from storage using a helper function and decrements the sender's active request count.
5. Emits a second event confirming the successful removal of the request.

### **removeRequest(uint id)**
This function enables the Antelope bridge to manually remove a request from storage. It works as follows:

1. It first checks if the request with the given ID exists (by comparing the stored request's ID with the provided ID). If the check fails, it returns false.
2. If the request exists, it calls an internal helper to remove the request from storage.
3. It then decrements the active request count for the sender of the request.
4. An event is emitted to log the successful manual removal of the request.
5. Finally, it returns true to indicate that the removal was successful.

### **clearFailedRequests()**
This function allows the contract owner or the designated Antelope bridge to clean up (remove) all requests that have been marked as failed. It works by iterating through the list of active request IDs. For each request, if its status is "Failed," the function:

1. Emits an event to signal that the failed request is being cleared.
2. Removes the request from storage using the helper function, which also decrements the sender's active request count.
3. Emits another event confirming the successful removal.

The loop is designed to correctly handle the removal process (using a swap-and-pop technique) by not incrementing the index when a removal occurs.

### **function bridgeTo(address token, address receiver, uint amount, bytes32 sender)**
This function is intended to be called by the Antelope bridge to mint tokens on the EVM side following a successful cross-chain transfer. It operates as follows:

Validation Checks:  
It first confirms that the approved token address is set and that the provided token matches this approved token. If either check fails, a validation event is emitted and the function reverts.

Successful Validation:  
If the validations pass, a "Validation successful" event is emitted.

Minting Process:  
The function then attempts to mint the specified amount of tokens to the receiver by calling the mint function on the approved token contract.
If the minting call succeeds, a BridgeTransaction event is emitted with a status of "Completed".
If the minting call fails, a BridgeTransaction event is emitted with a status of "Failed".
The function is restricted to calls from the Antelope bridge and uses a non-reentrant guard to prevent reentrancy attacks.

### **function bridge(IERC20Bridgeable token, uint amount, string calldata receiver, string calldata memo)**
This function initiates a transfer request by burning tokens on the EVM side. It performs the following steps:

1. **Validation Checks:**  
   - Verifies the sender has provided the exact fee.
   - Ensures the sender has not exceeded the maximum allowed active requests.
   - Checks that the receiver’s name is between 1 and 12 characters and that the memo is at most 32 characters.
   - Confirms the transfer amount is above the minimum and that the token being transferred is the approved token.
   - Converts the amount from 18 decimals (EVM) to 4 decimals (Antelope) and ensures it doesn’t exceed a predefined maximum and has the correct decimal precision.
   - Ensures the sender has given sufficient allowance for the token transfer.

2. **Fee Transfer:**  
   - Forwards the fee to the designated Antelope bridge EVM address.

3. **Token Burning and Request Creation:**  
   - Converts the receiver and memo strings into a fixed-size bytes32 format.
   - Attempts to burn the specified token amount from the sender’s balance.
   - If successful, it creates a new request with a pending status, stores it, updates the active requests list, and emits an event signaling the submission.
   - It then increments the global request counter and the sender’s active request count.

4. **Error Handling:**  
   - If token burning fails, an event is emitted with a failed status, and the function reverts the transaction.

Overall, this function securely initiates a bridge request by burning tokens and logging all necessary details for a preparation for minting on the Antelope side.

### **refundStuckReq()**
This function allows a user to refund a bridge request that has timed out. It works as follows:

1. **Validation:**  
   - Confirms that the caller is the original request sender.
   - Checks that the request is still pending.
   - Verifies that the request has exceeded the allowed timeout period. (default is set to 30 min)

2. **Refund Process:**  
   - Attempts to mint the original token amount back to the sender.
   - If successful, it emits an event marking the transaction as "Refunded."

3. **Cleanup:**  
   - The function then removes the request from storage and decreases the sender's active request count.
   - A subsequent event confirms the successful removal of the refunded request.

If the minting fails, the function reverts with an error message.

### **refundStuckReq()**
This function is used by the Antelope bridge or the contract owner to automatically process refunds for requests that have timed out.  
It iterates over the list of active request IDs, and for each request that is still pending and has exceeded the allowed timeout period, it attempts to mint tokens back to the original sender.  
If the minting is successful, the request is marked as refunded, removed from storage, and an event is emitted to log the successful auto-refund.  
If the minting fails, the request is marked as failed, removed from storage, and an event is emitted to record the removal.  
The iteration uses a swap-and-pop method, so when a request is removed, the index is not incremented to ensure that the newly swapped-in element is also checked.