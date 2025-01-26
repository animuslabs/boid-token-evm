import { ethers } from "ethers";
import { getEnvData } from "src/env";

type NetworkConfig = {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Wallet;
  chainId: number;
};

export function getEthersConfig(network: "mainnet" | "testnet"): NetworkConfig {
    // Fetch network-specific environment data
    const envData = getEnvData(network);

    // Extract provider URL and chain ID
    const { EVM_ENDPOINT, EVM_CHAIN_ID, EVM_PRIVATE_KEY } = envData;
  
    if (!EVM_ENDPOINT || !EVM_CHAIN_ID || !EVM_PRIVATE_KEY) {
      throw new Error(`Missing configuration for ${network} network`);
    }  
  const chainId = parseInt(EVM_CHAIN_ID,10);

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(EVM_ENDPOINT, chainId);
  const wallet = new ethers.Wallet(envData.EVM_PRIVATE_KEY, provider);

  console.log(`Configured ${network} network:`);
  console.log(`Provider URL: ${EVM_ENDPOINT}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Wallet Address: ${wallet.address}`);

  return { provider, wallet, chainId };
}
