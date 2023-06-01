# Acala EVM+ Hardhat Example: UpgradeableGreeter
This tutorial addresses the use of the upgradeable smart contracts using the [transparent proxy pattern](https://blog.openzeppelin.com/the-transparent-proxy-pattern). 

It contains a simple [Greeter](./contracts/Greeter.sol) smart contract that can be upgraded to [Greeter V2](./contracts/GreeterV2.sol), which has a new method `setGreetingV2()`. 

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
clean up proxy info cache (optional)
```
yarn clean
```

compile contracts
```
yarn build
```

deploy the the proxy contract with `scripts/deploy.ts`
```
yarn deploy --network mandala
```

upgrade the proxy contract with `scripts/upgrade.ts`
```
yarn upgrade --network mandala
```

run tests with `test/*.ts`
```
yarn test --network mandala
```

### run with public mandala
you can also run these scripts with public mandala by inserting your own account key to [hardhat.config.ts](./hardhat.config.ts), and then
```
yarn deploy --network mandalaPub
yarn upgrade --network mandalaPub
yarn test --network mandalaPub
```