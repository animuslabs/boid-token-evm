import { APIClient, PrivateKey, Action, Transaction, SignedTransaction, ABI } from '@wharfkit/antelope';
import { ContractKit, QueryParams } from "@wharfkit/contract"
import { AccountKit } from "@wharfkit/account"
import { Chains } from "@wharfkit/common"
import configuration from './env';
import { abi as eosioTokenABI } from './types/eosio.token';
import { abi as evmBoidABI } from './types/evm.boid';
import { abi as tokenBoidABI } from './types/token.boid';
import { abi as xsendBoidABI } from './types/xsend.boid';
import { abi as eosioEvmABI } from './types/eosio.evm';


type ChainType = 'mainnet' | 'testnet';

async function getAPIClient(chain: ChainType): Promise<APIClient> {
    // Configuration for mainnet and testnet
    const API_URLS = {
        mainnet: configuration.Mainnet.native_api,
        testnet: configuration.Testnet.native_api,
    };

    const url = API_URLS[chain];
    if (!url) {
        throw new Error(`Invalid chain: ${chain}. Allowed values are 'mainnet' or 'testnet'.`);
    }

    return new APIClient({ url });
}

async function createContractKit(chain: ChainType): Promise<ContractKit> {
    const client = await getAPIClient(chain);

    const kit = new ContractKit(
        { client },
        {
            abis: [
                { name: 'eosio.token', abi: eosioTokenABI },
                { name: 'evm.boid', abi: evmBoidABI },
                { name: 'token.boid', abi: tokenBoidABI },
                { name: 'xsend.boid', abi: xsendBoidABI },
                { name: 'eosio.evm', abi: eosioEvmABI },
            ],
        }
    );

    return kit;
}

export async function createAccountKit(chain: ChainType): Promise<AccountKit> {
    try {
        // Map chain type to corresponding Chains object
        const chainMap = {
            mainnet: Chains.Telos,
            testnet: Chains.TelosTestnet,
        };

        const chainEnum = chainMap[chain];
        if (!chainEnum) {
            throw new Error(`Invalid chain: ${chain}. Allowed values are 'mainnet' or 'testnet'.`);
        }

        // Create API client
        const client = await getAPIClient(chain);

        // Initialize AccountKit
        const accountKit = new AccountKit(chainEnum, { client });

        return accountKit;
    } catch (error) {
        console.error('Error creating AccountKit:', error);
        throw error;
    }
}

export async function readTable(
    chain: ChainType,
    contractName: string,
    tableName: string,
    query?: QueryParams
): Promise<any> {
    try {
        // Initialize the ContractKit
        const kit = await createContractKit(chain);

        // Load the contract
        const contract = kit.load(contractName);

        if (query) {
            // Query the table with specific parameters
            console.log('Fetching table data with query parameters:', query);
            const tableQueryResult = (await contract).table(tableName).query(query);
            return tableQueryResult;
        } else {
            // Fetch all rows from the table
            console.log('Fetching all table data');
            const tableAllResult = (await contract).table(tableName).all();
            return tableAllResult;
        }
    } catch (error) {
        console.error('An error occurred while reading the table:', error);
        throw error;
    }
}

async function createAndSendTransaction(chain: ChainType, actions: Action[], privKey: string): Promise<void> {
    try {
        // Get the API client
        const client = await getAPIClient(chain);
        const info = await client.v1.chain.get_info();
        const header = info.getTransactionHeader();

        // Convert WIF private key
        const privateKeyFromWif = PrivateKey.from(privKey);

        // Convert actions array into Antelope `Action` objects
        const antelopeActions = actions.map(action => Action.from(action));

        // Create the transaction
        const transaction = Transaction.from({
            ...header,
            actions: antelopeActions,
        });

        // Sign the transaction
        const signature = privateKeyFromWif.signDigest(transaction.signingDigest(info.chain_id));
        const signedTransaction = SignedTransaction.from({
            ...transaction,
            signatures: [signature],
        });

        // Push the transaction to the blockchain
        const result = await client.v1.chain.push_transaction(signedTransaction);
        console.log('Transaction successful:', result);
    } catch (error) {
        console.error('An error occurred while sending the transaction:', error);
    }
}


async function createAction(chain: ChainType, contractName:string, actionName: string, authName: string, active: string, dataObject: any): Promise<Action> {
    const client = await createContractKit(chain);
    const loadedABI = (await client.load(contractName)).abi;
    const action = {
        account: contractName,
        name: actionName,
        authorization: [
            {
                actor: authName,
                permission: active,
            }
        ],
        data: dataObject
    };
    return Action.from(action, loadedABI);}

export async function createAndSendAction(
        chain: ChainType,
        contracName: string,
        actionName: string,
        authName: string,
        permission: string,
        dataObject: any,
        privKey: string
    ): Promise<void> {
        try {
            // Create the action
            const action = await createAction(chain, contracName, actionName, authName, permission, dataObject);

            // Send the action using createAndSendTransaction
            await createAndSendTransaction(chain, [action], privKey);
        } catch (error) {
            console.error('An error occurred while creating and sending the action:', error);
        }
}