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

  const [deployer, initiator, beneficiary] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  deployerAddress = await deployer.getAddress();
  initiatorAddress = await initiator.getAddress();
  beneficiaryAddress = await beneficiary.getAddress();

  acaInstance = new Contract(ACA, TokenContract.abi, initiator);

  const Escrow = await ethers.getContractFactory('Escrow');
  const escrow = await Escrow.deploy(acaInstance.address, ESCROW_AMOUNT, initiatorAddress, beneficiaryAddress,
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
