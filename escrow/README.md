# Hardhat example: precompiled-token

## Table of contents

- [About](#about)
- [Smart contract](#smart-contract)
- [Test](#test)
- [Deploy Script](#script)
- [Summary](#summary)

## About

This example builds on top of the Acala EVM+ precompiled tokens. `Escrow` is an example of contract where two parties agree on a criteria to finish the transaction.

## Smart contract

This is a simple escrow contract that uses the precompiled ERC20 tokens of the Acala EVM+. The escrow supports two parties, one placing the tokens into the escrow and another providing a service. Once the second party accomplishes the criteria, both confirm the completion of the task and funds are released to the beneficiary. If both parties agree that the task was not completed, the funds are released back to the first party. For the sake of the tutorial, we ignore the scenario where the parties couldn't come into an agreement and would require and intermediary to solve a dispute.

# TODO: add step-by-step of contract coding

## Test

The test file in our case is called `Escrow.js`. Tests for this tutorial will validate the expected behavior of the escrow contract. 

# TODO: explain test cases

## Script

This deployment script will deploy the contract.

Within the deploy.js we will have the definition of main function called main() and then run it. Above it we will be importing the values needed for the deployment transaction parameters. 

## Summary

With this tutorial we start exploring the advanced features of EVM+ building upon the precompiled tokens. As we are using utilities only available in the Acala EVM+, we can no longer use a conventional development network like Ganache or Hardhat's emulated network.
