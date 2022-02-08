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

Your empty smart contract should look like this:

```solidity
pragma solidity =0.8.9;

contract Escrow {

}
```

Import of the `Token` from `@acala-network/contracts` is done between the `pragma` definition and the start of the `contract` block. The `Token` contract is the precompiled version of the `ERC20` standard made by the Acala team. The import statements look like this:

```solidity
import "@acala-network/contracts/token/Token.sol";
```

`requestor` and `serviceProvider` variables are used to store the address of the parties involved in the escrow. `tokenAddress` stores the address of the predeployed ERC20 token and `amount` stores the amount used in the escrow, this way we can avoid the `approval` of the ERC20. These first 4 variables are passed in the contract constructor later on. This means the contract accepts any precompiled token to be used in this escrow.

We also have two enumerated variables of `ServiceStatus` type, they are used to store the status of the party. This type is defined below in the `enum` section. We have three possible states for any given party of the escrow: `Pending`, `Confirmed` and `Denied`

The visibility of all variable are set to public, so that the compiler builds a getter function for it. All these variables and the enum look like this:

```solidity
    address payable public requestor;
    address payable public serviceProvider;
    address public tokenAddress;
    uint256 public amount;
    ServiceStatus public requestorStatus;
    ServiceStatus public serviceProviderStatus;

    enum ServiceStatus {
        Pending,
        Confirmed,
        Denied
    }
```

The `constructor` function receives the `precompiled token address`, its `amount` and both parties `addressess`. Then we initialize both statuses as `Pending`.

```solidity
    constructor(
        address _tokenAddress,
        uint256 _amount,
        address payable _requestor,
        address payable _serviceProvider
    ) {
        requestor = _requestor;
        serviceProvider = _serviceProvider;
        tokenAddress = _tokenAddress;
        amount = _amount;
        requestorStatus = ServiceStatus.Pending;
        serviceProviderStatus = ServiceStatus.Pending;
    }
```

After the construction we add two similar functions, one for the `requestor` to confirm its part and another one for the `serviceProvider`. Each function can only be called by its responsible party, hence the `require` in the beginning. We then change the status based on the input of the party... `true` confirms it, `false` denies it. Finally we can the `completeTask` function.

```solidity
    function requestorConfirmTaskCompletion(bool _taskConfirmation) public {
        require(
            msg.sender == requestor,
            "Only the requestor can confirm his part"
        );

        if (_taskConfirmation == true) {
            requestorStatus = ServiceStatus.Confirmed;
        } else {
            requestorStatus = ServiceStatus.Denied;
        }

        completeTask();
    }
```

The `completeTask` function checks if both parties are in agreement, if both parties confirmed the task completion, we call the function to pay the `serviceProvider`. If both parties denied the task completion, we call the function to refund the `requestor`. As mentioned before, for the sake of simplicity, we ignore the case where the parties can't reach an agreement.

```solidity
    function completeTask() private {
        if (
            serviceProviderStatus == ServiceStatus.Confirmed &&
            requestorStatus == ServiceStatus.Confirmed
        ) {
            payoutToServiceProvider();
            return;
        }

        if (
            serviceProviderStatus == ServiceStatus.Denied &&
            requestorStatus == ServiceStatus.Denied
        ) {
            refundRequestor();
            return;
        }
    }
```

Finally, we have the `pay` and `refund` functions. Here we use the `Token` contract we imported at the beginning, passing the `tokenAddress` to initialize an instance of the contract. Then we call `transfer` passing the `address` of the beneficiary and token `amount` to be transferred.

```solidity
    function payoutToServiceProvider() public {
        Token(tokenAddress).transfer(serviceProvider, amount);
    }

    function refundRequestor() public {
        Token(tokenAddress).transfer(requestor, amount);
    }
```

