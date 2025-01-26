import { Wallet } from 'ethers';

function generateEthereumAccount() {
  // Create a new random wallet
  const wallet = Wallet.createRandom();

  // Extract the address and private key
  const address = wallet.address;
  const privateKey = wallet.privateKey;
  const mnemonic = wallet.mnemonic ? wallet.mnemonic.phrase : '';

  // Display the details
  console.log('Address:', address);
  console.log('Private Key:', privateKey);
  console.log('Mnemonic:', mnemonic);

  // Return the account details
  return { address, privateKey, mnemonic };
}

// Example usage
const newAccount = generateEthereumAccount();
