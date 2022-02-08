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