<details>
    <summary>Your contracts/escrow.sol should look like this:</summary>

    // SPDX-License-Identifier: Unlicensed
    pragma solidity ^0.8.9;

    import "@acala-network/contracts/token/Token.sol";

    contract Escrow {
        address payable public requestor;
        address payable public serviceProvider;
        address public tokenAddress;
        uint256 public amount;
        ServiceStatus public requestorStatus;
        ServiceStatus public serviceProviderStatus;

        enum ServiceStatus {
            Pending,
            Confirmed,
            Denied
        }

        constructor(
            address _tokenAddress,
            uint256 _amount,
            address payable _requestor,
            address payable _serviceProvider
        ) {
            requestor = _requestor;
            serviceProvider = _serviceProvider;
            tokenAddress = _tokenAddress;
            amount = _amount;
            requestorStatus = ServiceStatus.Pending;
            serviceProviderStatus = ServiceStatus.Pending;
        }

        function requestorConfirmTaskCompletion(bool _taskConfirmation) public {
            require(
                msg.sender == requestor,
                "Only the requestor can confirm his part"
            );

            if (_taskConfirmation == true) {
                requestorStatus = ServiceStatus.Confirmed;
            } else {
                requestorStatus = ServiceStatus.Denied;
            }

            completeTask();
        }

        function serviceProviderConfirmTaskCompletion(bool _taskConfirmation)
            public
        {
            require(
                msg.sender == serviceProvider,
                "Only the service provider can confirm his part"
            );

            if (_taskConfirmation == true) {
                serviceProviderStatus = ServiceStatus.Confirmed;
            } else {
                serviceProviderStatus = ServiceStatus.Denied;
            }

            completeTask();
        }

        function completeTask() private {
            if (
                serviceProviderStatus == ServiceStatus.Confirmed &&
                requestorStatus == ServiceStatus.Confirmed
            ) {
                payoutToServiceProvider();
                return;
            }

            if (
                serviceProviderStatus == ServiceStatus.Denied &&
                requestorStatus == ServiceStatus.Denied
            ) {
                refundRequestor();
                return;
            }
        }

        function payoutToServiceProvider() public {
            Token(tokenAddress).transfer(serviceProvider, amount);
        }

        function refundRequestor() public {
            Token(tokenAddress).transfer(requestor, amount);
        }
    }
</details>

As the `Escrow` smart contract is ready to be compiled, we can use the `yarn build` command (like we did
in the [hello-world](../hello-world/package.json)) to compile the smart contract, which will create
the `artifacts` directory and contain the compiled smart contract.
## Test

The test file in our case is called `Escrow.js`. Tests for this tutorial will validate the expected behavior of the escrow contract. The empty test along with the import statements should look like this:

```js
const { expect } = require("chai");
const { Contract, ContractFactory } = require("ethers");
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
const { ACA } = require("@acala-network/contracts/utils/Address");

const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const EscrowContract = require("../artifacts/contracts/escrow.sol/Escrow.json");

describe("Escrow contract", function () {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '21000010',
    validUntil: '360001',
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

});
```

In this test, we will use `ACA` as the predeployed token as an example, but the contract can be initialized with any other predeployed token.

`deployer`, `requestor` and `provider` will store Signers. The `deployer` is the account used to deploy the smart contract, while `requestor` and `provider` are the parties involved in the escrow. The `requestorAddress` and `providerAddress` will store the addresses of both parties. The `acaInstance` stores the instance of the predeployed token we will be using on our test, which means it's already deployed and we just need its instance. The `Escrow` will be used to store the Escrow contract factory and the `escrowInstance` will store the deployed Escrow smart contract.

We also define a constant called `ESCROW_AMOUNT` to store the `amount` of ACA we are going to use throughout the test.

Let's assign values to the variables in the beforeEach action and call the deploy function of the contract factory passing the address of the predeployed ACA, our constant amount and both addresses of the parties.

```js
  let deployer;
  let requestor;
  let provider;
  let requestorAddress;
  let providerAddress;
  let acaInstance;
  let Escrow;
  let escrowInstance;

  const ESCROW_AMOUNT = 1_000_000_000; // 0.001 ACA

  beforeEach(async function () {
    [deployer, requestor, provider] = await ethers.getSigners();

    requestorAddress = await requestor.getAddress();
    providerAddress = await provider.getAddress();

    acaInstance = new Contract(ACA, TokenContract.abi, requestor);

    Escrow = new ContractFactory(EscrowContract.abi, EscrowContract.bytecode, deployer);
    escrowInstance = await Escrow.deploy(acaInstance.address, ESCROW_AMOUNT, requestorAddress, providerAddress,
      {
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
      }
    );
  });
```

We have 5 test cases, the first one checks if the `requestor` and `provider` address were set correctly:

