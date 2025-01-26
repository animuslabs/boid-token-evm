#!/bin/bash

# Path to JSON file
CONFIG_FILE="./../config.toml"

# Resolve and display the absolute path
ABS_CONFIG_PATH=$(realpath "$CONFIG_FILE" 2>/dev/null || echo "Invalid path")

# Check if the TOML file exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Error: Config file $CONFIG_FILE not found!"
  echo "Looking for the file at: $ABS_CONFIG_PATH"
  exit 1
else
  echo "Config file found at: $ABS_CONFIG_PATH"
fi

# Extract BRIDGE_CONTRACT_NAME from TOML using yq
BRIDGE_CONTRACT_NAME=$(yq eval '.Native_contracts.BRIDGE_CONTRACT_NAME' "$CONFIG_FILE")
EVM_SYSTEM_CONTRACT=$(yq eval '.Native_contracts.EVM_SYSTEM_CONTRACT' "$CONFIG_FILE")

# Check if BRIDGE_CONTRACT_NAME was extracted successfully
if [ -z "$BRIDGE_CONTRACT_NAME" ] || [ "$BRIDGE_CONTRACT_NAME" == "null" ]; then
  echo "Error: BRIDGE_CONTRACT_NAME not found or empty in $CONFIG_FILE!"
  exit 1
fi

# Check if EVM_SYSTEM_CONTRACT was extracted successfully
if [ -z "$EVM_SYSTEM_CONTRACT" ] || [ "$EVM_SYSTEM_CONTRACT" == "null" ]; then
  echo "Error: EVM_SYSTEM_CONTRACT not found or empty in $CONFIG_FILE!"
  exit 1
fi

echo ">>> Building contract with BRIDGE_CONTRACT_NAME: $BRIDGE_CONTRACT_NAME and EVM_SYSTEM_CONTRACT: $EVM_SYSTEM_CONTRACT"

# Create build directory if it doesn't exist
if [ ! -d "$PWD/build" ]; then
  mkdir -p build
fi

# Compile the contract with eosio-cpp
cdt-cpp -I="./include_tokenBridge/" -I="./external/" \
  -D BRIDGE_CONTRACT_NAME="\"$BRIDGE_CONTRACT_NAME\"" \
  -D EVM_SYSTEM_CONTRACT="\"$EVM_SYSTEM_CONTRACT\"" \
  -o="./build/$BRIDGE_CONTRACT_NAME.wasm" \
  -contract=$BRIDGE_CONTRACT_NAME \
  -abigen -abigen_output="./build/$BRIDGE_CONTRACT_NAME.abi" \
  ./src/tokenBridge.cpp

echo ">>> Build complete. BRIDGE_CONTRACT_NAME set to: $BRIDGE_CONTRACT_NAME and EVM_SYSTEM_CONTRACT set to: $EVM_SYSTEM_CONTRACT"