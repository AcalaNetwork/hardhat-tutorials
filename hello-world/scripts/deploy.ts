import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with the account:', deployer.address);
  console.log('Account balance:', (await deployer.getBalance()).toString());

  const HelloWorld = await ethers.getContractFactory('HelloWorld');
  const instance = await HelloWorld.deploy();
  await instance.deployed();
  console.log('HelloWorld address:', instance.address);

  const value = await instance.helloWorld();
  console.log('Stored value:', value);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