```js
  it("deployment should assign the escrow provider and requestor", async function () {
    expect(await escrowInstance.requestor()).to.equal(requestorAddress);
    expect(await escrowInstance.serviceProvider()).to.equal(providerAddress);
  });
```

After that we test if only the parties are the ones allowed to change its status about the task completion.

```js
  it("should only allow the requestor to complete his part", async function () {
    await expect(escrowInstance.connect(provider).requestorConfirmTaskCompletion(true)).to.
      be.revertedWith("Only the requestor can confirm his part")
  });

  it("should only allow the service provider to complete his part", async function () {
    await expect(escrowInstance.connect(requestor).serviceProviderConfirmTaskCompletion(true)).to.
      be.revertedWith("Only the service provider can confirm his part")
  });
```

Finally we test if the escrow contract is behaving as it should. First we transfer the amount of ACA from the requestor to the contract, avoiding having to call `approval` later on. Then we check if the contract balance changed after the transfer. It should match our constant `ESCROW_AMOUNT`.

After that, the requestor and the provider confirm the task completion and we store initial balances of the provider, both native ACA and predeployed ACA (ERC20). This will be used later for comparison. That's because the Acala blockchain is able to sync the balances of native Substrate tokens with its ERC20 equivalents.

After the second party confirm the task, the contract automatically sends the payout to the `service provider`. Then we check if both balances changed, meaning the ESCROW_AMOUNT should have been added to the `service provider` balance.

The last test case is very similar to its predecessor, but this time we test the situation where both parties deny the task completion and the `provider` gets a refund.

```js
  it("should let the both parties confirm the task completion and send tokens to the service provider", async function () {
    // transfer funds to the contract
    const previousContractBalance = await acaInstance.balanceOf(escrowInstance.address);
    await acaInstance.transfer(escrowInstance.address, ESCROW_AMOUNT, { from: requestorAddress })
    const currentContractBalance = await acaInstance.balanceOf(escrowInstance.address);
    expect(currentContractBalance).to.equal(previousContractBalance.add(ESCROW_AMOUNT));

    // requestor and service provider confirm completion
    await escrowInstance.connect(provider).serviceProviderConfirmTaskCompletion(true)
    const initialProviderNativeBalance = await provider.getBalance();
    const initialProviderBalance = await acaInstance.balanceOf(providerAddress);
    await escrowInstance.connect(requestor).requestorConfirmTaskCompletion(true)

    // complete the task and check if the provider balance increased
    const finalProviderBalance = await acaInstance.balanceOf(providerAddress);
    expect(finalProviderBalance).to.equal(initialProviderBalance.add(ESCROW_AMOUNT));

    // the change in native ACA balance should match the change in ERC20 ACA balance
    const finalProviderNativeBalance = await provider.getBalance();
    // multiplied the escrow amount by 10⁶ because there's a difference in
    // BigNumber's decimals between native and ERC20 balance
    const expectedProviderNativeBalance = initialProviderNativeBalance.add(ESCROW_AMOUNT * 1_000_000);
    expect(finalProviderNativeBalance).to.equal(expectedProviderNativeBalance);
  });

  it("should let the both parties deny the task completion and send tokens back to the requestor", async function () {
    // transfer funds to the contract
    const previousContractBalance = await acaInstance.balanceOf(escrowInstance.address);
    await acaInstance.transfer(escrowInstance.address, ESCROW_AMOUNT, { from: requestorAddress })
    const currentContractBalance = await acaInstance.balanceOf(escrowInstance.address);
    expect(currentContractBalance).to.equal(previousContractBalance.add(ESCROW_AMOUNT));

    // requestor and service provider deny completion
    await escrowInstance.connect(requestor).requestorConfirmTaskCompletion(false);
    const initialRequestorBalance = await acaInstance.balanceOf(requestorAddress);
    await escrowInstance.connect(provider).serviceProviderConfirmTaskCompletion(false);

    // complete the task and check if the requestor balance increased
    const finalRequestorBalance = await acaInstance.balanceOf(requestorAddress);
    expect(finalRequestorBalance).to.equal(initialRequestorBalance.add(ESCROW_AMOUNT));
  });
```

With that, our test is ready to be run.

