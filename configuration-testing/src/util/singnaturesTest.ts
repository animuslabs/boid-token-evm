import { ethers } from "ethers";

const signature = "signRegistrationRequest(uint256,uint256,string,string,string)";
const keccak = ethers.id(signature);     // keccak256 hash as a full 32-byte hex string
const selector = keccak.substring(0, 10);      // first 10 characters: "0x" + 8 hex chars = 4 bytes
console.log(selector);
