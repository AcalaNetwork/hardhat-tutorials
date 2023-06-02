import { ethers } from 'hardhat';
import { formatEther, parseEther } from 'ethers/lib/utils';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`deploying contracts with the account: ${deployer.address}`);
  console.log(`account balance: ${(formatEther(await deployer.getBalance()))}`);

  const Token = await ethers.getContractFactory('Token');
  const instance = await Token.deploy(parseEther('21000000'));
  await instance.deployed();
  console.log('Token address:', instance.address);

  const totalSupply = await instance.totalSupply();
  console.log('Total supply:', formatEther(totalSupply));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
