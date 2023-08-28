# Acala EVM+ Hardhat Example: predeployed Token
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


## Start a Local Development Stack
clean up docker containers
```
docker compose down -v
```

start the local development stack
```
cd ../   # compose file is at root dir
docker compose up
```

once you see logs like this, the local development stack is ready. It's ok if there are some warnings/errors in the logs, since there is no transaction in the node yet.
```
 --------------------------------------------
              🚀 SERVER STARTED 🚀
 --------------------------------------------
 version         : bodhi.js/eth-rpc-adapter/2.7.7
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
- [Acala EVM+ Development Doc](https://evmdocs.acala.network/)
- [predeploy contracts](https://github.com/AcalaNetwork/predeploy-contracts)