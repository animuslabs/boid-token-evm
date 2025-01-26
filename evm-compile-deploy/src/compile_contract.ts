import solc from "solc";
import fs from "fs";
import path from "path";
import { findImports } from "src/lib/findImports";

export async function compileContract(
  contractFileName: string,
  contractName: string
): Promise<{ abi: any; bytecode: string }> {
  // Define the contract path
  const contractPath = path.resolve(__dirname, "contracts", contractFileName);
  console.log(`Compiling contract: ${contractPath}`);
  
  if (!fs.existsSync(contractPath)) {
    throw new Error(`Contract file not found at: ${contractPath}`);
  }

  // Read the Solidity source file content
  const source = fs.readFileSync(contractPath, "utf8");

  // Define the compiler input format
  const input = {
    language: "Solidity",
    sources: {
      [contractFileName]: {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "berlin",
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "metadata"],
        },
      },
    },
  };

  // Compile the contract with the import callback
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

  // Check for compilation errors
  if (output.errors && output.errors.length > 0) {
    console.error("Compilation errors:", output.errors);
    throw new Error("Compilation failed");
  }

  // Extract ABI, bytecode, and metadata
  const contractOutput = output.contracts[contractFileName][contractName];
  const abi = contractOutput.abi;
  const bytecode = contractOutput.evm.bytecode.object;
  const metadata = contractOutput.metadata; // This is a JSON string

  // Define the output directory for artifacts
  const artifactsDir = path.resolve(__dirname, "artifacts");
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir);
  }

  // Write ABI and bytecode to JSON file
  const artifactPath = path.resolve(artifactsDir, `${contractName}.json`);
  fs.writeFileSync(
    artifactPath,
    JSON.stringify({ abi, bytecode }, null, 2),
    "utf8"
  );

  // Write metadata to <ContractName>_metadata.json
  const metadataPath = path.resolve(artifactsDir, `${contractName}_metadata.json`);
  fs.writeFileSync(metadataPath, metadata, "utf8");

  console.log(`Contract compiled successfully! Artifacts saved to ${artifactPath}. Metadata saved to ${metadataPath}`);
  
  return { abi, bytecode };
}

async function compileContracts(
  contractList: { fileName: string; name: string }[],
  selectedIndices: number[]
): Promise<void> {
  const selectedContracts = selectedIndices.map((index) => contractList[index - 1]);

  console.log(`Starting compilation for ${selectedContracts.length} contract(s)...`);

  for (const { fileName, name } of selectedContracts) {
    try {
      console.log(`Compiling: ${name} from ${fileName}`);
      await compileContract(fileName, name);
    } catch (error) {
      console.error(`Error compiling ${name}:`, error);
    }
  }

  console.log("Compilation process completed.");
}

// List of contracts to compile
const contractsToCompile = [
  { fileName: "TokenContract.sol", name: "TokenContract" },
  { fileName: "TokenBridge.sol", name: "TokenBridge" }
];

// Display list of contracts
console.log("Available contracts:");
contractsToCompile.forEach((contract, index) => {
  console.log(`${index + 1}. ${contract.name} (${contract.fileName})`);
});

// Parse command-line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("No contracts specified. Use 'all' or specify contract numbers (e.g., 1,2).");
  process.exit(1);
}
const compileAll = args.includes("all");
const selectedIndices = compileAll
  ? contractsToCompile.map((_, index) => index + 1)
  : args[0]
      .split(",")
      .map((arg) => parseInt(arg.trim()))
      .filter((num) => !isNaN(num) && num >= 1 && num <= contractsToCompile.length);

if (selectedIndices.length === 0) {
  console.error("No valid contracts selected for compilation.");
  process.exit(1);
}

// Compile selected contracts
compileContracts(contractsToCompile, selectedIndices).catch((error) => {
  console.error("Compilation process failed:", error);
  process.exit(1);
});