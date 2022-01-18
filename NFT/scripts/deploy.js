const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

async function main() {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '21000010',
    validUntil: '360001',
    storageLimit: '640010',
    txFeePerGas,
    storageByteDeposit
  });

  const [deployer, user] = await ethers.getSigners();

  console.log("Deploying contract with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const NFT = await ethers.getContractFactory("NFT");
  const instance = await NFT.deploy({
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit,
  });

  console.log("NFT address:", instance.address);

  await instance.connect(deployer).mintNFT(await user.getAddress(), "super-amazing-and-unique-nft");

  const tokenURI = await instance.tokenURI(1);

  console.log("Prime tokenURI:", tokenURI);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });