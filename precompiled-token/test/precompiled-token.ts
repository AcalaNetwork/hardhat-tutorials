import { ACA } from '@acala-network/contracts/utils/MandalaTokens';
import { Contract } from 'ethers';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import TokenContract from '@acala-network/contracts/build/contracts/Token.json';

describe('PrecompiledToken contract', function () {
  let instance: Contract;   // TODO: use typechain
  let deployer: HardhatEthersSigner;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();
    instance = new Contract(ACA, TokenContract.abi, deployer);
  });

  describe('Precompiled token', function () {
    it('should have the correct token name', async function () {
      expect(await instance.name()).to.equal('Acala');
    });

    it('should have the correct token symbol', async function () {
      expect(await instance.symbol()).to.equal('ACA');
    });

    it('should have the total supply greater than 0', async function () {
      expect(await instance.totalSupply()).be.above(0);
    });

    it('should show balance of the deployer address higher than 0', async function () {
      expect(await instance.balanceOf(await deployer.getAddress())).be.above(0);
    });
  });
});
