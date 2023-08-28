import { ACA, AUSD, DOT, LP_ACA_AUSD, RENBTC } from '@acala-network/contracts/utils/MandalaTokens';
import { Contract } from 'ethers';
import { DEX } from '@acala-network/contracts/utils/Predeploy';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';
import { expect } from 'chai';
import { parseUnits } from '@ethersproject/units';
import DEXContract from '@acala-network/contracts/build/contracts/DEX.json';
import TokenContract from '@acala-network/contracts/build/contracts/Token.json';

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

describe('DEX contract', () => {
  let instance: Contract;   // TODO: use typechain
  let ACAinstance: Contract;
  let AUSDinstance: Contract;
  let deployer: SignerWithAddress;
  let deployerAddress: string;

  beforeEach(async () => {
    [deployer] = await ethers.getSigners();
    deployerAddress = deployer.address;

    instance = new Contract(DEX, DEXContract.abi, deployer);
    ACAinstance = new Contract(ACA, TokenContract.abi, deployer);
    AUSDinstance = new Contract(AUSD, TokenContract.abi, deployer);
  });

  describe('Operation', () => {
    describe('getLiquidityPool', () => {
      it('should not allow tokenA to be a 0x0 address', async () => {
        await expect(instance.getLiquidityPool(NULL_ADDRESS, ACA)).to.be.revertedWith('DEX: tokenA is zero address');
      });

      it('should not allow tokenB to be a 0x0 address', async () => {
        await expect(instance.getLiquidityPool(ACA, NULL_ADDRESS)).to.be.revertedWith('DEX: tokenB is zero address');
      });

      it('should return 0 liquidity for nonexistent pair', async () => {
        const response = await instance.getLiquidityPool(ACA, DOT);

        const liquidityA = response[0];
        const liquidityB = response[1];

        expect(liquidityA).to.equal(0);
        expect(liquidityB).to.equal(0);
      });

      it('should return liquidity for existing pairs', async () => {
        const response = await instance.getLiquidityPool(ACA, AUSD);

        const liquidityA = response[0];
        const liquidityB = response[1];

        expect(liquidityA).to.be.above(0);
        expect(liquidityB).to.be.above(0);
      });
    });

    describe('getLiquidityTokenAddress', () => {
      it('should not allow tokenA to be a 0x0 address', async () => {
        await expect(instance.getLiquidityTokenAddress(NULL_ADDRESS, ACA)).to.be.revertedWith(
          'DEX: tokenA is zero address'
        );
      });

      it('should not allow tokenB to be a 0x0 address', async () => {
        await expect(instance.getLiquidityTokenAddress(ACA, NULL_ADDRESS)).to.be.revertedWith(
          'DEX: tokenB is zero address'
        );
      });

      it('should return liquidity token address for an existing pair', async () => {
        const response = await instance.getLiquidityTokenAddress(ACA, AUSD);

        expect(response).to.equal(LP_ACA_AUSD);
      });
    });

    describe('getSwapTargetAddress', () => {
      it('should not allow for the path to include a 0x0 address', async () => {
        let path = [NULL_ADDRESS, ACA, DOT, RENBTC];

        await expect(instance.getSwapTargetAmount(path, 12345678990)).to.be.revertedWith('DEX: token is zero address');

        path = [ACA, NULL_ADDRESS, DOT, RENBTC];

        await expect(instance.getSwapTargetAmount(path, 12345678990)).to.be.revertedWith('DEX: token is zero address');

        path = [ACA, DOT, NULL_ADDRESS, RENBTC];

        await expect(instance.getSwapTargetAmount(path, 12345678990)).to.be.revertedWith('DEX: token is zero address');

        path = [ACA, DOT, RENBTC, NULL_ADDRESS];

        await expect(instance.getSwapTargetAmount(path, 12345678990)).to.be.revertedWith('DEX: token is zero address');
      });

      it('should not allow supplyAmount to be 0', async () => {
        await expect(instance.getSwapTargetAmount([ACA, DOT], 0)).to.be.revertedWith('DEX: supplyAmount is zero');
      });

      it('should return 0 for an incompatible path', async () => {
        const response = await instance.getSwapTargetAmount([ACA, DOT], 100);
        expect(response.toString()).to.equal('0');
      });

      it('should return a swap target amount', async () => {
        const response = await instance.getSwapTargetAmount([ACA, AUSD], 100);

        expect(response).to.be.above(0);
      });
    });

    describe('getSwapSupplyAmount', () => {
      it('should not allow an address in the path to be a 0x0 address', async () => {
        let path = [NULL_ADDRESS, ACA, DOT, RENBTC];

        await expect(instance.getSwapSupplyAmount(path, 12345678990)).to.be.revertedWith('DEX: token is zero address');

        path = [ACA, NULL_ADDRESS, DOT, RENBTC];

        await expect(instance.getSwapSupplyAmount(path, 12345678990)).to.be.revertedWith('DEX: token is zero address');

        path = [ACA, DOT, NULL_ADDRESS, RENBTC];

        await expect(instance.getSwapSupplyAmount(path, 12345678990)).to.be.revertedWith('DEX: token is zero address');

        path = [ACA, DOT, RENBTC, NULL_ADDRESS];

        await expect(instance.getSwapSupplyAmount(path, 12345678990)).to.be.revertedWith('DEX: token is zero address');
      });

      it('should not allow targetAmount to be 0', async () => {
        await expect(instance.getSwapSupplyAmount([ACA, AUSD], 0)).to.be.revertedWith('DEX: targetAmount is zero');
      });

      it('should return 0 for an incompatible path', async () => {
        const response = await instance.getSwapSupplyAmount([ACA, DOT], 100);
        expect(response.toString()).to.equal('0');
      });

      it('should return the supply amount', async () => {
        const response = await instance.getSwapSupplyAmount([ACA, AUSD], 100);

        expect(response).to.be.above(0);
      });
    });

    describe('swapWithExactSupply', () => {
      it('should not allow path to contain a 0x0 address', async () => {
        let path = [NULL_ADDRESS, ACA, DOT, RENBTC];

        await expect(instance.swapWithExactSupply(path, 12345678990, 1)).to.be.revertedWith(
          'DEX: token is zero address'
        );

        path = [ACA, NULL_ADDRESS, DOT, RENBTC];

        await expect(instance.swapWithExactSupply(path, 12345678990, 1)).to.be.revertedWith(
          'DEX: token is zero address'
        );

        path = [ACA, DOT, NULL_ADDRESS, RENBTC];

        await expect(instance.swapWithExactSupply(path, 12345678990, 1)).to.be.revertedWith(
          'DEX: token is zero address'
        );

        path = [ACA, DOT, RENBTC, NULL_ADDRESS];

        await expect(instance.swapWithExactSupply(path, 12345678990, 1)).to.be.revertedWith(
          'DEX: token is zero address'
        );
      });

      it('should not allow supplyAmount to be 0', async () => {
        await expect(instance.swapWithExactSupply([ACA, AUSD], 0, 1)).to.be.revertedWith('DEX: supplyAmount is zero');
      });

      it('should allocate the tokens to the caller', async () => {
        const initalBalance = await ACAinstance.balanceOf(deployerAddress);
        const initBal = await AUSDinstance.balanceOf(deployerAddress);
        const path = [ACA, AUSD];
        const expected_target = await instance.getSwapTargetAmount(path, 100);

        await instance.swapWithExactSupply(path, 100, 1);

        const finalBalance = await ACAinstance.balanceOf(deployerAddress);
        const finBal = await AUSDinstance.balanceOf(deployerAddress);

        // The following assertion needs to check for the balance to be below the initialBalance - 100, because some of the ACA balance is used to pay for the transaction fee.
        expect(finalBalance).to.be.below(initalBalance.sub(100));
        expect(finBal).to.equal(initBal.add(expected_target));
      });

      it('should emit a Swaped event', async () => {
        const path = [ACA, AUSD];
        const expected_target = await instance.getSwapTargetAmount(path, 100);

        await expect(instance.swapWithExactSupply(path, 100, 1))
          .to.emit(instance, 'Swaped')
          .withArgs(deployerAddress, path, 100, expected_target);
      });
    });

    describe('swapWithExactTarget', () => {
      it('should not allow a token in a path to be a 0x0 address', async () => {
        let path = [NULL_ADDRESS, ACA, DOT, RENBTC];

        await expect(instance.swapWithExactTarget(path, 1, 12345678990)).to.be.revertedWith(
          'DEX: token is zero address'
        );

        path = [ACA, NULL_ADDRESS, DOT, RENBTC];

        await expect(instance.swapWithExactTarget(path, 1, 12345678990)).to.be.revertedWith(
          'DEX: token is zero address'
        );

        path = [ACA, DOT, NULL_ADDRESS, RENBTC];

        await expect(instance.swapWithExactTarget(path, 1, 12345678990)).to.be.revertedWith(
          'DEX: token is zero address'
        );

        path = [ACA, DOT, RENBTC, NULL_ADDRESS];

        await expect(instance.swapWithExactTarget(path, 1, 12345678990)).to.be.revertedWith(
          'DEX: token is zero address'
        );
      });

      it('should not allow targetAmount to be 0', async () => {
        await expect(instance.swapWithExactTarget([ACA, AUSD], 0, 1234567890)).to.be.revertedWith(
          'DEX: targetAmount is zero'
        );
      });

      it('should allocate tokens to the caller', async () => {
        const initalBalance = await ACAinstance.balanceOf(deployerAddress);
        const initBal = await AUSDinstance.balanceOf(deployerAddress);
        const path = [ACA, AUSD];
        const expected_supply = await instance.getSwapSupplyAmount(path, 100);

        await instance.swapWithExactTarget(path, 100, 1234567890);

        const finalBalance = await ACAinstance.balanceOf(deployerAddress);
        const finBal = await AUSDinstance.balanceOf(deployerAddress);

        // The following assertion needs to check for the balance to be below the initialBalance - 100, because some of the ACA balance is used to pay for the transaction fee.
        expect(finalBalance).to.be.below(initalBalance.sub(expected_supply));
        expect(finBal).to.equal(initBal.add(100));
      });

      it('should emit Swaped event', async () => {
        const path = [ACA, AUSD];
        const expected_supply = await instance.getSwapSupplyAmount(path, 100);

        await expect(instance.swapWithExactTarget(path, 100, 1234567890))
          .to.emit(instance, 'Swaped')
          .withArgs(deployerAddress, path, expected_supply, 100);
      });
    });

    describe('addLiquidity', () => {
      it('should not allow tokenA to be 0x0 address', async () => {
        await expect(instance.addLiquidity(NULL_ADDRESS, AUSD, 1000, 1000, 1)).to.be.revertedWith(
          'DEX: tokenA is zero address'
        );
      });

      it('should not allow tokenB to be 0x0 address', async () => {
        await expect(instance.addLiquidity(ACA, NULL_ADDRESS, 1000, 1000, 1)).to.be.revertedWith(
          'DEX: tokenB is zero address'
        );
      });

      it('should not allow maxAmountA to be 0', async () => {
        await expect(instance.addLiquidity(ACA, AUSD, 0, 1000, 1)).to.be.revertedWith('DEX: maxAmountA is zero');
      });

      it('should not allow maxAmountB to be 0', async () => {
        await expect(instance.addLiquidity(ACA, AUSD, 1000, 0, 1)).to.be.revertedWith('DEX: maxAmountB is zero');
      });

      it('should increase liquidity', async () => {
        const intialLiquidity = await instance.getLiquidityPool(ACA, AUSD);

        await instance.addLiquidity(ACA, AUSD, parseUnits('2', 12), parseUnits('2', 12), 1);

        const finalLiquidity = await instance.getLiquidityPool(ACA, AUSD);

        expect(finalLiquidity[0]).to.be.above(intialLiquidity[0]);
        expect(finalLiquidity[1]).to.be.above(intialLiquidity[1]);
      });

      it('should emit AddedLiquidity event', async () => {
        await expect(instance.addLiquidity(ACA, AUSD, 1000, 1000, 1))
          .to.emit(instance, 'AddedLiquidity')
          .withArgs(deployerAddress, ACA, AUSD, 1000, 1000);
      });
    });

    describe('removeLiquidity', () => {
      it('should not allow tokenA to be a 0x0 address', async () => {
        await expect(instance.removeLiquidity(NULL_ADDRESS, AUSD, 1, 0, 0)).to.be.revertedWith(
          'DEX: tokenA is zero address'
        );
      });

      it('should not allow tokenB to be a 0x0 address', async () => {
        await expect(instance.removeLiquidity(ACA, NULL_ADDRESS, 1, 0, 0)).to.be.revertedWith(
          'DEX: tokenB is zero address'
        );
      });

      it('should not allow removeShare to be 0', async () => {
        await expect(instance.removeLiquidity(ACA, AUSD, 0, 0, 0)).to.be.revertedWith('DEX: removeShare is zero');
      });

      it('should reduce the liquidity', async () => {
        const intialLiquidity = await instance.getLiquidityPool(ACA, AUSD);

        await instance.removeLiquidity(ACA, AUSD, 10, 1, 1);

        const finalLiquidity = await instance.getLiquidityPool(ACA, AUSD);

        expect(finalLiquidity[0]).to.be.below(intialLiquidity[0]);
        expect(finalLiquidity[1]).to.be.below(intialLiquidity[1]);
      });

      it('should emit RemovedLiquidity event', async () => {
        await expect(instance.removeLiquidity(ACA, AUSD, 1, 0, 0))
          .to.emit(instance, 'RemovedLiquidity')
          .withArgs(deployerAddress, ACA, AUSD, 1);
      });
    });
  });
});
