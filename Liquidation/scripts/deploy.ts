// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers } from "hardhat";
import { txParams } from "../utils/deployUtil";
import { EVM, AUSD, DEX, ORACLE } from "@acala-network/contracts/utils/MandalaAddress";
async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const param = await txParams();
  const Liquidation = await ethers.getContractFactory("Liquidation");
  const liquidation = await Liquidation.deploy(EVM,
    AUSD,
    DEX,
    ORACLE,
    {
      gasPrice: param.txGasPrice,
      gasLimit: param.txGasLimit,
    });

  await liquidation.deployed();
  console.log(`Liquidation Address: ${liquidation.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
