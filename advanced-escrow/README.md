# Acala EVM+ Hardhat Example: AdvancedEscrow
This tutorial dives into Acala EVM+ smart contract development using Hardhat development framework. The smart contract will allow users to initiate escrows in one currency, and for beneficiaries to specify if they desire to be paid in another currency. Another feature we will familiarise ourselves with is the on-chain automation using a predeployed smart contract called [Schedule](https://github.com/AcalaNetwork/predeploy-contracts/blob/master/contracts/docs/schedule/Schedule.md). Using it will allow us to set the automatic completion of escrow after a certain number of blocks are included in the blockchain.

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

compile contracts and build types
```
yarn build
```

deploy the contract with `scripts/deploy.ts`
```
yarn deploy:mandala
```

go thorugh the user journey with `scripts/journey.ts`
```
yarn journey:mandala
```

run tests with `test/*.ts`
```
yarn test:mandala
```

### run with public mandala
you can also run these scripts with public mandala by inserting your own account key to [hardhat.config.ts](./hardhat.config.ts), and then
```
yarn deploy:mandalaPub
yarn journey:mandalaPub
yarn test:mandalaPub
```

## Smart Contract Details
When two parties enter into an escrow agreement, using the `AdvancedEscrow` smart contract, the party paying for the service: first transfers the tokens from one of the predeployed ERC20 smart contracts into the escrow smart contract. The party then initiates the escrow within the smart contract. Initiation of escrow requires both the contract address of the token being escrowed, and the wallet address of the beneficiary of escrow.

Upon initiation of the escrow, the smart contract exchanges the tokens coming into escrow for AUSD. Then it sets the deadline after which, AUSD is released to the beneficiary. The beneficiary also has the ability to specify which tokens they want to receive from escrow and the smart contract exchanges the AUSD it is holding in escrow for the desired tokens upon completion of escrow.

We also allow for the escrow to be completed before the deadline, with the ability for the initiating party to release the funds to the beneficiary manually.

As each of the predeployed smart contracts has a predetermined address, we can use one of the
`Address` utlities of `@acala-network/contracts` dependency to set them in our smart contract. There
are the `AcalaAddress`, the `KaruraAddress` and the `MandalaAddress` utilities. We can use the
`MandalaAddress` in this example:

```solidity
import "@acala-network/contracts/utils/MandalaAddress.sol";
```

Now that we have sorted out all of the imports, we need to make sure that our `AdvancedEscrow` smart contract inherits the `ADDRESS` smart contract utility in order to be able to access the addresses of the predeployed contracts stored within it. We have to add the inheritance statement to the contract definition line:

```solidity
contract AdvancedEscrow is ADDRESS {
```

We can finally start working on the actual smart contract. We will be interacting with the predeployed [DEX](https://github.com/AcalaNetwork/predeploy-contracts/tree/master/contracts/docs/dex) and [Schedule](https://github.com/AcalaNetwork/predeploy-contracts/blob/master/contracts/docs/schedule/Schedule.md) smart contracts, so we can define them at the beginning of the smart contract:

```solidity
   IDEX public dex = IDEX(ADDRESS.DEX);
   ISchedule public schedule = ISchedule(ADDRESS.SCHEDULE);
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
 
       uint256 contractBalance = Token(ingressToken_).balanceOf(address(this));
       require(
           contractBalance >= ingressValue,
           "Escrow: contract balance is less than ingress value"
       );
 
       Token AUSDtoken = Token(ADDRESS.AUSD);
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
           Token token = Token(currentEscrow.egressToken);
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
           Token AusdToken = Token(ADDRESS.AUSD);
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

## User Journey Details
Beneficiary accepts the funds in aUSD and the escrow is released by `Schedule` predeployed smart contract.
Beneficiary accepts the funds in aUSD and the escrow is released by the initiator of the escrow, before it is released by the `Schedule`.
Beneficiary decides to get paid in DOT and the escrow is released by the `Schedule`.

It’s time to add a setup that includes getting the required signers, deploying the `AdvancedEscrow` smart contract and instantiating ACA ERC20 predeployed contract. We will also output the formatted balance of the ACA token to the console:

```ts
 const [initiator, beneficiary] = await ethers.getSigners();
 
 const initiatorAddress = initiator.address;
 const beneficiaryAddress = beneficiary.address;
 
 console.log("Address of the initiator is", initiatorAddress);
 console.log("Address of the beneficiary is", beneficiaryAddress);
 
 console.log("Deploying AdvancedEscrow smart contract")
 const AdvancedEscrow = await ethers.getContractFactory("AdvancedEscrow");
 const instance = await AdvancedEscrow.deploy();
 
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

```ts
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

```ts
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

```ts
 console.log("Instantiating AUSD instance");
 const AusdInstance = new Contract(AUSD, TokenContract.abi, initiator);
 
 const initalBeneficiatyAusdBalance = await AusdInstance.balanceOf(beneficiaryAddress);
 
 console.log("Initial aUSD balance of beneficiary: %s AUSD", formatUnits(initalBeneficiatyAusdBalance.toString(), 12));
```

**NOTE: The predeployed ERC20 smart contracts always use 12 decimal spaces, which means, we have to pass the decimals argument to the `formatUnits` and we can not use the default value of 18.**

As we have to wait for the `Schedule` to release the escrowed funds, we need to add a while loop to check whether the block in which the `Schedule` will release the funds has already been added to the blockchain. We don’t want to overwhelm the console output, so we have to add a helper function, which we define above the `main` function definition, that will pause the execution of the loop for `x` number of milliseconds:

```ts
const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));
```

We can finally add the loop that waits for the deadline block to be added to the chain:

```ts
 let currentBlockNumber = await ethers.provider.getBlockNumber();
 
 while(currentBlockNumber <= escrowBlockNumber + 10){
   console.log("Still waiting. Current block number is %s. Target block number is %s.", currentBlockNumber, escrowBlockNumber + 10);
   currentBlockNumber = await ethers.provider.getBlockNumber();
    await sleep(1000);
    await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
 }
```

All that is left to do in the first scenario is to get the final balance of the beneficiary and output it to the console along with the amount of funds, for which their balance has increased:

```ts
 const finalBeneficiaryAusdBalance = await AusdInstance.balanceOf(beneficiaryAddress);
 
 console.log("Final aUSD balance of beneficiary: %s AUSD", formatUnits(finalBeneficiaryAusdBalance.toString(), 12));
 console.log("Beneficiary aUSD balance has increased for %s AUSD", formatUnits(finalBeneficiaryAusdBalance.sub(initalBeneficiatyAusdBalance).toString(), 12));
```

In the second scenario, we will have the initiator releasing the funds before the `Schedule` has a chance to do so. We will add some more blank lines, so that the console output wil be clearer, initiate a new escrow and output it’s details:

```ts
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

```ts
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

```ts
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

```ts
 console.log("Beneficiary setting the desired escrow egress token");
 
 await instance.connect(beneficiary).setEgressToken(DOT);
```

If we want to output the beneficiary’s DOT balance and the difference in balance after the funds are released from escrow, we need to instantiate the DOT predeployed smart contract. Now we can also output the initial DOT balance of the beneficiary:

```ts
 console.log("Instantiating DOT instance");
 const DotInstance = new Contract(DOT, TokenContract.abi, initiator);
 
 const initalBeneficiatyDotBalance = await DotInstance.balanceOf(beneficiaryAddress);
 
 console.log("Initial DOT balance of beneficiary: %s DOT", formatUnits(initalBeneficiatyDotBalance.toString(), 12));
```

All that is left to do is to wait for the `Schedule` to release the funds and log the changes and results to the console:

```ts
 console.log("Waiting for automatic release of funds");
 
 let currentBlockNumber3 = await ethers.provider.getBlockNumber();
 
 while(currentBlockNumber3 <= escrowBlockNumber3 + 10){
   console.log("Still waiting. Current block number is %s. Target block number is %s.", currentBlockNumber3, escrowBlockNumber3 + 10);
   currentBlockNumber3 = await ethers.provider.getBlockNumber();
    await sleep(1000);
    await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
 }
 
 const finalBeneficiaryDotBalance = await DotInstance.balanceOf(beneficiaryAddress);
 
 console.log("Final DOT balance of beneficiary: %s DOT", formatUnits(finalBeneficiaryDotBalance.toString(), 12));
 console.log("Beneficiary DOT balance has increased for %s DOT", formatUnits(finalBeneficiaryDotBalance.sub(initalBeneficiatyDotBalance).toString(), 12));
```

With that, our user journey script is completed.

## Conclusion
We have successfully built an `AdvancedEscrow` smart contract that allows users to deposit funds in one token and is paid out in another. It also supports automatic release of funds after a desired number of blocks. 

This concludes our  `AdvancedEscrow` tutorial. We hope you enjoyed this dive into Acala EVM+ and have gotten a satisfying glimpse of what the **+** stands for.

All of the Acalanauts wish you a pleasant journey into the future of web3!

## More References
[Acala EVM+ Development Doc](https://evmdocs.acala.network/)
[predeploy contracts](https://github.com/AcalaNetwork/predeploy-contracts)