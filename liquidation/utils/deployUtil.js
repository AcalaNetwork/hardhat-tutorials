const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
const { EVM } = require("@acala-network/contracts/utils/MandalaAddress")
const EVMContract = require("@acala-network/contracts/build/contracts/EVM.json")
const { Contract } = require("ethers")
const { ethers } = require("hardhat")

const txParams = async () => {
    const txFeePerGas = '199999946752';
    const storageByteDeposit = '100000000000000';
    const blockNumber = await ethers.provider.getBlockNumber();

    const ethParams = calcEthereumTransactionParams({
        gasLimit: '31000000',
        validUntil: (blockNumber + 100).toString(),
        storageLimit: '64001',
        txFeePerGas,
        storageByteDeposit
    });

    return {
        txGasPrice: ethParams.txGasPrice,
        txGasLimit: ethParams.txGasLimit
    };
}

const publishContract = async (options) => {
    const { signer, contractAddress } = options;
    process.stdout.write(`Publishing ${contractAddress} deployer: ${signer.address} ...`);
    const res = await (await new Contract(EVM, EVMContract.abi, signer).publishContract(contractAddress)).wait();
    if (res?.events[0]?.event === "ContractPublished") {
        process.stdout.write(` Done!\n`);
    } else {
        process.stdout.write(` Failed!\n`);
    }
    return res;
}

module.exports = {
    txParams,
    publishContract
}