import { calcEthereumTransactionParams } from "@acala-network/eth-providers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { EVM } from "@acala-network/contracts/utils/MandalaAddress";
import EVMContract from "@acala-network/contracts/build/contracts/EVM.json";
import { Contract, BigNumber } from "ethers";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export const publishContract = async (options: { signer: SignerWithAddress, contractAddress: string }) => {
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

export const txParams = async (): Promise<{
    txGasPrice: BigNumber;
    txGasLimit: BigNumber;
}> => {
    const txFeePerGas = "199999946752";
    const storageByteDeposit = "100000000000000";
    const blockNumber = await ethers.provider.getBlockNumber();

    const ethParams = calcEthereumTransactionParams({
        gasLimit: "31000000",
        validUntil: (blockNumber + 100).toString(),
        storageLimit: "64001",
        txFeePerGas,
        storageByteDeposit,
    });

    return {
        txGasPrice: ethParams.txGasPrice,
        txGasLimit: ethParams.txGasLimit,
    };
}
