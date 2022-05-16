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
      a workaround to overriding gasPrice
      the provider will auto calculate a valid gasLimit with this gasPrice 
      https://github.com/OpenZeppelin/openzeppelin-upgrades/issues/85#issuecomment-1028435049
                                                                                   ---------- */
    provider.getFeeData = async () => ({
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      gasPrice: gasPriceOverrides,
    });

    const signer = ethers.Wallet.fromMnemonic(
      "fox sight canyon orphan hotel grow hedgehog build bless august weather swarm"
    ).connect(provider);

    /* --------------- deploy V1 --------------- */
    const Greeter = await ethers.getContractFactory("Greeter", signer);
    const greeter = await upgrades.deployProxy(Greeter, ["Hello, Goku!"]);
    expect(await greeter.greet()).to.equal("Hello, Goku!");

    await greeter.setGreeting("Hola, Vegeta!");
    expect(await greeter.greet()).to.equal("Hola, Vegeta!");

    expect(() => greeter.setGreetingV2("Hola, Buu!")).to.throw(
      "greeter.setGreetingV2 is not a function"
    );

    /* --------------- upgrade to V2 --------------- */
    const GreeterV2 = await ethers.getContractFactory("GreeterV2", signer);
    const greeterV2 = await upgrades.upgradeProxy(greeter.address, GreeterV2);
    expect(await greeterV2.greet()).to.equal("Hola, Vegeta!");

    await greeterV2.setGreetingV2("Hola, Buu!");
    expect(await greeterV2.greet()).to.equal("Hola, Buu! - V2");

    await greeterV2.setGreeting("Hola, Cell!");
    expect(await greeterV2.greet()).to.equal("Hola, Cell!");
  });
});
