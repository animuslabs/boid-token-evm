import { ethers } from "ethers";
import { getEthersConfig } from "src/config/configEVM";
import { getEnvData } from "src/env";
import { TokenBridge, TokenBridge__factory } from "src/types/TokenBridgeEVM";
import { TokenContract__factory } from "src/types/TokenContract/factories/TokenContract__factory";
import { TokenContract } from "src/types/TokenContract/TokenContract";

const network = "testnet"; // or "mainnet"
const env = getEnvData(network);

const gasLimit = BigInt(8000000);
console.log(`Gas limit: ${gasLimit}`);

const { wallet } = getEthersConfig(network);
const contract: TokenContract = TokenContract__factory.connect(env.TOKEN_CONTRACT_DEPLOYED, wallet);

// not sure if this is needed yet
async function approveTokenBridge() {
    // approve token bridge to mint or burn tokens on behalf of the token contract
    const tx = await contract.approve(env.TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS, ethers.MaxUint256);
    await tx.wait();
    console.log(`Approved token bridge to mint or burn tokens on behalf of the token contract`);
}

approveTokenBridge().catch(console.error);


