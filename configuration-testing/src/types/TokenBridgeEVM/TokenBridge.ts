/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "./common";

export interface TokenBridgeInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "REQUEST_TIMEOUT"
      | "activeRequestIds"
      | "antelope_bridge_evm_address"
      | "antelope_symbol"
      | "antelope_token_contract"
      | "antelope_token_name"
      | "bridge"
      | "bridgeTo"
      | "bytes32ToString"
      | "clearFailedRequests"
      | "evm_approvedToken"
      | "evm_decimals"
      | "fee"
      | "max_requests_per_requestor"
      | "min_amount"
      | "owner"
      | "refundRequest"
      | "refundStuckReq"
      | "removeRequest"
      | "renounceOwnership"
      | "requestSuccessful"
      | "request_counts"
      | "request_id"
      | "requests"
      | "setAntelopeBridgeEvmAddress"
      | "setFee"
      | "setMaxRequestsPerRequestor"
      | "setMinAmount"
      | "setTokenInfo"
      | "transferOwnership"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "BridgeRequest"
      | "BridgeTransaction"
      | "FailedRequestCleared"
      | "OwnershipTransferred"
      | "RequestRemovalSuccess"
      | "RequestStatusCallback"
      | "ValidationStatus"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "REQUEST_TIMEOUT",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "activeRequestIds",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "antelope_bridge_evm_address",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "antelope_symbol",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "antelope_token_contract",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "antelope_token_name",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "bridge",
    values: [AddressLike, BigNumberish, string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "bridgeTo",
    values: [AddressLike, AddressLike, BigNumberish, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "bytes32ToString",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "clearFailedRequests",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "evm_approvedToken",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "evm_decimals",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "fee", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "max_requests_per_requestor",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "min_amount",
    values?: undefined
  ): string;
  encodeFunctionData(functionFragment: "owner", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "refundRequest",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "refundStuckReq",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "removeRequest",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "renounceOwnership",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "requestSuccessful",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "request_counts",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "request_id",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "requests",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "setAntelopeBridgeEvmAddress",
    values: [AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "setFee",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "setMaxRequestsPerRequestor",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "setMinAmount",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "setTokenInfo",
    values: [AddressLike, string, string, string]
  ): string;
  encodeFunctionData(
    functionFragment: "transferOwnership",
    values: [AddressLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "REQUEST_TIMEOUT",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "activeRequestIds",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "antelope_bridge_evm_address",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "antelope_symbol",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "antelope_token_contract",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "antelope_token_name",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "bridge", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "bridgeTo", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "bytes32ToString",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "clearFailedRequests",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "evm_approvedToken",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "evm_decimals",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "fee", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "max_requests_per_requestor",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "min_amount", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "owner", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "refundRequest",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "refundStuckReq",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "removeRequest",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "renounceOwnership",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "requestSuccessful",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "request_counts",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "request_id", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "requests", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setAntelopeBridgeEvmAddress",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "setFee", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "setMaxRequestsPerRequestor",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setMinAmount",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setTokenInfo",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "transferOwnership",
    data: BytesLike
  ): Result;
}

export namespace BridgeRequestEvent {
  export type InputTuple = [
    id: BigNumberish,
    sender: AddressLike,
    token: AddressLike,
    antelope_token_contract: string,
    antelope_symbol: string,
    amount: BigNumberish,
    receiver: string,
    timestamp: BigNumberish,
    memo: string,
    status: BigNumberish,
    reason: string
  ];
  export type OutputTuple = [
    id: bigint,
    sender: string,
    token: string,
    antelope_token_contract: string,
    antelope_symbol: string,
    amount: bigint,
    receiver: string,
    timestamp: bigint,
    memo: string,
    status: bigint,
    reason: string
  ];
  export interface OutputObject {
    id: bigint;
    sender: string;
    token: string;
    antelope_token_contract: string;
    antelope_symbol: string;
    amount: bigint;
    receiver: string;
    timestamp: bigint;
    memo: string;
    status: bigint;
    reason: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace BridgeTransactionEvent {
  export type InputTuple = [
    id: BigNumberish,
    receiver: AddressLike,
    token: AddressLike,
    amount: BigNumberish,
    status: BigNumberish,
    timestamp: BigNumberish,
    sender: string,
    from_token_contract: string,
    from_token_symbol: string,
    reason: string
  ];
  export type OutputTuple = [
    id: bigint,
    receiver: string,
    token: string,
    amount: bigint,
    status: bigint,
    timestamp: bigint,
    sender: string,
    from_token_contract: string,
    from_token_symbol: string,
    reason: string
  ];
  export interface OutputObject {
    id: bigint;
    receiver: string;
    token: string;
    amount: bigint;
    status: bigint;
    timestamp: bigint;
    sender: string;
    from_token_contract: string;
    from_token_symbol: string;
    reason: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace FailedRequestClearedEvent {
  export type InputTuple = [
    id: BigNumberish,
    sender: AddressLike,
    timestamp: BigNumberish
  ];
  export type OutputTuple = [id: bigint, sender: string, timestamp: bigint];
  export interface OutputObject {
    id: bigint;
    sender: string;
    timestamp: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace OwnershipTransferredEvent {
  export type InputTuple = [previousOwner: AddressLike, newOwner: AddressLike];
  export type OutputTuple = [previousOwner: string, newOwner: string];
  export interface OutputObject {
    previousOwner: string;
    newOwner: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace RequestRemovalSuccessEvent {
  export type InputTuple = [
    id: BigNumberish,
    sender: AddressLike,
    timestamp: BigNumberish,
    message: string
  ];
  export type OutputTuple = [
    id: bigint,
    sender: string,
    timestamp: bigint,
    message: string
  ];
  export interface OutputObject {
    id: bigint;
    sender: string;
    timestamp: bigint;
    message: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace RequestStatusCallbackEvent {
  export type InputTuple = [
    id: BigNumberish,
    sender: AddressLike,
    antelope_token_contract: string,
    antelope_symbol: string,
    amount: BigNumberish,
    receiver: string,
    status: BigNumberish,
    timestamp: BigNumberish,
    reason: string
  ];
  export type OutputTuple = [
    id: bigint,
    sender: string,
    antelope_token_contract: string,
    antelope_symbol: string,
    amount: bigint,
    receiver: string,
    status: bigint,
    timestamp: bigint,
    reason: string
  ];
  export interface OutputObject {
    id: bigint;
    sender: string;
    antelope_token_contract: string;
    antelope_symbol: string;
    amount: bigint;
    receiver: string;
    status: bigint;
    timestamp: bigint;
    reason: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ValidationStatusEvent {
  export type InputTuple = [
    message: string,
    token: AddressLike,
    receiver: AddressLike,
    amount: BigNumberish,
    sender: string,
    from_token_contract: string,
    from_token_symbol: string,
    timestamp: BigNumberish
  ];
  export type OutputTuple = [
    message: string,
    token: string,
    receiver: string,
    amount: bigint,
    sender: string,
    from_token_contract: string,
    from_token_symbol: string,
    timestamp: bigint
  ];
  export interface OutputObject {
    message: string;
    token: string;
    receiver: string;
    amount: bigint;
    sender: string;
    from_token_contract: string;
    from_token_symbol: string;
    timestamp: bigint;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface TokenBridge extends BaseContract {
  connect(runner?: ContractRunner | null): TokenBridge;
  waitForDeployment(): Promise<this>;

  interface: TokenBridgeInterface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  REQUEST_TIMEOUT: TypedContractMethod<[], [bigint], "view">;

  activeRequestIds: TypedContractMethod<[arg0: BigNumberish], [bigint], "view">;

  antelope_bridge_evm_address: TypedContractMethod<[], [string], "view">;

  antelope_symbol: TypedContractMethod<[], [string], "view">;

  antelope_token_contract: TypedContractMethod<[], [string], "view">;

  antelope_token_name: TypedContractMethod<[], [string], "view">;

  bridge: TypedContractMethod<
    [token: AddressLike, amount: BigNumberish, receiver: string, memo: string],
    [void],
    "payable"
  >;

  bridgeTo: TypedContractMethod<
    [
      token: AddressLike,
      receiver: AddressLike,
      amount: BigNumberish,
      sender: BytesLike
    ],
    [void],
    "nonpayable"
  >;

  bytes32ToString: TypedContractMethod<[_bytes32: BytesLike], [string], "view">;

  clearFailedRequests: TypedContractMethod<[], [void], "nonpayable">;

  evm_approvedToken: TypedContractMethod<[], [string], "view">;

  evm_decimals: TypedContractMethod<[], [bigint], "view">;

  fee: TypedContractMethod<[], [bigint], "view">;

  max_requests_per_requestor: TypedContractMethod<[], [bigint], "view">;

  min_amount: TypedContractMethod<[], [bigint], "view">;

  owner: TypedContractMethod<[], [string], "view">;

  refundRequest: TypedContractMethod<[id: BigNumberish], [void], "nonpayable">;

  refundStuckReq: TypedContractMethod<[], [void], "nonpayable">;

  removeRequest: TypedContractMethod<
    [id: BigNumberish],
    [boolean],
    "nonpayable"
  >;

  renounceOwnership: TypedContractMethod<[], [void], "nonpayable">;

  requestSuccessful: TypedContractMethod<
    [id: BigNumberish],
    [void],
    "nonpayable"
  >;

  request_counts: TypedContractMethod<[arg0: AddressLike], [bigint], "view">;

  request_id: TypedContractMethod<[], [bigint], "view">;

  requests: TypedContractMethod<
    [arg0: BigNumberish],
    [
      [
        bigint,
        string,
        bigint,
        bigint,
        string,
        string,
        string,
        bigint,
        bigint,
        string
      ] & {
        id: bigint;
        sender: string;
        amount: bigint;
        requested_at: bigint;
        antelope_token_contract: string;
        antelope_symbol: string;
        receiver: string;
        evm_decimals: bigint;
        status: bigint;
        memo: string;
      }
    ],
    "view"
  >;

  setAntelopeBridgeEvmAddress: TypedContractMethod<
    [_antelope_bridge_evm_address: AddressLike],
    [void],
    "nonpayable"
  >;

  setFee: TypedContractMethod<[_fee: BigNumberish], [void], "nonpayable">;

  setMaxRequestsPerRequestor: TypedContractMethod<
    [_max_requests_per_requestor: BigNumberish],
    [void],
    "nonpayable"
  >;

  setMinAmount: TypedContractMethod<
    [_min_amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  setTokenInfo: TypedContractMethod<
    [
      _evm_approvedToken: AddressLike,
      _antelope_token_contract: string,
      _antelope_token_name: string,
      _antelope_symbol: string
    ],
    [void],
    "nonpayable"
  >;

  transferOwnership: TypedContractMethod<
    [newOwner: AddressLike],
    [void],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "REQUEST_TIMEOUT"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "activeRequestIds"
  ): TypedContractMethod<[arg0: BigNumberish], [bigint], "view">;
  getFunction(
    nameOrSignature: "antelope_bridge_evm_address"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "antelope_symbol"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "antelope_token_contract"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "antelope_token_name"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "bridge"
  ): TypedContractMethod<
    [token: AddressLike, amount: BigNumberish, receiver: string, memo: string],
    [void],
    "payable"
  >;
  getFunction(
    nameOrSignature: "bridgeTo"
  ): TypedContractMethod<
    [
      token: AddressLike,
      receiver: AddressLike,
      amount: BigNumberish,
      sender: BytesLike
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "bytes32ToString"
  ): TypedContractMethod<[_bytes32: BytesLike], [string], "view">;
  getFunction(
    nameOrSignature: "clearFailedRequests"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "evm_approvedToken"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "evm_decimals"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "fee"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "max_requests_per_requestor"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "min_amount"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "owner"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "refundRequest"
  ): TypedContractMethod<[id: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "refundStuckReq"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "removeRequest"
  ): TypedContractMethod<[id: BigNumberish], [boolean], "nonpayable">;
  getFunction(
    nameOrSignature: "renounceOwnership"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "requestSuccessful"
  ): TypedContractMethod<[id: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "request_counts"
  ): TypedContractMethod<[arg0: AddressLike], [bigint], "view">;
  getFunction(
    nameOrSignature: "request_id"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "requests"
  ): TypedContractMethod<
    [arg0: BigNumberish],
    [
      [
        bigint,
        string,
        bigint,
        bigint,
        string,
        string,
        string,
        bigint,
        bigint,
        string
      ] & {
        id: bigint;
        sender: string;
        amount: bigint;
        requested_at: bigint;
        antelope_token_contract: string;
        antelope_symbol: string;
        receiver: string;
        evm_decimals: bigint;
        status: bigint;
        memo: string;
      }
    ],
    "view"
  >;
  getFunction(
    nameOrSignature: "setAntelopeBridgeEvmAddress"
  ): TypedContractMethod<
    [_antelope_bridge_evm_address: AddressLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "setFee"
  ): TypedContractMethod<[_fee: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setMaxRequestsPerRequestor"
  ): TypedContractMethod<
    [_max_requests_per_requestor: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "setMinAmount"
  ): TypedContractMethod<[_min_amount: BigNumberish], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setTokenInfo"
  ): TypedContractMethod<
    [
      _evm_approvedToken: AddressLike,
      _antelope_token_contract: string,
      _antelope_token_name: string,
      _antelope_symbol: string
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "transferOwnership"
  ): TypedContractMethod<[newOwner: AddressLike], [void], "nonpayable">;

  getEvent(
    key: "BridgeRequest"
  ): TypedContractEvent<
    BridgeRequestEvent.InputTuple,
    BridgeRequestEvent.OutputTuple,
    BridgeRequestEvent.OutputObject
  >;
  getEvent(
    key: "BridgeTransaction"
  ): TypedContractEvent<
    BridgeTransactionEvent.InputTuple,
    BridgeTransactionEvent.OutputTuple,
    BridgeTransactionEvent.OutputObject
  >;
  getEvent(
    key: "FailedRequestCleared"
  ): TypedContractEvent<
    FailedRequestClearedEvent.InputTuple,
    FailedRequestClearedEvent.OutputTuple,
    FailedRequestClearedEvent.OutputObject
  >;
  getEvent(
    key: "OwnershipTransferred"
  ): TypedContractEvent<
    OwnershipTransferredEvent.InputTuple,
    OwnershipTransferredEvent.OutputTuple,
    OwnershipTransferredEvent.OutputObject
  >;
  getEvent(
    key: "RequestRemovalSuccess"
  ): TypedContractEvent<
    RequestRemovalSuccessEvent.InputTuple,
    RequestRemovalSuccessEvent.OutputTuple,
    RequestRemovalSuccessEvent.OutputObject
  >;
  getEvent(
    key: "RequestStatusCallback"
  ): TypedContractEvent<
    RequestStatusCallbackEvent.InputTuple,
    RequestStatusCallbackEvent.OutputTuple,
    RequestStatusCallbackEvent.OutputObject
  >;
  getEvent(
    key: "ValidationStatus"
  ): TypedContractEvent<
    ValidationStatusEvent.InputTuple,
    ValidationStatusEvent.OutputTuple,
    ValidationStatusEvent.OutputObject
  >;

  filters: {
    "BridgeRequest(uint256,address,address,string,string,uint256,string,uint256,string,uint8,string)": TypedContractEvent<
      BridgeRequestEvent.InputTuple,
      BridgeRequestEvent.OutputTuple,
      BridgeRequestEvent.OutputObject
    >;
    BridgeRequest: TypedContractEvent<
      BridgeRequestEvent.InputTuple,
      BridgeRequestEvent.OutputTuple,
      BridgeRequestEvent.OutputObject
    >;

    "BridgeTransaction(uint256,address,address,uint256,uint8,uint256,string,string,string,string)": TypedContractEvent<
      BridgeTransactionEvent.InputTuple,
      BridgeTransactionEvent.OutputTuple,
      BridgeTransactionEvent.OutputObject
    >;
    BridgeTransaction: TypedContractEvent<
      BridgeTransactionEvent.InputTuple,
      BridgeTransactionEvent.OutputTuple,
      BridgeTransactionEvent.OutputObject
    >;

    "FailedRequestCleared(uint256,address,uint256)": TypedContractEvent<
      FailedRequestClearedEvent.InputTuple,
      FailedRequestClearedEvent.OutputTuple,
      FailedRequestClearedEvent.OutputObject
    >;
    FailedRequestCleared: TypedContractEvent<
      FailedRequestClearedEvent.InputTuple,
      FailedRequestClearedEvent.OutputTuple,
      FailedRequestClearedEvent.OutputObject
    >;

    "OwnershipTransferred(address,address)": TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;
    OwnershipTransferred: TypedContractEvent<
      OwnershipTransferredEvent.InputTuple,
      OwnershipTransferredEvent.OutputTuple,
      OwnershipTransferredEvent.OutputObject
    >;

    "RequestRemovalSuccess(uint256,address,uint256,string)": TypedContractEvent<
      RequestRemovalSuccessEvent.InputTuple,
      RequestRemovalSuccessEvent.OutputTuple,
      RequestRemovalSuccessEvent.OutputObject
    >;
    RequestRemovalSuccess: TypedContractEvent<
      RequestRemovalSuccessEvent.InputTuple,
      RequestRemovalSuccessEvent.OutputTuple,
      RequestRemovalSuccessEvent.OutputObject
    >;

    "RequestStatusCallback(uint256,address,string,string,uint256,string,uint8,uint256,string)": TypedContractEvent<
      RequestStatusCallbackEvent.InputTuple,
      RequestStatusCallbackEvent.OutputTuple,
      RequestStatusCallbackEvent.OutputObject
    >;
    RequestStatusCallback: TypedContractEvent<
      RequestStatusCallbackEvent.InputTuple,
      RequestStatusCallbackEvent.OutputTuple,
      RequestStatusCallbackEvent.OutputObject
    >;

    "ValidationStatus(string,address,address,uint256,string,string,string,uint256)": TypedContractEvent<
      ValidationStatusEvent.InputTuple,
      ValidationStatusEvent.OutputTuple,
      ValidationStatusEvent.OutputObject
    >;
    ValidationStatus: TypedContractEvent<
      ValidationStatusEvent.InputTuple,
      ValidationStatusEvent.OutputTuple,
      ValidationStatusEvent.OutputObject
    >;
  };
}
