// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { txParams } = require("../utils/deployUtil");

async function main() {
  const ethParams = await txParams();
  const CDP_EVM_ADDRESS = '0x31382d495FEd5A6820d9C07e8B6eFe8D2166e9dD';
  const Liquidation = await ethers.getContractFactory("Liquidation");
  const liquidation = await Liquidation.deploy(CDP_EVM_ADDRESS,
    {
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit,
    });

  await liquidation.deployed();
  console.log("Liquidation Address: ",liquidation.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
