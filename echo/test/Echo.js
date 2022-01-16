const { expect } = require("chai");
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

describe("Echo contract", async function () {
        const ethParams = calcEthereumTransactionParams({
          gasLimit: '2100001',
          validUntil: '360001',
          storageLimit: '64001',
          txFeePerGas,
          storageByteDeposit
        });

        let Echo;
        let instance;

        beforeEach(async function () {
                Echo = await ethers.getContractFactory("Echo");
                instance = await Echo.deploy({
                        gasPrice: ethParams.txGasPrice,
                        gasLimit: ethParams.txGasLimit,
                });
        });

        describe("Deployment", function () {
                it("should set the value of the echo when deploying", async function () {
                        expect(await instance.echo()).to.equal("Deployed successfully!");
                });
        });

        describe("Operation", function () {
                this.timeout(50000);

                it("should update the echo variable", async function () {
                        await instance.scream("Hello World!");

                        expect(await instance.echo()).to.equal("Hello World!");
                });

                it("should emit a NewEcho event", async function () {
                        await expect(
                                instance.scream("Hello World!")).to
                                .emit(instance, "NewEcho")
                                .withArgs("Hello World!", 1);
                });

                it("should increment echo counter in the NewEcho event", async function () {
                        await instance.scream("Hello World!");

                        await expect(
                                instance.scream("Goodbye World!")).to
                                .emit(instance, "NewEcho")
                                .withArgs("Goodbye World!", 2);
                });

                it("should return input value", async function () {
                        const response = await instance.callStatic.scream("Hello World!");

                        expect(response).to.equal("Hello World!");
                });
        });
});