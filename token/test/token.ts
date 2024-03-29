import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { parseEther } from 'ethers';

import { Token } from '../typechain-types';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('Token contract', () => {
  let instance: Token;
  let deployer: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let deployerAddress: string;
  let userAddress: string;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = deployer.address;
    userAddress = user.address;

    instance = await ethers.deployContract('Token', [1234567890]);
    await instance.waitForDeployment();
  });

  describe('Deployment', () => {
    it('should set the correct token name', async () => {
      expect(await instance.name()).to.equal('Token');
    });

    it('should set the correct token symbol', async () => {
      expect(await instance.symbol()).to.equal('TKN');
    });

    it('should set the correct total supply', async () => {
      expect(await instance.totalSupply()).to.equal(1234567890);
    });

    it('should assign the initial balance to the deployer', async () => {
      expect(await instance.balanceOf(deployerAddress)).to.equal(1234567890);
    });

    it('should not assign value to a random address upon deployment', async () => {
      expect(await instance.balanceOf(userAddress)).to.equal(0);
    });

    it('should not assign allowance upon deployment', async () => {
      expect(await instance.allowance(deployerAddress, userAddress)).to.equal(0);
      expect(await instance.allowance(userAddress, deployerAddress)).to.equal(0);
    });
  });

  describe('Operation', () => {

    describe('Transfer', () => {
      describe('transfer()', () => {
        it('should change the balance of the sender and receiver when transferring token', async () => {
          const initialDeployerBalance = await instance.balanceOf(deployerAddress);
          const initialUserBalance = await instance.balanceOf(userAddress);

          await instance.transfer(userAddress, 500);

          const finalDeployerBalance = await instance.balanceOf(deployerAddress);
          const finalUserBalance = await instance.balanceOf(userAddress);

          expect(initialDeployerBalance - 500n).to.equal(finalDeployerBalance);
          expect(initialUserBalance + 500n).to.equal(finalUserBalance);
        });

        it('should emit a Transfer event when transfering the token', async () => {
          await expect(instance.transfer(userAddress, 100))
            .to.emit(instance, 'Transfer')
            .withArgs(deployerAddress, userAddress, 100);
        });

        it('should revert the transfer to a 0x0 address', async () => {
          await expect(instance.transfer(NULL_ADDRESS, 100)).to.be.revertedWith(
            'ERC20: transfer to the zero address'
          );
        });

        it('should revert if trying to transfer amount bigger than balance', async () => {
          await expect(instance.transfer(userAddress, 12345678900)).to.be.revertedWith(
            'ERC20: transfer amount exceeds balance'
          );
        });
      });
    });

    describe('Allowances', () => {
      describe('approve()', () => {
        it('should grant allowance when the caller has enough funds', async () => {
          await instance.approve(userAddress, 100);

          expect(await instance.allowance(deployerAddress, userAddress)).to.equal(100);
        });

        it('should grant allowance when the caller has less funds than the ize of the allowance', async () => {
          await instance.approve(userAddress, 12345678900);

          expect(await instance.allowance(deployerAddress, userAddress)).to.equal(12345678900);
        });

        it('should emit Approval event when calling approve()', async () => {
          await expect(instance.approve(userAddress, 100))
            .to.emit(instance, 'Approval')
            .withArgs(deployerAddress, userAddress, 100);
        });

        it('should revert when trying to give allowance to 0x0 address', async () => {
          await expect(instance.approve(NULL_ADDRESS, 100)).to.be.revertedWith(
            'ERC20: approve to the zero address'
          );
        });
      });

      describe('increaseAllowance()', () => {
        it('should allow to increase allowance', async () => {
          await instance.approve(userAddress, 100);

          const initialAllowance = await instance.allowance(deployerAddress, userAddress);

          await instance.increaseAllowance(userAddress, 50);

          const finalAllowance = await instance.allowance(deployerAddress, userAddress);

          expect(finalAllowance - initialAllowance).to.equal(50);
        });

        it('should allow to increase allowance above the balance', async () => {
          await instance.approve(userAddress, 100);

          const initialAllowance = await instance.allowance(deployerAddress, userAddress);

          await instance.increaseAllowance(userAddress, 1234567890);

          const finalAllowance = await instance.allowance(deployerAddress, userAddress);

          expect(finalAllowance - initialAllowance).to.equal(1234567890);
        });

        it('should emit Approval event', async () => {
          await instance.approve(userAddress, 100);
          await expect(instance.increaseAllowance(userAddress, 40))
            .to.emit(instance, 'Approval')
            .withArgs(deployerAddress, userAddress, 140);
        });

        it('should allow to increase allowance even if none was given before', async () => {
          await instance.increaseAllowance(userAddress, 1234567890);

          const allowance = await instance.allowance(deployerAddress, userAddress);

          expect(allowance).to.equal(1234567890);
        });
      });

      describe('decreaseAllowance()', () => {
        it('should decrease the allowance', async () => {
          await instance.approve(userAddress, 100);
          await instance.decreaseAllowance(userAddress, 40);

          const allowance = await instance.allowance(deployerAddress, userAddress);

          expect(allowance).to.equal(60);
        });

        it('should emit Approval event', async () => {
          await instance.approve(userAddress, 100);
          await expect(instance.decreaseAllowance(userAddress, 40))
            .to.emit(instance, 'Approval')
            .withArgs(deployerAddress, userAddress, 60);
        });

        it('should revert when tyring to decrease the allowance below 0', async () => {
          await instance.approve(userAddress, 100);
          await expect(instance.decreaseAllowance(userAddress, 1000)).to.be.revertedWith(
            'ERC20: decreased allowance below zero'
          );
        });
      });

      describe('transferFrom()', () => {
        it('should allow to transfer tokens when allowance is given', async () => {
          await instance.approve(userAddress, 100);

          const initialBalance = await instance.balanceOf(userAddress);

          await instance.connect(user).transferFrom(deployerAddress, userAddress, 50);

          const finalBalance = await instance.balanceOf(userAddress);

          expect(initialBalance + 50n).to.equal(finalBalance);
        });

        it('should emit Transfer event when transferring from another address', async () => {
          await instance.approve(userAddress, 100);

          await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 40))
            .to.emit(instance, 'Transfer')
            .withArgs(deployerAddress, userAddress, 40);
        });

        it('should emit Approval event when transferring from another address', async () => {
          await instance.approve(userAddress, 100);

          await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 40))
            .to.emit(instance, 'Approval')
            .withArgs(deployerAddress, userAddress, 60);
        });

        it('should update the allowance when transferring from another address', async () => {
          await instance.approve(userAddress, 100);
          await instance.connect(user).transferFrom(deployerAddress, userAddress, 40);

          expect(await instance.allowance(deployerAddress, userAddress)).to.equal(60);
        });

        it('should revert when tring to transfer more than allowed amount', async () => {
          await instance.approve(userAddress, 100);
          await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 1000)).to.be.revertedWith('ERC20: insufficient allowance');
        });

        it('should revert when transfering to 0x0 address', async () => {
          await instance.approve(userAddress, 100);
          await expect(instance.connect(user).transferFrom(deployerAddress, NULL_ADDRESS, 50)).to.be.revertedWith(
            'ERC20: transfer to the zero address'
          );
        });

        it('should revert when owner doesn\'t have enough funds', async () => {
          await instance.approve(userAddress, 12345678900);
          await expect(
            instance.connect(user).transferFrom(deployerAddress, userAddress, 12345678900)
          ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });

        it('should revert when trying to transfer from without being given allowance', async () => {
          await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 10)).to.be.revertedWith('ERC20: insufficient allowance');
        });
      });
    });
  });
});
