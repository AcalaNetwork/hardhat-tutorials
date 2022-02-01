const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  const blockNumber = await ethers.provider.getBlockNumber();

  const ethParams = calcEthereumTransactionParams({
    gasLimit: '21000010',
    validUntil: (blockNumber + 100).toString(),
    storageLimit: '640010',
    txFeePerGas,
    storageByteDeposit
  });

  console.log('Started the infinite NFT deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const NFT = await ethers.getContractFactory('NFT');
    await NFT.deploy({
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit,
    });

    console.log(`Current number of NFT instances: ${++count}`);
  }
};

loop();