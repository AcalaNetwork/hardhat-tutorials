# Acala EVM+ Hardhat Example: Token
This is a basic example on how to setup your Hardhat development environment as well as testing and
deployment configuration to be compatible with Acala EVM+. It contains a rudimentary
[Erc20 Token](./contracts/Token.sol) smart contract and the required configurations and scripts
in order to test and deploy it.

## Setup Local Development Stack
run a local mandala node at port `9944`
```
docker run -it --rm -p 9944:9944 -p 9933:9933 ghcr.io/acalanetwork/mandala-node:sha-a32c40b --dev --ws-external --rpc-port=9933 --rpc-external --rpc-cors=all --rpc-methods=unsafe -levm=debug --pruning=archive --instant-sealing
```

run an ETH RPC adapter at port `8545` with docker
```
docker run -p 8545:8545 acala/eth-rpc-adapter:2.7.3 --endpoint ws://host.docker.internal:9944 --local-mode
```

alternatively you can choose to run the ETH RPC adapter with npm
```
npx @acala-network/eth-rpc-adapter@2.7.3 --endpoint ws://localhost:9944 --local-mode
```


## Run
install deps
```
yarn
```

compile contracts and build types
```
yarn build
```

deploy the contract with `scripts/deploy.ts`
```
yarn deploy:mandala
```

run tests with `test/*.ts`
```
yarn test:mandala
```

### run with public mandala
you can also run these scripts with public mandala by inserting your own account key to [hardhat.config.ts](./hardhat.config.ts), and then
```
yarn deploy:mandalaPub
yarn test:mandalaPub
```

## More References
[Acala EVM+ Development Doc](https://evmdocs.acala.network/)