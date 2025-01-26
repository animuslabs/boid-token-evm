import fs from "fs";
import { z } from "zod";
import * as toml from "toml";

// Define the schema for ALL environment variables you use (both mainnet & testnet).
// Define schema with Zod
const configSchema = z.object({
  Mainnet: z.object({
    native_api: z.string().url(),
    EVM_ENDPOINT: z.string().url(),
    EVM_CHAIN_ID: z.string().regex(/^\d+$/, "EVM_CHAIN_ID must be a numeric string"),
  }),
  Testnet: z.object({
    native_api: z.string().url(),
    EVM_ENDPOINT: z.string().url(),
    TESTNET_EVM_CHAIN_ID: z.string().regex(/^\d+$/, "TESTNET_EVM_CHAIN_ID must be a numeric string"),
  }),
  Keys: z.object({
    priv_key: z.string(),
    testAcc_Key: z.string(),
    EVM_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "EVM_PRIVATE_KEY must be a valid 64-character hex string prefixed with 0x"),
  }),
  EVM_token_contract: z.object({
    TOKEN_CONTRACT_DEPLOYER_ACC: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "TOKEN_CONTRACT_DEPLOYER_ACC must be a valid 40-character hex address prefixed with 0x"),
    TOKEN_CONTRACT_OWNER_ACC: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "TOKEN_CONTRACT_OWNER_ACC must be a valid 40-character hex address prefixed with 0x"),
    TOKEN_CONTRACT_DEPLOYED_ACC: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "TOKEN_CONTRACT_DEPLOYED_ACC must be a valid 40-character hex address prefixed with 0x"),
    TESTNET_LZ_ENDPOINT: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "TESTNET_LZ_ENDPOINT must be a valid 40-character hex address prefixed with 0x"),
    LZ_ENDPOINT: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "LZ_ENDPOINT must be a valid 40-character hex address prefixed with 0x"),
  }),
  EVM_bridge_contract: z.object({
    ANTELOPE_BRIDGE_EVM_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "ANTELOPE_BRIDGE_EVM_ADDRESS must be a valid 40-character hex address prefixed with 0x"),
    MAX_REG_REQUEST_PER_REQUESTOR: z.string().regex(/^\d+$/, "MAX_REG_REQUEST_PER_REQUESTOR must be a numeric string"),
    MAX_BRIDGE_REQUEST_PER_REQUESTOR: z.string().regex(/^\d+$/, "MAX_BRIDGE_REQUEST_PER_REQUESTOR must be a numeric string"),
    REQUEST_VALIDITY_SECONDS: z.string().regex(/^\d+$/, "REQUEST_VALIDITY_SECONDS must be a numeric string"),
    TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, "TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS must be a valid 40-character hex address prefixed with 0x"),
    BRIDGE_FEE: z.string().regex(/^\d+$/, "BRIDGE_FEE must be a numeric string"),
    BRIDGE_MIN_AMOUNT: z.string().regex(/^\d+$/, "BRIDGE_MIN_AMOUNT must be a numeric string"),
  }),
  Native_contracts: z.object({
    BRIDGE_CONTRACT_NAME: z.string(),
    FEES_CONTRACT_NAME: z.string(),
    EVM_SYSTEM_CONTRACT: z.string(),
    TOKEN_CONTRACT_NAME: z.string(),
    TOKEN_NAME: z.string(),
    TOKEN_SYMBOL: z.string(),
  }),
});

// Load and parse the TOML configuration file
const configPath = "../config.toml";
let configContent: string;

try {
  configContent = fs.readFileSync(configPath, "utf-8");
} catch (error: any) {
  throw new Error(`Could not read the config file: ${error.message}`);
}

let configData: any;

try {
  configData = toml.parse(configContent);
} catch (error: any) {
  throw new Error(`Error parsing TOML file: ${error.message}`);
}

// Validate and parse the configuration
const env = configSchema.safeParse(configData);
if (!env.success) {
  throw new Error("Missing or invalid configuration variables: " + JSON.stringify(env.error.formErrors, null, 2));
}

const configuration = env.data;

export default configuration;

// Export a function that picks which endpoints/IDs to use.
export function getEnvData(network: "mainnet" | "testnet") {
  const isMainnet = (network === "mainnet");

  return {
    // Common to both
    EVM_PRIVATE_KEY: configuration.Keys.EVM_PRIVATE_KEY,
    TOKEN_CONTRACT_DEPLOYER: configuration.EVM_token_contract.TOKEN_CONTRACT_DEPLOYER_ACC,
    TOKEN_CONTRACT_OWNER: configuration.EVM_token_contract.TOKEN_CONTRACT_OWNER_ACC,
    TOKEN_CONTRACT_DEPLOYED: configuration.EVM_token_contract.TOKEN_CONTRACT_DEPLOYED_ACC,

    ANTELOPE_BRIDGE_EVM_ADDRESS: configuration.EVM_bridge_contract.ANTELOPE_BRIDGE_EVM_ADDRESS,
    MAX_REG_REQUEST_PER_REQUESTOR: configuration.EVM_bridge_contract.MAX_REG_REQUEST_PER_REQUESTOR,
    MAX_BRIDGE_REQUEST_PER_REQUESTOR: configuration.EVM_bridge_contract.MAX_BRIDGE_REQUEST_PER_REQUESTOR,
    REQUEST_VALIDITY_SECONDS: configuration.EVM_bridge_contract.REQUEST_VALIDITY_SECONDS,
    TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS: configuration.EVM_bridge_contract.TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS,
    BRIDGE_FEE: configuration.EVM_bridge_contract.BRIDGE_FEE,
    BRIDGE_MIN_AMOUNT: configuration.EVM_bridge_contract.BRIDGE_MIN_AMOUNT,
    TOKEN_CONTRACT_NAME: configuration.Native_contracts.TOKEN_CONTRACT_NAME,
    TOKEN_NAME: configuration.Native_contracts.TOKEN_NAME,
    TOKEN_SYMBOL: configuration.Native_contracts.TOKEN_SYMBOL,

    // Switch between mainnet/testnet for these
    LZ_ENDPOINT: isMainnet
      ? configuration.EVM_token_contract.LZ_ENDPOINT
      : configuration.EVM_token_contract.TESTNET_LZ_ENDPOINT,
    EVM_ENDPOINT: isMainnet
      ? configuration.Mainnet.EVM_ENDPOINT
      : configuration.Testnet.EVM_ENDPOINT,
    EVM_CHAIN_ID: isMainnet
      ? configuration.Mainnet.EVM_CHAIN_ID
      : configuration.Testnet.TESTNET_EVM_CHAIN_ID,
  };
}
