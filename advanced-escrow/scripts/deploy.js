const { txParams } = require('../utils/transactionHelper');

async function main() {
  const ethParams = await txParams();

  const [deployer] = await ethers.getSigners();

  const AdvancedEscrow = await ethers.getContractFactory('AdvancedEscrow');
  const instance = await AdvancedEscrow.deploy({
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit
  });

  console.log('AdvancedEscrow address:', instance.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
