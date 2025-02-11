import { ethers } from "ethers";
import { getEnvData } from "src/env";

type NetworkConfig = {
  provider: ethers.JsonRpcProvider;
  wallet: ethers.Wallet;
  walletIndex: number;
  walletAddress: string;
  chainId: number;
};

export function getEthersConfig(network: "mainnet" | "testnet", walletIndex: number = 0): NetworkConfig {
    // Fetch network-specific environment data
    const envData = getEnvData(network);

    // Extract provider URL and chain ID
    const { EVM_ENDPOINT, EVM_CHAIN_ID, EVM_PRIVATE_KEY, EVM_MNEMONIC } = envData;
  
    if (!EVM_ENDPOINT || !EVM_CHAIN_ID || (!EVM_PRIVATE_KEY && !EVM_MNEMONIC)) {
      throw new Error(`Missing configuration for ${network} network`);
    }  
  const chainId = parseInt(EVM_CHAIN_ID,10);

  // Create provider and wallet
  const provider = new ethers.JsonRpcProvider(EVM_ENDPOINT, chainId);
  let wallet: ethers.Wallet | ethers.HDNodeWallet;
  if (EVM_MNEMONIC) {
    wallet = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(EVM_MNEMONIC),
      `m/44'/60'/0'/0/${walletIndex}`
    ).connect(provider);  
  } else {
    wallet = new ethers.Wallet(EVM_PRIVATE_KEY, provider);
  }
  const walletAddress = wallet.address;

  console.log(`Configured ${network} network:`);
  console.log(`Provider URL: ${EVM_ENDPOINT}`);
  console.log(`Chain ID: ${chainId}`);
  console.log(`Wallet Address: ${walletAddress}`);

  return { provider, wallet: wallet as ethers.Wallet, walletIndex, walletAddress, chainId };
}
