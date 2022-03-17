# AdvancedEscrow

## Table of contents

- [Intro](#intro)
- [Setting up](#setting-up)
- [Smart contract](#smart-contract)
- [Deploy script](#deploy-script)
- [User journey](#user-journey)
- [Conclusion](#conclusion)

## Intro

This tutorial dives into Acala EVM+ smart contract development using Hardhat development framework. We will start with the setup, build the smart contract and write deployment and user journey scripts. The smart contract will allow users to initiate escrows in one currency, and for beneficiaries to specify if they desire to be paid in another currency. Another feature we will familiarise ourselves with is the on-chain automation using a predeployed smart contract called `Schedule`. Using it will allow us to set the automatic completion of escrow after a certain number of blocks are included in the blockchain.

Let’s jump right in!

## Setting up

The tutorial project will live in the `advanced-escrow/` folder. We can create it using `mkdir advanced-escrow`. As we will be using Hardhat development framework, we need to initiate the `yarn` project and add `hardhat` as a development dependency:

```shell
yarn init && yarn add --dev hardhat
```

**NOTE: This example can use the default yarn project settings, which means that all of the prompts can be responded to with pressing `enter`.**

Now that the `hardhat` dependency is added to the project, we can initiate a simple hardhat project with `yarn hardhat`:

```shell
➜  advanced-escrow yarn hardhat
yarn run v1.22.17

888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

👷 Welcome to Hardhat v2.8.3 👷‍

? What do you want to do? … 
❯ Create a basic sample project
  Create an advanced sample project
  Create an advanced sample project that uses TypeScript
  Create an empty hardhat.config.js
  Quit

```

When the Hardhat prompt appears, selecting the first option will give us an adequate project skeleton that we can modify.

**NOTE: Once again, the default settings from Hardhat are acceptable, so we only need to confirm them using the `enter` key.**

As we will be using the Mandala test network, we need to add it to `hardhat.config.js`. Networks are added in the `module.exports` section below the `solidity` compiler version configuration. We will be adding two networks to the configuration. The local development network, which we will call `mandala`, and the public test network, which we will call `mandalaPubDev`:

```javascript
 networks: {
   mandala: {
     url: 'http://127.0.0.1:8545',
     accounts: {
       mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
       path: "m/44'/60'/0'/0",
     },
     chainId: 595,
   },
   mandalaPubDev: {
     url: 'https://tc7-eth.aca-dev.network',
     accounts: {
       mnemonic: YOUR_MNEMONIC,
       path: "m/44'/60'/0'/0",
     },
     chainId: 595,
     timeout: 60000,
   },
 }
```

Let’s take a look at the network configurations:

- `url`: Used to specify the RPC endpoint of the network
- `accounts`: Section to describe how Hardhat should acquire or derive the EVM accounts
- `mnemonic`: Mnemonic used to derive the accounts. **Add your mnemonic here**
- `path`: Derivation path to create the accounts from the mnemonic
- `chainId`: Specific chain ID of the Mandala chain. The value of `595` is used for both, local development network as well as the public test network
- `timeout`: An override value for the built in transaction response timeout. It is needed only on the public test network

With that, our project is ready for development.

## Smart contract

The `AdvancedEscrow` smart contract, which we will add in the following section, will still leave some areas that could be improved. `Advanced` is referring to the use of the predeployed smart contracts in the Acala EVM+ rather than its function.

When two parties enter into an escrow agreement, using the `AdvancedEscrow` smart contract, the party paying for the service: first transfers the tokens from one of the predeployed ERC20 smart contracts into the escrow smart contract. The party then initiates the escrow within the smart contract. Initiation of escrow requires both the contract address of the token being escrowed, and the wallet address of the beneficiary of escrow.

Upon initiation of the escrow, the smart contract exchanges the tokens coming into escrow for AUSD. Then it sets the deadline after which, AUSD is released to the beneficiary. The beneficiary also has the ability to specify which tokens they want to receive from escrow and the smart contract exchanges the AUSD it is holding in escrow for the desired tokens upon completion of escrow.

We also allow for the escrow to be completed before the deadline, with the ability for the initiating party to release the funds to the beneficiary manually.

Hardhat has already created a smart contract within the `contracts/` folder when we ran its setup. This smart contract is named `Greeter`. We will remove it and add our own called `AdvancedEscrow`:

```shell
rm contracts/Greeter.sol && touch contracts/AdvancedEscrow.sol
```

Now that we have our smart contract file ready, we can place an empty smart contract within it:

```solidity
//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
 
contract AdvancedEscrow {
 
}
```

We will be using precompiled smart contracts available in `@acala-network/contracts`  and `@openzeppelin/contracts` dependencies. To be able to do this, we need to add the dependencies to the project:

```shell
yarn add --dev @acala-network/contracts@4.0.2 @openzeppelin/contracts@4.4.2
```

As we will be using predeployed IDEX and IScheduler as well as the precompiled ERC20 contracts, we need to import them after the `pragma` statement:

```solidity
import "@acala-network/contracts/dex/IDEX.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@acala-network/contracts/schedule/ISchedule.sol";
```

As the predeployed smart contracts always have the same address, no matter the network (public, public test network or local development network), we can use the `Address` utility of `@acala-network/contracts` dependency to set them in our smart contract:

```solidity
import "@acala-network/contracts/utils/Address.sol";
```

Now that we have sorted out all of the imports, we need to make sure that our `AdvancedEscrow` smart contract inherits the `ADDRESS` smart contract utility in order to be able to access the addresses of the predeployed contracts stored within it. We have to add the inheritance statement to the contract definition line:

```solidity
contract AdvancedEscrow is ADDRESS {
```

We can finally start working on the actual smart contract. We will be interacting with the predeployed DEX and Schedule smart contracts, so we can define them at the beginning of the smart contract:

```solidity
   IDEX public dex = IDEX(ADDRESS.DEX);
   ISchedule public schedule = ISchedule(ADDRESS.Schedule);
```

Our smart contract will support one active escrow at the time, but will allow reuse. Let’s add a counter to be able to check the previous escrows, as well as the Escrow structure:

```solidity
   uint256 public numberOfEscrows;
 
   mapping(uint256 => Escrow) public escrows;
 
   struct Escrow {
       address initiator;
       address beneficiary;
       address ingressToken;
       address egressToken;
       uint256 AusdValue;
       uint256 deadline;
       bool completed;
   }
```

As you can see, we added a counter for `numberOfEscrows`, a mapping to list said `escrows` and a struct to keep track of the information included inside an escrow. The `Escrow` structure holds the following information:

- `initiator`: The account that initiated and funded the escrow
- `beneficiary`; The account that is to receive the escrowed funds
- `ingressToken`: Address of the token that was used to fund the escrow
- `egressToken`: Address of the token that will be used to pay out of the escrow
- `AusdValue`: Value of the escrow in AUSD
- `deadline`: Block number of the block after which, the escrow will be paid out
- `completed`: As an escrow can only be active or fulfilled, this can be represented as by a boolean value.

The constructor in itself will only be used to set the value of `numberOfEscrows` to 0. While Solidity is a null-state language, it’s still better to be explicit where we can:

```solidity
   constructor() {
       numberOfEscrows = 0;
   }
```

Now we can add the event that will notify listeners of the change in the smart contract called `EscrowUpdate`:

```solidity
   event EscrowUpdate(
       address indexed initiator,
       address indexed beneficiary,
       uint256 AusdValue,
       bool fulfilled
   );
```

The event contains information about the current state of the latest escrow:

- `initiator`: Address of the account that initiated the escrow
- `beneficiary`: Address of the account to which the escrow should be released to
- `AusdValue`: Value of the escrow represented in the AUSD currency
- `fulfilled`: As an escrow can only be active or fulfilled, this can be represented as by a boolean value.

Let’s start writing the logic of the escrow. As we said, there should only be one escrow active at any given time and the initiator should transfer the tokens to the smart contract before initiating the escrow. When initiating escrow, the initiator should pass the address of the token they allocated to the smart contract as the function call parameter in order for the smart contract to be able to swap that token for AUSD. All of the escrows are held in AUSD, but they can be paid out in an alternative currency. None of the addresses passed to the function should be `0x0` and the period in which the escrow should automatically be completed, expressed in the number of blocks, should not be 0 as well.

Once all of the checks are passed and the ingress tokens are swapped for AUSD, the  completion of escrow should be scheduled with the predeployed `Schedule`. Afterwards, the escrow information should be saved to the storage and `EscrowUpdate` should be emitted.

All of this happens within `initiateEscrow` function:

```solidity
   function initiateEscrow(
       address beneficiary_,
       address ingressToken_,
       uint256 ingressValue,
       uint256 period
   )
       public returns (bool)
   {
       // Check to make sure the latest escrow is completed
       // Additional check is needed to ensure that the first escrow can be initiated and that the
       // guard statement doesn't underflow
       require(
           numberOfEscrows == 0 || escrows[numberOfEscrows - 1].completed,
           "Escrow: current escrow not yet completed"
       );
       require(beneficiary_ != address(0), "Escrow: beneficiary_ is 0x0");
       require(ingressToken_ != address(0), "Escrow: ingressToken_ is 0x0");
       require(period != 0, "Escrow: period is 0");
 
       uint256 contractBalance = ERC20(ingressToken_).balanceOf(address(this));
       require(
           contractBalance >= ingressValue,
           "Escrow: contract balance is less than ingress value"
       );
 
       ERC20 AUSDtoken = ERC20(ADDRESS.AUSD);
       uint256 initalAusdBalance = AUSDtoken.balanceOf(address(this));
      
       address[] memory path = new address[](2);
       path[0] = ingressToken_;
       path[1] = ADDRESS.AUSD;
       require(dex.swapWithExactSupply(path, ingressValue, 1), "Escrow: Swap failed");
      
       uint256 finalAusdBalance = AUSDtoken.balanceOf(address(this));
      
       schedule.scheduleCall(
           address(this),
           0,
           1000000,
           5000,
           period,
           abi.encodeWithSignature("completeEscrow()")
       );
 
       Escrow storage currentEscrow = escrows[numberOfEscrows];
       currentEscrow.initiator = msg.sender;
       currentEscrow.beneficiary = beneficiary_;
       currentEscrow.ingressToken = ingressToken_;
       currentEscrow.AusdValue = finalAusdBalance - initalAusdBalance;
       currentEscrow.deadline = block.number + period;
       numberOfEscrows += 1;
      
       emit EscrowUpdate(msg.sender, beneficiary_, currentEscrow.AusdValue, false);
      
       return true;
   }
```

As you might have noticed, we didn’t set the `egressToken` value of the escrow. This is up to the beneficiary. Default payout is AUSD; but the beneficiary should be able to set a different token if they wish. As this is completely their prerogative, they are the only party that can change this value. To be able to do so, we need to add an additional `setEgressToken` function. Only the latest escrow’s egress token value can be modified and only if the latest escrow is still active:

```solidity
   function setEgressToken(address egressToken_) public returns (bool) {
       require(!escrows[numberOfEscrows - 1].completed, "Escrow: already completed");
       require(
           escrows[numberOfEscrows - 1].beneficiary == msg.sender,
           "Escrow: sender is not beneficiary"
       );
 
       escrows[numberOfEscrows - 1].egressToken = egressToken_;
 
       return true;
   }
```

Another thing that you might have noticed is that we scheduled a call of `completeEscrow` in the `scheduleCall` call to the `Schedule` predeployed smart contract. We need to add this function as well. The function should only be able to be run if the current escrow is still active and only by the `AdvancedEscrow` smart contract or by the initiator of the escrow. The smart contract is able to call the `completeEscrow` function, because it passed a pre-signed transaction for this call to the `Schedule` smart contract. The function should swap the AUSD held in escrow for the desired egress token, if one is specified. Otherwise, the AUSD is released to the beneficiary. Once the funds are allocated to the beneficiary, the escrow should be marked as completed and `EscrowUpdate` event, notifying the listeners of the completion, should be emitted:

```solidity
   function completeEscrow() public returns (bool) {
       Escrow storage currentEscrow = escrows[numberOfEscrows - 1];
       require(!currentEscrow.completed, "Escrow: escrow already completed");
       require(
           msg.sender == currentEscrow.initiator || msg.sender == address(this),
           "Escrow: caller is not initiator or this contract"
       );
 
       if(currentEscrow.egressToken != address(0)){
           ERC20 token = ERC20(currentEscrow.egressToken);
           uint256 initialBalance = token.balanceOf(address(this));
          
           address[] memory path = new address[](2);
           path[0] = ADDRESS.AUSD;
           path[1] = currentEscrow.egressToken;
           require(
               dex.swapWithExactSupply(path, currentEscrow.AusdValue, 1),
               "Escrow: Swap failed"
           );
          
           uint256 finalBalance = token.balanceOf(address(this));
 
           token.transfer(currentEscrow.beneficiary, finalBalance - initialBalance);
       } else {
           ERC20 AusdToken = ERC20(ADDRESS.AUSD);
           AusdToken.transfer(currentEscrow.beneficiary, currentEscrow.AusdValue);
       }
 
       currentEscrow.completed = true;
 
       emit EscrowUpdate(
           currentEscrow.initiator,
           currentEscrow.beneficiary,
           currentEscrow.AusdValue,
           true
       );
 
       return true;
   }
```

This wraps up our `AdvancedEscrow` smart contract.

<details>
	<summary>Your `contracts/AdvancedEscrow.sol` should look like this:</summary>

	//SPDX-License-Identifier: Unlicense
    pragma solidity ^0.8.0;
    
    import "@acala-network/contracts/dex/IDEX.sol";
    import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
    import "@acala-network/contracts/schedule/ISchedule.sol";
    import "@acala-network/contracts/utils/Address.sol";
    
    contract AdvancedEscrow is ADDRESS {
        IDEX dex = IDEX(ADDRESS.DEX);
        ISchedule schedule = ISchedule(ADDRESS.Schedule);
        
        uint256 public numberOfEscrows;
        
        mapping(uint256 => Escrow) public escrows;
    
        struct Escrow {
            address initiator;
            address beneficiary;
            address ingressToken;
            address egressToken;
            uint256 AusdValue;
            uint256 deadline;
            bool completed;
        }
    
        constructor() {
            numberOfEscrows = 0;
        }
    
        event EscrowUpdate(
            address indexed initiator,
            address indexed beneficiary,
            uint256 AusdValue,
            bool fulfilled
        );
    
        function initiateEscrow(
            address beneficiary_,
            address ingressToken_,
            uint256 ingressValue,
            uint256 period
        )
            public returns (bool)
        {
            // Check to make sure the latest escrow is completed
            // Additional check is needed to ensure that the first escrow can be initiated and that the
            // guard statement doesn't underflow
            require(
                numberOfEscrows == 0 || escrows[numberOfEscrows - 1].completed,
                "Escrow: current escrow not yet completed"
            );
            require(beneficiary_ != address(0), "Escrow: beneficiary_ is 0x0");
            require(ingressToken_ != address(0), "Escrow: ingressToken_ is 0x0");
            require(period != 0, "Escrow: period is 0");
        
            uint256 contractBalance = ERC20(ingressToken_).balanceOf(address(this));
            require(
                contractBalance >= ingressValue,
                "Escrow: contract balance is less than ingress value"
            );
        
            ERC20 AUSDtoken = ERC20(ADDRESS.AUSD);
            uint256 initalAusdBalance = AUSDtoken.balanceOf(address(this));
            
            address[] memory path = new address[](2);
            path[0] = ingressToken_;
            path[1] = ADDRESS.AUSD;
            require(dex.swapWithExactSupply(path, ingressValue, 1), "Escrow: Swap failed");
            
            uint256 finalAusdBalance = AUSDtoken.balanceOf(address(this));
            
            schedule.scheduleCall(
                address(this),
                0,
                1000000,
                5000,
                period,
                abi.encodeWithSignature("completeEscrow()")
            );
        
            Escrow storage currentEscrow = escrows[numberOfEscrows];
            currentEscrow.initiator = msg.sender;
            currentEscrow.beneficiary = beneficiary_;
            currentEscrow.ingressToken = ingressToken_;
            currentEscrow.AusdValue = finalAusdBalance - initalAusdBalance;
            currentEscrow.deadline = block.number + period;
            numberOfEscrows += 1;
            
            emit EscrowUpdate(msg.sender, beneficiary_, currentEscrow.AusdValue, false);
            
            return true;
        }
    
        function setEgressToken(address egressToken_) public returns (bool) {
            require(!escrows[numberOfEscrows - 1].completed, "Escrow: already completed");
            require(
                escrows[numberOfEscrows - 1].beneficiary == msg.sender,
                "Escrow: sender is not beneficiary"
            );
        
            escrows[numberOfEscrows - 1].egressToken = egressToken_;
        
            return true;
        }
    
        function completeEscrow() public returns (bool) {
            Escrow storage currentEscrow = escrows[numberOfEscrows - 1];
            require(!currentEscrow.completed, "Escrow: escrow already completed");
            require(
                msg.sender == currentEscrow.initiator || msg.sender == address(this),
                "Escrow: caller is not initiator or this contract"
            );
        
            if(currentEscrow.egressToken != address(0)){
                ERC20 token = ERC20(currentEscrow.egressToken);
                uint256 initialBalance = token.balanceOf(address(this));
                
                address[] memory path = new address[](2);
                path[0] = ADDRESS.AUSD;
                path[1] = currentEscrow.egressToken;
                require(
                    dex.swapWithExactSupply(path, currentEscrow.AusdValue, 1),
                    "Escrow: Swap failed"
                );
                
                uint256 finalBalance = token.balanceOf(address(this));
        
                token.transfer(currentEscrow.beneficiary, finalBalance - initialBalance);
            } else {
                ERC20 AusdToken = ERC20(ADDRESS.AUSD);
                AusdToken.transfer(currentEscrow.beneficiary, currentEscrow.AusdValue);
            }
        
            currentEscrow.completed = true;
        
            emit EscrowUpdate(
                currentEscrow.initiator,
                currentEscrow.beneficiary,
                currentEscrow.AusdValue,
                true
            );
        
            return true;
        }
    }

</details>

In order to be able to compile our smart contract with the `yarn build` command, we need to add the custom build command to `package.json`. We do this by adding a `”scripts”` section below the `"devDependencies”` section and defining the `"build”` command within it:

```json
 "scripts": {
   "build": "hardhat compile"
 }
```

With that, the smart contract can be compiled using:

```shell
yarn build
```

## Deploy script

### Transaction helper utility

In order to be able to deploy your smart contract to the Acala EVM+ using Hardhat, you need to pass
custom transaction parameters to the deploy transactions. We could add them directly to the script,
but this becomes cumbersome and repetitive as our project grows. To avoid the repetitiveness, we
will create a custom transaction helper utility, which will use `calcEthereumTransactionParams` from
`@acala-network/eth-providers` dependency.

First we need to add the dependency to the project:

```shell
yarn add --dev @acala-network/eth-providers
```

Now that we have the required dependency added to the project, we can create the utility:

```shell
mkdir utils && touch utils/transactionHelpers.js
```

The `calcEthereumTransactionParams` is imported at the top of the file and let's define the
`txParams()` below it:

```javascript
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

async function txParams() {

}
```

Within the `txParams()` function, we set the parameters needed to be passed to the
`calcEthereumTransactionParams` and then assign its return values to the `ethParams`. At the end of
the function we return the gas price and gas limit needed to deploy a smart contract:

```javascript
    const txFeePerGas = '199999946752';
    const storageByteDeposit = '100000000000000';
    const blockNumber = await ethers.provider.getBlockNumber();

    const ethParams = calcEthereumTransactionParams({
      gasLimit: '31000000',
      validUntil: (blockNumber + 100).toString(),
      storageLimit: '64001',
      txFeePerGas,
      storageByteDeposit
    });

    return {
        txGasPrice: ethParams.txGasPrice,
        txGasLimit: ethParams.txGasLimit
    };
```

In order to be able to use the `txParams` from our new utility, we have to export it at the bottom
of the utility:

```javascript
module.exports = { txParams };
```

This concludes the `transactionHelper` and we can move on to writing the deploy script where we will
use it.

<details>
    <summary>Your utils/transactionHelper.js should look like this:</summary>

    const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

    async function txParams() {
        const txFeePerGas = '199999946752';
        const storageByteDeposit = '100000000000000';
        const blockNumber = await ethers.provider.getBlockNumber();

        const ethParams = calcEthereumTransactionParams({
          gasLimit: '31000000',
          validUntil: (blockNumber + 100).toString(),
          storageLimit: '64001',
          txFeePerGas,
          storageByteDeposit
        });

        return {
            txGasPrice: ethParams.txGasPrice,
            txGasLimit: ethParams.txGasLimit
        };
    }

    module.exports = { txParams };

</details>

### Script

Now that we have our smart contract ready, we can deploy it, so we can use it.

Initiating Hardhat also created a `scripts` folder and within it a sample script. We will remove it
and add our own deploy script instead:

```shell
rm scripts/sample-script.js && touch scripts/deploy.js
```

Let’s add a skeleton `main` function within the `deploy.js` and make sure it’s executed when the
script is called:

```javascript
async function main() {
 
}
 
main()
 .then(() => process.exit(0))
 .catch((error) => {
   console.error(error);
   process.exit(1);
 });

```

Now that we have the skeleton deploy script, we can import the `txParams` from the
`transactionHelper` we added in the subsection above at the top of the file:

```javascript
const { txParams } = require("../utils/transactionHelper");
```

At the beginning of the `main` function definition, we will set the transaction parameters, by
invoking the `txParams`:

```javascript
  const ethParams = await txParams();
```

Now that we have the deploy transaction parameters set, we can deploy the smart contract. We need to
get the signer which will be used to deploy the smart contract, then we instantiate the smart
contract within the contract factory and deploy it, passing the transaction parameters to the deploy
transaction. Once the smart contract is successfully deployed, we will log its address to the
console:

```javascript
 const [deployer] = await ethers.getSigners();
 
 const AdvancedEscrow = await ethers.getContractFactory("AdvancedEscrow");
 const instance = await AdvancedEscrow.deploy({
   gasPrice: ethParams.txGasPrice,
   gasLimit: ethParams.txGasLimit,
 });
 
 console.log("AdvancedEscrow address:", instance.address);
```

With that, our deploy script is ready to be run.

<details>
	<summary>Your `scripts/deploy.js` should look like this:</summary>

    const { txParams } = require("../utils/transactionHelper");
    
    async function main() {
        const ethParams = await txParams();
        
        const [deployer] = await ethers.getSigners();
        
        const AdvancedEscrow = await ethers.getContractFactory("AdvancedEscrow");
        const instance = await AdvancedEscrow.deploy({
            gasPrice: ethParams.txGasPrice,
            gasLimit: ethParams.txGasLimit,
        });
        
        console.log("AdvancedEscrow address:", instance.address);
    }
    
    main()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
        });

</details>

In order to be able to run the `deploy.js` script, we need to add a script to the `package. Json`. To add our custom script to the `package.json`, we need to place our custom script into the `"scripts”` section. Let’s add two scripts, one for the local development network and one for the public test network:

```json
   "deploy-mandala": "hardhat run scripts/deploy.js --network mandala",
   "deploy-mandala:pubDev": "hardhat run scripts/deploy.js --network mandalaPubDev"
```

With that, we are able to run the deploy script using `yarn deploy-mandala` or `yarn deploy-mandala:pubDev`. Using the latter command should result in the following output:

```shell
yarn deploy-mandala:pubDev
yarn run v1.22.17
$ hardhat run scripts/deploy.js --network mandalaPubDev
AdvancedEscrow address: 0xcfd3fef59055a7525607694FBcA16B6D92D97Eee
✨  Done in 33.18s.
```

## User journey

FInally we are able to simulate the user journey through the `AdvancedEscrow`. We will create another script in the `scripts` directory called  `userJourney.js` and add three scenarios to it:

Beneficiary accepts the funds in aUSD and the escrow is released by `Schedule` predeployed smart contract.
Beneficiary accepts the funds in aUSD and the escrow is released by the initiator of the escrow, before it is released by the `Schedule`.
Beneficiary decides to get paid in DOT and the escrow is released by the `Schedule`.

To create the `userJourney.` file, we can use the following command:

```shell
touch scripts/userJourney.js
```

Let’s add the imports and constants to the file:

```javascript
const { txParams } = require("../utils/transactionHelper");
const { ACA, AUSD, DOT } = require("@acala-network/contracts/utils/Address");
const { Contract } = require("ethers");
const { formatUnits } = require("ethers/lib/utils");
 
const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");
 
async function main() {
    
}
 
main()
 .then(() => process.exit(0))
 .catch((error) => {
   console.error(error);
   process.exit(1);
 });
```

We have to import the `txParams` and invoke it in order to be able to define the deployment transaction gas parameters within the `main` function. The script will use `ACA`, `AUSD` and `DOT` predeployed token smart contracts, so we need to import their addresses from the `Address` utility and `Token` precompile from `@acala-network/contracts` in order to be able to instantiate them. For the same reason as we are importing the `Token` precompile, we are also importing the `Contract` from `ethers` as it is required to instantiate the already deployed smart contract. `formatUnits` utility is imported, so that we will be able to print the formatted balances to the console.

Much like in the `deploy.js` we still need to prepare the deployment transaction gas parameters at the beginning of the `main` function:

```javascript
 const ethParams = await txParams();
```

It’s time to add a setup that includes getting the required signers, deploying the `AdvancedEscrow` smart contract and instantiating ACA ERC20 predeployed contract. We will also output the formatted balance of the ACA token to the console:

```javascript
 const [initiator, beneficiary] = await ethers.getSigners();
 
 const initiatorAddress = await initiator.getAddress();
 const beneficiaryAddress = await beneficiary.getAddress();
 
 console.log("Address of the initiator is", initiatorAddress);
 console.log("Address of the beneficiary is", beneficiaryAddress);
 
 console.log("Deploying AdvancedEscrow smart contract")
 const AdvancedEscrow = await ethers.getContractFactory("AdvancedEscrow");
 const instance = await AdvancedEscrow.deploy({
   gasPrice: ethParams.txGasPrice,
   gasLimit: ethParams.txGasLimit,
 });
 
 console.log("AdvancedEscrow is deployed at address:", instance.address);
 
 console.log("Instantiating ACA predeployed smart contract");
 const primaryTokenInstance = new Contract(ACA, TokenContract.abi, initiator);
 
 const intialPrimaryTokenBalance = await primaryTokenInstance.balanceOf(initiatorAddress);
 const primaryTokenName = await primaryTokenInstance.name();
 const primaryTokenSymbol = await primaryTokenInstance.symbol();
 const primaryTokenDecimals = await primaryTokenInstance.decimals();
 console.log("Initial initiator %s token balance: %s %s", primaryTokenName, formatUnits(intialPrimaryTokenBalance.toString(), primaryTokenDecimals), primaryTokenSymbol);
```

**NOTE: We are assigning signer’s addresses to the variables as we will use them a few times and doing so alleviates some of the repetition.**

To make the output to the console easier to read, we will add a few empty lines to the script. In the first scenario we will transfer the ACA token to the `AdvancedEscrow` smart contract and initiate the escrow. Then we will get the block number at which the escrow was initiated and output the block number of block in which the `Schedule` should automatically release the funds:

```javascript
 console.log("");
 console.log("");
 
 console.log("Scenario #1: Escrow funds are released by Schedule");
 
 console.log("");
 console.log("");
 
 console.log("Transferring primary token to Escrow instance");
 
 await primaryTokenInstance.connect(initiator).transfer(instance.address, intialPrimaryTokenBalance.div(10_000));
 
 console.log("Initiating escrow");
 
 await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance.div(100_000), 10);
 
 const escrowBlockNumber = await ethers.provider.getBlockNumber();
 
 console.log("Escrow initiation successful in block %s. Expected automatic completion in block %s", escrowBlockNumber, escrowBlockNumber + 10);
```

**WARNING: As you might have noticed, we initiated the escrow using a tenth of the funds that we transferred to the smart contract. This is because the smart contract needs to have some free balance in order to be able to pay for the scheduled call.**

Since we made the `escrows` public, we can use the automatically generated getter, to get the information about the escrow we have just created and output it to the console:

```javascript
 const escrow = await instance.escrows(0);
 
 console.log("Escrow initiator:", escrow.initiator);
 console.log("Escrow beneficiary:", escrow.beneficiary);
 console.log("Escrow ingress token:", escrow.ingressToken);
 console.log("Escrow egress token:", escrow.egressToken);
 console.log("Escrow AUSD value:", escrow.AusdValue.toString());
 console.log("Escrow deadline:", escrow.deadline.toString());
 console.log("Escrow completed:", escrow.completed);
```

To make sure the escrow funds release actually increases the beneficiary’s funds, we need to instantiate the AUSD smart contract and get the initial balance of the beneficiary:

```javascript
 console.log("Instantiating AUSD instance");
 const AusdInstance = new Contract(AUSD, TokenContract.abi, initiator);
 
 const initalBeneficiatyAusdBalance = await AusdInstance.balanceOf(beneficiaryAddress);
 
 console.log("Initial aUSD balance of beneficiary: %s AUSD", formatUnits(initalBeneficiatyAusdBalance.toString(), 12));
```

**NOTE: The predeployed ERC20 smart contracts always use 12 decimal spaces, which means, we have to pass the decimals argument to the `formatUnits` and we can not use the default value of 18.**

As we have to wait for the `Schedule` to release the escrowed funds, we need to add a while loop to check whether the block in which the `Schedule` will release the funds has already been added to the blockchain. We don’t want to overwhelm the console output, so we have to add a helper function, which we define above the `main` function definition, that will pause the execution of the loop for `x` number of milliseconds:

```javascript
const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));
```

We can finally add the loop that waits for the deadline block to be added to the chain:

```javascript
 let currentBlockNumber = await ethers.provider.getBlockNumber();
 
 while(currentBlockNumber <= escrowBlockNumber + 10){
   console.log("Still waiting. Current block number is %s. Target block number is %s.", currentBlockNumber, escrowBlockNumber + 10);
   currentBlockNumber = await ethers.provider.getBlockNumber();
   await sleep(2500);
 }
```

All that is left to do in the first scenario is to get the final balance of the beneficiary and output it to the console along with the amount of funds, for which their balance has increased:

```javascript
 const finalBeneficiaryAusdBalance = await AusdInstance.balanceOf(beneficiaryAddress);
 
 console.log("Final aUSD balance of beneficiary: %s AUSD", formatUnits(finalBeneficiaryAusdBalance.toString(), 12));
 console.log("Beneficiary aUSD balance has increased for %s AUSD", formatUnits(finalBeneficiaryAusdBalance.sub(initalBeneficiatyAusdBalance).toString(), 12));
```

In the second scenario, we will have the initiator releasing the funds before the `Schedule` has a chance to do so. We will add some more blank lines, so that the console output wil be clearer, initiate a new escrow and output it’s details:

```javascript
 console.log("");
 console.log("");
  console.log("Scenario #2: Escrow initiator releases the funds before the deadline");
 
 console.log("");
 console.log("");
 
 console.log("Initiating escrow");
 
 await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance.div(100_000), 10);
 
 const escrowBlockNumber2 = await ethers.provider.getBlockNumber();
 
 console.log("Escrow initiation successful in block %s. Expected automatic completion in block %s", escrowBlockNumber2, escrowBlockNumber2 + 10);
 
 const escrow2 = await instance.escrows(1);
 
 console.log("Escrow initiator:", escrow2.initiator);
 console.log("Escrow beneficiary:", escrow2.beneficiary);
 console.log("Escrow ingress token:", escrow2.ingressToken);
 console.log("Escrow egress token:", escrow2.egressToken);
 console.log("Escrow AUSD value:", escrow2.AusdValue.toString());
 console.log("Escrow deadline:", escrow2.deadline.toString());
 console.log("Escrow completed:", escrow2.completed);
```

All that is left to do in this example is to get the balance of the beneficiary before and after the release of funds from the escrow, manually releasing the funds and logging the results to the console.

```javascript
 const initalBeneficiatyAusdBalance2 = await AusdInstance.balanceOf(beneficiaryAddress);
 
 console.log("Initial aUSD balance of beneficiary: %s AUSD", formatUnits(initalBeneficiatyAusdBalance2.toString(), 12));
 
 console.log("Manually releasing the funds");
 
 await instance.connect(initiator).completeEscrow();
 
 let currentBlockNumber2 = await ethers.provider.getBlockNumber();
 
 const finalBeneficiaryAusdBalance2 = await AusdInstance.balanceOf(beneficiaryAddress);
 
 console.log("Escrow funds released at block %s, while the deadline was %s", currentBlockNumber2, escrow2.deadline);
 console.log("Final aUSD balance of beneficiary: %s AUSD", formatUnits(finalBeneficiaryAusdBalance2.toString(), 12));
 console.log("Beneficiary aUSD balance has increased for %s AUSD", formatUnits(finalBeneficiaryAusdBalance2.sub(initalBeneficiatyAusdBalance2).toString(), 12));
```

**NOTE: We didn’t have to instantiate AUSD smart contract here, because we already instantiated it in the first scenario.**

In the last scenario we will let the `Schedule` release the funds, but the beneficiary will set the egress token to DOT. The beginning of this example is similar to the ones before:

```javascript
 console.log("");
 console.log("");
 
 console.log("Scenario #3: Beneficiary decided to be paid out in DOT");
 
 console.log("");
 console.log("");
 
 console.log("Initiating escrow");
 
 await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance.div(100_000), 10);
 
 const escrowBlockNumber3 = await ethers.provider.getBlockNumber();
 
 console.log("Escrow initiation successful in block %s. Expected automatic completion in block %s", escrowBlockNumber3, escrowBlockNumber3 + 10);
 
 const escrow3 = await instance.escrows(2);
 
 console.log("Escrow initiator:", escrow3.initiator);
 console.log("Escrow beneficiary:", escrow3.beneficiary);
 console.log("Escrow ingress token:", escrow3.ingressToken);
 console.log("Escrow egress token:", escrow3.egressToken);
 console.log("Escrow AUSD value:", escrow3.AusdValue.toString());
 console.log("Escrow deadline:", escrow3.deadline.toString());
 console.log("Escrow completed:", escrow3.completed);
```

As the escrow is set up, beneficiary can now configure the egress token of the escrow:

```javascript
 console.log("Beneficiary setting the desired escrow egress token");
 
 await instance.connect(beneficiary).setEgressToken(DOT);
```

If we want to output the beneficiary’s DOT balance and the difference in balance after the funds are released from escrow, we need to instantiate the DOT predeployed smart contract. Now we can also output the initial DOT balance of the beneficiary:

```javascript
 console.log("Instantiating DOT instance");
 const DotInstance = new Contract(DOT, TokenContract.abi, initiator);
 
 const initalBeneficiatyDotBalance = await DotInstance.balanceOf(beneficiaryAddress);
 
 console.log("Initial DOT balance of beneficiary: %s DOT", formatUnits(initalBeneficiatyDotBalance.toString(), 12));
```

All that is left to do is to wait for the `Schedule` to release the funds and log the changes and results to the console:

```javascript
 console.log("Waiting for automatic release of funds");
 
 let currentBlockNumber3 = await ethers.provider.getBlockNumber();
 
 while(currentBlockNumber3 <= escrowBlockNumber3 + 10){
   console.log("Still waiting. Current block number is %s. Target block number is %s.", currentBlockNumber3, escrowBlockNumber3 + 10);
   currentBlockNumber3 = await ethers.provider.getBlockNumber();
   await sleep(2500);
 }
 
 const finalBeneficiaryDotBalance = await DotInstance.balanceOf(beneficiaryAddress);
 
 console.log("Final DOT balance of beneficiary: %s DOT", formatUnits(finalBeneficiaryDotBalance.toString(), 12));
 console.log("Beneficiary DOT balance has increased for %s DOT", formatUnits(finalBeneficiaryDotBalance.sub(initalBeneficiatyDotBalance).toString(), 12));
```

With that, our user journey script is completed.

<details>
	<summary>Your `scripts/userJourney.js` should look like this:</summary>

    const { txParams } = require("../utils/transactionHelper");
    const { ACA, AUSD, DOT } = require("@acala-network/contracts/utils/Address");
    const { Contract } = require("ethers");
    const { formatUnits } = require("ethers/lib/utils");
    
    const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");
    
    const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));
    
    async function main() {
        const ethParams = await txParams();
        
        console.log("Getting signers");
        const [initiator, beneficiary] = await ethers.getSigners();
        
        const initiatorAddress = await initiator.getAddress();
        const beneficiaryAddress = await beneficiary.getAddress();
        
        console.log("Address of the initiator is", initiatorAddress);
        console.log("Address of the beneficiary is", beneficiaryAddress);
        
        console.log("Deploying AdvancedEscrow smart contract")
        const AdvancedEscrow = await ethers.getContractFactory("AdvancedEscrow");
        const instance = await AdvancedEscrow.deploy({
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
        });
        
        console.log("AdvancedEscrow is deployed at address:", instance.address);
        
        console.log("Instantiating ACA predeployed smart contract");
        const primaryTokenInstance = new Contract(ACA, TokenContract.abi, initiator);
        
        const intialPrimaryTokenBalance = await primaryTokenInstance.balanceOf(initiatorAddress);
        const primaryTokenName = await primaryTokenInstance.name();
        const primaryTokenSymbol = await primaryTokenInstance.symbol();
        const primaryTokenDecimals = await primaryTokenInstance.decimals();
        console.log("Initial initiator %s token balance: %s %s", primaryTokenName, formatUnits(intialPrimaryTokenBalance.toString(), primaryTokenDecimals), primaryTokenSymbol);
        
        console.log("");
        console.log("");
        
        console.log("Scenario #1: Escrow funds are released by Schedule");
        
        console.log("");
        console.log("");
        
        console.log("Transferring primary token to Escrow instance");
        
        await primaryTokenInstance.connect(initiator).transfer(instance.address, intialPrimaryTokenBalance.div(10_000));
        
        console.log("Initiating escrow");
        
        await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance.div(100_000), 10);
        
        const escrowBlockNumber = await ethers.provider.getBlockNumber();
        
        console.log("Escrow initiation successful in block %s. Expected automatic completion in block %s", escrowBlockNumber, escrowBlockNumber + 10);
        
        const escrow = await instance.escrows(0);
        
        console.log("Escrow initiator:", escrow.initiator);
        console.log("Escrow beneficiary:", escrow.beneficiary);
        console.log("Escrow ingress token:", escrow.ingressToken);
        console.log("Escrow egress token:", escrow.egressToken);
        console.log("Escrow AUSD value:", escrow.AusdValue.toString());
        console.log("Escrow deadline:", escrow.deadline.toString());
        console.log("Escrow completed:", escrow.completed);
        
        console.log("Instantiating AUSD instance");
        const AusdInstance = new Contract(AUSD, TokenContract.abi, initiator);
        
        const initalBeneficiatyAusdBalance = await AusdInstance.balanceOf(beneficiaryAddress);
        
        console.log("Initial aUSD balance of beneficiary: %s AUSD", formatUnits(initalBeneficiatyAusdBalance.toString(), 12));
        
        console.log("Waiting for automatic release of funds");
        
        let currentBlockNumber = await ethers.provider.getBlockNumber();
    
        while(currentBlockNumber <= escrowBlockNumber + 10){
            console.log("Still waiting. Current block number is %s. Target block number is %s.", currentBlockNumber, escrowBlockNumber + 10);
            currentBlockNumber = await ethers.provider.getBlockNumber();
            await sleep(2500);
        }
        
        const finalBeneficiaryAusdBalance = await AusdInstance.balanceOf(beneficiaryAddress);
        
        console.log("Final aUSD balance of beneficiary: %s AUSD", formatUnits(finalBeneficiaryAusdBalance.toString(), 12));
        console.log("Beneficiary aUSD balance has increased for %s AUSD", formatUnits(finalBeneficiaryAusdBalance.sub(initalBeneficiatyAusdBalance).toString(), 12));
        
        console.log("");
        console.log("");
        console.log("Scenario #2: Escrow initiator releases the funds before the deadline");
        
        console.log("");
        console.log("");
        
        console.log("Initiating escrow");
        
        await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance.div(100_000), 10);
        
        const escrowBlockNumber2 = await ethers.provider.getBlockNumber();
        
        console.log("Escrow initiation successful in block %s. Expected automatic completion in block %s", escrowBlockNumber2, escrowBlockNumber2 + 10);
        
        const escrow2 = await instance.escrows(1);
        
        console.log("Escrow initiator:", escrow2.initiator);
        console.log("Escrow beneficiary:", escrow2.beneficiary);
        console.log("Escrow ingress token:", escrow2.ingressToken);
        console.log("Escrow egress token:", escrow2.egressToken);
        console.log("Escrow AUSD value:", escrow2.AusdValue.toString());
        console.log("Escrow deadline:", escrow2.deadline.toString());
        console.log("Escrow completed:", escrow2.completed);
        
        const initalBeneficiatyAusdBalance2 = await AusdInstance.balanceOf(beneficiaryAddress);
        
        console.log("Initial aUSD balance of beneficiary: %s AUSD", formatUnits(initalBeneficiatyAusdBalance2.toString(), 12));
        
        console.log("Manually releasing the funds");
        
        await instance.connect(initiator).completeEscrow();
        
        let currentBlockNumber2 = await ethers.provider.getBlockNumber();
        
        const finalBeneficiaryAusdBalance2 = await AusdInstance.balanceOf(beneficiaryAddress);
        
        console.log("Escrow funds released at block %s, while the deadline was %s", currentBlockNumber2, escrow2.deadline);
        console.log("Final aUSD balance of beneficiary: %s AUSD", formatUnits(finalBeneficiaryAusdBalance2.toString(), 12));
        console.log("Beneficiary aUSD balance has increased for %s AUSD", formatUnits(finalBeneficiaryAusdBalance2.sub(initalBeneficiatyAusdBalance2).toString(), 12));
        
        console.log("");
        console.log("");
        
        console.log("Scenario #3: Beneficiary decided to be paid out in DOT");
        
        console.log("");
        console.log("");
        
        console.log("Initiating escrow");
        
        await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance.div(100_000), 10);
        
        const escrowBlockNumber3 = await ethers.provider.getBlockNumber();
        
        console.log("Escrow initiation successful in block %s. Expected automatic completion in block %s", escrowBlockNumber3, escrowBlockNumber3 + 10);
        
        const escrow3 = await instance.escrows(2);
    
        console.log("Escrow initiator:", escrow3.initiator);
        console.log("Escrow beneficiary:", escrow3.beneficiary);
        console.log("Escrow ingress token:", escrow3.ingressToken);
        console.log("Escrow egress token:", escrow3.egressToken);
        console.log("Escrow AUSD value:", escrow3.AusdValue.toString());
        console.log("Escrow deadline:", escrow3.deadline.toString());
        console.log("Escrow completed:", escrow3.completed);
        
        console.log("Beneficiary setting the desired escrow egress token");
        
        await instance.connect(beneficiary).setEgressToken(DOT);
        
        console.log("Instantiating DOT instance");
        const DotInstance = new Contract(DOT, TokenContract.abi, initiator);
        
        const initalBeneficiatyDotBalance = await DotInstance.balanceOf(beneficiaryAddress);
        
        console.log("Initial DOT balance of beneficiary: %s DOT", formatUnits(initalBeneficiatyDotBalance.toString(), 12));
        
        console.log("Waiting for automatic release of funds");
        
        let currentBlockNumber3 = await ethers.provider.getBlockNumber();
        
        while(currentBlockNumber3 <= escrowBlockNumber3 + 10){
            console.log("Still waiting. Current block number is %s. Target block number is %s.", currentBlockNumber3, escrowBlockNumber3 + 10);
            currentBlockNumber3 = await ethers.provider.getBlockNumber();
            await sleep(2500);
        }
        
        const finalBeneficiaryDotBalance = await DotInstance.balanceOf(beneficiaryAddress);
        
        console.log("Final DOT balance of beneficiary: %s DOT", formatUnits(finalBeneficiaryDotBalance.toString(), 12));
        console.log("Beneficiary DOT balance has increased for %s DOT", formatUnits(finalBeneficiaryDotBalance.sub(initalBeneficiatyDotBalance).toString(), 12));
    }
    
    main()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
        });

