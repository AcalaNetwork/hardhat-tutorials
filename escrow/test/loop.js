const { Contract } = require("ethers");
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
const { ACA } = require("@acala-network/contracts/utils/Address");

const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const ESCROW_AMOUNT = 1_000_000_000; // 0.001 ACA

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
    [_, _, _, deployer, initiator, beneficiary] = await ethers.getSigners();

    deployerAddress = await deployer.getAddress();
    initiatorAddress = await initiator.getAddress();
    beneficiaryAddress = await beneficiary.getAddress();

    acaInstance = new Contract(ACA, TokenContract.abi, initiator);

    await sleep(interval);
    const Escrow = await ethers.getContractFactory('Escrow');
    await Escrow.deploy(acaInstance.address, ESCROW_AMOUNT, initiatorAddress, beneficiaryAddress,
      {
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
      }
    );

    console.log(`Current number of Escrow instances: ${++count}`);
  }
};

loop();
