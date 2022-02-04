const { Contract } = require("ethers");
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
const { ACA } = require("@acala-network/contracts/utils/Address");

const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '21000010',
    validUntil: '360001',
    storageLimit: '640010',
    txFeePerGas,
    storageByteDeposit
  });

  console.log('Started the infinite Escrow deployment loop!');

  let count = 0;

  while (true) {
    // using different accounts than the test to avoid conflicts
    [_, _, _, deployer, requestor, provider] = await ethers.getSigners();

    deployerAddress = await deployer.getAddress();
    requestorAddress = await requestor.getAddress();
    providerAddress = await provider.getAddress();

    acaInstance = new Contract(ACA, TokenContract.abi, requestor);

    await sleep(interval);
    const Escrow = await ethers.getContractFactory('Escrow');
    await Escrow.deploy(acaInstance.address, 100, requestorAddress, providerAddress,
      {
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
      }
    );

    console.log(`Current number of Escrow instances: ${++count}`);
  }
};

loop();
