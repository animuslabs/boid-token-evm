// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Bridgeable} from "./IERC20Bridgeable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// Define the RequestStatus enum
enum RequestStatus { Pending, Completed, Failed, Refunded }

contract TokenBridge is Ownable, ReentrancyGuard {

    // explicit left-alignment
    function _leftAlignToBytes32(string memory source) internal pure returns (bytes32 result) {
        require(bytes(source).length <= 32, "String exceeds 32 bytes");
        // This copies up to 32 bytes into a bytes32, left-aligned with trailing zeros
        assembly {
            result := mload(add(source, 32))
        }
    }
    function bytes32ToString(bytes32 _bytes32) public pure returns (string memory) {
        uint256 charCount = 0;
        while (charCount < 32 && _bytes32[charCount] != 0) {
            charCount++;
        }
        bytes memory bytesArray = new bytes(charCount);
        for (uint256 i = 0; i < charCount; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }

    // ------------------------------------------------------------------
    //  Events
    // ------------------------------------------------------------------
    event BridgeTransaction(
        address indexed receiver,
        address indexed token,
        uint amount,
        RequestStatus status,
        uint256 timestamp,
        string sender,
        string from_token_contract,
        string from_token_symbol,
        string reason
    );

    event ValidationStatus(
        string message,
        address token,
        address receiver,
        uint amount,
        string sender,
        string from_token_contract,
        string from_token_symbol,
        uint256 timestamp
    );

    event RequestStatusCallback(
        uint indexed id,
        address indexed sender,
        string antelope_token_contract,
        string antelope_symbol,
        uint amount,
        string receiver,
        RequestStatus status,
        uint256 timestamp,
        string reason
    );

    event BridgeRequest(
        uint indexed id,
        address indexed sender,
        address token,
        string antelope_token_contract,
        string antelope_symbol,
        uint amount,
        string receiver,
        uint256 timestamp,
        string memo,
        RequestStatus status,
        string reason
    );

    event RequestRemovalSuccess(
        uint indexed id,
        address indexed sender,
        uint256 timestamp,
        string message
    );
    event FailedRequestCleared(
        uint indexed id,
        address indexed sender,
        uint256 timestamp
    );

    // ------------------------------------------------------------------
    //  State
    // ------------------------------------------------------------------
    address public evm_approvedToken;
    address public antelope_bridge_evm_address;
    uint public fee;
    uint8 public max_requests_per_requestor;

    // The three fields storing "left-aligned ASCII" in bytes32
    bytes32 public antelope_token_contract;
    bytes32 public antelope_token_name;
    bytes32 public antelope_symbol;  
    uint8 public constant evm_decimals = 18;  // OFT tokens always use 18 decimals

    struct Request {
        uint id;
        address sender;
        uint amount;
        uint requested_at;
        bytes32 antelope_token_contract;
        bytes32 antelope_symbol;
        bytes32 receiver;
        uint8 evm_decimals;
        RequestStatus status;
        bytes32 memo;
    }
    Request[] public requests;

    uint public constant REQUEST_TIMEOUT = 1 hours;
    
    mapping(address => uint) public request_counts;

    uint request_id;
    uint public min_amount;

    constructor(
        address initialOwner,
        address _antelope_bridge_evm_address,
        address _evm_approvedToken,
        uint8 _max_requests_per_requestor,
        uint _fee,
        uint _min_amount,
        string memory _antelope_token_contract,
        string memory _antelope_token_name,
        string memory _antelope_symbol
        ) Ownable(initialOwner) {
        antelope_bridge_evm_address = _antelope_bridge_evm_address;
        evm_approvedToken = _evm_approvedToken;
        max_requests_per_requestor = _max_requests_per_requestor;
        fee = _fee;
        min_amount = _min_amount;

        // The three fields storing "left-aligned ASCII" in bytes32
        antelope_token_contract = _leftAlignToBytes32(_antelope_token_contract);
        antelope_token_name = _leftAlignToBytes32(_antelope_token_name);
        antelope_symbol = _leftAlignToBytes32(_antelope_symbol);
        request_id = 0;
    }

    modifier onlyAntelopeBridge() {
        require(
            antelope_bridge_evm_address == msg.sender,
            "Only the Antelope bridge EVM address can trigger this method !"
        );
        _;
    }

    // ----------------------------------------------------------
    //  SETTERS
    // ----------------------------------------------------------
     function setFee(uint _fee) external onlyOwner {
        fee = _fee;
     }

     function setMaxRequestsPerRequestor(uint8 _max_requests_per_requestor) external onlyOwner {
        max_requests_per_requestor = _max_requests_per_requestor;
     }

     function setAntelopeBridgeEvmAddress(address _antelope_bridge_evm_address) external onlyOwner {
        antelope_bridge_evm_address = _antelope_bridge_evm_address;
     }

     function setTokenInfo(
        address _evm_approvedToken,
        string calldata _antelope_token_contract,
        string calldata _antelope_token_name,
        string calldata _antelope_symbol) external onlyOwner {
        evm_approvedToken = _evm_approvedToken;
        antelope_token_contract = _leftAlignToBytes32(_antelope_token_contract);
        antelope_token_name = _leftAlignToBytes32(_antelope_token_name);
        antelope_symbol = _leftAlignToBytes32(_antelope_symbol);
    }

    // ----------------------------------------------------------
    //  Internal Helper Functions
    // ----------------------------------------------------------
    /// @notice Removes a request from storage by swapping with the last element.
    function _removeRequest(uint i) internal {
        address sender = requests[i].sender;
        requests[i] = requests[requests.length - 1];
        requests.pop();
        request_counts[sender]--;
     }

    // ----------------------------------------------------------
    //  Main Bridge Functions
    // ----------------------------------------------------------
    /// @notice Called by the Antelope bridge to mark a request as successful.
    function requestSuccessful(uint id) external onlyAntelopeBridge nonReentrant {
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].id == id) {
                require(requests[i].status == RequestStatus.Pending, "Request not in pending state");
                requests[i].status = RequestStatus.Completed;
                
                emit RequestStatusCallback(
                    id,
                    requests[i].sender,
                    bytes32ToString(requests[i].antelope_token_contract),
                    bytes32ToString(requests[i].antelope_symbol),
                    requests[i].amount,
                    bytes32ToString(requests[i].receiver),
                    RequestStatus.Completed,
                    block.timestamp,
                    "Request Success"
                );
                
                _removeRequest(i);
                emit RequestRemovalSuccess(id, requests[i].sender, block.timestamp, "Request successfully removed after successful request");
                break;
            }
        }
    }

    /// @notice Manually remove a request by id (only callable by the bridge).
    function removeRequest(uint id) external onlyAntelopeBridge nonReentrant returns (bool) {
        for (uint i = 0; i < requests.length; i++) {
            if (requests[i].id == id) {
                _removeRequest(i);
                return true;
            }
        }
        return false;
    }

    /// @notice Allows manual cleanup of requests marked as Failed.
    /// Both the owner and the Antelope bridge can trigger this.
    function clearFailedRequests() external onlyAntelopeBridge nonReentrant {
        uint i = 0;
        while (i < requests.length) {
            // Only remove requests that are in the Failed state.
            if (requests[i].status == RequestStatus.Failed) {
                emit FailedRequestCleared(requests[i].id, requests[i].sender, block.timestamp);
                _removeRequest(i);
                emit RequestRemovalSuccess(requests[i].id, requests[i].sender, block.timestamp, "Request successfully removed after failed request");
                continue;
            }
            i++;
        }
    }

    /// @notice Called by the Antelope bridge to mint tokens on the EVM side after a cross-chain transfer.
    /// If minting fails, the event is emitted with a Failed status.
    function bridgeTo(
        address token, 
        address receiver, 
        uint amount, 
        bytes32 sender
    ) external onlyAntelopeBridge nonReentrant{
        if (evm_approvedToken == address(0)) {
            emit ValidationStatus(
                "Approved token is not set", token, receiver, amount, bytes32ToString(sender),
                bytes32ToString(antelope_token_contract), bytes32ToString(antelope_symbol), block.timestamp);
            revert("Approved token is not set");
        }
        if (evm_approvedToken != token) {
            emit ValidationStatus(
                "Token is not the approved token", token, receiver, amount, bytes32ToString(sender),
                bytes32ToString(antelope_token_contract), bytes32ToString(antelope_symbol), block.timestamp);
            revert("Token is not the approved token");
        }

        emit ValidationStatus(
            "Validation successful", token, receiver, amount, bytes32ToString(sender),
            bytes32ToString(antelope_token_contract), bytes32ToString(antelope_symbol), block.timestamp);

        try IERC20Bridgeable(evm_approvedToken).mint(receiver, amount) {
            emit BridgeTransaction(
                receiver, 
                evm_approvedToken, 
                amount, 
                RequestStatus.Completed,
                block.timestamp, 
                bytes32ToString(sender),
                bytes32ToString(antelope_token_contract),
                bytes32ToString(antelope_symbol),
                "Bridging confirmed"
            );
        } catch {
            emit BridgeTransaction(
                receiver, 
                evm_approvedToken, 
                amount, 
                RequestStatus.Failed, 
                block.timestamp, 
                bytes32ToString(sender),
                bytes32ToString(antelope_token_contract),
                bytes32ToString(antelope_symbol),
                "Minting failed"
            );
        }
    }

    /// @notice Initiates a bridge request by burning tokens on the EVM side.
    /// The corresponding mint on the Antelope side will be triggered later.
    function bridge(
        IERC20Bridgeable token,
        uint amount,
        string calldata receiver,
        string calldata memo
    ) external payable nonReentrant {
        // Checks
        require(msg.value == fee, "Needs exact TLOS fee passed");
        require(request_counts[msg.sender] < max_requests_per_requestor, "Maximum requests reached. Please wait for them to complete before trying again.");
        require(bytes(receiver).length > 0, "Receiver must be at least 1 character");
        require(bytes(receiver).length <= 13, "Receiver name cannot be over 13 characters");
        require(bytes(memo).length <= 32, "Memo cannot be longer than 32 characters");
        require(amount >= min_amount, "Minimum amount is not reached");
        require(address(token) == evm_approvedToken, "Wrong token!");

        // Convert from 18 decimals (EVM) to 4 decimals (Antelope)
        uint exponent = 10**14;  // 18 - 4 = 14
        uint sanitized_amount = amount / exponent;
        require(sanitized_amount * exponent == amount, "Amount must not have more decimal places than the Antelope token");

        // Enforce sanitized amount under C++ uint64_t max (for Antelope transfer)
        require(sanitized_amount <= 1000000000, "Amount is too high to bridge");

        // Check allowance is ok
        uint remaining = token.allowance(msg.sender, address(this));
        require(remaining >= amount, "Allowance is too low");

        // Send fee to the antelope bridge evm address (for the callback, removal of request, ...)
        Address.sendValue(payable(antelope_bridge_evm_address), msg.value);

        // Convert to bytes32
        bytes32 receiver_32 = _leftAlignToBytes32(receiver);
        bytes32 memo_32     = _leftAlignToBytes32(memo);

        // Burn it
        try token.burnFrom(msg.sender, amount) {
            // Add a request to be picked up and processed by the Antelope side
            requests.push(Request(
                request_id, msg.sender,
                amount,
                block.timestamp,
                antelope_token_contract,
                antelope_symbol,
                receiver_32,
                evm_decimals,
                RequestStatus.Pending,
                memo_32
            ));
            
            emit BridgeRequest(
                request_id,
                msg.sender,
                address(token),
                bytes32ToString(antelope_token_contract),
                bytes32ToString(antelope_symbol),
                amount,
                bytes32ToString(receiver_32),
                block.timestamp,
                bytes32ToString(memo_32),
                RequestStatus.Pending,
                "Request submitted."
            );
            
            request_id++;
            request_counts[msg.sender]++;
        } catch {
            // Burning failed... Nothing to do but revert...
            emit BridgeRequest(
                request_id,
                msg.sender,
                address(token),
                bytes32ToString(antelope_token_contract),
                bytes32ToString(antelope_symbol),
                amount,
                bytes32ToString(receiver_32),
                block.timestamp,
                bytes32ToString(memo_32),
                RequestStatus.Failed,
                "Tokens could not be burned"
            );
            revert('Tokens could not be burned');
        }
    }

    // ----------------------------------------------------------
    //  Refund Functions
    // ----------------------------------------------------------
    /// @notice Called by a user to refund a timed-out request.
    /// The function mints tokens back to the original sender.
    function refundRequest(uint id) external nonReentrant {
        // Loop through stored requests to find the matching request id.
        for (uint256 i = 0; i < requests.length; i++) {
            if (requests[i].id == id) {
                // Only the original sender can trigger a refund.
                require(requests[i].sender == msg.sender, "Not request sender");
                // Request must be pending.
                require(requests[i].status == RequestStatus.Pending, "Request is not pending");
                // Ensure the request has timed out.
                require(block.timestamp >= requests[i].requested_at + REQUEST_TIMEOUT, "Request not timed out yet");

                // Attempt to refund by minting tokens back to the request sender.
                try IERC20Bridgeable(evm_approvedToken).mint(requests[i].sender, requests[i].amount) {
                    emit BridgeRequest(
                        id,
                        requests[i].sender,
                        evm_approvedToken,
                        bytes32ToString(requests[i].antelope_token_contract),
                        bytes32ToString(requests[i].antelope_symbol),
                        requests[i].amount,
                        bytes32ToString(requests[i].receiver),
                        block.timestamp,
                        "",
                        RequestStatus.Refunded,
                        "User initiated refund"
                    );
                    // Store sender before removal.
                    address reqSender = requests[i].sender;
                    _removeRequest(i);
                    emit RequestRemovalSuccess(id, reqSender, block.timestamp, "Request successfully removed after user initiated refund");
                    return;
                } catch {
                    revert("Refund minting failed");
                }
            }
        }
        revert("Request not found");
    }

    /// @notice Called by the Antelope bridge to auto-refund timed-out requests.
    /// If minting fails, the request is marked as Failed.
    function refundStuckReq() external onlyAntelopeBridge nonReentrant {
        uint256 i = 0;
        while (i < requests.length) {
            Request storage req = requests[i];
            if (req.status == RequestStatus.Pending && block.timestamp >= req.requested_at + REQUEST_TIMEOUT) {
                try IERC20Bridgeable(evm_approvedToken).mint(req.sender, req.amount) {
                    emit BridgeRequest(
                        req.id,
                        req.sender,
                        evm_approvedToken,
                        bytes32ToString(req.antelope_token_contract),
                        bytes32ToString(req.antelope_symbol),
                        req.amount,
                        bytes32ToString(req.receiver),
                        block.timestamp,
                        "",
                        RequestStatus.Refunded,
                        "Refund triggered by the TokenBridge"
                    );
                    // Store necessary values before removing the request.
                    address reqSender = req.sender;
                    uint idTemp = req.id;
                    _removeRequest(i); // Removes the current request (swaps last element in place)
                    emit RequestRemovalSuccess(idTemp, reqSender, block.timestamp, "Request successfully removed after auto-refund");
                    continue; // Skip incrementing i since array size decreases.
                } catch {
                    // Mark this request as "Failed" so that it is skipped in future iterations.
                    req.status = RequestStatus.Failed;
                }
            }
            i++;
        }
    }
}
