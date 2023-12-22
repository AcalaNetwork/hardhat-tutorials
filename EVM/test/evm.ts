import { Contract, Wallet } from 'ethers';
import { EVM } from '@acala-network/contracts/utils/Predeploy';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import EVMContract from '@acala-network/contracts/build/contracts/EVM.json';
import TokenContract from '@acala-network/contracts/build/contracts/Token.json';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('EVM contract', function () {
  let instance: Contract;   // TODO: use typechain
  let contract: Contract;   // TODO: use typechain
  let deployer: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let deployerAddress: string;
  let userAddress: string;

  beforeEach(async function () {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    userAddress = await user.getAddress();
    instance = new Contract(EVM, EVMContract.abi, deployer);
    const Token = new ethers.ContractFactory(TokenContract.abi, TokenContract.bytecode, deployer);
    contract = await Token.deploy();
  });

  describe('Operation', function () {
    describe('newContractExtraBytes()', function () {
      it('should return the new contract extra bytes', async function () {
        const response = await instance.newContractExtraBytes();

        expect(response).to.be.above(0);
      });
    });

    describe('storageDepositPerByte()', function () {
      it('should return the storage deposit', async function () {
        const response = await instance.storageDepositPerByte();

        expect(response).to.be.above(0);
      });
    });

    describe('maintainerOf()', function () {
      it('should return the maintainer of the contract', async function () {
        const owner = await instance.maintainerOf(await contract.getAddress());

        expect(owner).to.equal(deployerAddress);
      });
    });

    describe('developerDeposit()', function () {
      it('should return the developer deposit', async function () {
        const response = await instance.developerDeposit();

        expect(response).to.be.above(0);
      });
    });

    describe('publicationFee()', function () {
      it('should return the publication fee', async function () {
        const response = await instance.publicationFee();

        expect(response).to.be.above(0);
      });
    });

    describe('transferMaintainter()', function () {
      it('should transfer the maintainer of the contract', async function () {
        const initialOwner = await instance.maintainerOf(await contract.getAddress());

        await instance.transferMaintainer(await contract.getAddress(), userAddress);

        const finalOwner = await instance.maintainerOf(await contract.getAddress());

        expect(initialOwner).to.equal(deployerAddress);
        expect(finalOwner).to.equals(userAddress);
      });

      it('should emit TransferredMaintainer when maintainer role of the contract is transferred', async function () {
        await expect(instance.transferMaintainer(await contract.getAddress(), userAddress))
          .to.emit(instance, 'TransferredMaintainer')
          .withArgs(await contract.getAddress(), userAddress);
      });

      it('should revert if the caller is not the maintainer of the contract', async function () {
        await expect(
          instance.connect(user).transferMaintainer(await contract.getAddress(), deployerAddress)
        ).to.be.reverted;
      });

      it('should revert if trying to transfer maintainer of 0x0', async function () {
        await expect(instance.transferMaintainer(NULL_ADDRESS, userAddress)).to.be.revertedWith(
          'EVM: the contractAddress is the zero address'
        );
      });

      it('should revert when trying to transfer maintainer to 0x0 address', async function () {
        await expect(instance.transferMaintainer(await contract.getAddress(), NULL_ADDRESS)).to.be.revertedWith(
          'EVM: the newMaintainer is the zero address'
        );
      });
    });

    describe('publishContract()', function () {
      it('should emit ContractPublished event', async function () {
        await expect(instance.publishContract(await contract.getAddress()))
          .to.emit(instance, 'ContractPublished')
          .withArgs(await contract.getAddress());
      });

      it('should revert when caller is not the maintainer of the contract', async function () {
        await expect(instance.connect(user).publishContract(await contract.getAddress())).to.be.reverted;
      });

      it('should revert when trying to publish 0x0 contract', async function () {
        await expect(instance.publishContract(NULL_ADDRESS)).to.be.revertedWith(
          'EVM: the contractAddress is the zero address'
        );
      });
    });

    describe('developerStatus()', function () {
      it('should return the status of the development account', async function () {
        const randomSigner = Wallet.createRandom();

        const responseTrue = await instance.developerStatus(deployerAddress);
        const responseFalse = await instance.developerStatus(await randomSigner.getAddress());

        expect(responseTrue).to.be.true;
        expect(responseFalse).to.be.false;
      });
    });

    describe('developerDisable()', function () {
      it('should disable development mode', async function () {
        const setupStatus = await instance.developerStatus(userAddress);

        if (!setupStatus) {
          await instance.connect(user).developerEnable();
        }

        const initialStatus = await instance.developerStatus(userAddress);

        await instance.connect(user).developerDisable();

        const finalStatus = await instance.developerStatus(userAddress);

        expect(initialStatus).to.be.true;
        expect(finalStatus).to.be.false;
      });

      it('should emit DeveloperDisabled', async function () {
        const initialStatus = await instance.developerStatus(userAddress);

        if (!initialStatus) {
          await instance.connect(user).developerEnable();
        }

        await expect(instance.connect(user).developerDisable())
          .to.emit(instance, 'DeveloperDisabled')
          .withArgs(userAddress);
      });

      it('should revert if the development account is not enabled', async function () {
        const setupStatus = await instance.developerStatus(userAddress);

        if (setupStatus) {
          await instance.connect(user).developerDisable();
        }

        await expect(instance.connect(user).developerDisable()).to.be.reverted;
      });
    });

    describe('developerEnable()', function () {
      it('should enable development mode', async function () {
        const setupStatus = await instance.developerStatus(userAddress);

        if (setupStatus) {
          await instance.connect(user).developerDisable();
        }

        const initialStatus = await instance.developerStatus(userAddress);

        await instance.connect(user).developerEnable();

        const finalStatus = await instance.developerStatus(userAddress);

        expect(initialStatus).to.be.false;
        expect(finalStatus).to.be.true;
      });

      it('should emit DeveloperEnabled event', async function () {
        const setupStatus = await instance.developerStatus(userAddress);

        if (setupStatus) {
          await instance.connect(user).developerDisable();
        }

        await expect(instance.connect(user).developerEnable())
          .to.emit(instance, 'DeveloperEnabled')
          .withArgs(userAddress);
      });

      it('should revert if the development mode is already enabled', async function () {
        const setupStatus = await instance.developerStatus(userAddress);

        if (!setupStatus) {
          await instance.connect(user).developerEnable();
        }

        await expect(instance.connect(user).developerEnable()).to.be.reverted;
      });
    });
  });
});
