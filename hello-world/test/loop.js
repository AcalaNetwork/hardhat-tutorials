const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '2100001',
    validUntil: '360001',
    storageLimit: '64001',
    txFeePerGas,
    storageByteDeposit
  });

  console.log('Started the infinite HelloWorld deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const HelloWorld = await ethers.getContractFactory('HelloWorld');
    await HelloWorld.deploy({
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit
    });

    console.log(`Current number of HelloWorld instances: ${++count}`);
  }
};

loop();