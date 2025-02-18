import { ethers } from "ethers";
import { getEthersConfig } from "src/config/configEVM";
import { getEnvData } from "src/env";
import { TokenBridge__factory } from "src/types/TokenBridgeEVM/factories/TokenBridge__factory";
import { TokenContract__factory } from "src/types/TokenContract/factories/TokenContract__factory";

async function testBridge() {
  const network: "testnet" | "mainnet" = "testnet";
  const env = getEnvData(network);

  // Get the deployed TokenBridge contract address
  const tokenBridgeAddress = env.TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS;
  // Get the approved token address (must match the one set in the bridge)
  const approvedTokenAddress = env.TOKEN_CONTRACT_DEPLOYED; 

  // Get the provider and wallet from our EVM config
  const { wallet } = getEthersConfig(network, 1);

  // Connect to the TokenBridge contract using our wallet
  const tokenBridge = TokenBridge__factory.connect(tokenBridgeAddress, wallet);

  // Bridge parameters:
  // - The amount is processed from a whole number string to 18-decimal units.
  //   (For example, "55555" becomes 55555 * 10^18 which should be divisible by 10^14 in the contract)
  const tokenAmountString = "5555.555555";
  const amount = ethers.parseEther(tokenAmountString);

  // Receiver: a native Telos account name (1 to 12 characters)
  const receiver = "3boidanimus3";
  // Memo: an arbitrary memo string for the bridge request
  const memo = "Bridge Transfer from EVM";

  // Fee: The required fee for the bridge transaction (e.g., "0.5 TLOS")
  // Using ethers.parseEther to convert to 18-decimal raw value.
  const fee = ethers.parseEther("0.5");

  console.log("Sending bridge transaction with parameters:", {
    approvedTokenAddress,
    amount: amount.toString(),
    receiver,
    memo,
    fee: fee.toString()
  });

  // Connect to the token contract using our wallet
  const tokenContract = TokenContract__factory.connect(approvedTokenAddress, wallet);
  // Approve the TokenBridge contract to spend tokens on behalf of the wallet
  const approveTx = await tokenContract.approve(tokenBridgeAddress, amount);
  console.log("Approval transaction sent. Waiting for confirmation...");
  await approveTx.wait();
  console.log("Approval confirmed.");

  // Call the bridge function.
  // Note: The function is payable, so we attach the specified fee.
  const tx = await tokenBridge.bridge(approvedTokenAddress, amount, receiver, memo, { value: fee });
  console.log("Bridge transaction sent. Waiting for confirmation...");
  
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction receipt is null");
  console.log(`Transaction hash: ${receipt.hash}`);
  console.log(`Transaction hash: ${receipt.status}`);
}

// Execute the test function
testBridge().catch(error => {
  console.error("Error in testBridge:", error);
});
