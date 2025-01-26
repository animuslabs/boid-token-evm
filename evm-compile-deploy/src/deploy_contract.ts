import { ethers } from "ethers";
import { getEthersConfig } from "src/config";
import path from "path";
import { getEnvData } from "src/env";
import fs from "fs";

const gasLimit = BigInt(8000000);
console.log(`Gas limit: ${gasLimit}`);

// Retrieve the network argument from the command line
const network = process.argv[2] as "mainnet" | "testnet";

// Retrieve network-specific environment data
const envData = getEnvData(network);

// Define contract deployment parameters
const contractDeploymentParams: Record<string, any[]> = {
  TokenContract: [ // This to be deployed first
    envData.TOKEN_NAME, // _name
    envData.TOKEN_SYMBOL, // _symbol
    envData.LZ_ENDPOINT, // _lzEndpoint
    envData.TOKEN_CONTRACT_OWNER, // _delegate
  ],
  TokenBridge: [ // This to be second
    envData.TOKEN_CONTRACT_OWNER,               // initialOwner
    envData.ANTELOPE_BRIDGE_EVM_ADDRESS,        // _antelope_bridge_evm_address
    envData.TOKEN_CONTRACT_DEPLOYED,             // _evm_approvedToken (the deployed TokenContract address)
    Number(envData.MAX_BRIDGE_REQUEST_PER_REQUESTOR),  // _max_requests_per_requestor (uint8)
    BigInt(envData.BRIDGE_FEE),                // _fee (uint)
    BigInt(envData.BRIDGE_MIN_AMOUNT),         // _min_amount (uint)
    envData.TOKEN_CONTRACT_NAME,                // _antelope_token_contract
    envData.TOKEN_NAME,                         // _antelope_token_name
    envData.TOKEN_SYMBOL,                       // _antelope_symbol
  ]
};
const contractList = Object.keys(contractDeploymentParams).map((name, index) => ({
  index: index + 1,
  name,
  fileName: `${name}.sol`,
}));

async function deployContract(
  network: "mainnet" | "testnet",
  contractName: string,
  contractPath: string,
  constructorArgs: any[]
) {
  // Get the ethers configuration for the specified network
  const { provider, wallet, chainId } = getEthersConfig(network);

  console.log(`Deploying ${contractName} on ${network} network (Chain ID: ${chainId})`);
  console.log(`Wallet address: ${wallet.address}`);

  // Log wallet balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Wallet balance: ${ethers.formatEther(balance)} TLOS`);

  if (!constructorArgs || constructorArgs.length === 0) {
    throw new Error(`Error: Deployment parameters not defined for ${contractName}`);
  }

  // Load compiled artifacts
  const artifactsPath = `${contractPath}/${contractName}.json`; // Path to precompiled artifacts
  if (!fs.existsSync(artifactsPath)) {
    throw new Error(`Artifacts not found at ${artifactsPath}. Please compile the contract first.`);
  }

  const { abi, bytecode } = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));

  // Create a contract factory and deploy the contract
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log("Deploying contract...");
  const contract = await factory.deploy(...constructorArgs, { gasLimit });

  console.log("Waiting for deployment to be mined...");
  const receipt = await contract.deploymentTransaction()?.wait();

  console.log(`${contractName} deployed successfully!`);
  console.log("Contract Address:", contract.target);
  console.log("Transaction Hash:", receipt?.blockHash || "");

  // Verify deployment by checking the code at the contract address
  const code = await provider.getCode(contract.target);
  if (code === "0x") {
    throw new Error("Deployment failed: No contract code found at the address");
  } else {
    console.log("Deployment verified: Contract code is present");
  }
}

async function executeDeployment(network: string, contractNumber: string) {
  // Validate network
  if (!network || (network !== "mainnet" && network !== "testnet")) {
    console.error("Error: Please specify a valid network ('mainnet' or 'testnet').");
    console.error("Usage: node deploy_contract.js <network> <contractNumber>");
    console.error("Available networks: mainnet, testnet");
    console.error("Available contracts:");
    contractList.forEach(({ index, name }) =>
      console.log(`${index}: ${name} (${name}.sol)`)
    );
    process.exit(1);
  }

  // Validate and parse contract number
  const selectedIndex = parseInt(contractNumber, 10);
  if (isNaN(selectedIndex) || selectedIndex < 1 || selectedIndex > contractList.length) {
    console.error("Error: Invalid contract number.");
    console.error("Available contracts:");
    contractList.forEach(({ index, name }) =>
      console.log(`${index}: ${name} (${name}.sol)`)
    );
    process.exit(1);
  }

  // Get the selected contract details
  const { name } = contractList[selectedIndex - 1];
  const artifactsDir = path.resolve(__dirname, "artifacts");
  const constructorArgs = contractDeploymentParams[name];

  try {
    console.log(`Deploying ${name} using precompiled artifacts...`);
    await deployContract(network as "mainnet" | "testnet", name, artifactsDir, constructorArgs);
  } catch (error) {
    console.error(`Error deploying ${name}:`, error);
  }
}



// Run the deployment process
executeDeployment(process.argv[2], process.argv[3]).catch((error) => {
  console.error("Deployment failed:", error);
  process.exit(1);
});
