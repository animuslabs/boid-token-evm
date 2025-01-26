import type {Action, AssetType, NameType} from '@wharfkit/antelope'
import {ABI, Asset, Blob, Name, Struct, TimePointSec, UInt64} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yAAgLY2xhaW1yZWZ1bmQAAQR1c2VyBG5hbWUIZGVsdG9rZW4AAQx0b2tlbl9zeW1ib2wGc3ltYm9sCmZlZV9yZWNvcmQABQJpZAZ1aW50NjQEdXNlcgRuYW1lBmFtb3VudAVhc3NldA50b2tlbl9jb250cmFjdARuYW1lCmNyZWF0ZWRfYXQOdGltZV9wb2ludF9zZWMMZ2xvYmFsX3N0YXRlAAYCaWQGdWludDY0A2ZlZQVhc3NldBJmZWVfdG9rZW5fY29udHJhY3QEbmFtZRBmZWVfdG9rZW5fc3ltYm9sBnN5bWJvbA5icmlkZ2VfYWNjb3VudARuYW1lCGV2bV9tZW1vBnN0cmluZwhyZWd0b2tlbgADDnRva2VuX2NvbnRyYWN0BG5hbWUMdG9rZW5fc3ltYm9sBnN5bWJvbAptaW5fYW1vdW50BWFzc2V0CXNldGdsb2JhbAAFA2ZlZQVhc3NldBJmZWVfdG9rZW5fY29udHJhY3QEbmFtZRBmZWVfdG9rZW5fc3ltYm9sBnN5bWJvbA5icmlkZ2VfYWNjb3VudARuYW1lCGV2bV9tZW1vBnN0cmluZwx0b2tlbl9jb25maWcAAwx0b2tlbl9zeW1ib2wGc3ltYm9sDnRva2VuX2NvbnRyYWN0BG5hbWUKbWluX2Ftb3VudAVhc3NldAx3aXRoZHJhd2ZlZXMAAAUA0tRLXelMRAtjbGFpbXJlZnVuZAAAAABTQZqjSghkZWx0b2tlbgAAAABTQZqZughyZWd0b2tlbgAAAIjm0MiywglzZXRnbG9iYWwAgJVa3NzUsuMMd2l0aGRyYXdmZWVzAAMAAAAAAICVWgNpNjQAAApmZWVfcmVjb3JkAAAAAERzaGQDaTY0AAAMZ2xvYmFsX3N0YXRlAAAAAOCpIM0DaTY0AAAMdG9rZW5fY29uZmlnAAAAAAA='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('claimrefund')
    export class claimrefund extends Struct {
        @Struct.field(Name)
        declare user: Name
    }
    @Struct.type('deltoken')
    export class deltoken extends Struct {
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
    }
    @Struct.type('fee_record')
    export class fee_record extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Name)
        declare user: Name
        @Struct.field(Asset)
        declare amount: Asset
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(TimePointSec)
        declare created_at: TimePointSec
    }
    @Struct.type('global_state')
    export class global_state extends Struct {
        @Struct.field(UInt64)
        declare id: UInt64
        @Struct.field(Asset)
        declare fee: Asset
        @Struct.field(Name)
        declare fee_token_contract: Name
        @Struct.field(Asset.Symbol)
        declare fee_token_symbol: Asset.Symbol
        @Struct.field(Name)
        declare bridge_account: Name
        @Struct.field('string')
        declare evm_memo: string
    }
    @Struct.type('regtoken')
    export class regtoken extends Struct {
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
        @Struct.field(Asset)
        declare min_amount: Asset
    }
    @Struct.type('setglobal')
    export class setglobal extends Struct {
        @Struct.field(Asset)
        declare fee: Asset
        @Struct.field(Name)
        declare fee_token_contract: Name
        @Struct.field(Asset.Symbol)
        declare fee_token_symbol: Asset.Symbol
        @Struct.field(Name)
        declare bridge_account: Name
        @Struct.field('string')
        declare evm_memo: string
    }
    @Struct.type('token_config')
    export class token_config extends Struct {
        @Struct.field(Asset.Symbol)
        declare token_symbol: Asset.Symbol
        @Struct.field(Name)
        declare token_contract: Name
        @Struct.field(Asset)
        declare min_amount: Asset
    }
    @Struct.type('withdrawfees')
    export class withdrawfees extends Struct {}
}
export const TableMap = {
    fees: Types.fee_record,
    global: Types.global_state,
    tokens: Types.token_config,
}
export interface TableTypes {
    fees: Types.fee_record
    global: Types.global_state
    tokens: Types.token_config
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {}
    export interface claimrefund {
        user: NameType
    }
    export interface deltoken {
        token_symbol: Asset.SymbolType
    }
    export interface regtoken {
        token_contract: NameType
        token_symbol: Asset.SymbolType
        min_amount: AssetType
    }
    export interface setglobal {
        fee: AssetType
        fee_token_contract: NameType
        fee_token_symbol: Asset.SymbolType
        bridge_account: NameType
        evm_memo: string
    }
    export interface withdrawfees {}
}
export interface ActionNameParams {
    claimrefund: ActionParams.claimrefund
    deltoken: ActionParams.deltoken
    regtoken: ActionParams.regtoken
    setglobal: ActionParams.setglobal
    withdrawfees: ActionParams.withdrawfees
}
export type ActionNames = keyof ActionNameParams
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('xsend.boid'),
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
