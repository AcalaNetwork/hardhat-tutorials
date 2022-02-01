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

  console.log('Started the infinite Token deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const Token = await ethers.getContractFactory('Token');
    await Token.deploy(
      1234567890,
      {
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
      }
    );

    console.log(`Current number of Token instances: ${++count}`);
  }
};

loop();