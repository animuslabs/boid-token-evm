import { createAccountKit, createAndSendAction } from '../antelope';
import { Asset, Authority, Name } from '@wharfkit/antelope';
import configuration from 'src/env';

const key = configuration.Keys.priv_key;
const keyTestAcc = configuration.Keys.testAcc_Key;

/**
 * Fetches and formats balances and permissions for the given account on the specified chain.
 *
 * @param chain        - The chain name (e.g., "mainnet", "testnet").
 * @param accountName  - The account to load (e.g., "boid").
 * @param tokenName    - The token contract account (e.g., "token.boid").
 * @param tokenSymbol  - The token symbol (e.g., "BOID").
 * @returns A formatted report and raw data for additional use.
 */
export async function checkAccountInfo(
    chain: "mainnet" | "testnet",
    accountName: string,
    tokenName: string,
    tokenSymbol: string
  ) {
    try {
      const kit = await createAccountKit(chain);
      const account = await kit.load(accountName);
  
      // Fetch the main balance (handle potential errors)
      let balanceAll:Asset | string;
      try {
        balanceAll = await account.balance();
      } catch {
        balanceAll = "No balance available";
      }
  
      // Fetch the token balance (handle potential errors)
      let balanceToken:Asset | string;
      try {
        balanceToken = await account.balance(tokenSymbol, tokenName);
      } catch {
        balanceToken = "No balance available for this token";
      }
  
      const permActive = account.permission("active");
      const permOwner = account.permission("owner");
  
      const formatPermission = (perm: any) => {
        const keys = perm.required_auth.keys
          .map((key: any) => key.key)
          .join(', ') || 'No keys';
        const accounts = perm.required_auth.accounts
          .map((acc: any) => `${acc.permission.actor}@${acc.permission.permission}`)
          .join(', ') || 'No accounts';
        const linkedActions = perm.linked_actions
          .map((action: any) => `${action.account}:${action.action}`)
          .join(', ') || 'No linked actions';
  
        return `
          Permission Name: ${perm.perm_name}
          Parent: ${perm.parent}
          Threshold: ${perm.required_auth.threshold}
          Keys: [${keys}]
          Accounts: [${accounts}]
          Linked Actions: [${linkedActions}]
        `;
      };
  
      return {
        // raw: {
        //   chain,
        //   accountName,
        //   balanceAll,
        //   balanceToken,
        //   permActive,
        //   permOwner,
        // },
        formatted: `
    Account Report
    ================
    Chain: ${chain}
    Account Name: ${accountName}
    Balance (All): ${
          typeof balanceAll === "string" ? balanceAll : balanceAll.toJSON()
        }
    Balance (Token): ${
          typeof balanceToken === "string" ? balanceToken : balanceToken.toJSON()
        }
    Permissions:
      Active: ${formatPermission(permActive)}
      Owner: ${formatPermission(permOwner)}
    `,
      };
    } catch (error) {
      return {
        raw: null,
        formatted: `Error fetching account information for ${accountName} on ${chain}: ${(error as Error).message}`,
      };
    }
  }
  
// Example usage  
// checkAccountInfo("testnet", "evm.boid", "token.boid", "BOID").then(console.log).catch(console.error);
// checkAccountInfo("testnet", "xsend.boid", "token.boid", "BOID").then(console.log).catch(console.error);

(async () => {
    try {
        const acc = "evm.boid";
        const auth = Authority.from({
                threshold: 1,
                keys: [
                    {
                        key: "EOS4vjtUmGAXZGyAXrwGnnu5LhSTgwBuVC58CxFN3ZEtd9HPgPJ5u",
                        weight: 1
                    }
                ],
                accounts: [
                    {
                        permission: {
                            actor: acc,
                            permission: "eosio.code",
                        },
                        weight: 1,
                    },
                    {
                        permission: {
                            actor: acc,
                            permission: "owner",
                        },
                        weight: 1,
                    }
                ]
        });
        
        const dataObject = {
                account: Name.from(acc),
                permission: Name.from("active"),
                parent: Name.from("owner"),
                auth
            };
        createAndSendAction(
            "mainnet",
            "eosio",
            "updateauth",
            acc,
            "active",
            dataObject,
            key
        )

      console.log("Permission update action successfully sent!");
    } catch (error) {
      const err = error as Error;
      console.error("Error during permission update flow:", err.message, err.stack);
    }
  })();
  
