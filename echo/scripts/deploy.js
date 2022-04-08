const { txParams } = require('../utils/transactionHelper');

async function main() {
  const ethParams = await txParams();

  const [deployer] = await ethers.getSigners();

  console.log('Deploying contract with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const Echo = await ethers.getContractFactory('Echo');
  const instance = await Echo.deploy({
    gasPrice: ethParams.txGasPrice,
    gasLimit: ethParams.txGasLimit
  });

  console.log('Echo address:', instance.address);

  const value = await instance.echo();

  console.log('Deployment status:', value);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
