import { Contract } from 'ethers';
import { EVM } from '@acala-network/contracts/utils/Predeploy';
import { ethers } from 'hardhat';
import EVMContract from '@acala-network/contracts/build/contracts/EVM.json';
import TokenContract from '@acala-network/contracts/build/contracts/Token.json';

async function main() {
  console.log('');
  console.log('');

  const [deployer, user] = await ethers.getSigners();
  const deployerAddress = deployer.address;
  const userAddress = user.address;

  console.log(`Interacting with EVM using accounts ${deployerAddress} and ${userAddress}`);

  console.log('');
  console.log('');

  console.log('Instantiating EVM smart contract');

  const instance = new Contract(EVM, EVMContract.abi, deployer);

  console.log('EVM instantiated with address', await instance.getAddress());

  console.log('');
  console.log('');

  console.log('Preparing addresses for the journey');

  const initalDeployerStatus = await instance.developerStatus(deployerAddress);
  const initialUserStatus = await instance.developerStatus(userAddress);

  if (initalDeployerStatus) {
    await instance.connect(deployer).developerDisable();
  }

  if (initialUserStatus) {
    await instance.connect(user).developerDisable();
  }

  console.log('');
  console.log('');

  console.log('Enabling development mode on deployer address');

  await instance.connect(deployer).developerEnable();

  const midwayDeployerStatus = await instance.developerStatus(deployerAddress);
  const midwayUserStatus = await instance.developerStatus(userAddress);

  console.log(`The developer status of ${deployerAddress} is ${midwayDeployerStatus}.`);
  console.log(`The developer status of ${userAddress} is ${midwayUserStatus}.`);

  console.log('');
  console.log('');

  console.log('Deploying a smart contract');

  const Token = new ethers.ContractFactory(TokenContract.abi, TokenContract.bytecode, deployer);
  const contract = await Token.deploy();

  const deployMaintainer = await instance.maintainerOf(await contract.getAddress());

  console.log(`Contract deployed at ${await contract.getAddress()} has a maintainer ${deployMaintainer}`);

  console.log('');
  console.log('');

  console.log('Publishing the contract');

  const fee = await instance.publicationFee();

  await instance.connect(deployer).publishContract(await contract.getAddress());

  console.log(`Publication fee is ${fee}`);
  console.log('Contract is sucessfuly published!');

  console.log('');
  console.log('');

  console.log('Enabling developer mode on the user address');

  await instance.connect(user).developerEnable();

  const finalDeployerStatus = await instance.developerStatus(deployerAddress);
  const finalUserStatus = await instance.developerStatus(userAddress);

  console.log(`The developer status of ${deployerAddress} in ${finalDeployerStatus}.`);
  console.log(`The developer status of ${userAddress} in ${finalUserStatus}.`);

  console.log('');
  console.log('');

  console.log('Transferring maintainer of the contract to the user address');

  const initialMaintainer = await instance.maintainerOf(await contract.getAddress());

  await instance.connect(deployer).transferMaintainer(await contract.getAddress(), userAddress);

  const finalMaintainer = await instance.maintainerOf(await contract.getAddress());

  console.log(
    `Maintainer of the contract at ${await contract.getAddress()} was transferred from ${initialMaintainer} to ${finalMaintainer}.`
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
