import fetch from "node-fetch";

const chainsURL = ["https://rpc.testnet.telos.net", "https://rpc.telos.net"];

async function debugTraceTransaction(
  chainURL: string,
  txHash: string
): Promise<any> {
  const body = {
    method: "debug_traceTransaction",
    params: [
      txHash, 
      { tracer: "callTracer",
    // {   tracer: "prestateTracer",
        tracerConfig: {
            withLog: true,
            debug: true,
        }
       }
    ],
    id: 1,
    jsonrpc: "2.0"
  };

  const response = await fetch(chainURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const json = await response.json();
  return json;
}

// Example usage:
(async () => {
  try {
    const txHash = "0xae6ecccf1744febbcfb504f1e7577f1d5ae58fc19424d763fbcb14b7556e2c38";
    const traceResult = await debugTraceTransaction(chainsURL[0], txHash);
    console.log("Debug Trace Result:", JSON.stringify(traceResult, null, 2));
  } catch (error) {
    console.error("Error fetching debug trace:", error);
  }
})();