</details>

To be able to run the script, we have to add two additional commands to the `"scripts”` section of  `package.json`:

```json
   "user-journey-mandala": "hardhat run scripts/userJourney.js --network mandala",
   "user-journey-mandala:pubDev": "hardhat run scripts/userJourney.js --network mandalaPubDev"
```

These two commands allow us to run the user journey script in the local development network and in the public development network. Running the script in the local development environment should give you an output similar to this one:

```shell
yarn user-journey-mandala
yarn run v1.22.17
$ hardhat run scripts/userJourney.js --network mandala

Getting signers
Address of the initiator is 0x75E480dB528101a381Ce68544611C169Ad7EB342
Address of the beneficiary is 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
Deploying AdvancedEscrow smart contract
AdvancedEscrow is deployed at address: 0xA8505C02cfd9d84389c11702C9994db27E4E2E1B
Instantiating ACA predeployed smart contract
Initial initiator Acala token balance: 9998842.411516250838 ACA


Scenario #1: Escrow funds are released by Schedule


Transferring primary token to Escrow instance
Initiating escrow
Escrow initiation successful in block 136. Expected automatic completion in block 146
Escrow initiator: 0x75E480dB528101a381Ce68544611C169Ad7EB342
Escrow beneficiary: 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
Escrow ingress token: 0x0000000000000000000100000000000000000000
Escrow egress token: 0x0000000000000000000000000000000000000000
Escrow AUSD value: 199637171695833
Escrow deadline: 146
Escrow completed: false
Instantiating AUSD instance
Initial aUSD balance of beneficiary: 10000399.559877590747 AUSD
Waiting for automatic release of funds
Still waiting. Current block number is 137. Target block number is 146.
Still waiting. Current block number is 137. Target block number is 146.
Still waiting. Current block number is 137. Target block number is 146.
Still waiting. Current block number is 138. Target block number is 146.
Still waiting. Current block number is 138. Target block number is 146.
Still waiting. Current block number is 139. Target block number is 146.
Still waiting. Current block number is 140. Target block number is 146.
Still waiting. Current block number is 141. Target block number is 146.
Still waiting. Current block number is 142. Target block number is 146.
Still waiting. Current block number is 142. Target block number is 146.
Still waiting. Current block number is 143. Target block number is 146.
Still waiting. Current block number is 144. Target block number is 146.
Still waiting. Current block number is 145. Target block number is 146.
Still waiting. Current block number is 146. Target block number is 146.
Still waiting. Current block number is 146. Target block number is 146.
Final aUSD balance of beneficiary: 10000599.19704928658 AUSD
Beneficiary aUSD balance has increased for 199.637171695833 AUSD


Scenario #2: Escrow initiator releases the funds before the deadline


Initiating escrow
Escrow initiation successful in block 149. Expected automatic completion in block 159
Escrow initiator: 0x75E480dB528101a381Ce68544611C169Ad7EB342
Escrow beneficiary: 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
Escrow ingress token: 0x0000000000000000000100000000000000000000
Escrow egress token: 0x0000000000000000000000000000000000000000
Escrow AUSD value: 199597288782589
Escrow deadline: 159
Escrow completed: false
Initial aUSD balance of beneficiary: 10000599.19704928658 AUSD
Manually releasing the funds
Escrow funds released at block 151, while the deadline was 159
Final aUSD balance of beneficiary: 10000798.794338069169 AUSD
Beneficiary aUSD balance has increased for 199.597288782589 AUSD


Scenario #3: Beneficiary decided to be paid out in DOT


Initiating escrow
Escrow initiation successful in block 152. Expected automatic completion in block 162
Escrow initiator: 0x75E480dB528101a381Ce68544611C169Ad7EB342
Escrow beneficiary: 0x0085560b24769dAC4ed057F1B2ae40746AA9aAb6
Escrow ingress token: 0x0000000000000000000100000000000000000000
Escrow egress token: 0x0000000000000000000000000000000000000000
Escrow AUSD value: 199557417821676
Escrow deadline: 162
Escrow completed: false
Beneficiary setting the desired escrow egress token
Instantiating DOT instance
Initial DOT balance of beneficiary: 10000003.989610526389 DOT
Waiting for automatic release of funds
Still waiting. Current block number is 154. Target block number is 162.
Still waiting. Current block number is 154. Target block number is 162.
Still waiting. Current block number is 155. Target block number is 162.
Still waiting. Current block number is 155. Target block number is 162.
Still waiting. Current block number is 156. Target block number is 162.
Still waiting. Current block number is 157. Target block number is 162.
Still waiting. Current block number is 158. Target block number is 162.
Still waiting. Current block number is 158. Target block number is 162.
Still waiting. Current block number is 159. Target block number is 162.
Still waiting. Current block number is 160. Target block number is 162.
Still waiting. Current block number is 161. Target block number is 162.
Still waiting. Current block number is 162. Target block number is 162.
Still waiting. Current block number is 162. Target block number is 162.
Final DOT balance of beneficiary: 10000007.974382139931 DOT
Beneficiary DOT balance has increased for 3.984771613542 DOT
✨  Done in 83.36s.
```

## Conclusion

We have successfully built an `AdvancedEscrow` smart contract that allows users to deposit funds in one token and is paid out in another. It also supports automatic release of funds after a desired number of blocks. We added scripts and commands to run those scripts. To compile the smart contract, use `yarn build`. In order to deploy the smart contract to a local development network use `yarn deploy-mandala` and to deploy it to a public test network use `yarn deploy-mandala:pubDev`. We also created a script that simulates the user's journey through the use of the `AdvancedEscrow`. To run the script in the local development network use `yarn user-journey-mandala`  and to run it on the public test network use `yarn user-journey-mandala:pubDev`.

This concludes our  `AdvancedEscrow` tutorial. We hope you enjoyed this dive into Acala EVM+ and have gotten a satisfying glimpse of what the **+** stands for.

All of the Acalanauts wish you a pleasant journey into the future of web3!