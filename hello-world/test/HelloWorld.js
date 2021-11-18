const { expect } = require("chai");

describe("HelloWorld contract", async function () {
    it("returns the right value after the contract is deployed", async function () {
        const HelloWorld = await ethers.getContractFactory("HelloWorld");
console.log("Deployig contract");
        const instance = await HelloWorld.deploy();
console.log("Contract address:");
console.log(instance.address);
console.log(instance);
console.log(instance.estimateGas);
console.log(instance.estimateGas.helloWorld);
        const value = await instance.helloWorld();
console.log(value);
        expect(value).to.equal("Hello World!");
    });
});