import { getEnvData } from "src/env";
import { ethers } from "ethers";
const network = "testnet"; // or "mainnet"
const env = getEnvData(network);

const tokenContractAddress = env.TOKEN_CONTRACT_DEPLOYED;

interface TelosContractTransaction {
    [key: string]: unknown
  }

async function fetchTelosContractTransactions(): Promise<TelosContractTransaction[]> {
    // Ensure the contract address is valid.
    if (!tokenContractAddress?.startsWith('0x')) {
      console.error('Invalid contract address')
      return []
    }

    // Teloscan API endpoint – use the testnet or mainnet URL as appropriate.
    const baseUrl = 'https://api.testnet.teloscan.io'
    const endpoint = `${baseUrl}/v1/token/${tokenContractAddress}/transfers`
    console.log("endpoint", endpoint)
    try {
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`)
      }
      const rawData = await response.json();

      // Extract array from response – adjust based on API's structure.
      let items: any[] = [];
      if (Array.isArray(rawData)) {
        items = rawData;
      } else if (rawData.data && Array.isArray(rawData.data)) {
        items = rawData.data;
      } else if (rawData.results && Array.isArray(rawData.results)) {
        items = rawData.results;
      } else {
        console.error("Unexpected API response structure:", rawData);
        return [];
      }

      // Process raw transactions into human-readable format.
      const processedData = items.map((item: any) => ({
        amount: Number(ethers.formatEther(item.amount)).toFixed(0),
        from: item.from,
        to: item.to,
        transaction: item.transaction,
        timestamp: new Date(item.timestamp).toLocaleString()
      }));
      console.log("processed data", processedData);
      return processedData;
    } catch (error) {
      console.error('Error fetching contract transactions:', error)
      return []
    }
  }

(async () => {
  await fetchTelosContractTransactions().catch(console.error);
})();