# Deployment steps
- to create account on Telos Native if you need to do it through m-sign you can use this tool: https://msig.animus.is also to deploy smart contracts
- useful script to change permissions an Telos Native account - util/accKeys.ts
- important to have jq version 4 or above installed for example: https://github.com/mikefarah/yq/releases/tag/v4.45.1
- create types for EVM smart contracts use typechain (npx typechain --target ethers-v6 --out-dir ./types ./TelosEVMContracts/TokenBridge.json --show-stack-traces)
## Before you start list:
- token.boid - token contract ready to go
- xsend.boid - this will be the feeForwarder smart contract
- evm.boid - this will be token bridge smart contract (generate evm account name before deploy)
- evm/contracts_deploy/.env - make sure that you have all the information
- antelope/config.json - same

Acconts involved in the Telos bridge:  
Native/Zero  
- token.boid - token contract
- xsend.boid - account for collecting fees connected to the evm bridge ( user should send BOID, TLOS (fee), memo with EVM acc name where the BOID should go ) - this contract can be created by running the antelope/buildFeeForwarder.sh bash file
- evm.boid - token bridge to evm (in the code originally named token.brdg) (tokens are locked here when the user sends the transfer) (need to generate an evm account from this account and evm fees costs will be taken from that account for transfers from native to evm) - this contract can be created by running the antelope/buildTokenBridge.sh bash file

EVM
- token bridge account
- BOID token in OFT standard account - after deploy need to make sure that owner, BRIDGE_ROLE and DEFAULT_ADMIN_ROLE are pointed to right places
- pair bridge register account

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
#### Deploy
```
node dist/contracts_deploy.js testnet 1
```

When contract is deployed you should verify it on https://sourcify.dev  
Example already done on Telos Testnet EVM 0x932Ebc45117A00be19b27A586142b94d14D8a8aA
https://testnet.teloscan.io/address/0x932Ebc45117A00be19b27A586142b94d14D8a8aA?tab=contract  

- transferBridgeRole action - this needs to be run and pointed to the bridge smart contract so it can burn and mint tokens
- transferAdminRole action - this should point to the evm account that was generated from evm.boid account
- transferOwnership action - this should point to the evm account that was generated from evm.boid account

testnet token contract has admin setup as 0x1D8F40d91602DF5117Bd6D97D2aC4EDE5C9FB300  

## Deploy pair bridge register smart contract (PairBridgeRegister.sol)
#### Compilation
```
cd evm/contracts_deploy
yarn install
yarn build
node dist/compile_contract.js 3
```
#### Deploy
```
node dist/deploy_contract.js testnet 3
```

## Deploy token bridge smart contract (TokenBridge.sol)
#### Compilation
```
cd evm/contracts_deploy
yarn install
yarn build
node dist/deploy_contract.js 2
```

#### Deploy
```
cd evm/contracts_deploy
node dist/deploy_contract.js testnet 2
```


## Setting up deployed smart contracts
### Native side
#### xsend.boid (feeForwarder.cpp contract source file)
1. in configuration-testing\src\config\feeForwarderConfig.ts run setGlobalConfig function
2. then regtoken function
3. now the fee contract is configured and ready to go

#### evm.boid (tokenBridge.cpp contract source file)
1. in configuration-testing\src\config\tokenBridgeConfig.ts run initiateContract function to initiate the contract with proper settings
- bridge_address - EVM token bridge contract address
- register_address - EVM register contract address
- version - version of the contract,
- admin - name of the administrator of this contract, this is an antelope account, normally the same account as the contract

2. in configuration-testing\src\config\tokenBridgeConfig.ts run signregpair to register the token pair to be supported by the bridge | IMPORTANT! This can only be run when on the EVM side you already made a reqRegistration on the pair bridge register.


- evm_address - The EVM address of the token to register.
- account - The EOSIO account that manages the token on Antelope.
- symbol - The symbol of the token to register.
- request_id - A unique identifier for the registration request.  
##### IMPORTANT - This action must be signed by the EOSIO account that manages the token on Antelope.

### EVM side
#### 0x510dC84BfaA622f5dEa0B381880fd3F482c7b8Eb (PairBridgeRegister.sol contract source file)
1. in tokenBridgeEvmConfig run reqRegistration to make a request to register BOID token contract on the EVM side, normally it creates a request with ID 0, you can check if the request is active on the smarct contract by using the queryRequest function

#### 0xEB7A8fc575029CEed0f04EA3CF0Bd7462eCC62F9 (TokenBridge.sol contract source file)

####  0x932Ebc45117A00be19b27A586142b94d14D8a8aA (TokenContract.sol contract source file)