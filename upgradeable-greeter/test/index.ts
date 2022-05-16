import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { EvmRpcProvider } from "@acala-network/eth-providers";
import { Contract, Signer } from "ethers";

describe("Greeter", function () {
  let greeter: Contract;
  let greeterV2: Contract;
  let signer: Signer;

  before("prepare signer with custom gas overrides", async () => {
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

    signer = ethers.Wallet.fromMnemonic(
      "fox sight canyon orphan hotel grow hedgehog build bless august weather swarm"
    ).connect(provider);
  });

  it("deploy Greeter V1 with proxy", async function () {
    const Greeter = await ethers.getContractFactory("Greeter", signer);
    greeter = await upgrades.deployProxy(Greeter, ["Hello, Goku!"]);
    expect(await greeter.greet()).to.equal("Hello, Goku!");

    await greeter.setGreeting("Hola, Vegeta!");
    expect(await greeter.greet()).to.equal("Hola, Vegeta!");

    expect(() => greeter.setGreetingV2("Hola, Buu!")).to.throw(
      "greeter.setGreetingV2 is not a function"
    );
  });

  it("upgrade Greeter to V2 and call the new method setGreetingV2()", async function () {
    const GreeterV2 = await ethers.getContractFactory("GreeterV2", signer);
    greeterV2 = await upgrades.upgradeProxy(greeter.address, GreeterV2);
    expect(await greeterV2.greet()).to.equal("Hola, Vegeta!");

    await greeterV2.setGreetingV2("Hola, Buu!");
    expect(await greeterV2.greet()).to.equal("Hola, Buu! - V2");

    await greeterV2.setGreeting("Hola, Cell!");
    expect(await greeterV2.greet()).to.equal("Hola, Cell!");
  });
});
