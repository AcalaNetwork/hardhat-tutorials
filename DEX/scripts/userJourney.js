const { ACA, AUSD, DEX, DOT } = require('@acala-network/contracts/utils/MandalaAddress');
const { Contract } = require('ethers');

const DEXContract = require('@acala-network/contracts/build/contracts/DEX.json');
const TokenContract = require('@acala-network/contracts/build/contracts/Token.json');
const { formatUnits, parseUnits } = require('ethers/lib/utils');

async function main() {
  console.log('');
  console.log('');

  const [deployer] = await ethers.getSigners();

  console.log('Interacting with DEX using account:', deployer.address);

  const initialBalance = await deployer.getBalance();

  console.log('Initial account balance: %s ACA', formatUnits(initialBalance.toString(), 12));

  console.log('');
  console.log('');

  console.log('Instantiating DEX and token smart contracts');

  const instance = new Contract(DEX, DEXContract.abi, deployer);
  const ACAinstance = new Contract(ACA, TokenContract.abi, deployer);
  const AUSDinstance = new Contract(AUSD, TokenContract.abi, deployer);
  const DOTinstance = new Contract(DOT, TokenContract.abi, deployer);

  console.log('DEX instantiated with address', instance.address);
  console.log('ACA token instantiated with address', ACAinstance.address);
  console.log('AUSD token instantiated with address', AUSDinstance.address);
  console.log('DOT token instantiated with address', DOTinstance.address);

  console.log('');
  console.log('');

  console.log('Getting inital token balances');

  const initialAcaBalance = await ACAinstance.balanceOf(deployer.address);
  const initialAusdBalance = await AUSDinstance.balanceOf(deployer.address);
  const initialDotBalance = await DOTinstance.balanceOf(deployer.address);

  console.log('Inital %s ACA balance: %s ACA', deployer.address, formatUnits(initialAcaBalance.toString(), 12));
  console.log('Inital %s AUSD balance: %s AUSD', deployer.address, formatUnits(initialAusdBalance.toString(), 12));
  console.log('Inital %s DOT balance: %s DOT', deployer.address, formatUnits(initialDotBalance.toString(), 12));

  console.log('');
  console.log('');

  console.log('Getting liquidity pools');

  const initialAcaAusdLP = await instance.getLiquidityPool(ACA, AUSD);
  const initialAcaDotLP = await instance.getLiquidityPool(ACA, DOT);
  const initialDotAusdLP = await instance.getLiquidityPool(DOT, AUSD);

  console.log(
    'Initial ACA - AUSD liquidity pool: %s ACA - %s AUSD',
    formatUnits(initialAcaAusdLP[0].toString(), 12),
    formatUnits(initialAcaAusdLP[1].toString(), 12)
  );
  console.log(
    'Initial ACA - DOT liquidity pool: %s ACA - %s DOT',
    formatUnits(initialAcaDotLP[0].toString(), 12),
    formatUnits(initialAcaDotLP[1].toString(), 12)
  );
  console.log(
    'Initial DOT - AUSD liquidity pool: %s DOT - %s AUSD',
    formatUnits(initialDotAusdLP[0].toString(), 12),
    formatUnits(initialDotAusdLP[1].toString(), 12)
  );

  console.log('');
  console.log('');

  console.log('Getting liquidity pool token addresses');

  const acaAusdLPTokenAddress = await instance.getLiquidityTokenAddress(ACA, AUSD);
  const acaDotLPTokenAddress = await instance.getLiquidityTokenAddress(ACA, DOT);
  const dotAusdLPTokenAddress = await instance.getLiquidityTokenAddress(DOT, AUSD);

  console.log('Liquidity pool token address for ACA - AUSD:', acaAusdLPTokenAddress);
  console.log('Liquidity pool token address for ACA - DOT:', acaDotLPTokenAddress);
  console.log('Liquidity pool token address for DOT - AUSD:', dotAusdLPTokenAddress);

  console.log('');
  console.log('');

  console.log('Getting expected swap target amounts');

  const path1 = [ACA, AUSD];
  const path2 = [ACA, AUSD, DOT];
  const supply = initialAcaBalance.div(1000);

  const expectedTarget1 = await instance.getSwapTargetAmount(path1, supply);
  const expectedTarget2 = await instance.getSwapTargetAmount(path2, supply);

  console.log('Expected target when using path ACA -> AUSD: %s AUSD', formatUnits(expectedTarget1.toString(), 12));
  console.log(
    'Expected target when using path ACA -> AUSD -> DOT: %s DOT',
    formatUnits(expectedTarget2.toString(), 12)
  );

  console.log('');
  console.log('');

  console.log('Swapping with exact supply');

  await instance.swapWithExactSupply(path1, supply, 1);
  await instance.swapWithExactSupply(path2, supply, 1);

  const halfwayAcaBalance = await ACAinstance.balanceOf(deployer.address);
  const halfwayAusdBalance = await AUSDinstance.balanceOf(deployer.address);
  const halfwayDotBalance = await DOTinstance.balanceOf(deployer.address);

  console.log('Halfway %s ACA balance: %s ACA', deployer.address, formatUnits(halfwayAcaBalance.toString(), 12));
  console.log('Halfway %s AUSD balance: %s AUSD', deployer.address, formatUnits(halfwayAusdBalance.toString(), 12));
  console.log('Halfway %s DOT balance: %s DOT', deployer.address, formatUnits(halfwayDotBalance.toString(), 12));

  console.log(
    '%s AUSD balance increase was %s AUSD, while the expected increase was %s AUSD.',
    deployer.address,
    formatUnits(halfwayAusdBalance.sub(initialAusdBalance).toString(), 12),
    formatUnits(expectedTarget1.toString(), 12)
  );
  console.log(
    '%s DOT balance increase was %s DOT, while the expected increase was %s DOT.',
    deployer.address,
    formatUnits(halfwayDotBalance.sub(initialDotBalance).toString(), 12),
    formatUnits(expectedTarget2.toString(), 12)
  );

  console.log('');
  console.log('');

  console.log('Getting expected supply amount');

  const targetAusd = parseUnits('10', 12);
  const targetDot = parseUnits('10', 12);

  const expectedSupply1 = await instance.getSwapSupplyAmount(path1, targetAusd);
  const expectedSupply2 = await instance.getSwapSupplyAmount(path2, targetDot);

  console.log(
    'Expected supply for getting %s AUSD in order to reach a total of %s AUSD is %s ACA.',
    formatUnits(targetAusd.toString(), 12),
    formatUnits(targetAusd.add(halfwayAusdBalance).toString(), 12),
    formatUnits(expectedSupply1.toString(), 12)
  );
  console.log(
    'Expected supply for getting %s DOT in order to reach a total of %s DOT is %s ACA.',
    formatUnits(targetDot.toString(), 12),
    formatUnits(targetDot.add(halfwayDotBalance).toString(), 12),
    formatUnits(expectedSupply2.toString(), 12)
  );

  console.log('');
  console.log('');

  console.log('Swapping with exact target');

  await instance.swapWithExactTarget(path1, targetAusd, expectedSupply1.add(parseUnits('1', 12)));
  await instance.swapWithExactTarget(path2, targetAusd, expectedSupply2.add(parseUnits('10', 12)));

  const finalAcaBalance = await ACAinstance.balanceOf(deployer.address);
  const finalAusdBalance = await AUSDinstance.balanceOf(deployer.address);
  const finalDotBalance = await DOTinstance.balanceOf(deployer.address);

  console.log('Final %s ACA balance: %s ACA', deployer.address, formatUnits(finalAcaBalance.toString(), 12));
  console.log('Final %s AUSD balance: %s AUSD', deployer.address, formatUnits(finalAusdBalance.toString(), 12));
  console.log('Final %s DOT balance: %s DOT', deployer.address, formatUnits(finalDotBalance.toString(), 12));

  console.log(
    'AUSD balance has increased by %s AUSD, while the expected increase was %s AUSD.',
    formatUnits(finalAusdBalance.sub(halfwayAusdBalance), 12),
    formatUnits(targetAusd.toString(), 12)
  );
  console.log(
    'DOT balance has increased by %s DOT, while the expected increase was %s DOT.',
    formatUnits(finalDotBalance.sub(halfwayDotBalance), 12),
    formatUnits(targetDot.toString(), 12)
  );

  console.log(
    'Expected decrease of AUSD balance was %s AUSD, while the actual decrease was %s AUSD.',
    formatUnits(expectedSupply1.add(expectedSupply2).toString(), 12),
    formatUnits(halfwayAcaBalance.sub(finalAcaBalance).toString(), 12)
  );

  console.log('');
  console.log('');

  console.log('User journey completed!');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
