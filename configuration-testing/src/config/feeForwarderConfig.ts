import { createAndSendAction } from '../antelope';
import { Asset, Name } from '@wharfkit/antelope';
import configuration from 'src/env';
import { ActionParams as TknBoidActionParams } from '.././types/token.boid';
import { ActionParams as XsendBoidActionParams } from '.././types/xsend.boid';
import { ActionParams as EosioTknActionParams } from '.././types/eosio.token';


const key = configuration.Keys.priv_key;
const testAccKey = configuration.Keys.testAcc_Key;

// Set global configuration or update the existing one
// fee - in TLOS
// fee_token_contract - eosio.token
// fee_token_symbol - 4,TLOS
// bridge_account - evm.boid
// evm_memo - evm generated bridge acc address, will be used to cover the fees for the bridge account
export async function setGlobalConfig(chain: "mainnet" | "testnet") {
    try {
        const acc = "xsend.boid";
        
        const dataObject: XsendBoidActionParams.setglobal = {
            fee: Asset.from("0.5000 TLOS"),
            fee_token_contract: Name.from("eosio.token"),
            fee_token_symbol: Asset.Symbol.from("4,TLOS"),
            bridge_account: Name.from("evm.boid"),
            evm_memo: "0x245ae39b8bd7074febfbf94a8310498e015cc0cb",
            fee_receiver: Name.from("eosio.evm")
        };
        createAndSendAction(
            chain,
            "xsend.boid",
            "setglobal",
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

// setGlobalConfig("testnet");

// Register token to be used in the bridge
export async function regtoken(chain: "mainnet" | "testnet") {
    try {
        const acc = "xsend.boid";
        
        const dataObject: XsendBoidActionParams.regtoken = {
            token_contract: Name.from("token.boid"),
            token_symbol: Asset.Symbol.from("4,BOISD"),
            min_amount: Asset.from("1.0000 BOISD")
        };
        createAndSendAction(
            chain,
            "xsend.boid",
            "regtoken",
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

// regtoken("testnet");

// remove token from the contract
export async function deltoken(chain: "mainnet" | "testnet") {
    try {
        const acc = "xsend.boid";
        
        const dataObject: XsendBoidActionParams.deltoken = {
            token_symbol: Asset.Symbol.from("4,BOISD")
        };
        createAndSendAction(
            chain,
            "xsend.boid",
            "deltoken",
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

// deltoken("testnet");

// send TLOS to the fee forwarder contract
export async function sendTLOS(chain: "mainnet" | "testnet") {
    try {
        const acc = "3boidanimus3";
        const fee = "0.5000 TLOS";
        
        const dataObject: EosioTknActionParams.transfer = {
            from: Name.from(acc),
            to: Name.from("xsend.boid"),
            quantity: Asset.from(fee),
            memo: "0x24d5101a649066304a46dF192ffb91bFa612E424"
        };
        createAndSendAction(
            chain,
            "eosio.token",
            "transfer",
            acc,
            "active",
            dataObject,
            testAccKey
        )

      console.log("Action successfully sent!");
    } catch (error) {
      const err = error as Error;
      console.error("Error during permission update flow:", err.message, err.stack);
    }
  };

// sendTLOS("testnet");

// send BOID to the fee forwarder contract
export async function sendBOID(chain: "mainnet" | "testnet") {
    try {
        const acc = "3boidanimus3";
        const fee = "5000.0233 BOID";
        
        const dataObject: TknBoidActionParams.transfer = {
            from: Name.from(acc),
            to: Name.from("xsend.boid"),
            quantity: Asset.from(fee),
            memo: "0x24d5101a649066304a46dF192ffb91bFa612E424"
        };
        createAndSendAction(
            chain,
            "token.boid",
            "transfer",
            acc,
            "active",
            dataObject,
            testAccKey
        )

      console.log("Action successfully sent!");
    } catch (error) {
      const err = error as Error;
      console.error("Error during permission update flow:", err.message, err.stack);
    }
  };

sendBOID("testnet");

// function to send TLOS fee then wait 1s and send BOID
async function testTrx() {
  try {
    await sendTLOS("testnet")
    // Wait 1 second before sending BOID
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendBOID("testnet");
    console.log("Fee forwarded successfully: TLOS fee sent and BOID transferred.");
  } catch (error) {
    console.error("Error in testTrx:", error);
  }
}
// testTrx()