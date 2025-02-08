import { ethers } from "ethers";
import { getEthersConfig } from "src/config/configEVM";
import { getEnvData } from "src/env";
import { TokenBridge__factory } from "src/types/TokenBridgeEVM/factories/TokenBridge__factory";
import { TokenBridge } from "src/types/TokenBridgeEVM/TokenBridge"

const network = "testnet"; // or "mainnet"
const env = getEnvData(network);

const gasLimit = BigInt(8000000);
console.log(`Gas limit: ${gasLimit}`);

/** 
 * Safely parse a bytes32 value (0x....32bytes) into a UTF-8 string.
 * If it's not zero-terminated or has unexpected data, parseBytes32String may throw,
 * so we catch and fallback to returning the raw hex or an empty string.
 */
function parseBytes32ToString(bytes32Val: string): string {
  if (!bytes32Val || bytes32Val === ethers.ZeroHash) {
    return "";
  }
  try {
    // Convert bytes32 to a buffer and then to a string
    const buffer = Buffer.from(bytes32Val.replace(/^0x/, ''), 'hex');
    return buffer.toString('utf8').replace(/\0/g, ''); // Remove null characters
  } catch {
    // Fallback: just return the raw hex if parsing fails
    return bytes32Val;
  }
}

// Define the interface for the request response
interface BridgeRequest {
  index: number;
  id: string;
  sender: string;
  amount: string;
  requested_at: Date;
  antelope_token_contract: string;
  antelope_symbol: string;
  receiver: string;
  evm_decimals: number;
  status: string;
  lastAttempt: number;
  memo: string;
}

// Function to query a specific request
async function queryRequest(
  network: "mainnet" | "testnet",
  contractAddress: string,
  index: number
): Promise<BridgeRequest | null> {
  const { wallet } = getEthersConfig(network);
  const contract: TokenBridge = TokenBridge__factory.connect(contractAddress, wallet);

  try {
    const request = await contract.requests(index);
    if (request.sender === "0x0000000000000000000000000000000000000000") {
      return null; // Skip empty requests
    }
    // Decode the bytes32 fields into strings
    const antelopeTokenContractStr = parseBytes32ToString(request.antelope_token_contract);
    const antelopeSymbolStr        = parseBytes32ToString(request.antelope_symbol);
    const receiverStr              = parseBytes32ToString(request.receiver);
    const memoStr                  = parseBytes32ToString(request.memo);

    // Convert other fields from BigInt => string or number
    const idStr    = request.id.toString();
    const amountStr= request.amount.toString();
    const status   = request.status; // a BigInt for the enum, typically
    const statusNum= (typeof status === "number")
       ? status
       : Number(status); // Convert BigInt to number

    // Log
    console.log(`\nRequest[${index}] =>`);
    console.log(`ID: ${idStr}`);
    console.log(`Sender: ${request.sender}`);
    console.log(`Amount: ${amountStr}`);
    console.log(`Requested At (epoch): ${request.requested_at.toString()}`);
    console.log(`Antelope Token Contract: ${antelopeTokenContractStr}`);
    console.log(`Antelope Symbol: ${antelopeSymbolStr}`);
    console.log(`Receiver: ${receiverStr}`);
    console.log(`EVM Decimals: ${request.evm_decimals}`);
    console.log(`Status: ${statusNum} (0=Pending,1=Completed,2=Failed)`);
    console.log(`Last Attempt: ${request.lastAttempt.toString()}`);
    console.log(`Memo: ${memoStr}`);
    
    // Return structured data
    return {
      index,
      id: request.id.toString(),
      sender: request.sender,
      amount: request.amount.toString(),
      requested_at: new Date(Number(request.requested_at) * 1000),
      antelope_token_contract: request.antelope_token_contract,
      antelope_symbol: request.antelope_symbol,
      receiver: request.receiver,
      evm_decimals: Number(request.evm_decimals),
      status: request.status.toString(),
      lastAttempt: Number(request.lastAttempt),
      memo: request.memo
    };
  } catch (error: any) {
    if (error.message.includes("invalid array access")) {
      return null; // End of array reached
    }
    console.error(`Error querying request at index ${index}:`, error);
    return null;
  }
}

