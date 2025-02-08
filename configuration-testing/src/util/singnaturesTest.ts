import { ethers } from "ethers";

const signatures = {
    "EVM_SUCCESS_CALLBACK_SIGNATURE": "requestSuccessful(uint256)",
    "EVM_REFUND_CALLBACK_SIGNATURE": "refundSuccessful(uint256)",
    "EVM_BRIDGE_SIGNATURE": "bridgeTo(address,address,uint256,bytes32)",
};

for (const [name, signature] of Object.entries(signatures)) {
    const selector = ethers.id(signature).substring(0, 10);
    console.log(`${name}: ${selector}`);
}

// async function main() {
//     const provider = new ethers.JsonRpcProvider("https://testnet.telos.net/evm");
//     const contractAddress = "0xf05ab8502f9E1d98909aFc00370E3D6A194f5d7f";

//     const baseSlot = 8;
//     const baseSlotHex = ethers.toBeHex(baseSlot);
//     const paddedSlot = ethers.zeroPadValue(baseSlotHex, 32);
//     const baseSlotKeccak = ethers.keccak256(paddedSlot);
//     console.log("Computed base slot for requests[]:", baseSlotKeccak);

//     for (let index = 0; index < 10; index++) {
//         const baseBN = BigInt(baseSlotKeccak);
//         const requestSlotBN = baseBN + BigInt(index);
//         const requestSlot = "0x" + requestSlotBN.toString(16).padStart(64, "0");
//         console.log(`\nStorage slot for requests[${index}]:`, requestSlot);

//         const storageValue = await provider.getStorage(contractAddress, requestSlot);
//         console.log(`Storage value at slot ${index}:`, storageValue);
//     }

//   const lengthSlot = ethers.zeroPadValue(ethers.toBeHex(8), 32);
//   const arrayLength = await provider.getStorage(contractAddress, lengthSlot);
//   console.log("Array length at slot 8:", arrayLength);
// }

// main().catch(console.error);
