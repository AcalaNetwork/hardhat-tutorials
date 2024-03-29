# Acala EVM+ Hardhat Examples

**If you are searching for [Truffle](https://github.com/AcalaNetwork/truffle-tutorials) or
[Waffle](https://github.com/AcalaNetwork/waffle-tutorials) examples, please follow the links.**

## Current tutorials

1. [hello-world](./hello-world/README.md): This tutorial contains instructions on how to setup a
simple Hardhat project that is compatible, deployable and testable with Acala EVM+.

2. [echo](./echo/README.md): This tutorial builds upon the previous one and adds return values to
the function calls, events and changes of storage variables.

3. [token](./token/README.md): This tutorial builds upon the previous ones and adds the ERC20 token
using OpenZeppelin dependency.

4. [NFT](./NFT/README.md): This tutorial demonstrates how to build a NFT contract in Acala EVM+.

---

This section of tutorial uses Acala EVM+ specific mechanics and is incompatible with the legacy EVM.
It introduces the use of our precompiled smart contracts that are accessible to anyone using the
Acala EVM+

5. [precompiled-token](./precompiled-token/README.md): This tutorial utilizes the precompiled and
predeployed ERC20 tokens present in the Acala EVM+. It uses the `ADDRESS` utility, which serves
as an automatic getter of the precompiled smart contract addresses, so we don't have to seach
for them in the documentation and hardcode them into our project.

6. [DEX](./DEX/README.md): This tutorial utilizes the predeployed `DEX` smart contract to swap the
ERC20 tokens of the  predeployed `Token` smart contracts, which we instantitate with the help of the
`ADDRESS` utility.

7. [EVM](./EVM/README.md): This tutorial utilizes the predeployed `EVM` smart contract to manage the
account preferences and the smart contract that the account maintains. It introduces the publishing
of the smart contracts in the Acala EVM+ as well as enabling and disabling the developer mode of the
account directly in the Acala EVM+.

8. [AdvancedEscrow](./advanced-escrow/README.md): This tutorial utilizes the predeployed `DEX`,
`Token`s and `Schedule` smart contracts in order to build an escrow service that accepts any of the
predeployed ERC20 tokens, swaps them for `AUSD` and at a set block releases the funds in `AUSD` or
in another predeployed ERC20 token.

9. [UpgradeableGreeter](./upgradeable-greeter/README.md): This tutorial explores on how to use the
proxy-upgrade pattern in order to deploy, manage and upgrade upgradeable smart contracts in Acala
EVM+.

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