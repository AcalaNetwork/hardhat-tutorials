import { ethers } from "hardhat";
import { expect } from "chai";

describe('HelloWorld contract', function () {
  it('returns the right value after the contract is deployed', async function () {
    const HelloWorld = await ethers.getContractFactory('HelloWorld');
    const instance = await HelloWorld.deploy();
    await instance.deployed();

    const value = await instance.helloWorld();
    expect(value).to.equal('Hello World!');
  });
});
