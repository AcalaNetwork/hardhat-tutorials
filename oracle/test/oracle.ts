import { ORACLE } from '@acala-network/contracts/utils/Predeploy';
import * as MandalaToken from '@acala-network/contracts/utils/MandalaTokens';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Oracle__factory } from '@acala-network/contracts/typechain/factories/contracts/oracle';
import { Oracle } from '@acala-network/contracts/typechain/contracts/oracle/Oracle';

describe('EVM contract', function () {
  let deployer: SignerWithAddress;
  let oracle: Oracle;

  beforeEach(async function () {
    [deployer] = await ethers.getSigners();
    oracle = Oracle__factory.connect(ORACLE, deployer);
  });

  describe('get price', function () {
    it('return correct price for ACA, DOT, LDOT', async function () {
      for (const token of ['ACA', 'DOT', 'LDOT'] as const) {
        const tokenAddr = MandalaToken[token];
        const price = await oracle.getPrice(tokenAddr);
        expect(price).to.be.gt(0);

        console.log(`${token} price: ${price}`)
      }
    });
  });
});
