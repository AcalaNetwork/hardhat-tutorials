import { ACA, AUSD, DOT } from '@acala-network/contracts/utils/MandalaTokens';
import { AdvancedEscrow, AdvancedEscrow__factory } from '../typechain-types';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Contract } from 'ethers';
import { DEX } from '@acala-network/contracts/utils/Predeploy';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { options } from '@acala-network/api';
import DEXContract from '@acala-network/contracts/build/contracts/DEX.json';
import TokenContract from '@acala-network/contracts/build/contracts/Token.json';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
const ENDPOINT_URL = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

describe('AdvancedEscrow contract', () => {
  let AdvancedEscrow: AdvancedEscrow__factory;
  let instance: AdvancedEscrow;
  let ACAinstance: Contract;    // TODO: use typechain
  let AUSDinstance: Contract;
  let DOTinstance: Contract;
  let DEXinstance: Contract;
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;
  let deployerAddress:string;
  let userAddress:string;
  let api: ApiPromise;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = deployer.address;
    userAddress = user.address;

    AdvancedEscrow = await ethers.getContractFactory('AdvancedEscrow');
    instance = await AdvancedEscrow.deploy();
    await instance.deployed();

    ACAinstance = new Contract(ACA, TokenContract.abi, deployer);
    AUSDinstance = new Contract(AUSD, TokenContract.abi, deployer);
    DOTinstance = new Contract(DOT, TokenContract.abi, deployer);
    DEXinstance = new Contract(DEX, DEXContract.abi, deployer);
    api = await ApiPromise.create(options({
      provider: new WsProvider(ENDPOINT_URL),
    }));
  });

  describe('Deployment', () => {
    it('should set the initial number of escrows to 0', async () => {
      expect(await instance.numberOfEscrows()).to.equal(0);
    });
  });

  describe('Operation', () => {
    it('should revert when beneficiary is 0x0', async () => {
      await expect(instance.initiateEscrow(NULL_ADDRESS, ACA, 10_000, 10)).to
        .be.revertedWith('Escrow: beneficiary_ is 0x0');
    });

    it('should revert when ingress token is 0x0', async () => {
      await expect(instance.initiateEscrow(userAddress, NULL_ADDRESS, 10_000, 10)).to
        .be.revertedWith('Escrow: ingressToken_ is 0x0');
    });

    it('should revert when period is 0', async () => {
      await expect(instance.initiateEscrow(userAddress, ACA, 10_000, 0)).to
        .be.revertedWith('Escrow: period is 0');
    });

    it('should revert when balance of the contract is lower than ingressValue', async () => {
      const balance = await ACAinstance.balanceOf(instance.address);

      expect(balance).to.be.below(10000);

      await expect(instance.initiateEscrow(userAddress, ACA, 10_000, 10)).to
        .be.revertedWith('Escrow: contract balance is less than ingress value');
    });

    it('should initate escrow and emit EscrowUpdate when initating escrow', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      const expectedValue = await DEXinstance.getSwapTargetAmount([ACA, AUSD], startingBalance.div(1_000_000));

      await expect(instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1)).to
        .emit(instance, 'EscrowUpdate')
        .withArgs(deployerAddress, userAddress, expectedValue, false);
    });

    it('should set the values of current escrow when initiating the escrow', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      const expectedValue = await DEXinstance.getSwapTargetAmount([ACA, AUSD], startingBalance.div(1_000_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

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

    it('should revert when initiating a new escrow when there is a preexiting active escrow', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

      await expect(instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1)).to
        .be.revertedWith('Escrow: current escrow not yet completed');
    });

    it('should revert when trying to set the egress token after the escrow has already been completed', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);

      await expect(instance.connect(user).setEgressToken(DOT)).to
        .be.revertedWith('Escrow: already completed');
    });

    it('should revert when trying to set the egress token while not being the beneficiary', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

      await expect(instance.setEgressToken(DOT)).to
        .be.revertedWith('Escrow: sender is not beneficiary');
    });

    it('should update the egress token', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      const expectedValue = await DEXinstance.getSwapTargetAmount([ACA, AUSD], startingBalance.div(1_000_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 10);
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

    it('should revert when trying to complete an already completed escrow', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
      await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);

      await expect(instance.completeEscrow()).to
        .be.revertedWith('Escrow: escrow already completed');
    });

    it('should revert when trying to complete an escrow when not being the initiator', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

      await expect(instance.connect(user).completeEscrow()).to
        .be.revertedWith('Escrow: caller is not initiator or this contract');
    });

    it('should pay out the escrow in AUSD if no egress token is set', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);
      const initalBalance = await AUSDinstance.balanceOf(userAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);

      await instance.completeEscrow();
      const finalBalance = await AUSDinstance.balanceOf(userAddress);

      expect(finalBalance).to.be.above(initalBalance);
    });

    it('should pay out the escrow in set token when egress token is set', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);
      const initalBalance = await DOTinstance.balanceOf(userAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 10);
      await instance.connect(user).setEgressToken(DOT);

      await instance.completeEscrow();
      const finalBalance = await DOTinstance.balanceOf(userAddress);

      expect(finalBalance).to.be.above(initalBalance);
    });

    it('should not pay out the escrow in set AUSD when egress token is set', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);
      const initalBalance = await AUSDinstance.balanceOf(userAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 10);
      await instance.connect(user).setEgressToken(DOT);

      await instance.completeEscrow();
      const finalBalance = await AUSDinstance.balanceOf(userAddress);

      expect(finalBalance).to.equal(initalBalance);
    });

    it('should emit EscrowUpdate when escrow is completed', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      const expectedValue = await DEXinstance.getSwapTargetAmount([ACA, AUSD], startingBalance.div(1_000_000));
      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 10);

      await expect(instance.completeEscrow()).to
        .emit(instance, 'EscrowUpdate')
        .withArgs(deployerAddress, userAddress, expectedValue, true);
    });

    it('should automatically complete the escrow when given number of blocks has passed', async () => {
      const startingBalance = await ACAinstance.balanceOf(deployerAddress);

      await ACAinstance.transfer(instance.address, startingBalance.div(100_000));

      await instance.initiateEscrow(userAddress, ACA, startingBalance.div(1_000_000), 1);
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
