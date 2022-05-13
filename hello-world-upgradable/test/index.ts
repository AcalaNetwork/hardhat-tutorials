import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { EvmRpcProvider } from "@acala-network/eth-providers";

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const provider = EvmRpcProvider.from("ws://localhost:9944");
    await provider.isReady();
    provider.getFeeData = async () => ({
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: (await provider._getEthGas()).gasPrice,
    });

    const signer = ethers.Wallet.fromMnemonic(
      "fox sight canyon orphan hotel grow hedgehog build bless august weather swarm"
    ).connect(provider);

    const Greeter = await ethers.getContractFactory("Greeter", signer);
    const greeter = await upgrades.deployProxy(Greeter, ["Hello, Hardhat!"]);

    // const res = greeter.greet()
    expect(await greeter.greet()).to.equal("Hello, world!");

    // const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // // wait until the transaction is mined
    // await setGreetingTx.wait();

    // expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
