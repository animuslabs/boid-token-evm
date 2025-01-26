import type {
    Action,
    AssetType,
    BytesType,
    Checksum160Type,
    NameType,
    UInt16Type,
    UInt32Type,
    UInt64Type,
    UInt8Type,
} from '@wharfkit/antelope'
import {
    ABI,
    Asset,
    Blob,
    Bytes,
    Checksum160,
    Checksum256,
    Name,
    Struct,
    UInt16,
    UInt32,
    UInt64,
    UInt8,
} from '@wharfkit/antelope'
import type {ActionOptions, ContractArgs, PartialBy, Table} from '@wharfkit/contract'
import {Contract as BaseContract} from '@wharfkit/contract'
export const abiBlob = Blob.from(
    'DmVvc2lvOjphYmkvMS4yABAHQWNjb3VudAAGBWluZGV4BnVpbnQ2NAdhZGRyZXNzC2NoZWNrc3VtMTYwB2FjY291bnQEbmFtZQVub25jZQZ1aW50NjQEY29kZQVieXRlcwdiYWxhbmNlC2NoZWNrc3VtMjU2DEFjY291bnRTdGF0ZQADBWluZGV4BnVpbnQ2NANrZXkLY2hlY2tzdW0yNTYFdmFsdWULY2hlY2tzdW0yNTYEY2FsbAADCXJhbV9wYXllcgRuYW1lAnR4BWJ5dGVzBnNlbmRlcgxjaGVja3N1bTE2MD8GY29uZmlnAAUJdHJ4X2luZGV4BnVpbnQzMgpsYXN0X2Jsb2NrBnVpbnQzMg5nYXNfdXNlZF9ibG9jawtjaGVja3N1bTI1NglnYXNfcHJpY2ULY2hlY2tzdW0yNTYIcmV2aXNpb24HdWludDMyJAZjcmVhdGUAAgdhY2NvdW50BG5hbWUEZGF0YQZzdHJpbmcLZG9yZXNvdXJjZXMAAARpbml0AAYLc3RhcnRfYnl0ZXMGdWludDY0CnN0YXJ0X2Nvc3QFYXNzZXQLdGFyZ2V0X2ZyZWUGdWludDY0B21pbl9idXkGdWludDY0EGZlZV90cmFuc2Zlcl9wY3QGdWludDE2DGdhc19wZXJfYnl0ZQZ1aW50NjQIaXR4X2RhdGEAEghjYWxsVHlwZQVieXRlcwRmcm9tC2NoZWNrc3VtMTYwA2dhcwVieXRlcwVpbnB1dAVieXRlcwJ0bwVieXRlcwV2YWx1ZQVieXRlcwdnYXNVc2VkBWJ5dGVzBm91dHB1dAVieXRlcwRjb2RlBWJ5dGVzBGluaXQFYnl0ZXMHYWRkcmVzcwZzdHJpbmcJc3VidHJhY2VzBnVpbnQxNgx0cmFjZUFkZHJlc3MIdWludDE2W10EdHlwZQZzdHJpbmcFZGVwdGgGc3RyaW5nBWVycm9yBnN0cmluZwVleHRyYRRwYWlyX3N0cmluZ19zdHJpbmdbXQZzdGF0dXMFdWludDgKb3BlbndhbGxldAACB2FjY291bnQEbmFtZQdhZGRyZXNzC2NoZWNrc3VtMTYwEnBhaXJfc3RyaW5nX3N0cmluZwACBWZpcnN0BnN0cmluZwZzZWNvbmQGc3RyaW5nA3JhdwAECXJhbV9wYXllcgRuYW1lAnR4BWJ5dGVzDGVzdGltYXRlX2dhcwRib29sBnNlbmRlcgxjaGVja3N1bTE2MD8HcmVjZWlwdAANAnR4BWJ5dGVzCXRyeF9pbmRleAZ1aW50MzIFYmxvY2sGdWludDY0BGZyb20Gc3RyaW5nBnN0YXR1cwV1aW50OAVlcG9jaAZ1aW50MzILY3JlYXRlZGFkZHIGc3RyaW5nB2dhc3VzZWQGc3RyaW5nDGdhc3VzZWRibG9jawZzdHJpbmcEbG9ncwZzdHJpbmcGb3V0cHV0BnN0cmluZwZlcnJvcnMGc3RyaW5nBGl0eHMKaXR4X2RhdGFbXQlyZXNvdXJjZXMACAxnYXNfcGVyX2J5dGULY2hlY2tzdW0yNTYJYnl0ZV9jb3N0C2NoZWNrc3VtMjU2CmJ5dGVzX3VzZWQGdWludDY0DGJ5dGVzX2JvdWdodAZ1aW50NjQRdGFyZ2V0X2J5dGVzX2ZyZWUGdWludDY0DG1pbl9ieXRlX2J1eQZ1aW50NjQLZmVlX2JhbGFuY2ULY2hlY2tzdW0yNTYQZmVlX3RyYW5zZmVyX3BjdAZ1aW50MTYMc2V0cmVzb3VyY2VzAAQMZ2FzX3Blcl9ieXRlBnVpbnQ2NAt0YXJnZXRfZnJlZQZ1aW50NjQHbWluX2J1eQZ1aW50NjQQZmVlX3RyYW5zZmVyX3BjdAZ1aW50NjQLc2V0cmV2aXNpb24AAQxuZXdfcmV2aXNpb24GdWludDMyCHdpdGhkcmF3AAICdG8EbmFtZQhxdWFudGl0eQVhc3NldAoAAAAAABCjQQRjYWxsPy0tLQpzcGVjX3ZlcnNpb246ICIwLjIuMCIKdGl0bGU6IENBTEwKc3VtbWFyeTogJ2NhbGwnCmljb246Ci0tLQAAAACobNRFBmNyZWF0ZUMtLS0Kc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBDUkVBVEUKc3VtbWFyeTogJ0NyZWF0ZScKaWNvbjoKLS0tALBCV1OsLk0LZG9yZXNvdXJjZXMAAAAAAACQ3XQEaW5pdAAAQFYxGj5VpQpvcGVud2FsbGV0AAAAAAAAALi5A3Jhdz0tLS0Kc3BlY192ZXJzaW9uOiAiMC4yLjAiCnRpdGxlOiBSQVcKc3VtbWFyeTogJ1JhdycKaWNvbjoKLS0tAAAAIFenkLoHcmVjZWlwdACAFbqaYnWzwgxzZXRyZXNvdXJjZXMAACZ12G11s8ILc2V0cmV2aXNpb24AAAAA3NzUsuMId2l0aGRyYXdHLS0tCnNwZWNfdmVyc2lvbjogIjAuMi4wIgp0aXRsZTogV0lUSERSQVcKc3VtbWFyeTogJ1dpdGhkcmF3JwppY29uOgotLS0EAAAAIE9NETIDaTY0AAAHQWNjb3VudKCyyThPTREyA2k2NAAADEFjY291bnRTdGF0ZQAAAAAwtyZFA2k2NAAABmNvbmZpZwAAwApdTbG6A2k2NAAACXJlc291cmNlcwAAAAAA'
)
export const abi = ABI.from(abiBlob)
export namespace Types {
    @Struct.type('Account')
    export class Account extends Struct {
        @Struct.field(UInt64)
        declare index: UInt64
        @Struct.field(Checksum160)
        declare address: Checksum160
        @Struct.field(Name)
        declare account: Name
        @Struct.field(UInt64)
        declare nonce: UInt64
        @Struct.field(Bytes)
        declare code: Bytes
        @Struct.field(Checksum256)
        declare balance: Checksum256
    }
    @Struct.type('AccountState')
    export class AccountState extends Struct {
        @Struct.field(UInt64)
        declare index: UInt64
        @Struct.field(Checksum256)
        declare key: Checksum256
        @Struct.field(Checksum256)
        declare value: Checksum256
    }
    @Struct.type('call')
    export class call extends Struct {
        @Struct.field(Name)
        declare ram_payer: Name
        @Struct.field(Bytes)
        declare tx: Bytes
        @Struct.field(Checksum160, {optional: true})
        declare sender?: Checksum160
    }
    @Struct.type('config')
    export class config extends Struct {
        @Struct.field(UInt32)
        declare trx_index: UInt32
        @Struct.field(UInt32)
        declare last_block: UInt32
        @Struct.field(Checksum256)
        declare gas_used_block: Checksum256
        @Struct.field(Checksum256)
        declare gas_price: Checksum256
        @Struct.field(UInt32, {optional: true})
        declare revision?: UInt32
    }
    @Struct.type('create')
    export class create extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field('string')
        declare data: string
    }
    @Struct.type('doresources')
    export class doresources extends Struct {}
    @Struct.type('init')
    export class init extends Struct {
        @Struct.field(UInt64)
        declare start_bytes: UInt64
        @Struct.field(Asset)
        declare start_cost: Asset
        @Struct.field(UInt64)
        declare target_free: UInt64
        @Struct.field(UInt64)
        declare min_buy: UInt64
        @Struct.field(UInt16)
        declare fee_transfer_pct: UInt16
        @Struct.field(UInt64)
        declare gas_per_byte: UInt64
    }
    @Struct.type('pair_string_string')
    export class pair_string_string extends Struct {
        @Struct.field('string')
        declare first: string
        @Struct.field('string')
        declare second: string
    }
    @Struct.type('itx_data')
    export class itx_data extends Struct {
        @Struct.field(Bytes)
        declare callType: Bytes
        @Struct.field(Checksum160)
        declare from: Checksum160
        @Struct.field(Bytes)
        declare gas: Bytes
        @Struct.field(Bytes)
        declare input: Bytes
        @Struct.field(Bytes)
        declare to: Bytes
        @Struct.field(Bytes)
        declare value: Bytes
        @Struct.field(Bytes)
        declare gasUsed: Bytes
        @Struct.field(Bytes)
        declare output: Bytes
        @Struct.field(Bytes)
        declare code: Bytes
        @Struct.field(Bytes)
        declare init: Bytes
        @Struct.field('string')
        declare address: string
        @Struct.field(UInt16)
        declare subtraces: UInt16
        @Struct.field(UInt16, {array: true})
        declare traceAddress: UInt16[]
        @Struct.field('string')
        declare type: string
        @Struct.field('string')
        declare depth: string
        @Struct.field('string')
        declare error: string
        @Struct.field(pair_string_string, {array: true})
        declare extra: pair_string_string[]
        @Struct.field(UInt8)
        declare status: UInt8
    }
    @Struct.type('openwallet')
    export class openwallet extends Struct {
        @Struct.field(Name)
        declare account: Name
        @Struct.field(Checksum160)
        declare address: Checksum160
    }
    @Struct.type('raw')
    export class raw extends Struct {
        @Struct.field(Name)
        declare ram_payer: Name
        @Struct.field(Bytes)
        declare tx: Bytes
        @Struct.field('bool')
        declare estimate_gas: boolean
        @Struct.field(Checksum160, {optional: true})
        declare sender?: Checksum160
    }
    @Struct.type('receipt')
    export class receipt extends Struct {
        @Struct.field(Bytes)
        declare tx: Bytes
        @Struct.field(UInt32)
        declare trx_index: UInt32
        @Struct.field(UInt64)
        declare block: UInt64
        @Struct.field('string')
        declare from: string
        @Struct.field(UInt8)
        declare status: UInt8
        @Struct.field(UInt32)
        declare epoch: UInt32
        @Struct.field('string')
        declare createdaddr: string
        @Struct.field('string')
        declare gasused: string
        @Struct.field('string')
        declare gasusedblock: string
        @Struct.field('string')
        declare logs: string
        @Struct.field('string')
        declare output: string
        @Struct.field('string')
        declare errors: string
        @Struct.field(itx_data, {array: true})
        declare itxs: itx_data[]
    }
    @Struct.type('resources')
    export class resources extends Struct {
        @Struct.field(Checksum256)
        declare gas_per_byte: Checksum256
        @Struct.field(Checksum256)
        declare byte_cost: Checksum256
        @Struct.field(UInt64)
        declare bytes_used: UInt64
        @Struct.field(UInt64)
        declare bytes_bought: UInt64
        @Struct.field(UInt64)
        declare target_bytes_free: UInt64
        @Struct.field(UInt64)
        declare min_byte_buy: UInt64
        @Struct.field(Checksum256)
        declare fee_balance: Checksum256
        @Struct.field(UInt16)
        declare fee_transfer_pct: UInt16
    }
    @Struct.type('setresources')
    export class setresources extends Struct {
        @Struct.field(UInt64)
        declare gas_per_byte: UInt64
        @Struct.field(UInt64)
        declare target_free: UInt64
        @Struct.field(UInt64)
        declare min_buy: UInt64
        @Struct.field(UInt64)
        declare fee_transfer_pct: UInt64
    }
    @Struct.type('setrevision')
    export class setrevision extends Struct {
        @Struct.field(UInt32)
        declare new_revision: UInt32
    }
    @Struct.type('withdraw')
    export class withdraw extends Struct {
        @Struct.field(Name)
        declare to: Name
        @Struct.field(Asset)
        declare quantity: Asset
    }
}
export const TableMap = {
    account: Types.Account,
    accountstate: Types.AccountState,
    config: Types.config,
    resources: Types.resources,
}
export interface TableTypes {
    account: Types.Account
    accountstate: Types.AccountState
    config: Types.config
    resources: Types.resources
}
export type RowType<T> = T extends keyof TableTypes ? TableTypes[T] : any
export type TableNames = keyof TableTypes
export namespace ActionParams {
    export namespace Type {
        export interface itx_data {
            callType: BytesType
            from: Checksum160Type
            gas: BytesType
            input: BytesType
            to: BytesType
            value: BytesType
            gasUsed: BytesType
            output: BytesType
            code: BytesType
            init: BytesType
            address: string
            subtraces: UInt16Type
            traceAddress: UInt16Type[]
            type: string
            depth: string
            error: string
            extra: Type.pair_string_string[]
            status: UInt8Type
        }
        export interface pair_string_string {
            first: string
            second: string
        }
    }
    export interface call {
        ram_payer: NameType
        tx: BytesType
        sender?: Checksum160Type
    }
    export interface create {
        account: NameType
        data: string
    }
    export interface doresources {}
    export interface init {
        start_bytes: UInt64Type
        start_cost: AssetType
        target_free: UInt64Type
        min_buy: UInt64Type
        fee_transfer_pct: UInt16Type
        gas_per_byte: UInt64Type
    }
    export interface openwallet {
        account: NameType
        address: Checksum160Type
    }
    export interface raw {
        ram_payer: NameType
        tx: BytesType
        estimate_gas: boolean
        sender?: Checksum160Type
    }
    export interface receipt {
        tx: BytesType
        trx_index: UInt32Type
        block: UInt64Type
        from: string
        status: UInt8Type
        epoch: UInt32Type
        createdaddr: string
        gasused: string
        gasusedblock: string
        logs: string
        output: string
        errors: string
        itxs: Type.itx_data[]
    }
    export interface setresources {
        gas_per_byte: UInt64Type
        target_free: UInt64Type
        min_buy: UInt64Type
        fee_transfer_pct: UInt64Type
    }
    export interface setrevision {
        new_revision: UInt32Type
    }
    export interface withdraw {
        to: NameType
        quantity: AssetType
    }
}
export interface ActionNameParams {
    call: ActionParams.call
    create: ActionParams.create
    doresources: ActionParams.doresources
    init: ActionParams.init
    openwallet: ActionParams.openwallet
    raw: ActionParams.raw
    receipt: ActionParams.receipt
    setresources: ActionParams.setresources
    setrevision: ActionParams.setrevision
    withdraw: ActionParams.withdraw
}
export type ActionNames = keyof ActionNameParams
export class Contract extends BaseContract {
    constructor(args: PartialBy<ContractArgs, 'abi' | 'account'>) {
        super({
            client: args.client,
            abi: abi,
            account: args.account || Name.from('eosio.evm'),
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
