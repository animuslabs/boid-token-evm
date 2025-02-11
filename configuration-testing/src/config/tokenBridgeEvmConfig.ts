import { ethers } from "ethers";
import { getEthersConfig } from "src/config/configEVM";
import { getEnvData } from "src/env";
import { TokenBridge__factory } from "src/types/TokenBridgeEVM/factories/TokenBridge__factory";
import { TokenBridge } from "src/types/TokenBridgeEVM/TokenBridge";

const network = "testnet"; // or "mainnet"
const env = getEnvData(network);
const contractAddress = env.TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS;
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
  id: number;
  sender: string;
  amount: string;
  requested_at: Date;
  antelope_token_contract: string;
  antelope_symbol: string;
  receiver: string;
  evm_decimals: number;
  status: string;
  memo: string;
}

export async function getRecentContractEvents(
  network: "mainnet" | "testnet",
  contractAddress: string,
  hours: number
): Promise<any[]> {
  const { wallet, provider } = getEthersConfig(network);
  const currentBlock = await provider.getBlock("latest");
  if (!currentBlock) {
    throw new Error("Failed to get current block");
  }
  // Adjust the average block time (in seconds) as needed
  const averageBlockTime = 0.5;
  const blocksAgo = Math.floor((hours * 3600) / averageBlockTime);
  const fromBlock = currentBlock.number > blocksAgo ? currentBlock.number - blocksAgo : 0;
  
  // Retrieve all logs for this contract since fromBlock
  const logs = await provider.getLogs({
    address: contractAddress,
    fromBlock,
    toBlock: currentBlock.number
  });
  
  // Connect to the contract to allow decoding logs using its interface
  const contract = TokenBridge__factory.connect(contractAddress, wallet);
  
  // Parse each log and combine with its block info
  const eventsWithBlock = logs.map(log => {
      try {
          const parsed = contract.interface.parseLog(log);
          if (!parsed) {
            return null;
          }

          return {
              blockNumber: log.blockNumber,
              logIndex: (log as any).logIndex,
              event: parsed.name,
              args: parsed.args,
              parsedLog: parsed
          };
      } catch (err) {
          return null;
      }
  }).filter(e => e !== null);
  
  // Sort events in chronological order
  eventsWithBlock.sort((a, b) => {
      if(a.blockNumber !== b.blockNumber) return a.blockNumber - b.blockNumber;
      return a.logIndex - b.logIndex;
  });
  
  return eventsWithBlock;
}

export async function queryActiveRequests(
  network: "mainnet" | "testnet",
  contractAddress: string
): Promise<BridgeRequest[]> {
  const { provider } = getEthersConfig(network);
  
  // 1. Get all active request IDs from the array
  const activeIds = await getActiveRequestIds(provider, contractAddress);
  
  // 2. Fetch each request in parallel
  const requests = await Promise.all(
    activeIds.map(requestId => getRequestById(provider, contractAddress, requestId))
  );

  return requests.filter(r => r !== null) as BridgeRequest[];
}

async function getActiveRequestIds(provider: any, contractAddress: string): Promise<bigint[]> {
  // Get array length from slot 10
  const lengthHex = await provider.getStorage(contractAddress, 10);
  const length = Number(BigInt(lengthHex));
  
  // Get all elements from the array
  const ids: bigint[] = [];
  const arrayBaseSlot = ethers.keccak256(
    new ethers.AbiCoder().encode(["uint256"], [10])
  );
  
  for (let i = 0; i < length; i++) {
    const slot = BigInt(arrayBaseSlot) + BigInt(i);
    const idHex = await provider.getStorage(contractAddress, "0x" + slot.toString(16));
    ids.push(BigInt(idHex));
  }
  
  return ids;
}

async function getRequestById(provider: any, contractAddress: string, requestId: bigint): Promise<BridgeRequest | null> {
  try {
    const baseSlot = ethers.keccak256(
      new ethers.AbiCoder().encode(["uint256", "uint256"], [requestId, 9])
    );
    
    // Read all required slots in parallel
    const [sender, amount, requestedAt, tokenContract, symbol, receiver, packedData, memo] = await Promise.all([
      readStorageSlot(provider, contractAddress, BigInt(baseSlot) + 1n), // sender
      readStorageSlot(provider, contractAddress, BigInt(baseSlot) + 2n), // amount
      readStorageSlot(provider, contractAddress, BigInt(baseSlot) + 3n), // requested_at
      readStorageSlot(provider, contractAddress, BigInt(baseSlot) + 4n), // antelope_token_contract
      readStorageSlot(provider, contractAddress, BigInt(baseSlot) + 5n), // antelope_symbol
      readStorageSlot(provider, contractAddress, BigInt(baseSlot) + 6n), // receiver
      readStorageSlot(provider, contractAddress, BigInt(baseSlot) + 7n), // evm_decimals + status
      readStorageSlot(provider, contractAddress, BigInt(baseSlot) + 8n), // memo
    ]);

    // Extract packed values (evm_decimals + status)
    const packedValue = BigInt(packedData);
    const evmDecimals = Number(packedValue & 0xFFn);
    const status = String((packedValue >> 8n) & 0xFFn);

    return {
      id: Number(requestId),
      sender: "0x" + sender.slice(-40),
      amount: (Number(ethers.formatUnits(BigInt(amount), evmDecimals)).toFixed(0)),
      requested_at: new Date(Number(BigInt(requestedAt)) * 1000),
      antelope_token_contract: parseBytes32ToString(tokenContract),
      antelope_symbol: parseBytes32ToString(symbol),
      receiver: parseBytes32ToString(receiver),
      evm_decimals: evmDecimals,
      status: status,
      memo: parseBytes32ToString(memo)
    };
  } catch {
    return null;
  }
}

// Helper to read storage slots
async function readStorageSlot(provider: any, contractAddress: string, slot: bigint) {
  return await provider.getStorage(contractAddress, "0x" + slot.toString(16));
}

export async function testRefundRequest(
  network: "mainnet" | "testnet",
  contractAddress: string,
  requestId: number
): Promise<void> {
  try {
    const { wallet } = getEthersConfig(network, 1);
    const contract = TokenBridge__factory.connect(contractAddress, wallet);
    
    console.log(`Attempting to refund request ID ${requestId}...`);
    const tx = await contract.refundRequest(requestId);
    const receipt = await tx.wait();
    
    if (!receipt) throw new Error("Transaction receipt is null");
    console.log(`Refund successful! Transaction hash: ${receipt.hash}`);
    console.log(`Refund successful! Transaction hash: ${receipt.status}`);
  } catch (error) {
    console.error("Error processing refund:", error);
    throw error;
  }
}

// testRefundRequest("testnet", contractAddress, 1);


// get all active requests with details
queryActiveRequests("testnet", contractAddress).then(requests => {
  console.log(requests);
});