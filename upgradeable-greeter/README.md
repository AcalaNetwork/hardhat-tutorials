# Acala EVM+ Hardhat Example: UpgradeableGreeter
This tutorial addresses the use of the upgradeable smart contracts using the [transparent proxy pattern](https://blog.openzeppelin.com/the-transparent-proxy-pattern). 

It contains a simple [Greeter](./contracts/Greeter.sol) smart contract that can be upgraded to [Greeter V2](./contracts/GreeterV2.sol), which has a new method `setGreetingV2()`. 

## Start a Local Development Stack
clean up docker containers
```
docker compose down -v
```

start the local development stack
```
docker compose up
```

once you see logs like this, the local development stack is ready. It's ok if there are some warnings/errors in the logs, since there is no transaction in the node yet.
```
 --------------------------------------------
              🚀 SERVER STARTED 🚀
 --------------------------------------------
 version         : bodhi.js/eth-rpc-adapter/2.7.3
 endpoint url    : ws://mandala-node:9944
 subquery url    : http://graphql-engine:3001
 listening to    : 8545
 max blockCache  : 200
 max batchSize   : 50
 max storageSize : 5000
 safe mode       : false
 local mode      : false
 rich mode       : false
 http only       : false
 verbose         : true
 --------------------------------------------
```

For more information about the local development stack, please refer to the [doc](https://evmdocs.acala.network/network/network-setup/local-development-network).


## Run
install deps
```
yarn
```

clean up proxy info cache (only required after re-starting the local development stack)
```
yarn clean
```

compile contracts and build types
```
yarn build
```

deploy the the proxy contract with `scripts/deploy.ts`
```
yarn deploy:mandala
```

upgrade the proxy contract with `scripts/upgrade.ts`
```
yarn upgrade:mandala
```

run tests with `test/*.ts`
```
yarn test:mandala
```

### run with public mandala
you can also run these scripts with public mandala by inserting your own account key to [hardhat.config.ts](./hardhat.config.ts), and then
```
yarn deploy:mandalaPub
yarn upgrade:mandalaPub
yarn test:mandalaPub
```

## More References
- [Acala EVM+ Development Doc](https://evmdocs.acala.network/)