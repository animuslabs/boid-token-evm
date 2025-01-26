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

# Extract from TOML using yq
FEES_CONTRACT_NAME=$(yq eval '.Native_contracts.FEES_CONTRACT_NAME' "$CONFIG_FILE")

# Check if FEES_CONTRACT_NAME was extracted successfully
if [ -z "$FEES_CONTRACT_NAME" ] || [ "$FEES_CONTRACT_NAME" == "null" ]; then
  echo "Error: FEES_CONTRACT_NAME not found or empty in $CONFIG_FILE!"
  exit 1
fi

echo ">>> Building contract called $FEES_CONTRACT_NAME..."
# Create build directory if it doesn't exist
if [ ! -d "$PWD/build" ]; then
  mkdir -p build
fi

# Compile the contract with eosio-cpp
cdt-cpp -I="./external/" \
  -I="./include_feeForwarder/" \
  -o="./build/$FEES_CONTRACT_NAME.wasm" \
  -contract=$FEES_CONTRACT_NAME \
  -D FEES_CONTRACT_NAME="\"$FEES_CONTRACT_NAME\"" \
  -abigen -abigen_output="./build/$FEES_CONTRACT_NAME.abi" \
  ./src/feeForwarder.cpp

echo ">>> Build complete."
