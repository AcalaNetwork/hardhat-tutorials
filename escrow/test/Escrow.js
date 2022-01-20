const { expect, use } = require("chai");
const { ContractFactory } = require("ethers");
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const EscrowContract = require("../artifacts/contracts/escrow.sol/Escrow.json");

describe("Escrow contract", function () {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: '360001',
    storageLimit: '640010',
    txFeePerGas,
    storageByteDeposit
  });

  beforeEach(async function () {
    [requestor, provider] = await ethers.getSigners();
    requestorAddress = await requestor.getAddress();
    providerAddress = await provider.getAddress();
    Escrow = new ContractFactory(EscrowContract.abi, EscrowContract.bytecode, requestor);
    instance = await Escrow.deploy(providerAddress,
      {
        gasPrice: ethParams.txGasPrice,
        // TODO: fix this, going overboard for some reason
        // gasLimit: ethParams.txGasLimit,
        gasLimit: 30000000,
      });
  });

  it("deployment should assign the escrow provider and requestor", async function () {
    expect(await instance.requestor()).to.equal(requestorAddress);
    expect(await instance.serviceProvider()).to.equal(providerAddress);
  });

  it("should only allow the requestor to complete his part", async function () {
    await expect(instance.connect(provider).requestorConfirmTaskCompletion(true)).to.
      be.revertedWith("Only the requestor can confirm his part")
    expect(await instance.requestorConfirmed()).to.be.false;
  });

  it("should only allow the service provider to complete his part", async function () {
    await expect(instance.connect(requestor).serviceProviderConfirmTaskCompletion(true)).to.
      be.revertedWith("Only the service provider can confirm his part")
    expect(await instance.serviceProviderConfirmed()).to.be.false;
  });

  it("should allow the requestor to fund the contract", async function () {
    await expect(instance.connect(provider).fund(100)).to.
      be.revertedWith("Only the requestor can fund the contract")
    expect(await instance.amount()).to.equal(0);

    await expect(instance.connect(requestor).fund(100)).to.emit(instance, "ContractFunded").withArgs(100);
    expect(await instance.amount()).to.equal(100);
  });

  it("should let the requestor complete the task and send funds to the service provider", async function () {
    await expect(instance.connect(requestor).fund(100)).to.emit(instance, "ContractFunded").withArgs(100);
    expect(await instance.amount()).to.equal(100);

    await instance.connect(requestor).requestorConfirmTaskCompletion(true)
    await instance.connect(provider).serviceProviderConfirmTaskCompletion(true)
    await instance.connect(requestor).completeTask();

    expect(await instance.amount()).to.equal(0);
  });
});