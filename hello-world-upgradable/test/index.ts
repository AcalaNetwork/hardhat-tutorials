import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { EvmRpcProvider } from "@acala-network/eth-providers";

describe("Greeter", function () {
  it("Should return the new greeting once it's changed", async function () {
    const provider = EvmRpcProvider.from("ws://localhost:9944");
    await provider.isReady();

    /* ----------
      some examples might use `calcEthereumTransactionParams(...args)`
      which internally calls _getEthGas(...args)
      so we can also use _getEthGas() directly here
                                                            ---------- */
    const gasPriceOverrides = (await provider._getEthGas()).gasPrice;

    /* ----------
      a workaround to force overriding gasPrice
      the provider will auto calculate a valid gasLimit with this gasPrice 
                                                                ---------- */
    provider.getFeeData = async () => ({
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: gasPriceOverrides,
    });

    const signer = ethers.Wallet.fromMnemonic(
      "fox sight canyon orphan hotel grow hedgehog build bless august weather swarm"
    ).connect(provider);

    const Greeter = await ethers.getContractFactory("Greeter", signer);
    const greeter = await upgrades.deployProxy(Greeter, ["Hello, world!"]);

    expect(await greeter.greet()).to.equal("Hello, world!");

    const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    await setGreetingTx.wait();

    expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
