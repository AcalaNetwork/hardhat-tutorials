const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  const blockNumber = await ethers.provider.getBlockNumber();

  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: (blockNumber + 100).toString(),
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

  console.log('Started the infinite Echo deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const Echo = await ethers.getContractFactory('Echo');
    await Echo.deploy({
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit,
    });

    console.log(`Current number of Echo instances: ${++count}`);
  }
};

loop();