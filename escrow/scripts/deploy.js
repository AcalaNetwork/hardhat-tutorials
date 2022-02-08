const { Contract } = require("ethers");
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
const { ACA } = require("@acala-network/contracts/utils/Address");

const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const ESCROW_AMOUNT = 1_000_000_000; // 0.001 ACA

async function main() {
  const ethParams = calcEthereumTransactionParams({
    gasLimit: '21000010',
    validUntil: '360001',
    storageLimit: '640010',
    txFeePerGas,
    storageByteDeposit
  });

  const [deployer, requestor, provider] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  deployerAddress = await deployer.getAddress();
  requestorAddress = await requestor.getAddress();
  providerAddress = await provider.getAddress();

  acaInstance = new Contract(ACA, TokenContract.abi, requestor);

  const Escrow = await ethers.getContractFactory('Escrow');
  const escrow = await Escrow.deploy(acaInstance.address, ESCROW_AMOUNT, requestorAddress, providerAddress,
    {
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit,
    }
  );

  console.log("Escrow address:", escrow.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
