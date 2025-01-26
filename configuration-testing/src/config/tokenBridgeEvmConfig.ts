import { ethers } from "ethers";
import { getEthersConfig } from "src/config/configEVM";
import { getEnvData } from "src/env";
import { TokenBridge__factory } from "src/types/TokenBridgeEVM/factories/TokenBridge__factory";
import { TokenBridge } from "src/types/TokenBridgeEVM/TokenBridge";

const network = "testnet"; // or "mainnet"
const env = getEnvData(network);

const gasLimit = BigInt(8000000);
console.log(`Gas limit: ${gasLimit}`);

// Function to request registration
async function setTokenInfoAction(
  network: "mainnet" | "testnet",
  contractAddress: string,
) {
  // Get the ethers configuration for the specified network
  const { provider, wallet } = getEthersConfig(network);

  console.log(`Wallet address: ${wallet.address}`);

  // Log wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Wallet balance: ${ethers.formatEther(balance)} TLOS`);

  // Use the factory to create a typed contract instance
  const contract: TokenBridge = TokenBridge__factory.connect(contractAddress, wallet);  

  try {
    // Call the requestRegistration function
    const tx = await contract.setTokenInfo(
      env.TOKEN_CONTRACT_DEPLOYED,
      env.TOKEN_CONTRACT_NAME,
      env.TOKEN_NAME,
      env.TOKEN_SYMBOL
    );

    console.log("Transaction sent. Waiting for confirmation...");

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    console.log("Transaction confirmed:", receipt);
    if (receipt) {
      console.log("Transaction Hash:", receipt.hash);
    } else {
      console.error("Transaction receipt is null");
    }
  } catch (error) {
    console.error("Error during transaction:", error);
  }
}

// Define the interface for the request response
interface BridgeRequest {
  index: number;
  id: string;
  sender: string;
  amount: string;
  requested_at: Date;
  antelope_token_name: string;
  antelope_symbol: string;
  receiver: string;
  evm_decimals: number;
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
    // Log for visibility
    console.log("\nRequest Details:");
    console.log(`Index: ${index}`);
    console.log(`Request ID: ${request.id.toString()}`);
    console.log(`Sender: ${request.sender}`);
    console.log(`Amount: ${request.amount.toString()}`);
    console.log(`Requested at: ${new Date(Number(request.requested_at) * 1000).toLocaleString()}`);
    console.log(`Antelope Token Name: ${request.antelope_token_name}`);
    console.log(`Antelope Symbol: ${request.antelope_symbol}`);
    console.log(`Receiver: ${request.receiver}`);
    console.log(`EVM Decimals: ${Number(request.evm_decimals)}`);
    
    // Return structured data
    return {
      index,
      id: request.id.toString(),
      sender: request.sender,
      amount: request.amount.toString(),
      requested_at: new Date(Number(request.requested_at) * 1000),
      antelope_token_name: request.antelope_token_name,
      antelope_symbol: request.antelope_symbol,
      receiver: request.receiver,
      evm_decimals: Number(request.evm_decimals)
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
    // Log for visibility
    console.log("\nRefund Details:");
    console.log(`Index: ${index}`);
    console.log(`Refund ID: ${refund.id.toString()}`);
    console.log(`Amount: ${refund.amount.toString()}`);
    console.log(`Antelope Token Name: ${refund.antelope_token_name}`);
    console.log(`Antelope Symbol: ${refund.antelope_symbol}`);
    console.log(`Receiver: ${refund.receiver}`);
    console.log(`EVM Decimals: ${Number(refund.evm_decimals)}`);
    
    // Return structured data
    return {
      index,
      id: refund.id.toString(),
      amount: refund.amount.toString(),
      antelope_token_name: refund.antelope_token_name,
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
  const network = "mainnet";
  const contractAddress = env.TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS not found in environment variables");
    return;
  }

  console.log("Checking TokenBridge status...");
  const result = await queryAllRequestsAndRefunds(network, contractAddress, 100);
  console.log(result);
})();