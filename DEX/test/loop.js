const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const DEXcompiled = require("@acala-network/contracts/build/contracts/DEX.json");

const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  let blockNumber = await ethers.provider.getBlockNumber();

  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: (blockNumber + 100).toString(),
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

  const [deployer] = await ethers.getSigners();

  console.log('Started the infinite DEX deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const DEX = await ethers.ContractFactory.fromSolidity(DEXcompiled, deployer);
    await DEX.deploy({
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit,
    });

    console.log(`Current number of DEX instances: ${++count}`);
  }
};

loop();