<details>
    <summary>Your test/Escrow.js should look like this:</summary>

    const { expect } = require("chai");
    const { Contract, ContractFactory } = require("ethers");
    const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
    const { ACA } = require("@acala-network/contracts/utils/Address");

    const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");

    const txFeePerGas = '199999946752';
    const storageByteDeposit = '100000000000000';

    const EscrowContract = require("../artifacts/contracts/escrow.sol/Escrow.json");

    describe("Escrow contract", function () {
    const ethParams = calcEthereumTransactionParams({
        gasLimit: '21000010',
        validUntil: '360001',
        storageLimit: '64001',
        txFeePerGas,
        storageByteDeposit
    });

    let deployer;
    let requestor;
    let provider;
    let requestorAddress;
    let providerAddress;
    let acaInstance;
    let Escrow;
    let escrowInstance;

    const ESCROW_AMOUNT = 1_000_000_000; // 0.001 ACA

    beforeEach(async function () {
        [deployer, requestor, provider] = await ethers.getSigners();

        requestorAddress = await requestor.getAddress();
        providerAddress = await provider.getAddress();

        acaInstance = new Contract(ACA, TokenContract.abi, requestor);

        Escrow = new ContractFactory(EscrowContract.abi, EscrowContract.bytecode, deployer);
        escrowInstance = await Escrow.deploy(acaInstance.address, ESCROW_AMOUNT, requestorAddress, providerAddress,
        {
            gasPrice: ethParams.txGasPrice,
            gasLimit: ethParams.txGasLimit,
        }
        );
    });

    it("deployment should assign the escrow provider and requestor", async function () {
        expect(await escrowInstance.requestor()).to.equal(requestorAddress);
        expect(await escrowInstance.serviceProvider()).to.equal(providerAddress);
    });

    it("should only allow the requestor to complete his part", async function () {
        await expect(escrowInstance.connect(provider).requestorConfirmTaskCompletion(true)).to.
        be.revertedWith("Only the requestor can confirm his part")
    });

    it("should only allow the service provider to complete his part", async function () {
        await expect(escrowInstance.connect(requestor).serviceProviderConfirmTaskCompletion(true)).to.
        be.revertedWith("Only the service provider can confirm his part")
    });

    it("should let the both parties confirm the task completion and send tokens to the service provider", async function () {
        // transfer funds to the contract
        const previousContractBalance = await acaInstance.balanceOf(escrowInstance.address);
        await acaInstance.transfer(escrowInstance.address, ESCROW_AMOUNT, { from: requestorAddress })
        const currentContractBalance = await acaInstance.balanceOf(escrowInstance.address);
        expect(currentContractBalance).to.equal(previousContractBalance.add(ESCROW_AMOUNT));

        // requestor and service provider confirm completion
        await escrowInstance.connect(provider).serviceProviderConfirmTaskCompletion(true)
        const initialProviderNativeBalance = await provider.getBalance();
        const initialProviderBalance = await acaInstance.balanceOf(providerAddress);
        await escrowInstance.connect(requestor).requestorConfirmTaskCompletion(true)

        // complete the task and check if the provider balance increased
        const finalProviderBalance = await acaInstance.balanceOf(providerAddress);
        expect(finalProviderBalance).to.equal(initialProviderBalance.add(ESCROW_AMOUNT));

        // the change in native ACA balance should match the change in ERC20 ACA balance
        const finalProviderNativeBalance = await provider.getBalance();
        // multiplied the escrow amount by 10⁶ because there's a difference in
        // BigNumber's decimals between native and ERC20 balance
        const expectedProviderNativeBalance = initialProviderNativeBalance.add(ESCROW_AMOUNT * 1_000_000);
        expect(finalProviderNativeBalance).to.equal(expectedProviderNativeBalance);
    });

    it("should let the both parties deny the task completion and send tokens back to the requestor", async function () {
        // transfer funds to the contract
        const previousContractBalance = await acaInstance.balanceOf(escrowInstance.address);
        await acaInstance.transfer(escrowInstance.address, ESCROW_AMOUNT, { from: requestorAddress })
        const currentContractBalance = await acaInstance.balanceOf(escrowInstance.address);
        expect(currentContractBalance).to.equal(previousContractBalance.add(ESCROW_AMOUNT));

        // requestor and service provider deny completion
        await escrowInstance.connect(requestor).requestorConfirmTaskCompletion(false);
        const initialRequestorBalance = await acaInstance.balanceOf(requestorAddress);
        await escrowInstance.connect(provider).serviceProviderConfirmTaskCompletion(false);

        // complete the task and check if the requestor balance increased
        const finalRequestorBalance = await acaInstance.balanceOf(requestorAddress);
        expect(finalRequestorBalance).to.equal(initialRequestorBalance.add(ESCROW_AMOUNT));
    });
    });

