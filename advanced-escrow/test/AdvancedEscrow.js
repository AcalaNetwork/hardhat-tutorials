const { ACA, AUSD, DEX, DOT } = require('@acala-network/contracts/utils/Address');
const { expect } = require('chai');
const { Contract, ContractFactory, BigNumber } = require('ethers');

const { txParams } = require('../utils/transactionHelper');
const AdvancedEscrowContract = require('../artifacts/contracts/AdvancedEscrow.sol/AdvancedEscrow.json');
const TokenContract = require('@acala-network/contracts/build/contracts/Token.json');
const DEXContract = require('@acala-network/contracts/build/contracts/DEX.json')
const { ApiPromise, WsProvider } = require('@polkadot/api');

require('console.mute');

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';
const provider = new WsProvider(ENDPOINT_URL);

describe('AdvancedEscrow contract', function () {
  let AdvancedEscrow;
  let instance;
  let ACAinstance;
  let AUSDinstance;
  let DOTinstance;
  let DEXinstance;
  let deployer;
  let user;
  let deployerAddress;
  let userAddress;
  let ethParams;
  let api;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    userAddress = await user.getAddress();
    AdvancedEscrow = new ContractFactory(AdvancedEscrowContract.abi, AdvancedEscrowContract.bytecode, deployer);
    ethParams = await txParams();
    instance = await AdvancedEscrow.deploy({
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit,
    });
    await instance.deployed();
    ACAinstance = new Contract(ACA, TokenContract.abi, deployer);
    AUSDinstance = new Contract(AUSD, TokenContract.abi, deployer);
    DOTinstance = new Contract(DOT, TokenContract.abi, deployer);
    DEXinstance = new Contract(DEX, DEXContract.abi, deployer);
    console.mute();
    api = await ApiPromise.create({ provider });
    console.resume();
  });

  describe('Deployment', function () {
    it('should set the initial number of escrows to 0', async function () {
      expect(await instance.numberOfEscrows()).to.equal(0);
    });
  });

  describe('Operation', function () {
    it('should revert when beneficiary is 0x0', async function () {
      await expect(instance.initiateEscrow(NULL_ADDRESS, ACA, 10_000, 10)).to
        .be.revertedWith('Escrow: beneficiary_ is 0x0');
    });

    it('should revert when ingress token is 0x0', async function () {
      await expect(instance.initiateEscrow(userAddress, NULL_ADDRESS, 10_000, 10)).to
        .be.revertedWith('Escrow: ingressToken_ is 0x0');
    });

    it('should revert when period is 0', async function () {
      await expect(instance.initiateEscrow(userAddress, ACA, 10_000, 0)).to
        .be.revertedWith('Escrow: period is 0');
    });

    it('should revert when balance of the contract is lower than ingressValue', async function () {
      const balance = await ACAinstance.balanceOf(instance.address);

      expect(balance).to.be.below(BigNumber.from('10000'));

      await expect(instance.initiateEscrow(userAddress, ACA, 10_000, 10)).to
        .be.revertedWith('Escrow: contract balance is less than ingress value');
    });

    it('should initate escrow and emit EscrowUpdate when initating escrow', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      const expectedValue = await DEXinstance.getSwapTargetAmount([ACA, AUSD], startingBalance.div(1_000_000));

      await expect(instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1)).to
        .emit(instance, 'EscrowUpdate')
        .withArgs(deployerAddress, userAddress, expectedValue, false);
    });

    it('should set the values of current escrow when initiating the escrow', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      const expectedValue = await DEXinstance.getSwapTargetAmount([ACA, AUSD], startingBalance.div(1_000_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

      const blockNumber = await ethers.provider.getBlockNumber();
      const currentId = await instance.numberOfEscrows();
      const escrow = await instance.escrows(currentId.sub(1));

      expect(escrow.initiator).to.equal(deployerAddress);
      expect(escrow.beneficiary).to.equal(userAddress);
      expect(escrow.ingressToken).to.equal(ACA);
      expect(escrow.egressToken).to.equal(NULL_ADDRESS);
      expect(escrow.AusdValue).to.equal(expectedValue);
      expect(escrow.deadline).to.equal(blockNumber + 1);
      expect(escrow.completed).to.be.false;
    });

    it('should revert when initiating a new escrow when there is a preexiting active escrow', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);
      
      await expect(instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1)).to
        .be.revertedWith('Escrow: current escrow not yet completed');
    });

    it('should revert when trying to set the egress token after the escrow has already been completed', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);

      await expect(instance.connect(user).setEgressToken(DOT)).to
        .be.revertedWith('Escrow: already completed');
    });

    it('should revert when trying to set the egress token while not being the beneficiary', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

      await expect(instance.connect(deployer).setEgressToken(DOT)).to
        .be.revertedWith('Escrow: sender is not beneficiary');
    });

    it('should update the egress token', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      const expectedValue = await DEXinstance.getSwapTargetAmount([ACA, AUSD], startingBalance.div(1_000_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 10);
      const blockNumber = await ethers.provider.getBlockNumber();

      await instance.connect(user).setEgressToken(DOT);

      const currentId = await instance.numberOfEscrows();
      const escrow = await instance.escrows(currentId.sub(1));

      expect(escrow.initiator).to.equal(deployerAddress);
      expect(escrow.beneficiary).to.equal(userAddress);
      expect(escrow.ingressToken).to.equal(ACA);
      expect(escrow.egressToken).to.equal(DOT);
      expect(escrow.AusdValue).to.equal(expectedValue);
      expect(escrow.deadline).to.equal(blockNumber + 10);
      expect(escrow.completed).to.be.false;
    });

    it('should revert when trying to complete an already completed escrow', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);

      await expect(instance.connect(deployer).completeEscrow()).to
        .be.revertedWith('Escrow: escrow already completed');
    });

    it('should revert when trying to complete an escrow when not being the initiator', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

      await expect(instance.connect(user).completeEscrow()).to
        .be.revertedWith('Escrow: caller is not initiator or this contract');
    });

    it('should pay out the escrow in AUSD if no egress token is set', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);
      const initalBalance = await AUSDinstance.balanceOf(userAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

      await instance.connect(deployer).completeEscrow();
      const finalBalance = await AUSDinstance.balanceOf(userAddress);

      expect(finalBalance).to.be.above(initalBalance);
    });

    it('should pay out the escrow in set token when egress token is set', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);
      const initalBalance = await DOTinstance.balanceOf(userAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 10);
      await instance.connect(user).setEgressToken(DOT);

      await instance.connect(deployer).completeEscrow();
      const finalBalance = await DOTinstance.balanceOf(userAddress);

      expect(finalBalance).to.be.above(initalBalance);
    });

    it('should not pay out the escrow in set AUSD when egress token is set', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);
      const initalBalance = await AUSDinstance.balanceOf(userAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 10);
      await instance.connect(user).setEgressToken(DOT);

      await instance.connect(deployer).completeEscrow();
      const finalBalance = await AUSDinstance.balanceOf(userAddress);

      expect(finalBalance).to.equal(initalBalance);
    });

    it('should emit EscrowUpdate when escrow is completed', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      const expectedValue = await DEXinstance.getSwapTargetAmount([ACA, AUSD], startingBalance.div(1_000_000));
      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 10);

      await expect(instance.connect(deployer).completeEscrow()).to
        .emit(instance, 'EscrowUpdate')
        .withArgs(deployerAddress, userAddress, expectedValue, true);
    });

    it('should automatically complete the escrow when given number of blocks has passed', async function () {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.connect(deployer).transfer(instance.address, startingBalance.div(100_000));

      await instance.connect(deployer).initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);
      const currentEscrow = await instance.numberOfEscrows();
      const initalState = await instance.escrows(currentEscrow.sub(1));
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
      const finalState = await instance.escrows(currentEscrow.sub(1));

      expect(initalState.completed).to.be.false;
      expect(finalState.completed).to.be.true;
    });
  });
});
