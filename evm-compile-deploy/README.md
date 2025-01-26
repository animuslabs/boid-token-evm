# tokenDeploy-on-telosEVM
to generate a new wallet for the contract creation use  
``
yarn wallet:generate
``

then make sure to setup the .env file  
next is to compile the contract and deploy it
``
yarn build
cd dist
node deploy_contract.js testnet
``
