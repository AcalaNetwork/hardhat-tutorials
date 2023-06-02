import { ACA } from '@acala-network/contracts/utils/MandalaAddress';
import { Contract } from 'ethers';
import { ethers } from 'hardhat';
import { formatUnits } from 'ethers/lib/utils';
import TokenContract from '@acala-network/contracts/build/contracts/Token.json';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Getting contract info with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const instance = new Contract(ACA, TokenContract.abi, deployer);

  console.log('PrecompiledToken address:', instance.address);

  const name = await instance.name();
  const symbol = await instance.symbol();
  const decimals = await instance.decimals();
  const value = await instance.totalSupply();
  const balance = await instance.balanceOf(deployer.address);

  console.log('Token name:', name);
  console.log('Token symbol:', symbol);
  console.log('Token decimal spaces:', decimals.toString());
  console.log('Total supply:', value.toString());
  console.log('Our account token balance:', balance.toString());

  const formattedSuppy = formatUnits(value, decimals);
  const formattedBalance = formatUnits(balance, decimals);

  console.log('Total formatted supply: %s %s', formattedSuppy, symbol);
  console.log('Total formatted account token balance: %s %s', formattedBalance, symbol);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
