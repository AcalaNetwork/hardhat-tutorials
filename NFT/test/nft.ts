import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';

import { NFT, NFT__factory } from '../typechain-types';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('NFT contract', () => {
  let NFT: NFT__factory;
  let instance: NFT;
  let deployer: SignerWithAddress;
  let user: SignerWithAddress;
  let deployerAddress: string;
  let userAddress: string;

  beforeEach(async () => {
    [deployer, user] = await ethers.getSigners();
    deployerAddress = await deployer.getAddress();
    userAddress = await user.getAddress();

    NFT = await ethers.getContractFactory('NFT');
    instance = await NFT.deploy();
    await instance.deployed();
  });

  describe('Deployment', () => {
    it('should set the correct NFT name', async () => {
      expect(await instance.name()).to.equal('Example non-fungible token');
    });

    it('should set the correct NFT symbol', async () => {
      expect(await instance.symbol()).to.equal('eNFT');
    });

    it('should assign the initial balance of the deployer', async () => {
      expect(await instance.balanceOf(deployerAddress)).to.equal(0);
    });

    it('should revert when trying to get the balance of the 0x0 address', async () => {
      await expect(instance.balanceOf(NULL_ADDRESS)).to.be.revertedWith('ERC721: address zero is not a valid owner');
    });
  });

  describe('Operation', () => {
    describe('minting', () => {
      it('should mint token to an address', async () => {
        const initialBalance = await instance.balanceOf(userAddress);

        await instance.mintNFT(userAddress, 'testURI');

        const finalBalance = await instance.balanceOf(userAddress);

        expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
      });

      it('should emit Transfer event', async () => {
        await expect(instance.mintNFT(userAddress, ''))
          .to.emit(instance, 'Transfer')
          .withArgs(NULL_ADDRESS, userAddress, 1);
      });

      it('should set the expected base URI', async () => {
        await instance.mintNFT(userAddress, '');

        const token = await instance.tokenURI(1);

        expect(token).to.equal('acala-evm+-tutorial-nft/1');
      });

      it('should set the expected URI', async () => {
        await instance.mintNFT(userAddress, 'expected');

        const token = await instance.tokenURI(1);

        expect(token).to.equal('acala-evm+-tutorial-nft/expected');
      });

      it('should allow user to own multiple tokens', async () => {
        const initialBalance = await instance.balanceOf(userAddress);

        await instance.mintNFT(userAddress, '');
        await instance.mintNFT(userAddress, '');

        const finalBalance = await instance.balanceOf(userAddress);

        expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(2);
      });

      it('should revert when trying to get an URI of an nonexistent token', async () => {
        await expect(instance.tokenURI(42)).to.be.revertedWith('ERC721: invalid token ID');
      });
    });

    describe('balances and ownerships', () => {
      it('should revert when trying to get balance of 0x0 address', async () => {
        await expect(instance.balanceOf(NULL_ADDRESS)).to.be.revertedWith('ERC721: address zero is not a valid owner');
      });

      it('should revert when trying to get the owner of a nonexistent token', async () => {
        await expect(instance.ownerOf(42)).to.be.revertedWith('ERC721: invalid token ID');
      });

      it('should return the token owner', async () => {
        await instance.mintNFT(userAddress, '');

        const owner = await instance.ownerOf(1);

        expect(owner).to.equal(userAddress);
      });
    });

    describe('approvals', () => {
      it('should grant an approval', async () => {
        await instance.mintNFT(userAddress, '');

        await instance.connect(user).approve(deployerAddress, 1);

        const authorized = await instance.getApproved(1);

        expect(authorized).to.equal(deployerAddress);
      });

      it('should emit Approval event when granting approval', async () => {
        await instance.mintNFT(userAddress, '');

        await expect(instance.connect(user).approve(deployerAddress, 1))
          .to.emit(instance, 'Approval')
          .withArgs(userAddress, deployerAddress, 1);
      });

      it('should revert when trying to set token approval to self', async () => {
        await instance.mintNFT(userAddress, '');

        await expect(instance.connect(user).approve(userAddress, 1)).to.be.revertedWith(
          'ERC721: approval to current owner'
        );
      });

      it('should revert when trying to grant approval for a token that is someone else\'s', async () => {
        await instance.mintNFT(userAddress, '');

        await expect(instance.approve(deployerAddress, 1)).to.be.revertedWith(
          'ERC721: approve caller is not token owner or approved for all'
        );
      });

      it('should revert when trying to get an approval of a nonexistent token', async () => {
        await expect(instance.getApproved(42)).to.be.revertedWith('ERC721: invalid token ID');
      });

      it('should return 0x0 address as approved for a token for which no approval is given', async () => {
        await instance.mintNFT(userAddress, '');

        const authorized = await instance.getApproved(1);

        expect(authorized).to.equal(NULL_ADDRESS);
      });

      it('sets approval for all', async () => {
        await instance.connect(user).setApprovalForAll(deployerAddress, true);

        const approved = await instance.isApprovedForAll(userAddress, deployerAddress);

        expect(approved).to.equal(true);
      });

      it('revokes approval for all', async () => {
        await instance.connect(user).setApprovalForAll(deployerAddress, true);

        const initiallyApproved = await instance.isApprovedForAll(userAddress, deployerAddress);

        expect(initiallyApproved).to.equal(true);

        await instance.connect(user).setApprovalForAll(deployerAddress, false);

        const finallyApproved = await instance.isApprovedForAll(userAddress, deployerAddress);

        expect(finallyApproved).to.equal(false);
      });

      it('doesn\'t reflect operator approval in single token approval', async () => {
        await instance.mintNFT(userAddress, '');

        await instance.connect(user).setApprovalForAll(deployerAddress, true);

        const approved = await instance.getApproved(1);

        expect(approved).to.equal(NULL_ADDRESS);
      });

      it('should allow operator to grant allowance for a apecific token', async () => {
        await instance.mintNFT(userAddress, '');

        await instance.connect(user).setApprovalForAll(deployerAddress, true);

        await instance.approve(deployerAddress, 1);

        const approved = await instance.getApproved(1);

        expect(approved).to.equal(deployerAddress);
      });

      it('should emit Approval event when operator grants approval', async () => {
        await instance.mintNFT(userAddress, '');

        await instance.connect(user).setApprovalForAll(deployerAddress, true);

        await expect(instance.approve(deployerAddress, 1))
          .to.emit(instance, 'Approval')
          .withArgs(userAddress, deployerAddress, 1);
      });

      it('should emit ApprovalForAll event when approving for all', async () => {
        await expect(instance.connect(user).setApprovalForAll(deployerAddress, true))
          .to.emit(instance, 'ApprovalForAll')
          .withArgs(userAddress, deployerAddress, true);
      });

      it('should emit ApprovalForAll event when revoking approval for all', async () => {
        await instance.connect(user).setApprovalForAll(deployerAddress, true);

        await expect(instance.connect(user).setApprovalForAll(deployerAddress, false))
          .to.emit(instance, 'ApprovalForAll')
          .withArgs(userAddress, deployerAddress, false);
      });
    });

    describe('transfers', () => {
      it('should transfer the token', async () => {
        await instance.mintNFT(userAddress, '');

        const initialBalance = await instance.balanceOf(deployerAddress);

        await instance.connect(user).transferFrom(userAddress, deployerAddress, 1);

        const finalBalance = await instance.balanceOf(deployerAddress);

        expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
      });

      it('should emit Transfer event', async () => {
        await instance.mintNFT(userAddress, '');

        await expect(instance.connect(user).transferFrom(userAddress, deployerAddress, 1))
          .to.emit(instance, 'Transfer')
          .withArgs(userAddress, deployerAddress, 1);
      });

      it('should allow transfer of the tokens if the allowance is given', async () => {
        await instance.mintNFT(userAddress, '');

        await instance.connect(user).approve(deployerAddress, 1);

        const initialBalance = await instance.balanceOf(deployerAddress);

        await instance.transferFrom(userAddress, deployerAddress, 1);

        const finalBalance = await instance.balanceOf(deployerAddress);

        expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
      });

      it('should reset the allowance after the token is transferred', async () => {
        await instance.mintNFT(userAddress, '');
        await instance.connect(user).approve(deployerAddress, 1);

        const initialAllowance = await instance.getApproved(1);

        expect(initialAllowance).to.equal(deployerAddress);

        await instance.transferFrom(userAddress, deployerAddress, 1);

        const finalAllowance = await instance.getApproved(1);

        expect(finalAllowance).to.equal(NULL_ADDRESS);
      });
    });
  });
});
