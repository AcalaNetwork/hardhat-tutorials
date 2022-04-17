const { txParams } = require('../utils/transactionHelper');

async function main() {
  const ethParams = await txParams();

  const [deployer, user] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const NFT = await ethers.getContractFactory('NFT');
  const instance = await NFT.deploy({
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit
  });

  console.log('NFT address:', instance.address);

  await instance.connect(deployer).mintNFT(await user.getAddress(), 'super-amazing-and-unique-nft');

  const tokenURI = await instance.tokenURI(1);

  console.log('Prime tokenURI:', tokenURI);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
