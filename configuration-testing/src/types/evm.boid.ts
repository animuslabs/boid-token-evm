import type {Action, Checksum160Type, NameType, UInt8Type} from '@wharfkit/antelope'
import {
    ABI,
    Asset,
    Blob,
    Checksum160,
    Checksum256,
    Name,
    Struct,
    TimePoint,
    UInt64,
    UInt8,
} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yAAYMYnJpZGdlY29uZmlnAAgSZXZtX2JyaWRnZV9hZGRyZXNzC2NoZWNrc3VtMTYwEGV2bV9icmlkZ2Vfc2NvcGUGdWludDY0EWV2bV90b2tlbl9hZGRyZXNzC2NoZWNrc3VtMTYwDGV2bV9jaGFpbl9pZAV1aW50OBNuYXRpdmVfdG9rZW5fc3ltYm9sBnN5bWJvbBVuYXRpdmVfdG9rZW5fY29udHJhY3QEbmFtZQ1mZWVzX2NvbnRyYWN0BG5hbWUJaXNfbG9ja2VkBGJvb2wEaW5pdAAHEmV2bV9icmlkZ2VfYWRkcmVzcwtjaGVja3N1bTE2MBFldm1fdG9rZW5fYWRkcmVzcwtjaGVja3N1bTE2MAxldm1fY2hhaW5faWQFdWludDgTbmF0aXZlX3Rva2VuX3N5bWJvbAZzeW1ib2wVbmF0aXZlX3Rva2VuX2NvbnRyYWN0BG5hbWUNZmVlc19jb250cmFjdARuYW1lCWlzX2xvY2tlZARib29sDHJlZnVuZG5vdGlmeQAAB3JlZnVuZHMAAwlyZWZ1bmRfaWQGdWludDY0B2NhbGxfaWQLY2hlY2tzdW0yNTYJdGltZXN0YW1wCnRpbWVfcG9pbnQJcmVxbm90aWZ5AAAIcmVxdWVzdHMAAwpyZXF1ZXN0X2lkBnVpbnQ2NAdjYWxsX2lkC2NoZWNrc3VtMjU2CXRpbWVzdGFtcAp0aW1lX3BvaW50AwAAAAAAkN10BGluaXQA4JfLdKapl7oMcmVmdW5kbm90aWZ5AAAA8MtlOq26CXJlcW5vdGlmeQADwNyaFCmW3D0DaTY0AAAMYnJpZGdlY29uZmlnAAAAAKepl7oDaTY0AAAHcmVmdW5kcwAAADhjpa26A2k2NAAACHJlcXVlc3RzAAAAAAA='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('bridgeconfig')
    export class bridgeconfig extends Struct {
        @Struct.field(Checksum160)
        declare evm_bridge_address: Checksum160
        @Struct.field(UInt64)
        declare evm_bridge_scope: UInt64
        @Struct.field(Checksum160)
        declare evm_token_address: Checksum160
        @Struct.field(UInt8)
        declare evm_chain_id: UInt8
        @Struct.field(Asset.Symbol)
        declare native_token_symbol: Asset.Symbol
        @Struct.field(Name)
        declare native_token_contract: Name
        @Struct.field(Name)
        declare fees_contract: Name
        @Struct.field('bool')
        declare is_locked: boolean
    }
    @Struct.type('init')
    export class init extends Struct {
        @Struct.field(Checksum160)
        declare evm_bridge_address: Checksum160
        @Struct.field(Checksum160)
        declare evm_token_address: Checksum160
        @Struct.field(UInt8)
        declare evm_chain_id: UInt8
        @Struct.field(Asset.Symbol)
        declare native_token_symbol: Asset.Symbol
        @Struct.field(Name)
        declare native_token_contract: Name
        @Struct.field(Name)
        declare fees_contract: Name
        @Struct.field('bool')
        declare is_locked: boolean
    }
    @Struct.type('refundnotify')
    export class refundnotify extends Struct {}
    @Struct.type('refunds')
    export class refunds extends Struct {
        @Struct.field(UInt64)
        declare refund_id: UInt64
        @Struct.field(Checksum256)
        declare call_id: Checksum256
        @Struct.field(TimePoint)
        declare timestamp: TimePoint
    }
    @Struct.type('reqnotify')
    export class reqnotify extends Struct {}
    @Struct.type('requests')
    export class requests extends Struct {
        @Struct.field(UInt64)
        declare request_id: UInt64
        @Struct.field(Checksum256)
        declare call_id: Checksum256
        @Struct.field(TimePoint)
        declare timestamp: TimePoint
    }
}
export const TableMap = {
    bridgeconfig: Types.bridgeconfig,
    refunds: Types.refunds,
    requests: Types.requests,
}
export interface TableTypes {
    bridgeconfig: Types.bridgeconfig
    refunds: Types.refunds
    requests: Types.requests
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {}
    export interface init {
        evm_bridge_address: Checksum160Type
        evm_token_address: Checksum160Type
        evm_chain_id: UInt8Type
        native_token_symbol: Asset.SymbolType
        native_token_contract: NameType
        fees_contract: NameType
        is_locked: boolean
    }
    export interface refundnotify {}
    export interface reqnotify {}
}
export interface ActionNameParams {
    init: ActionParams.init
    refundnotify: ActionParams.refundnotify
    reqnotify: ActionParams.reqnotify
}
export type ActionNames = keyof ActionNameParams
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('evm.boid'),
        })
    }
    action<T extends ActionNames>(
        name: T,
        data: ActionNameParams[T],
        options?: ActionOptions
    ): Action {
        return super.action(name, data, options)
    }
    table<T extends TableNames>(name: T, scope?: NameType): Table<RowType<T>> {
        return super.table(name, scope, TableMap[name])
    }
}
