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
  let initiator;
  let beneficiary;
  let initiatorAddress;
  let beneficiaryAddress;
  let acaInstance;
  let Escrow;
  let escrowInstance;

  const ESCROW_AMOUNT = 1_000_000_000; // 0.001 ACA

  beforeEach(async function () {
    [deployer, initiator, beneficiary] = await ethers.getSigners();

    initiatorAddress = await initiator.getAddress();
    beneficiaryAddress = await beneficiary.getAddress();

    acaInstance = new Contract(ACA, TokenContract.abi, initiator);

    Escrow = new ContractFactory(EscrowContract.abi, EscrowContract.bytecode, deployer);
    escrowInstance = await Escrow.deploy(acaInstance.address, ESCROW_AMOUNT, initiatorAddress, beneficiaryAddress,
      {
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
      }
    );
  });

  it("deployment should assign the escrow beneficiary and initiator", async function () {
    expect(await escrowInstance.initiator()).to.equal(initiatorAddress);
    expect(await escrowInstance.beneficiary()).to.equal(beneficiaryAddress);
  });

  it("should only allow the initiator to complete his part", async function () {
    await expect(escrowInstance.connect(beneficiary).initiatorConfirmTaskCompletion(true)).to.
      be.revertedWith("Only the initiator can confirm his part")
  });

  it("should only allow the beneficiary to complete his part", async function () {
    await expect(escrowInstance.connect(initiator).beneficiaryConfirmTaskCompletion(true)).to.
      be.revertedWith("Only the beneficiary can confirm his part")
  });

  it("should let the both parties confirm the task completion and send tokens to the beneficiary", async function () {
    // transfer funds to the contract
    const previousContractBalance = await acaInstance.balanceOf(escrowInstance.address);
    await acaInstance.transfer(escrowInstance.address, ESCROW_AMOUNT, { from: initiatorAddress })
    const currentContractBalance = await acaInstance.balanceOf(escrowInstance.address);
    expect(currentContractBalance).to.equal(previousContractBalance.add(ESCROW_AMOUNT));

    // initiator and beneficiary confirm completion
    await escrowInstance.connect(beneficiary).beneficiaryConfirmTaskCompletion(true)
    const initialBeneficiaryNativeBalance = await beneficiary.getBalance();
    const initialBeneficiaryBalance = await acaInstance.balanceOf(beneficiaryAddress);
    await escrowInstance.connect(initiator).initiatorConfirmTaskCompletion(true)

    // complete the task and check if the beneficiary balance increased
    const finalBeneficiaryBalance = await acaInstance.balanceOf(beneficiaryAddress);
    expect(finalBeneficiaryBalance).to.equal(initialBeneficiaryBalance.add(ESCROW_AMOUNT));

    // the change in native ACA balance should match the change in ERC20 ACA balance
    const finalBeneficiaryNativeBalance = await beneficiary.getBalance();
    // multiplied the escrow amount by 10⁶ because there's a difference in
    // BigNumber's decimals between native and ERC20 balance
    const expectedBeneficiaryNativeBalance = initialBeneficiaryNativeBalance.add(ESCROW_AMOUNT * 1_000_000);
    expect(finalBeneficiaryNativeBalance).to.equal(expectedBeneficiaryNativeBalance);
  });

  it("should let the both parties deny the task completion and send tokens back to the initiator", async function () {
    // transfer funds to the contract
    const previousContractBalance = await acaInstance.balanceOf(escrowInstance.address);
    await acaInstance.transfer(escrowInstance.address, ESCROW_AMOUNT, { from: initiatorAddress })
    const currentContractBalance = await acaInstance.balanceOf(escrowInstance.address);
    expect(currentContractBalance).to.equal(previousContractBalance.add(ESCROW_AMOUNT));

    // initiator and beneficiary deny completion
    await escrowInstance.connect(initiator).initiatorConfirmTaskCompletion(false);
    const initialInitiatorBalance = await acaInstance.balanceOf(initiatorAddress);
    await escrowInstance.connect(beneficiary).beneficiaryConfirmTaskCompletion(false);

    // complete the task and check if the initiator balance increased
    const finalInitiatorBalance = await acaInstance.balanceOf(initiatorAddress);
    expect(finalInitiatorBalance).to.equal(initialInitiatorBalance.add(ESCROW_AMOUNT));
  });
});
