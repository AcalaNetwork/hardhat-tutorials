const { expect } = require('chai');
const { calcEthereumTransactionParams } = require('@acala-network/eth-providers');

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

describe('HelloWorld contract', function () {
  it('returns the right value after the contract is deployed', async function () {
    const blockNumber = await ethers.provider.getBlockNumber();

    const ethParams = calcEthereumTransactionParams({
      gasLimit: '2100001',
      validUntil: (blockNumber + 100).toString(),
      storageLimit: '64001',
      txFeePerGas,
      storageByteDeposit
    });

    const HelloWorld = await ethers.getContractFactory('HelloWorld');

    const instance = await HelloWorld.deploy({
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit
    });

    const value = await instance.helloWorld();

    expect(value).to.equal('Hello World!');
  });
});
