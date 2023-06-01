import { ethers } from 'hardhat';
import { formatEther } from 'ethers/lib/utils';

async function main() {
  const [deployer, user] = await ethers.getSigners();
  console.log(`deploying contracts with the account: ${deployer.address}`);
  console.log(`account balance: ${(formatEther(await deployer.getBalance()))}`);

  const NFT = await ethers.getContractFactory('NFT');
  const instance = await NFT.deploy();
  await instance.deployed();
  console.log('NFT address:', instance.address);

  await instance.mintNFT(user.address, 'super-amazing-and-unique-nft');

  const tokenURI = await instance.tokenURI(1);
  console.log('Prime tokenURI:', tokenURI);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
