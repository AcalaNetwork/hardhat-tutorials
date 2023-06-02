# Acala EVM+ Hardhat Example: Dex
This example introduces the use of Acala EVM+ precompiles and predeploys that are present on
every network at a fixed address (the address of a predeployed contract is the same on a local
development network, public test network as well as the production network). As this example
focuses on showcasing the precompiles and predeploys, it doesn't have a smart conract. We will
however interact with an [predeployed ERC20](https://github.com/AcalaNetwork/predeploy-contracts/blob/master/contracts/docs/token/Token.md) smart contract that is already deployed to the network and we
will get all of the required imports from the
[`@acala-network/contracts`](https://github.com/AcalaNetwork/predeploy-contracts) dependency.
The precompiles and predeploys are a specific feature of the Acala EVM+, so this and the
following tutorial is no longer compatible with traditional EVM development networks (like
Ganache) or with the Hardhat's build in network emulator.
Let's take a look!


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

get the predeploy ACA token info with `scripts/getACAInfo.ts`
```
yarn getInfo:mandala
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
[Acala EVM+ Development Doc](https://evmdocs.acala.network/)
[predeploy contracts](https://github.com/AcalaNetwork/predeploy-contracts)