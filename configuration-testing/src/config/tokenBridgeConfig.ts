import { createAndSendAction } from '../antelope';
import { Asset, Name, Checksum160Type, Checksum160, UInt64 } from '@wharfkit/antelope';
import configuration from 'src/env';
import { ActionParams as TknBoidActionParams } from '.././types/token.boid';
import { ActionParams as XsendBoidActionParams } from '.././types/xsend.boid';
import { ActionParams as EosioTknActionParams } from '.././types/eosio.token';
import { ActionParams as EvmBridgeActionParams } from '.././types/evm.boid';
import { cleanAddress, toObject } from '../helperFunctions';

const key = configuration.Keys.priv_key;
const testAccKey = configuration.Keys.testAcc_Key;

// Set global configuration or update the existing one
export async function initiateContract(chain: "mainnet" | "testnet") {
    try {
        const acc = configuration.Native_contracts.BRIDGE_CONTRACT_NAME;
        
        // Dynamically set the evm_chain_id based on the chain
        const evm_chain_id = chain === "mainnet" 
          ? configuration.Mainnet.EVM_CHAIN_ID 
          : configuration.Testnet.TESTNET_EVM_CHAIN_ID;

        const dataObject: EvmBridgeActionParams.init = {
            evm_bridge_address: Checksum160.from(cleanAddress(configuration.EVM_bridge_contract.TOKEN_BRIDGE_SMART_CONTRACT_ADDRESS)), // EVM token bridge contract address
            evm_token_address: Checksum160.from(cleanAddress(configuration.EVM_token_contract.TOKEN_CONTRACT_DEPLOYED_ACC)),
            evm_chain_id,
            native_token_symbol: Asset.Symbol.from(configuration.Native_contracts.TOKEN_SYMBOL),
            native_token_contract: Name.from(configuration.Native_contracts.TOKEN_CONTRACT_NAME),
            fees_contract: Name.from(configuration.Native_contracts.FEES_CONTRACT_NAME),
            is_locked: false
        };
        createAndSendAction(
            chain,
            acc,
            "init",
            acc,
            "active",
            dataObject,
            key
        )

      console.log("Action successfully sent!");
    } catch (error) {
      const err = error as Error;
      console.error("Error during permission update flow:", err.message, err.stack);
    }
  };

initiateContract("mainnet");

// Processes bridging requests from the EVM to Antelope by transferring or minting tokens for the specified recipient and notifying the EVM of successful completion.
export async function reqnotify(chain: "mainnet" | "testnet", req_id: number) {
    try {
        const acc = "evm.boid";
        
        const dataObject: EvmBridgeActionParams.reqnotify = {
            req_id: req_id
        };
        createAndSendAction(
            chain,
            acc,
            "reqnotify",
            acc,
            "active",
            dataObject,
            key
        )

        console.log("Action successfully sent!");
    } catch (error) {
        const err = error as Error;
        console.error("Error during permission update flow:", toObject(err), err.stack);
    }
    };

// reqnotify("testnet", 6);
// reqnotify("testnet", 7);
// reqnotify("testnet", 5);

// function to refund stuck requests
export async function refundStuckReq(chain: "mainnet" | "testnet") {
    try {
        const acc = "evm.boid";
        const dataObject: EvmBridgeActionParams.refstuckreq = {
            // req_index: req_index
        };
        createAndSendAction(
            chain,
            acc,
            "refstuckreq",
            acc,
            "active",
            dataObject,
            key
        )
    } catch (error) {
        const err = error as Error;
        console.error("Error during permission update flow:", toObject(err), err.stack);
    }
}

// refundStuckReq("testnet");