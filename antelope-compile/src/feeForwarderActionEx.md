cleos push action feeforwarder setglobal \
'{
  "fee": "1.0000 TLOS",
  "fee_token_contract": "eosio.token",
  "fee_token_symbol": "4,TLOS",
  "bridge_account": "bridge.acct",
  "evm_memo": "0x123456789abcdef0123456789abcdef012345678"
}' \
-p feeforwarder@active


cleos push action feeforwarder regtoken \
'{
  "token_contract": "some.token",
  "token_symbol": "4,MYT",
  "min_amount": "10.0000 MYT"
}' \
-p feeforwarder@active

cleos push action feeforwarder claimrefund \
'{
  "user": "testaccount1"
}' \
-p testaccount1@active


cleos push action feeforwarder withdrawfees '{}' -p feeforwarder@active


cleos push action eosio.token transfer \
'{
  "from": "alice",
  "to": "feeforwarder",
  "quantity": "1.0000 TLOS",
  "memo": ""
}' \
-p alice@active


cleos push action some.token transfer \
'{
  "from": "alice",
  "to": "feeforwarder",
  "quantity": "10.0000 MYT",
  "memo": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
}' \
-p alice@active
