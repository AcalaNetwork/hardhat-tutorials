const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

async function main() {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: '3600010',
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const HelloWorld = await ethers.getContractFactory("HelloWorld");
  const instance = await HelloWorld.deploy({
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit,
  });

  await instance.deployed();

  console.log("HelloWorld address:", instance.address);

  const value = await instance.helloWorld();

  console.log("Stored value:", value);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });