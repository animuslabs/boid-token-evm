# Telos Native to Telos EVM bridge
Contracts description to look at:
[EVM Token Bridge Contract](EVM-TokenBridgeContract.md)  
[EVM Token Contract](EVM-TokenContract.md)  
[Native Fees Contract](Native-FeesContract.md)  
[Native Token Bridge Contract](Native-TokenBridgeContract.md)

UI for the bridge done in quasar: [UI](https://github.com/animuslabs/boid-bridge-ui)

# Deployment steps
- to create account on Telos Native if you need to do it through m-sign you can use this tool: https://msig.animus.is also to deploy smart contracts
- useful script to change permissions an Telos Native account - util/accKeys.ts
- important to have jq version 4 or above installed for example: https://github.com/mikefarah/yq/releases/tag/v4.45.1
- create types for EVM smart contracts use typechain (npx typechain --target ethers-v6 --out-dir ./types ./TelosEVMContracts/TokenBridge.json --show-stack-traces)
- to generate a new wallet for the contract creation use on Telos EVM you can use evm-compile-deploy/src/util/wallet.ts script

## Before you start list:
- token.boid - token contract ready to go
- xsend.boid - this will be the feeForwarder smart contract
- evm.boid - this will be token bridge smart contract (generate evm account name before deploy)
- config.toml - make sure that you have all the information

Acconts involved in the Telos bridge:  
Native/Zero  
- token.boid - token contract
- xsend.boid - account for collecting fees connected to the evm bridge ( user should send BOID, TLOS (fee), memo with EVM acc name where the BOID should go ) - this contract can be created by running the antelope-compile/buildFeeForwarder.sh bash file
- evm.boid - token bridge to evm (in the code originally named token.brdg) (tokens are locked here when the user sends the transfer) (need to generate an evm account from this account and evm fees costs will be taken from that account for transfers from native to evm) - this contract can be created by running the antelope-compile/buildTokenBridge.sh bash file

EVM
- token bridge account
- BOID token in OFT standard account

### NOTE
compilation of the Telos Native C++ contracts has been tested on an Ubuntu 22 (major issues with compiling it and trying to run it on MacOS) with CDT 3.1 https://github.com/AntelopeIO/cdt/releases/tag/v3.1.0 (more up to date versions have brakable updates that are not working properly with existing version of Telos)  
to generate types for your smart contract use wharkfit cli
```
npx @wharfkit/cli generate evm.boid -u https://telos.testnet.boid.animus.is -f evm.boid.ts
```

## Deploy BOID token smart contract (OFT standard - TokenContract.sol)
#### Compilation
```
cd evm/contracts_deploy
yarn install
yarn build
node dist/compile_contract.js 1
```
#### Deploy EVM side
```
node dist/contracts_deploy.js testnet 1
```

!IMPORTANT! - after you deployed the token contract, update the config.toml file with the new token contract address TOKEN_CONTRACT_DEPLOYED_ACC. Do not deploy the TokenBridge contract until you do that!!!

When contract is deployed you should verify it on https://sourcify.dev  
Example already done on Telos Testnet EVM 0x00B2656e963242BbA1B6Ba618c72c86eb839a1C9
https://testnet.teloscan.io/address/0x00B2656e963242BbA1B6Ba618c72c86eb839a1C9?tab=contract  

- transferBridgeRole action - this needs to be run and pointed to the bridge smart contract so it can burn and mint tokens
- transferAdminRole action - this should point to the evm account that was generated from evm.boid account
- transferOwnership action - this should point to the evm account that was generated from evm.boid account

testnet token contract has admin setup as 0x1D8F40d91602DF5117Bd6D97D2aC4EDE5C9FB300  

## Deploy token bridge smart contract (TokenBridge.sol)
#### Compilation
```
cd evm-compile-deploy
yarn install
yarn build
node dist/util/compile_contract.js 2
```
#### Deploy
```
cd evm-compile-deploy
node dist/util/deploy_contract.js testnet 2
```

## Setting up deployed native smart contracts
#### xsend.boid (feeForwarder.cpp contract source file)
1. in configuration-testing\src\config\feeForwarderConfig.ts run setGlobalConfig function
2. then regtoken function
3. now the fee contract is configured and ready to go

#### evm.boid (tokenBridge.cpp contract source file)
1. in configuration-testing\src\config\tokenBridgeConfig.ts run initiateContract function to initiate the contract with proper settings
- evm_bridge_address - 0x... address for evm deployed bridge smart contract
- evm_token_address - 0x... address for the token smart contract deployed on evm side
- evm_chain_id - 40 for mainnet or 41 for testnet
- native_token_symbol - for example BOID
- native_token_contract - for example token.boid
- fees_contract - native contract that will be accepting fees
- is_locked - locking the setup for the smart contract