// Function to query a specific refund
async function queryRefund(
  network: "mainnet" | "testnet",
  contractAddress: string,
  index: number
) {
  const { wallet } = getEthersConfig(network);
  const contract: TokenBridge = TokenBridge__factory.connect(contractAddress, wallet);

  try {
    const refund = await contract.refunds(index);
    if (refund.receiver === "") {
      return null; // Skip empty refunds
    }
    // Decode the bytes32 fields
    const contractStr = parseBytes32ToString(refund.antelope_token_contract);
    const symbolStr   = parseBytes32ToString(refund.antelope_symbol);
    const receiverStr = parseBytes32ToString(refund.receiver);

    // Convert others
    const idStr     = refund.id.toString();
    const amountStr = refund.amount.toString();
    const statusNum = Number(refund.status); // Convert BigInt to number

    console.log(`\nRefund[${index}] =>`);
    console.log(`ID: ${idStr}`);
    console.log(`Amount: ${amountStr}`);
    console.log(`Antelope Contract: ${contractStr}`);
    console.log(`Symbol: ${symbolStr}`);
    console.log(`Receiver: ${receiverStr}`);
    console.log(`Sender: ${refund.sender}`);
    console.log(`Decimals: ${refund.evm_decimals}`);
    console.log(`Status: ${statusNum}`);
    console.log(`LastAttempt: ${refund.lastAttempt.toString()}`);
    
    // Return structured data
    return {
      index,
      id: refund.id.toString(),
      amount: refund.amount.toString(),
      antelope_token_contract: refund.antelope_token_contract,
      antelope_symbol: refund.antelope_symbol,
      receiver: refund.receiver,
      evm_decimals: Number(refund.evm_decimals)
    };
  } catch (error: any) {
    if (error.message.includes("invalid array access")) {
      return null; // End of array reached
    }
    console.error(`Error querying refund at index ${index}:`, error);
    return null;
  }
}

// Function to query all requests and refunds
async function queryAllRequestsAndRefunds(
  network: "mainnet" | "testnet",
  contractAddress: string,
  maxItems: number = 100
) {
  console.log(`\nQuerying up to ${maxItems} requests and refunds...`);
  const requests: Array<NonNullable<Awaited<ReturnType<typeof queryRequest>>>> = [];
  const refunds: Array<NonNullable<Awaited<ReturnType<typeof queryRefund>>>> = [];
  
  console.log("\nChecking Requests...");
  for (let i = 0; i < maxItems; i++) {
    const request = await queryRequest(network, contractAddress, i);
    if (request) {
      requests.push(request);
    }
    if (!request && i > 0) break; // Stop if we hit an empty slot after finding some requests
  }
  
  console.log("\nChecking Refunds...");
  for (let i = 0; i < maxItems; i++) {
    const refund = await queryRefund(network, contractAddress, i);
    if (refund) {
      refunds.push(refund);
    }
    if (!refund && i > 0) break; // Stop if we hit an empty slot after finding some refunds
  }
  
  console.log(`\nSummary:`);
  console.log(`- Found ${requests.length} active requests`);
  console.log(`- Found ${refunds.length} pending refunds`);

  return {
    requests,
    refunds,
    summary: {
      activeRequests: requests.length,
      pendingRefunds: refunds.length
    }
  };
}

// Example usage
(async () => {
  const network = "testnet";
  const contractAddress = env.TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS not found in environment variables");
    return;
  }

  console.log("Checking TokenBridge status...");
  const result = await queryAllRequestsAndRefunds(network, contractAddress, 100);
  console.log(result);
})();