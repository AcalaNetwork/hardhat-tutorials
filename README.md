# Hardhat Acala EVM+ development tutorial

**If you are searching for [Truffle](https://github.com/AcalaNetwork/truffle-tutorials) or
[Waffle](https://github.com/AcalaNetwork/waffle-tutorials) tutorial, please follow the links.**

## Prerequisites

To be able to run the tutorial steps that require an operational development network (like deploying
and testing), please refer to the [guide](https://github.com/AcalaNetwork/Acala#5-development) on
how to setup a local development network.

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

7. [AdvancedEscrow](./advanced-escrow/README.md): This tutorial utilizes the predeployed `DEX`,
`Token`s and `Schedule` smart contracts in order to build an escrow service that accepts any of the
predeployed ERC20 tokens, swaps them for `AUSD` and at a set block releases the funds in `AUSD` or
in another predeployed ERC20 token.