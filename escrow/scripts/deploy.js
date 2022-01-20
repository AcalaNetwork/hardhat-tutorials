const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: '360001',
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy({
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit,
  });

  console.log("Escrow address:", escrow.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });