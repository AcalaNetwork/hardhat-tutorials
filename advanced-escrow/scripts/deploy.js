const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

async function main() {
  const blockNumber = await ethers.provider.getBlockNumber();

  const ethParams = calcEthereumTransactionParams({
    gasLimit: '21000010',
    validUntil: (blockNumber + 100).toString(),
    storageLimit: '640010',
    txFeePerGas,
    storageByteDeposit
  });

  const [deployer] = await ethers.getSigners();

  const AdvancedEscrow = await ethers.getContractFactory("AdvancedEscrow");
  const instance = await AdvancedEscrow.deploy({
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit,
  });

  console.log("AdvancedEscrow address:", instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });