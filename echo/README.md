# Hardhat example: echo

## Table of contents

- [About](#about)
- [Smart contract](#smart-contract)
- [Test](#test)
- [Deploy script](#deploy-script)
- [Summary](#summary)

## About

This is an example that builds upon the [hello-world example](../hello-world/README.md) with
additional functionalities, like support for events, interactable public functions and private
variables. As the hello-world already contains an example on how to build the project, we will only
focus on building the smart contract, test and deploy scripts. For the setup and naming, replace the
hello-world with echo. Let's jump into it!

## Smart contract

In this tutorial we will be adding a simple smart contract that has a public variable called `echo`,
which stores the latest string passed to a public function. Every time the `echo` variable is
changed, the event, containing the latest value as well as the number of time it was changed, is
emitted.

Your empty smart contract should look like this:

```solidity
pragma solidity =0.8.9;

contract Echo{
   
}
```

`echo` variable, used to store the string passed to it, is placed at the beginning of the example.
Its visibility should be set to public, so that the compiler builds a getter function for it.
`echoCount` variable is used to count the number of times the `echo` variable is changed.
Additionally we will have a `NewEcho` event that will be emitted every time the `echo` variable is
changed and it will contain the new value as well as the number of times the `echo` variable is
changed. The content of the smart contract, including these two variables and the event, looks like
this:

```solidity
    string public echo;
    uint echoCount;

    event NewEcho(string message, uint count);
```

The `constructor` function can set the initial walue of the `echo` variable. Let's set it to
`Deployed successfully!`, to signal that the smart contract is ready to use:

```solidity
    constructor() {
        echo = "Deployed successfully!";
    }
```

The last thing to add is a function that allows us to change the value of the `echo` variable. The
function should assign the new value to the `echo` variable, increment the `echoCount`, emit the
`NewEcho` event and return the input string. Let's call this function `scream()` as it will cause an
echo:

```solidity
    function scream(string memory message) public returns(string memory){
        echo = message;
        echoCount += 1;
        emit NewEcho(message, echoCount);
        return message;
    }
```

This concludes our `Echo` smart contract.

<details>
    <summary>Your contracts/Echo.sol should look like this:</summary>

    pragma solidity =0.8.9;

    contract Echo{
        string public echo;
        uint echoCount;

        event NewEcho(string message, uint count);

        constructor() {
            echo = "Deployed successfully!";
        }

        function scream(string memory message) public returns(string memory){
            echo = message;
            echoCount += 1;
            emit NewEcho(message, echoCount);
            return message;
        }
    }

</details>

As the Echo smart contract is ready to be compiled, we can use the `yarn build` command (like we did
in the [hello-world](../hello-world/package.json)) to compile the smart contract, which will create
the `artifacts` directory and contain the compiled smart contract.

## Test

Your test file should be called `Echo.js` and the empty test along with the import statements
and transaction parameters definition should look like this:

```js
const { expect } = require("chai");
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

describe("Echo contract", async function () {
        const ethParams = calcEthereumTransactionParams({
                gasLimit: '2100001',
                validUntil: '360001',
                storageLimit: '64001',
                txFeePerGas,
                storageByteDeposit
        });

});
```

To prepare for the testing, we have to define two global variables, `Echo` and `instance`. The
`Echo` will be used to store the Echo contract factory and the `instance` will store the deployed
Echo smart contract. Let's assign them values in the `beforeEach` action:

```js
        let Echo;
        let instance;

        beforeEach(async function () {
                Echo = await ethers.getContractFactory("Echo");
                instance = await Echo.deploy({
                        gasPrice: ethParams.txGasPrice,
                        gasLimit: ethParams.txGasLimit
                });
        });
```

Our test will be split into two sections, `Deployment` and `Operation`:

```js
        describe("Deployment", function () {

        });

        describe("Operation", function () {
          
        });
```

Within `Deployment` describe block we will validate that the `echo` variable is set to `Deployed
successfully!`:

```js
                it("should set the value of the echo when deploying", async function () {
                        expect(await instance.echo()).to.equal("Deployed successfully!");
                });
```

In the `Operation` describe block we first need to increase the timeout to 50000ms, so that the RPC
adapter has enough time to return the required information:

```js
                this.timeout(50000);
```

We can now add the following test cases to our describe block:

1. The contract should update the `echo` variable when `scream()` is called.
2. When the `echo` variable is changed, the `NewEcho` should be emitted.
3. The `echoCount` should be incremented when new string is saved to the `echo` variable.
4. The `scream()` function should return the input value.

The test cases of the `Operation` describe block should look like this:

```js
                it("should update the echo variable", async function () {
                        await instance.scream("Hello World!");

                        expect(await instance.echo()).to.equal("Hello World!");
                });

                it("should emit a NewEcho event", async function () {
                        await expect(instance.scream("Hello World!")).to
                                .emit(instance, "NewEcho")
                                .withArgs("Hello World!", 1);
                });

                it("should increment echo counter in the NewEcho event", async function () {
                        await instance.scream("Hello World!");

                        await expect(instance.scream("Goodbye World!")).to
                                .emit(instance, "NewEcho")
                                .withArgs("Goodbye World!", 2);
                });

                it("should return input value", async function () {
                        const response = await instance.callStatic.scream("Hello World!");

                        expect(response).to.equal("Hello World!");
                });
```

With that, our test is ready to be run.

<details>
    <summary>Your test/Echo.js should look like this:</summary>

        const { expect } = require("chai");
        const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

        const txFeePerGas = '199999946752';
        const storageByteDeposit = '100000000000000';

        describe("Echo contract", async function () {
                const ethParams = calcEthereumTransactionParams({
                        gasLimit: '2100001',
                        validUntil: '360001',
                        storageLimit: '64001',
                        txFeePerGas,
                        storageByteDeposit
                });

                let Echo;
                let instance;

                beforeEach(async function () {
                        Echo = await ethers.getContractFactory("Echo");
                        instance = await Echo.deploy({
                                gasPrice: ethParams.txGasPrice,
                                gasLimit: ethParams.txGasLimit
                        });
                });

                describe("Deployment", function () {
                        it("should set the value of the echo when deploying", async function () {
                                expect(await instance.echo()).to.equal("Deployed successfully!");
                        });
                });

                describe("Operation", function () {
                        this.timeout(50000);

                        it("should update the echo variable", async function () {
                                await instance.scream("Hello World!");

                                expect(await instance.echo()).to.equal("Hello World!");
                        });

                        it("should emit a NewEcho event", async function () {
                                await expect(
                                        instance.scream("Hello World!")).to
                                        .emit(instance, "NewEcho")
                                        .withArgs("Hello World!", 1);
                        });

                        it("should increment echo counter in the NewEcho event", async function () {
                                await instance.scream("Hello World!");

                                await expect(
                                        instance.scream("Goodbye World!")).to
                                        .emit(instance, "NewEcho")
                                        .withArgs("Goodbye World!", 2);
                        });

                        it("should return input value", async function () {
                                const response = await instance.callStatic.scream("Hello World!");

                                expect(response).to.equal("Hello World!");
                        });
                });
        });

</details>

When you run the test with (for example) `yarn test-mandala`, your tests should pass with the
following output:

```shell
yarn test-mandala


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ hardhat test --network mandala


  Echo contract
    Deployment
      ✓ should set the value of the echo when deploying (8247ms)
    Operation
      ✓ should update the echo variable (11574ms)
      ✓ should emit a NewEcho event (19568ms)
      ✓ should increment echo counter in the NewEcho event (25942ms)
      ✓ should return input value (8170ms)


  5 passing (2m)

✨  Done in 102.01s.
```

## Deploy script

This deployment script will deploy the contract and output the value of the `echo` variable.

Within the `deploy.js` we will have the definition of main function called `main()` and then run it.
Above it we will be importing the values needed for the deployment transaction parameters. We do
this by placing the following code within the file:

```js
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

async function main() {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: '360001',
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });
    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Our deploy script will reside in the definition (`async function main()`). First, we will get the
address of the account which will be used to deploy the smart contract. Then we get the `Echo.sol`
to the contract factory and deploy it and assign the deployed smart contract to the `instance`
variable. Assigning the `instance` variable is optional and is only done, so that we can output the
value returned by the `echo()` getter to the terminal. We retrieve the value of `echo` variable by
calling `echo()` from instance and outputting the result using `console.log()`:

```js
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contract with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Echo = await ethers.getContractFactory("Echo");
  const instance = await Echo.deploy({
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit,
  });

  console.log("Echo address:", instance.address);

  const value = await instance.echo();

  console.log("Deployment status:", value);
```

<details>
    <summary>Your script/deploy.js should look like this:</summary>

        const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

        const txFeePerGas = '199999946752';
        const storageByteDeposit = '100000000000000';

        async function main() {
                const ethParams = calcEthereumTransactionParams({
                        gasLimit: '2100001',
                        validUntil: '360001',
                        storageLimit: '64001',
                        txFeePerGas,
                        storageByteDeposit
                });

                const [deployer] = await ethers.getSigners();

                console.log("Deploying contract with the account:", deployer.address);

                console.log("Account balance:", (await deployer.getBalance()).toString());

                const Echo = await ethers.getContractFactory("Echo");
                const instance = await Echo.deploy({
                        gasPrice: ethParams.txGasPrice,
                        gasLimit: ethParams.txGasLimit,
                });

                console.log("Echo address:", instance.address);

                const value = await instance.echo();

                console.log("Deployment status:", value);
        }

        main()
                .then(() => process.exit(0))
                .catch((error) => {
                console.error(error);
                process.exit(1);
        });

</details>

Running the `yarn deploy-mandala` script should return the following output:

```shell
yarn deploy-mandala


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ hardhat run scripts/deploy.js --network mandala
Deploying contract with the account: 0x75E480dB528101a381Ce68544611C169Ad7EB342
Account balance: 9999993084982117502000000
Echo address: 0x02d7055704EfF050323A2E5ee4ba05DB2A588959
Deployment status: Deployed successfully!
✨  Done in 19.85s.
```

## Summary

We have built upon the first example and added a smart contract with more functionalities and tested
all of them. The tests were more detailed and covered more examples. We also ensured that we can
interact with the smart contract and that we can modify its storage. We can compile smart contract
`yarn build`, test it with `yarn test`, `yarn test-mandala` or `yarn test-mandala:pubDev` and deploy
it with `yarn deploy`, `yarn deploy-mandala` or  `yarn deploy-mandala:pubDev`.