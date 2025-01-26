import type {Action, AssetType, NameType} from '@wharfkit/antelope'
import {
    ABI,
    Asset,
    Blob,
    Bytes,
    Float32,
    Float64,
    Int16,
    Int32,
    Int64,
    Int8,
    Name,
    Struct,
    UInt16,
    UInt32,
    UInt64,
    UInt8,
    Variant,
} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yAAoHQWNjb3VudAABB2JhbGFuY2UFYXNzZXQMQXRvbWljRm9ybWF0AAIEbmFtZQZzdHJpbmcEdHlwZQZzdHJpbmcORXh0ZW5kZWRTeW1ib2wAAgNzeW0Gc3ltYm9sCGNvbnRyYWN0BG5hbWUEU3RhdAADBnN1cHBseQVhc3NldAptYXhfc3VwcGx5BWFzc2V0Bmlzc3VlcgRuYW1lBWNsb3NlAAIFb3duZXIEbmFtZQZzeW1ib2wGc3ltYm9sBmNyZWF0ZQACBmlzc3VlcgRuYW1lDm1heGltdW1fc3VwcGx5BWFzc2V0BWlzc3VlAAMCdG8EbmFtZQhxdWFudGl0eQVhc3NldARtZW1vBnN0cmluZwRvcGVuAAMFb3duZXIEbmFtZQZzeW1ib2wGc3ltYm9sCXJhbV9wYXllcgRuYW1lBnJldGlyZQACCHF1YW50aXR5BWFzc2V0BG1lbW8Gc3RyaW5nCHRyYW5zZmVyAAQEZnJvbQRuYW1lAnRvBG5hbWUIcXVhbnRpdHkFYXNzZXQEbWVtbwZzdHJpbmcGAAAAAACFaUQFY2xvc2UAAAAAAKhs1EUGY3JlYXRlAAAAAAAApTF2BWlzc3VlAAAAAAAAMFWlBG9wZW4AAAAAAKjrsroGcmV0aXJlAAAAAFctPM3NCHRyYW5zZmVyAAIAAAA4T00RMgNpNjQAAAdBY2NvdW50AAAAAACQTcYDaTY0AAAEU3RhdAAAAAELQXRvbWljVmFsdWUWBGludDgFaW50MTYFaW50MzIFaW50NjQFdWludDgGdWludDE2BnVpbnQzMgZ1aW50NjQHZmxvYXQzMgdmbG9hdDY0BnN0cmluZwZpbnQ4W10HaW50MTZbXQdpbnQzMltdB2ludDY0W10FYnl0ZXMIdWludDE2W10IdWludDMyW10IdWludDY0W10JZmxvYXQzMltdCWZsb2F0NjRbXQhzdHJpbmdbXQA='
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Variant.type('AtomicValue', [
        Int8,
        Int16,
        Int32,
        Int64,
        UInt8,
        UInt16,
        UInt32,
        UInt64,
        Float32,
        Float64,
        'string',
        {type: Int8, array: true},
        {type: Int16, array: true},
        {type: Int32, array: true},
        {type: Int64, array: true},
        Bytes,
        {type: UInt16, array: true},
        {type: UInt32, array: true},
        {type: UInt64, array: true},
        {type: Float32, array: true},
        {type: Float64, array: true},
        'string[]',
    ])
    export class AtomicValue extends Variant {
        declare value:
            | Int8
            | Int16
            | Int32
            | Int64
            | UInt8
            | UInt16
            | UInt32
            | UInt64
            | Float32
            | Float64
            | string
            | Int8[]
            | Int16[]
            | Int32[]
            | Int64[]
            | Bytes
            | UInt16[]
            | UInt32[]
            | UInt64[]
            | Float32[]
            | Float64[]
            | string[]
    }
    @Struct.type('Account')
    export class Account extends Struct {
        @Struct.field(Asset)
        declare balance: Asset
    }
    @Struct.type('AtomicFormat')
    export class AtomicFormat extends Struct {
        @Struct.field('string')
        declare name: string
        @Struct.field('string')
        declare type: string
    }
    @Struct.type('ExtendedSymbol')
    export class ExtendedSymbol extends Struct {
        @Struct.field(Asset.Symbol)
        declare sym: Asset.Symbol
        @Struct.field(Name)
        declare contract: Name
    }
    @Struct.type('Stat')
    export class Stat extends Struct {
        @Struct.field(Asset)
        declare supply: Asset
        @Struct.field(Asset)
        declare max_supply: Asset
        @Struct.field(Name)
        declare issuer: Name
    }
    @Struct.type('close')
    export class close extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Asset.Symbol)
        declare symbol: Asset.Symbol
    }
    @Struct.type('create')
    export class create extends Struct {
        @Struct.field(Name)
        declare issuer: Name
        @Struct.field(Asset)
        declare maximum_supply: Asset
    }
    @Struct.type('issue')
    export class issue extends Struct {
        @Struct.field(Name)
        declare to: Name
        @Struct.field(Asset)
        declare quantity: Asset
        @Struct.field('string')
        declare memo: string
    }
    @Struct.type('open')
    export class open extends Struct {
        @Struct.field(Name)
        declare owner: Name
        @Struct.field(Asset.Symbol)
        declare symbol: Asset.Symbol
        @Struct.field(Name)
        declare ram_payer: Name
    }
    @Struct.type('retire')
    export class retire extends Struct {
        @Struct.field(Asset)
        declare quantity: Asset
        @Struct.field('string')
        declare memo: string
    }
    @Struct.type('transfer')
    export class transfer extends Struct {
        @Struct.field(Name)
        declare from: Name
        @Struct.field(Name)
        declare to: Name
        @Struct.field(Asset)
        declare quantity: Asset
        @Struct.field('string')
        declare memo: string
    }
}
export const TableMap = {
    accounts: Types.Account,
    stat: Types.Stat,
}
export interface TableTypes {
    accounts: Types.Account
    stat: Types.Stat
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {}
    export interface close {
        owner: NameType
        symbol: Asset.SymbolType
    }
    export interface create {
        issuer: NameType
        maximum_supply: AssetType
    }
    export interface issue {
        to: NameType
        quantity: AssetType
        memo: string
    }
    export interface open {
        owner: NameType
        symbol: Asset.SymbolType
        ram_payer: NameType
    }
    export interface retire {
        quantity: AssetType
        memo: string
    }
    export interface transfer {
        from: NameType
        to: NameType
        quantity: AssetType
        memo: string
    }
}
export interface ActionNameParams {
    close: ActionParams.close
    create: ActionParams.create
    issue: ActionParams.issue
    open: ActionParams.open
    retire: ActionParams.retire
    transfer: ActionParams.transfer
}
export type ActionNames = keyof ActionNameParams
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('token.boid'),
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
