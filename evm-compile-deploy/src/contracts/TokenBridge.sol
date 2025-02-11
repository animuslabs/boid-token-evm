// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Bridgeable} from "./IERC20Bridgeable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

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
        uint indexed id,
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
    // Mapping from request id to Request
    mapping(uint => Request) public requests;
    // An array to hold active request ids for iteration
    uint[] public activeRequestIds;
    // Mapping from request id to its index in activeRequestIds
    mapping(uint => uint) private activeRequestIndex;
    // Unique request id counter – always increases
    uint public request_id;

    uint public constant REQUEST_TIMEOUT = 30 minutes;
    mapping(address => uint) public request_counts;
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
        request_id = 1; // this is the first request id - IMPORTANT NOT TO BE 0
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

     function setMinAmount(uint _min_amount) external onlyOwner {
        min_amount = _min_amount;
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
    /// @notice Removes a request by its id from storage.
    /// @dev Returns the sender so that request_counts can be adjusted.
    function _removeRequest(uint id) internal returns (address sender) {
        Request storage req = requests[id];
        sender = req.sender;
        // Swap the id with the last id in activeRequestIds
        uint index = activeRequestIndex[id];
        uint lastId = activeRequestIds[activeRequestIds.length - 1];
        activeRequestIds[index] = lastId;
        activeRequestIndex[lastId] = index;
        activeRequestIds.pop();
        delete activeRequestIndex[id];
        delete requests[id];
    }

    // ----------------------------------------------------------
    //  Main Bridge Functions
    // ----------------------------------------------------------
    /// @notice Called by the Antelope bridge to mark a request as successful.
    function requestSuccessful(uint id) external onlyAntelopeBridge nonReentrant {
        Request storage req = requests[id];
        require(req.status == RequestStatus.Pending, "Request not pending");
        req.status = RequestStatus.Completed;
        
        emit RequestStatusCallback(
            id,
            req.sender,
            bytes32ToString(req.antelope_token_contract),
            bytes32ToString(req.antelope_symbol),
            req.amount,
            bytes32ToString(req.receiver),
            RequestStatus.Completed,
            block.timestamp,
            "Request Success"
        );
        
        address reqSender = _removeRequest(id);
        request_counts[reqSender]--;
        emit RequestRemovalSuccess(id, reqSender, block.timestamp, "Request successfully removed after successful request");
    }

    /// @notice Manually remove a request by id (only callable by the bridge).
    function removeRequest(uint id) external onlyAntelopeBridge nonReentrant returns (bool) {
        if (requests[id].id != id) {
            return false;
        }
        address reqSender = _removeRequest(id);
        request_counts[reqSender]--;
        emit RequestRemovalSuccess(id, reqSender, block.timestamp, "Request manually removed by bridge");
        return true;
    }

    /// @notice Allows manual cleanup of requests marked as Failed.
    /// Both the owner and the Antelope bridge can trigger this.
    function clearFailedRequests() external nonReentrant {
        require(msg.sender == antelope_bridge_evm_address || msg.sender == owner(), "Caller is not owner or Antelope bridge");
        uint i = 0;
        while (i < activeRequestIds.length) {
            uint id = activeRequestIds[i];
            Request storage req = requests[id];
            if (req.status == RequestStatus.Failed) {
                emit FailedRequestCleared(req.id, req.sender, block.timestamp);
                address reqSender = _removeRequest(id);
                request_counts[reqSender]--;
                emit RequestRemovalSuccess(req.id, reqSender, block.timestamp, "Request successfully removed after failed request");
                // Do not increment i because the last element was swapped in.
            } else {
                i++;
            }
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
                request_id,
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
                request_id,
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
        require(bytes(receiver).length <= 12, "Receiver name cannot be over 12 characters");
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

        // Burn tokens from sender.
        try token.burnFrom(msg.sender, amount) {
            // Create and store the new request.
            Request memory newReq = Request({
                id: request_id,
                sender: msg.sender,
                amount: amount,
                requested_at: block.timestamp,
                antelope_token_contract: antelope_token_contract,
                antelope_symbol: antelope_symbol,
                receiver: receiver_32,
                evm_decimals: evm_decimals,
                status: RequestStatus.Pending,
                memo: memo_32
            });
            requests[request_id] = newReq;
            activeRequestIndex[request_id] = activeRequestIds.length;
            activeRequestIds.push(request_id);

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
            revert("Tokens could not be burned");
        }
    }

    // ----------------------------------------------------------
    //  Refund Functions
    // ----------------------------------------------------------
    /// @notice Called by a user to refund a timed-out request.
    /// The function mints tokens back to the original sender.
    function refundRequest(uint id) external nonReentrant {
        Request storage req = requests[id];
        require(req.sender == msg.sender, "Not request sender");
        require(req.status == RequestStatus.Pending, "Request is not pending");
        require(block.timestamp >= req.requested_at + REQUEST_TIMEOUT, "Request not timed out yet");

        try IERC20Bridgeable(evm_approvedToken).mint(req.sender, req.amount) {
            emit BridgeTransaction(
                id,
                req.sender,
                evm_approvedToken,
                req.amount,
                RequestStatus.Refunded,
                block.timestamp,
                "",
                bytes32ToString(req.antelope_token_contract),
                bytes32ToString(req.antelope_symbol),
                "User initiated refund"
            );
            address reqSender = _removeRequest(id);
            request_counts[reqSender]--;
            emit RequestRemovalSuccess(id, reqSender, block.timestamp, "Request successfully removed after user initiated refund");
        } catch {
            revert("Refund minting failed");
        }
    }

    /// @notice Called by the Antelope bridge to auto-refund timed-out requests.
    /// If minting fails, the request is marked as Failed.
    function refundStuckReq() external nonReentrant {
        require(msg.sender == antelope_bridge_evm_address || msg.sender == owner(), "Caller is not owner or Antelope bridge");
        uint i = 0;
        while (i < activeRequestIds.length) {
            uint id = activeRequestIds[i];
            Request storage req = requests[id];
            if (req.status == RequestStatus.Pending && block.timestamp >= req.requested_at + REQUEST_TIMEOUT) {
                try IERC20Bridgeable(evm_approvedToken).mint(req.sender, req.amount) {
                    emit BridgeTransaction(
                        req.id,
                        req.sender,
                        evm_approvedToken,
                        req.amount,
                        RequestStatus.Refunded,
                        block.timestamp,
                        "",
                        bytes32ToString(req.antelope_token_contract),
                        bytes32ToString(req.antelope_symbol),
                        "Refund triggered by the TokenBridge"
                    );
                    address reqSender = _removeRequest(id);
                    request_counts[reqSender]--;
                    emit RequestRemovalSuccess(req.id, reqSender, block.timestamp, "Request successfully removed after auto-refund");
                    // Do not increment i because we swapped in the last element.
                } catch {
                    req.status = RequestStatus.Failed;
                    address reqSender = _removeRequest(id);
                    request_counts[reqSender]--;
                    emit RequestRemovalSuccess(req.id, reqSender, block.timestamp, "Request removed after failed auto-refund");
                    // Do not increment i because we swapped in the last element.
                }
            } else {
                i++;
            }
        }
    }
}
