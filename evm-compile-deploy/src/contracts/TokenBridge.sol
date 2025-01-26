// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20Bridgeable} from "./IERC20Bridgeable.sol";

contract TokenBridge is Ownable {

    event BridgeToAntelopeRequested(uint request_id, address indexed sender, address indexed evm_approvedToken, string antelope_token_name, uint amount, string recipient);
    event BridgeToAntelopeSucceeded(uint request_id, address indexed sender, string antelope_token_name, uint amount, string recipient);
    event BridgeFromAntelopeSucceeded(address indexed recipient, address indexed evm_approvedToken, uint amount);
    event BridgeFromAntelopeFailed(address indexed recipient, address indexed evm_approvedToken, uint amount, string refund_account);
    event BridgeFromAntelopeRefunded(uint refund_id);
    event RequestStatusUpdated(uint indexed request_id, RequestStatus status);
    event RefundStatusUpdated(uint indexed refund_id, RequestStatus status);
    event RequestRetryAttempted(uint indexed request_id, uint attempt);
    event RefundRetryAttempted(uint indexed refund_id, uint attempt);

    address public evm_approvedToken;
    address public antelope_bridge_evm_address;
    uint public fee;
    uint8 public max_requests_per_requestor;
    string public antelope_token_contract;
    string public antelope_token_name;
    string public antelope_symbol;    
    uint8 public constant evm_decimals = 18;  // OFT tokens always use 18 decimals

    enum RequestStatus { Pending, Completed, Failed }

    struct Request {
        uint id;
        address sender;
        uint amount;
        uint requested_at;
        string antelope_token_name;
        string antelope_symbol;
        string receiver;
        uint8 evm_decimals;
        RequestStatus status;
        uint lastAttempt;
    }

    struct Refund {
        uint id;
        uint amount;
        string antelope_token_name;
        string antelope_symbol;
        string receiver;
        uint8 evm_decimals;
        RequestStatus status;
        uint lastAttempt;
    }

    Request[] public requests;
    Refund[] public refunds;

    uint public constant REQUEST_TIMEOUT = 1 hours;
    uint public constant MAX_RETRY_ATTEMPTS = 3;
    
    mapping(address => uint) public request_counts;
    mapping(uint => uint) public requestAttempts;
    mapping(uint => uint) public refundAttempts;
    uint request_id;
    uint refund_id;
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
        antelope_token_contract = _antelope_token_contract;
        antelope_token_name = _antelope_token_name;
        antelope_symbol = _antelope_symbol;
        request_id = 0;
        refund_id = 0;
    }

    modifier onlyAntelopeBridge() {
        require(
            antelope_bridge_evm_address == msg.sender,
            "Only the Antelope bridge EVM address can trigger this method !"
        );
        _;
    }

     // SETTERS  ================================================================ >
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
        antelope_token_contract = _antelope_token_contract;
        antelope_token_name = _antelope_token_name;
        antelope_symbol = _antelope_symbol;
    }

     // MAIN   ================================================================ >
     // SUCCESS ANTELOPE CALLBACK
     function requestSuccessful(uint id) external onlyAntelopeBridge {
        for(uint i = 0; i < requests.length; i++){
            if(requests[i].id == id){
                require(requests[i].status == RequestStatus.Pending, "Request not in pending state");
                requests[i].status = RequestStatus.Completed;
                emit RequestStatusUpdated(id, RequestStatus.Completed);
                emit BridgeToAntelopeSucceeded(id, requests[i].sender, requests[i].antelope_token_name, requests[i].amount, requests[i].receiver);
                _removeRequest(i);
                break;
            }
        }
     }

     // REFUND ANTELOPE CALLBACK
     function refundSuccessful(uint id) external onlyAntelopeBridge {
        bool found = false;
        for(uint i = 0; i < refunds.length; i++){
            if(refunds[i].id == id){
                require(!found, "Refund already processed");
                require(refunds[i].status == RequestStatus.Pending, "Refund not in pending state");
                found = true;
                refunds[i].status = RequestStatus.Completed;
                emit RefundStatusUpdated(id, RequestStatus.Completed);
                refunds[i] = refunds[refunds.length - 1];
                refunds.pop();
                emit BridgeFromAntelopeRefunded(id);
            }
        }
        require(found, "Refund not found");
     }

     function retryFailedRequests() external {
        for(uint i = 0; i < requests.length; i++) {
            if(requests[i].status == RequestStatus.Failed && 
               block.timestamp >= requests[i].lastAttempt + REQUEST_TIMEOUT &&
               requestAttempts[requests[i].id] < MAX_RETRY_ATTEMPTS) {
                
                requests[i].status = RequestStatus.Pending;
                requests[i].lastAttempt = block.timestamp;
                requestAttempts[requests[i].id]++;
                
                emit RequestRetryAttempted(requests[i].id, requestAttempts[requests[i].id]);
                emit RequestStatusUpdated(requests[i].id, RequestStatus.Pending);
            }
        }
     }

     function retryFailedRefunds() external {
        for(uint i = 0; i < refunds.length; i++) {
            if(refunds[i].status == RequestStatus.Failed && 
               block.timestamp >= refunds[i].lastAttempt + REQUEST_TIMEOUT &&
               refundAttempts[refunds[i].id] < MAX_RETRY_ATTEMPTS) {
                
                refunds[i].status = RequestStatus.Pending;
                refunds[i].lastAttempt = block.timestamp;
                refundAttempts[refunds[i].id]++;
                
                emit RefundRetryAttempted(refunds[i].id, refundAttempts[refunds[i].id]);
                emit RefundStatusUpdated(refunds[i].id, RequestStatus.Pending);
            }
        }
     }

     function _removeRequest(uint i) internal {
        address sender = requests[i].sender;
        requests[i] = requests[requests.length - 1];
        requests.pop();
        request_counts[sender]--;
     }

     function removeRequest(uint id) external onlyAntelopeBridge returns (bool) {
        for(uint i = 0; i < requests.length; i++){
            if(requests[i].id == id){
                _removeRequest(i);
                return true;
            }
        }
        return false;
     }

     // FROM ANTELOPE BRIDGE
     function bridgeTo(address token, address receiver, uint amount, string calldata sender) external onlyAntelopeBridge {
        require(evm_approvedToken != address(0), "Approved token is not set");
        require(evm_approvedToken == token, "Token is not the approved token");

        try IERC20Bridgeable(evm_approvedToken).mint(receiver, amount) {
            emit BridgeFromAntelopeSucceeded(receiver, evm_approvedToken, amount);
        } catch {
            // Could not mint for whatever reason... Refund the Antelope tokens
            emit BridgeFromAntelopeFailed(receiver, evm_approvedToken, amount, sender);
            refunds.push(Refund(refund_id, amount, antelope_token_contract, antelope_token_name, sender, evm_decimals, RequestStatus.Pending, block.timestamp));
            refund_id++;
        }
     }

     // TO ANTELOPE
     function bridge(IERC20Bridgeable token, uint amount, string calldata receiver) external payable {
        // Checks
        require(msg.value >= fee, "Needs TLOS fee passed");
        require(request_counts[msg.sender] < max_requests_per_requestor, "Maximum requests reached. Please wait for them to complete before trying again.");
        require(bytes(receiver).length > 0, "Receiver must be at least 1 character");
        require(bytes(receiver).length <= 13, "Receiver name cannot be over 13 characters");
        require(amount >= min_amount, "Minimum amount is not reached");

        // Check token has bridge address
        require(token.bridge() == address(this), "The token bridge address must be set to this contract");

        // Convert from 18 decimals (EVM) to 4 decimals (Antelope BOID)
        uint exponent = 10**14;  // 18 - 4 = 14
        uint sanitized_amount = amount / exponent;
        require(sanitized_amount * exponent == amount, "Amount must not have more decimal places than the Antelope token");

        // Enforce sanitized amount under C++ uint64_t max (for Antelope transfer)
        require(sanitized_amount <= 18446744073709551615, "Amount is too high to bridge");

        // Check allowance is ok
        uint remaining = token.allowance(msg.sender, address(this));
        require(remaining >= amount, "Allowance is too low");

        // Send fee to the antelope bridge evm address (for the callback, removal of request, ...)
        payable(antelope_bridge_evm_address).transfer(msg.value);

        // Burn it
        try token.burnFrom(msg.sender, amount){
            // Add a request to be picked up and processed by the Antelope side
            requests.push(Request (request_id, msg.sender, amount, block.timestamp, antelope_token_name, antelope_symbol, receiver, evm_decimals, RequestStatus.Pending, block.timestamp));
            emit BridgeToAntelopeRequested(request_id, msg.sender, address(token), antelope_token_name, amount, receiver);
            request_id++;
            request_counts[msg.sender]++;
        } catch {
            // Burning failed... Nothing to do but revert...
            revert('Tokens could not be burned');
        }
     }
}
