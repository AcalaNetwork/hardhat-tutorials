const { expect } = require("chai");

describe("HelloWorld contract", async function () {
    it("returns the right value after the contract is deployed", async function () {
        const HelloWorld = await ethers.getContractFactory("HelloWorld");
        
        const instance = await HelloWorld.deploy();

        const value = await instance.helloWorld();

        expect(value).to.equal("Hello World!");
    });
});