</details>


When you run the test with (for example) `yarn test-mandala`, your tests should pass with the following output:

```shell
➜ yarn test-mandala
yarn run v1.22.11
$ hardhat test test/Escrow.js --network mandala


  Escrow contract
    ✓ deployment should assign the escrow provider and requestor
    ✓ should only allow the requestor to complete his part (4075ms)
    ✓ should only allow the service provider to complete his part
    ✓ should let the both parties confirm the task completion and send tokens to the service provider (3233ms)
    ✓ should let the both parties deny the task completion and send tokens back to the requestor (3273ms)


  5 passing (16s)

Done in 17.66s.
```

## Script

This deployment script will deploy the contract.

Within the deploy.js we will have the definition of main function called main() and then run it. Above it we will be importing the values needed for the deployment transaction parameters.

```js
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const ESCROW_AMOUNT = 1_000_000_000; // 0.001 ACA

async function main() {

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Inside the `main` function we will set the transaction parameters for the deployment transaction and get the address of the account which will be used to deploy the smart contract and the addresses of both parties of the escrow. Then we get the `escrow.sol` to the contract factory and deploy it, passing the address of ACA predeployed token, its amount and both addresses of the parties, and assign the deployed smart contract to the instance variable. Assigning the instance variable is optional and we only do it to print the newly deployed contract address at the end.

```
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '21000010',
    validUntil: '360001',
    storageLimit: '640010',
    txFeePerGas,
    storageByteDeposit
  });

  const [deployer, requestor, provider] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  deployerAddress = await deployer.getAddress();
  requestorAddress = await requestor.getAddress();
  providerAddress = await provider.getAddress();

  acaInstance = new Contract(ACA, TokenContract.abi, requestor);

  const Escrow = await ethers.getContractFactory('Escrow');
  const escrow = await Escrow.deploy(acaInstance.address, ESCROW_AMOUNT, requestorAddress, providerAddress,
    {
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit,
    }
  );

  console.log("Escrow address:", escrow.address);
```


<details>
    <summary>Your script/deploy.js should look like this:</summary>

    const { Contract } = require("ethers");
    const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
    const { ACA } = require("@acala-network/contracts/utils/Address");

    const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");

    const txFeePerGas = '199999946752';
    const storageByteDeposit = '100000000000000';

    const ESCROW_AMOUNT = 1_000_000_000; // 0.001 ACA

    async function main() {
    const ethParams = calcEthereumTransactionParams({
        gasLimit: '21000010',
        validUntil: '360001',
        storageLimit: '640010',
        txFeePerGas,
        storageByteDeposit
    });

    const [deployer, requestor, provider] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    deployerAddress = await deployer.getAddress();
    requestorAddress = await requestor.getAddress();
    providerAddress = await provider.getAddress();

    acaInstance = new Contract(ACA, TokenContract.abi, requestor);

    const Escrow = await ethers.getContractFactory('Escrow');
    const escrow = await Escrow.deploy(acaInstance.address, ESCROW_AMOUNT, requestorAddress, providerAddress,
        {
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
        }
    );

    console.log("Escrow address:", escrow.address);
    }

    main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
</details>

Running the `yarn deploy` script should return the following output:

```shell
➜ yarn deploy-mandala
yarn run v1.22.11
$ hardhat run scripts/deploy.js --network mandala

Deploying contracts with the account: 0x75E480dB528101a381Ce68544611C169Ad7EB342
Escrow address: 0xBb50F59dD372811D183fCddfb8195F3e6A60C819
Done in 3.07s.
```

## Summary

With this tutorial we start exploring the advanced features of EVM+ building upon the precompiled tokens. As we are using utilities only available in the Acala EVM+, we can no longer use a conventional development network like Ganache or Hardhat's emulated network. We showed some features of the Acala blockchain e.g. how it syncs the balance of its native token with the equivalent ERC20 predeployed token.
