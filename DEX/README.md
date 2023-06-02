# Acala EVM+ Hardhat Example: Dex
This example introduces the use of Acala EVM+ predeployed DEX that is present on every network at a
fixed address (the address of a predeployed contract is the same on a local development network,
public test network as well as the production network). As this example focuses on showcasing the
interactions with the [predeployed DEX](https://github.com/AcalaNetwork/predeploy-contracts/blob/master/contracts/docs/dex/DEX.md), it doesn't have its own smart conract. We will get all of
the required imports from the [`@acala-network/contracts`](https://github.com/AcalaNetwork/predeploy-contracts)
dependency. The precompiles and predeploys are a specific feature of the Acala EVM+, so this
tutorial is no longer compatible with traditional EVM development networks (like Ganache) or with
the Hardhat's built in network emulator.

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

go thorugh the user journey with `scripts/journey.ts`
```
yarn journey:mandala
```

run tests with `test/*.ts`
```
yarn test:mandala
```

### run with public mandala
you can also run these scripts with public mandala by inserting your own account key to [hardhat.config.ts](./hardhat.config.ts), and then
```
yarn journey:mandalaPub
yarn test:mandalaPub
```

## More References
- [Acala EVM+ Development Doc](https://evmdocs.acala.network/)
- [predeploy contracts](https://github.com/AcalaNetwork/predeploy-contracts)