import { APIClient, FetchProvider } from '@wharfkit/antelope'
import { HyperionAPIClient } from '@wharfkit/hyperion' // Adjust the import path if needed


const client = new APIClient({
  provider: new FetchProvider("https://test.telos.eosusa.io"), // Use a real provider here
})

export interface ContractActionResponse {
  timestamp: string
  trx_id: string
  act: {
    account: string
    name: string      
  },
  data: { 
    [key: string]: any
  } | undefined  // Union type with undefined
}

export interface TokenActionResponse {
  timestamp: string
  trx_id: string
  act: {
    account: string
    name: string
  },
  data: {
    from: string,
    to: string,
    amount: number,
    symbol: string,
    memo: string,
    quantity: string
  }
}

// Instantiate the Hyperion API client
const hyperion = new HyperionAPIClient(client)

export async function queryNativeContractActions(contractAccount: string): Promise<ContractActionResponse[] | undefined> {
  try {
    const response = await hyperion.v2.history.get_actions(contractAccount, {
      filter: `${contractAccount}:*`, // Adjust filter: you can specify action name if needed (e.g., `${contractAccount}:transfer`)
      skip: 0,
      limit: 1000,
      after: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    })
    const dataResponse: ContractActionResponse[] = response.actions.map(action => ({
      timestamp: action.timestamp.toString(),
      trx_id: action.trx_id.toString(),
      act: {
        account: action.act.account.toString(),
        name: action.act.name.toString()
      },
      data: action.act.data
    })) || []
    console.log(`Actions for ${contractAccount}:`, dataResponse)
    return dataResponse
  } catch (error) {
    console.error(`Error querying actions for ${contractAccount}:`, error)
    return undefined
  }
}

export async function queryNativeTokenActions(): Promise<TokenActionResponse[] | undefined> {
  const contractAccount = "token.boid"
  try {    
    const response = await hyperion.v2.history.get_actions(contractAccount, {
      filter: `${contractAccount}:*`, // Adjust filter: you can specify action name if needed (e.g., `${contractAccount}:transfer`)
      skip: 0,
      limit: 1000,
      after: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
    })
    const dataResponse: TokenActionResponse[] = response.actions
      .map(action => ({
        timestamp: action.timestamp.toString(),
        trx_id: action.trx_id.toString(),
        act: {
          account: action.act.account.toString(),
          name: action.act.name.toString()
        },
        data: action.act.data
      }))
      .filter(action => {
        const allowedSenders = new Set(['xsend.boid', 'evm.boid'])
        return allowedSenders.has(action.data?.from)
      })
    console.log(`Actions for ${contractAccount}:`, dataResponse)
    return dataResponse
  } catch (error) {
    console.error(`Error querying actions for ${contractAccount}:`, error)
    return undefined
  }
}


queryNativeContractActions("xsend.boid")