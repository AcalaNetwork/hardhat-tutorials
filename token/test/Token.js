const { expect } = require("chai");
const { ContractFactory } = require("ethers");
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");

const txFeePerGas = '199999946752';
const storageByteDeposit = '100000000000000';

const TokenContract = require("../artifacts/contracts/Token.sol/Token.json");
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("Token contract", async function () {
        const ethParams = calcEthereumTransactionParams({
                gasLimit: '2100001',
                validUntil: '360001',
                storageLimit: '64001',
                txFeePerGas,
                storageByteDeposit
        });

        let Token;
        let instance;
        let deployer;
        let user;
        let deployerAddress;
        let userAddress;

        beforeEach(async function () {
                [deployer, user] = await ethers.getSigners();
                deployerAddress = await deployer.getAddress();
                userAddress = await user.getAddress();
                Token = new ContractFactory(TokenContract.abi, TokenContract.bytecode, deployer);
                instance = await Token.deploy(
                        1234567890,
                        {
                                gasPrice: ethParams.txGasPrice,
                                gasLimit: ethParams.txGasLimit,
                        }
                );
        });

        describe("Deployment", function () {
                it("should set the correct token name", async function () {
                        expect(await instance.name()).to.equal("Token");
                });

                it("should set the correct token symbol", async function () {
                        expect(await instance.symbol()).to.equal("TKN");
                });

                it("should set the correct total supply", async function () {
                        expect(await instance.totalSupply()).to.equal(1234567890);
                });

                it("should assign the initial balance to the deployer", async function () {
                        expect(await instance.balanceOf(deployerAddress)).to.equal(1234567890);
                });

                it("should not assign value to a random address upon deployment", async function () {
                        expect(await instance.balanceOf(userAddress)).to.equal(0);
                });

                it("should not assign allowance upon deployment", async function () {
                        expect(await instance.allowance(deployerAddress, userAddress)).to.equal(0);
                        expect(await instance.allowance(userAddress, deployerAddress)).to.equal(0);
                });
        });

        describe("Operation", function () {
                this.timeout(50000);

                describe("Transfer", function () {
                        describe("transfer()", function () {
                                it("should change the balance of the sender and receiver when transferring token", async function () {
                                        const initialDeployerBalance = await instance.balanceOf(deployerAddress);
                                        const initialUserBalance = await instance.balanceOf(userAddress);

                                        await instance.connect(deployer).transfer(userAddress, 500);

                                        const finalDeployerBalance = await instance.balanceOf(deployerAddress);
                                        const finalUserBalance = await instance.balanceOf(userAddress);

                                        expect(initialDeployerBalance - 500).to.equal(finalDeployerBalance);
                                        expect(initialUserBalance + 500).to.equal(finalUserBalance);
                                });

                                it("should emit a Transfer event when transfering the token", async function () {
                                        await expect(instance.connect(deployer).transfer(userAddress, 100)).to
                                                .emit(instance, "Transfer")
                                                .withArgs(deployerAddress, userAddress, 100);
                                });

                                it("should revert the transfer to a 0x0 address", async function () {
                                        await expect(instance.connect(deployer).transfer(NULL_ADDRESS, 100)).to
                                                .be.revertedWith("ERC20: transfer to the zero address");
                                });

                                it("should revert if trying to transfer amount bigger than balance", async function () {
                                        await expect(instance.connect(deployer).transfer(userAddress, 12345678900)).to
                                                .be.revertedWith("ERC20: transfer amount exceeds balance");
                                });
                        });
                });

                describe("Allowances", function () {
                        describe("approve()", function () {
                                it("should grant allowance when the caller has enough funds", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);

                                        expect(await instance.allowance(deployerAddress, userAddress)).to
                                                .equal(100);
                                });


                                it("should grant allowance when the caller has less funds than the ize of the allowance", async function () {
                                        await instance.connect(deployer).approve(userAddress, 12345678900);

                                        expect(await instance.allowance(deployerAddress, userAddress)).to
                                                .equal(12345678900);
                                });

                                it("should emit Approval event when calling approve()", async function () {
                                        await expect(instance.connect(deployer).approve(userAddress, 100)).to
                                                .emit(instance, "Approval")
                                                .withArgs(deployerAddress, userAddress, 100);
                                });

                                it("should revert when trying to give allowance to 0x0 address", async function () {
                                        await expect(instance.connect(deployer).approve(NULL_ADDRESS, 100)).to
                                                .be.revertedWith("ERC20: approve to the zero address");
                                });
                        });

                        describe("increaseAllowance()", function () {
                                it("should allow to increase allowance", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);

                                        const initialAllowance = await instance.allowance(deployerAddress, userAddress);

                                        await instance.connect(deployer).increaseAllowance(userAddress, 50);

                                        const finalAllowance = await instance.allowance(deployerAddress, userAddress);

                                        expect(finalAllowance - initialAllowance).to.equal(50);
                                });

                                it("should allow to increase allowance above the balance", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);

                                        const initialAllowance = await instance.allowance(deployerAddress, userAddress);

                                        await instance.connect(deployer).increaseAllowance(userAddress, 1234567890);

                                        const finalAllowance = await instance.allowance(deployerAddress, userAddress);

                                        expect(finalAllowance - initialAllowance).to.equal(1234567890);
                                });

                                it("should emit Approval event", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);
                                        await expect(instance.connect(deployer).increaseAllowance(userAddress, 40)).to
                                                .emit(instance, "Approval")
                                                .withArgs(deployerAddress, userAddress, 140);
                                });

                                it("should allow to increase allowance even if none was given before", async function () {
                                        await instance.connect(deployer).increaseAllowance(userAddress, 1234567890);

                                        const allowance = await instance.allowance(deployerAddress, userAddress);

                                        expect(allowance).to.equal(1234567890);
                                });
                        });

                        describe("decreaseAllowance()", function() {
                                it("should decrease the allowance", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);
                                        await instance.connect(deployer).decreaseAllowance(userAddress, 40);

                                        const allowance = await instance.allowance(deployerAddress, userAddress);

                                        expect(allowance).to.equal(60);
                                });

                                it("should emit Approval event", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);
                                        await expect(instance.connect(deployer).decreaseAllowance(userAddress, 40)).to
                                                .emit(instance, "Approval")
                                                .withArgs(deployerAddress, userAddress, 60);
                                });

                                it("should revert when tyring to decrease the allowance below 0", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);
                                        await expect(instance.connect(deployer).decreaseAllowance(userAddress, 1000)).to
                                                .be.revertedWith("ERC20: decreased allowance below zero");
                                });
                        });

                        describe("transferFrom()", function () {
                                it("should allow to transfer tokens when allowance is given", async function () {

                                        await instance.connect(deployer).approve(userAddress, 100);

                                        const initialBalance = await instance.balanceOf(userAddress);

                                        await instance.connect(user).transferFrom(deployerAddress, userAddress, 50);

                                        const finalBalance = await instance.balanceOf(userAddress);

                                        expect(initialBalance + 50).to.equal(finalBalance);
                                });

                                it("should emit Transfer event when transferring from another address", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);

                                        await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 40)).to
                                                .emit(instance, "Transfer")
                                                .withArgs(deployerAddress, userAddress, 40);
                                });

                                it("should emit Approval event when transferring from another address", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);

                                        await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 40)).to
                                                .emit(instance, "Approval")
                                                .withArgs(deployerAddress, userAddress, 60);
                                });

                                it("should update the allowance when transferring from another address", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);
                                        await instance.connect(user).transferFrom(deployerAddress, userAddress, 40);

                                        expect(await instance.allowance(deployerAddress, userAddress)).to.equal(60);
                                });

                                it("should revert when tring to transfer more than allowed amount", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);
                                        await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 1000)).to
                                                .be.revertedWith("ERC20: transfer amount exceeds allowance");
                                });

                                it("should revert when transfering to 0x0 address", async function () {
                                        await instance.connect(deployer).approve(userAddress, 100);
                                        await expect(instance.connect(user).transferFrom(deployerAddress, NULL_ADDRESS, 50)).to
                                                .be.revertedWith("ERC20: transfer to the zero address");
                                });

                                it("should revert when owner doesn't have enough funds", async function () {
                                        await instance.connect(deployer).approve(userAddress, 12345678900);
                                        await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 12345678900)).to
                                                .be.revertedWith("ERC20: transfer amount exceeds balance");
                                });

                                it("should revert when trying to transfer from without being given allowance", async function () {
                                        await expect(instance.connect(user).transferFrom(deployerAddress, userAddress, 10)).to
                                                .be.revertedWith("ERC20: transfer amount exceeds allowance");
                                });
                        });
                });
        });
});