const { expect } = require("chai");
const { Contract } = require("ethers");
const { ACA } = require("@acala-network/contracts/utils/Address");

const TokenContract = require("@acala-network/contracts/build/contracts/Token.json");

describe("PrecompiledToken contract", async function () {
        let instance;
        let deployer;

        beforeEach(async function () {
                this.timeout(100000);

                [deployer] = await ethers.getSigners();
                instance = new Contract(ACA, TokenContract.abi, deployer);
        });

        describe("Precompiled token", function () {
                this.timeout(100000);

                it("should have the correct token name", async function () {
                        expect(await instance.name()).to.equal("Acala");
                });

                it("should have the correct token symbol", async function () {
                        expect(await instance.symbol()).to.equal("ACA");
                });

                it("should have the total supply greater than 0", async function () {
                        expect(await instance.totalSupply()).be.above(0);
                });

                it("should show balance of the deployer address higher than 0", async function () {
                        expect(await instance.balanceOf(await deployer.getAddress())).be.above(0);
                });
        });
});