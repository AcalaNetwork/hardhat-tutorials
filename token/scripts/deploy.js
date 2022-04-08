const { txParams } = require('../utils/transactionHelper');

async function main() {
  const ethParams = await txParams();

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const Token = await ethers.getContractFactory('Token');
  const instance = await Token.deploy(1234567890, {
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit
  });

  console.log('Token address:', instance.address);

  const value = await instance.totalSupply();

  console.log('Total supply:', value.toNumber());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
