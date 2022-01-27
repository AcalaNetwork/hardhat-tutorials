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

  beforeEach(async function () {
    [deployer, requestor, provider] = await ethers.getSigners();

    deployerAddress = await deployer.getAddress();
    requestorAddress = await requestor.getAddress();
    providerAddress = await provider.getAddress();

    Escrow = new ContractFactory(EscrowContract.abi, EscrowContract.bytecode, deployer);
    escrowInstance = await Escrow.deploy(requestorAddress, providerAddress,
      {
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
      });

    acaInstance = new Contract(ACA, TokenContract.abi, requestor);
  });

  it("deployment should assign the escrow provider and requestor", async function () {
    expect(await escrowInstance.requestor()).to.equal(requestorAddress);
    expect(await escrowInstance.serviceProvider()).to.equal(providerAddress);
  });

  it("should only allow the requestor to complete his part", async function () {
    await expect(escrowInstance.connect(provider).requestorConfirmTaskCompletion(true)).to.
      be.revertedWith("Only the requestor can confirm his part")
    expect(await escrowInstance.requestorConfirmed()).to.be.false;
  });

  it("should only allow the service provider to complete his part", async function () {
    await expect(escrowInstance.connect(requestor).serviceProviderConfirmTaskCompletion(true)).to.
      be.revertedWith("Only the service provider can confirm his part")
    expect(await escrowInstance.serviceProviderConfirmed()).to.be.false;
  });

  it("should allow the requestor to fund the contract", async function () {
    const providerACABalance = await acaInstance.balanceOf(requestorAddress);

    expect(providerACABalance).to.be.above(100);

    await expect(escrowInstance.connect(provider).fund(acaInstance.address, 100)).to.
      be.revertedWith("Only the requestor can fund the contract")
    expect(await escrowInstance.amount()).to.equal(0);

    await expect(escrowInstance.connect(requestor).fund(acaInstance.address, 100)).to.
      emit(escrowInstance, "ContractFunded").withArgs(acaInstance.address, 100);
    expect(await escrowInstance.amount()).to.equal(100);

    // TODO: properly check balance
    // const requestorACABalanceUpdated = await acaInstance.balanceOf(requestorAddress);
    // console.info(requestorACABalance)
    // console.info(requestorACABalanceUpdated)

    // This will fail because of gas used on `fund` transaction
    // expect(requestorACABalanceUpdated).to.equal(requestorACABalance.sub(100));
  });

  it("should let the requestor complete the task and send funds to the service provider", async function () {
    await expect(escrowInstance.connect(requestor).fund(acaInstance.address, 100)).to.
      emit(escrowInstance, "ContractFunded").withArgs(acaInstance.address, 100);
    expect(await escrowInstance.amount()).to.equal(100);

    await escrowInstance.connect(requestor).requestorConfirmTaskCompletion(true)
    await escrowInstance.connect(provider).serviceProviderConfirmTaskCompletion(true)

    const providerACABalance = await acaInstance.balanceOf(providerAddress);

    await escrowInstance.connect(requestor).completeTask();

    expect(await escrowInstance.amount()).to.equal(0);

    const providerACABalanceUpdated = await acaInstance.balanceOf(providerAddress);

    expect(providerACABalanceUpdated).to.equal(providerACABalance.add(100));
  });

  // TODO: test scenario where task is not completed
});
