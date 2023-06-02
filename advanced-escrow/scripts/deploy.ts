import { ethers } from 'hardhat';
import { formatEther } from 'ethers/lib/utils';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`deploying contracts with the account: ${deployer.address}`);
  console.log(`account balance: ${(formatEther(await deployer.getBalance()))}`);

  const AdvancedEscrow = await ethers.getContractFactory('AdvancedEscrow');
  const instance = await AdvancedEscrow.deploy();
  await instance.deployed();

  console.log('AdvancedEscrow address:', instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
