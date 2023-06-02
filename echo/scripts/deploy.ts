import { ethers } from 'hardhat';
import { formatEther } from 'ethers/lib/utils';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`deploying contracts with the account: ${deployer.address}`);
  console.log(`account balance: ${(formatEther(await deployer.getBalance()))}`);

  const Echo = await ethers.getContractFactory('Echo');
  const instance = await Echo.deploy();
  await instance.deployed();
  console.log('Echo address:', instance.address);

  const value = await instance.echo();
  console.log('deployment status:', value);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
