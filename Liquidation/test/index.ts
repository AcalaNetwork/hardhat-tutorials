import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect, use } from "chai";
import { ContractReceipt } from "ethers";
import BN from 'bignumber.js'
import { ethers } from "hardhat";
import { publishContract, txParams } from "../utils/deployUtil";
import { feedOraclePrice, feedTestOraclePrices, getTestProvider, testPairs } from "../utils/testUtil";
import { EVM, DOT, AUSD, ACA, DEX, ORACLE } from "@acala-network/contracts/utils/MandalaAddress";
import { abi as IERC20ABI } from "@openzeppelin/contracts/build/contracts/IERC20Metadata.json";
import { TestProvider } from "@acala-network/bodhi";
import { Liquidation, Liquidation__factory } from "../typechain";

import { solidity } from "ethereum-waffle";
import { evmChai } from "@acala-network/bodhi";
import { firstValueFrom } from "rxjs";

use(evmChai);
use(solidity);

const EVM_PALLET_ADDRESS = '0x31382d495FEd5A6820d9C07e8B6eFe8D2166e9dD';

describe("Liquidation", () => {
    let signers: SignerWithAddress[];
    let provider: TestProvider;
    let Liquidation: Liquidation__factory;
    let liquidation: Liquidation;

    const resetLiquidationPerf = async (collateral: string): Promise<ContractReceipt> =>
        liquidation.setCollateralPreference(collateral, {
            swapWithUSD: false,
            limitedSupply: false,
            supply: '0',
            totalSupplied: '0',
            minDiscount: '0'
        }).then((r) => r.wait());

    const transferToken = async (token: string, amount: string, to: string): Promise<ContractReceipt> => {
        console.log(`Transferring ${amount} ${token} to ${to}`);
        const tokenContract = await ethers.getContractAt(IERC20ABI, token);
        const res = await tokenContract.connect(signers[1]).transfer(to, amount);
        const receipt = await res.wait();
        console.log(`Transferred ${amount} ${token} to ${to}`);
        return receipt;
    }


    before(async () => {
        const param = await txParams();
        signers = await ethers.getSigners();
        provider = await getTestProvider();
        Liquidation = await ethers.getContractFactory("Liquidation");
        liquidation = await Liquidation.deploy(
            signers[0].address,
            AUSD,
            DEX,
            ORACLE,
            {
                gasPrice: param.txGasPrice,
                gasLimit: param.txGasLimit,
            });
        await liquidation.deployed();
    })

    beforeEach(async () => {
        const receipt = await resetLiquidationPerf(liquidation.address);
        expect((receipt.events || []).find((e) => e.event === 'CollateralPreferenceUpdated')).to.not.be.undefined;
    })

    it('liquidate - Should fail if collateral is not allowed', async () => {
        await liquidation.setCollateralLimitedSupply(liquidation.address, true).then(r => r.wait())
        await expect(liquidation.liquidate(liquidation.address, liquidation.address, '0', '0'))
            .to.be.revertedWith("Liquidation: Collateral is not allowed");
    })

    it('liquidate - Should fail if collateralSupply is exhausted', async () => {
        await liquidation.setCollateralLimitedSupply(liquidation.address, true).then(r => r.wait());
        await (await liquidation.setCollateralSupply(liquidation.address, '1')).wait();
        await (await liquidation.liquidate(liquidation.address, liquidation.address, '1', '1')).wait();
        await expect(liquidation.liquidate(liquidation.address, liquidation.address, '1', '1'))
            .to.be.revertedWith("Liquidation: Not enough collateral supply");
    });

    it('liquidate - Should fail if collateralSupply is reduced after more supply', async () => {
        await liquidation.setCollateralLimitedSupply(liquidation.address, true).then(r => r.wait())
        await liquidation.setCollateralSupply(liquidation.address, '3').then(r => r.wait())
        await liquidation.liquidate(liquidation.address, liquidation.address, '2', '2').then(r => r.wait())
        await liquidation.setCollateralSupply(liquidation.address, '1').then(r => r.wait())
        await expect(liquidation.liquidate(liquidation.address, liquidation.address, '1', '1'))
            .to.be.revertedWith("Liquidation: Collateral supply not satisfied");
    });

    it('liquidate - should fail if paused', async () => {
        await liquidation.pause().then(r => r.wait())
        await expect(liquidation.liquidate(liquidation.address, liquidation.address, '0', '0'))
            .to.be.revertedWith("Pausable: paused");
        await liquidation.unpause().then(r => r.wait())

    })

    it('liquidate - should fail if not called by EVM', async () => {
        await expect(liquidation.connect(signers[1]).liquidate(liquidation.address, liquidation.address, '0', '0'))
            .to.be.revertedWith("Liqudation: Only evm can call this function");
    })

    it('liquidate - Should transfer target amount to target', async () => {
        const deposit = new BN(5000).shiftedBy(12).toFixed(0);
        const target = new BN(100).shiftedBy(12).toFixed(0);
        const ausd = await ethers.getContractAt(IERC20ABI, AUSD);
        await transferToken(AUSD, deposit, liquidation.address);
        const receipt = await liquidation.liquidate(liquidation.address, signers[1].address, '10', target).then(r => r.wait())
        expect((receipt.events || []).find((e) => e.event === 'Liquidate')).to.not.be.undefined;
        const liquidationBalance = await ausd.balanceOf(liquidation.address);
        expect(liquidationBalance.toString()).to.equal(new BN(deposit).minus(target).toString());
    })

    it('onCollateralTransfer - Should fail if collateral is not allowed', async () => {
        await liquidation.setCollateralLimitedSupply(liquidation.address, true).then(r => r.wait())
        await expect(liquidation.onCollateralTransfer(liquidation.address, '10'))
            .to.be.revertedWith("Liquidation: Collateral is not allowed");
    })

    it('onCollateralTransfer - should fail if paused', async () => {
        await liquidation.pause().then(r => r.wait())
        await expect(liquidation.onCollateralTransfer(liquidation.address, '10'))
            .to.be.revertedWith("Pausable: paused");
        await liquidation.unpause().then(r => r.wait())

    })

    it('onCollateralTransfer - should fail if not called by EVM', async () => {
        await expect(liquidation.connect(signers[1]).onCollateralTransfer(liquidation.address, '10'))
            .to.be.revertedWith("Liqudation: Only evm can call this function");
    })

    it('onCollateralTransfer - Should emit OnCollateralTransfer event', async () => {
        const receipt = await liquidation.onCollateralTransfer(liquidation.address, '10').then(r => r.wait())
        expect((receipt.events || []).find((e) => e.event === 'OnCollateralTransfer')).to.not.be.undefined;
    })

    it('onCollateralTransfer - Should swap collateral with AUSD', async () => {
        const deposit = new BN(1).shiftedBy(10).toFixed(0);
        const dot = await ethers.getContractAt(IERC20ABI, DOT);
        await liquidation.setCollateralSwapWithUSD(DOT, true).then(r => r.wait())
        await transferToken(DOT, deposit, liquidation.address);
        let liquidationDotBalance = await dot.balanceOf(liquidation.address);
        expect(liquidationDotBalance.toString()).to.equal(deposit);
        const receipt = await liquidation.onCollateralTransfer(DOT, deposit).then(r => r.wait())
        expect((receipt.events || []).find((e) => e.event === 'OnCollateralTransfer')).to.not.be.undefined;
        liquidationDotBalance = await dot.balanceOf(liquidation.address);
        expect(liquidationDotBalance.toString()).to.equal('0');
    })

    it('onRepaymentRefund - should fail if paused', async () => {
        await liquidation.pause().then(r => r.wait())
        await expect(liquidation.onRepaymentRefund(liquidation.address, '10'))
            .to.be.revertedWith("Pausable: paused");
        await liquidation.unpause().then(r => r.wait())

    })

    it('onRepaymentRefund - should fail if not called by EVM', async () => {
        await expect(liquidation.connect(signers[1]).onRepaymentRefund(liquidation.address, '10'))
            .to.be.revertedWith("Liqudation: Only evm can call this function");
    })


    it('onRepaymentRefund - Should emit OnRepaymentRefund event and reduce totalSupply', async () => {
        await liquidation.setCollateralPreference(liquidation.address, {
            swapWithUSD: false,
            limitedSupply: false,
            supply: '0',
            totalSupplied: '10',
            minDiscount: '0'
        }).then((r) => r.wait());
        let pref = await liquidation.collateralPreference(liquidation.address);
        expect(pref.totalSupplied.toString()).to.equal('10');
        const receipt = await liquidation.onRepaymentRefund(liquidation.address, '2').then(r => r.wait())
        expect((receipt.events || []).find((e) => e.event === 'OnRepaymentRefund')).to.not.be.undefined;
        pref = await liquidation.collateralPreference(liquidation.address);
        expect(pref.totalSupplied.toString()).to.equal('8');
    })


    describe('e2e', () => {
        it('e2e - feed default test prices', async () => {
            await feedTestOraclePrices(provider);
        })

        it('e2e - set collateral params for DOT asset', async () => {
            const ext = provider.api.tx.cdpEngine.setCollateralParams(
                { Token: "DOT" },
                { NewValue: new BN(1).div(100000).shiftedBy(18).toFixed(0) },
                { NewValue: new BN(3).div(2).shiftedBy(18).toFixed(0) },
                { NewValue: new BN(2).div(10).shiftedBy(18).toFixed(0) },
                { NewValue: new BN(9).div(5).shiftedBy(18).toFixed(0) },
                { NewValue: new BN(10000).shiftedBy(18).toFixed(0) },
            );
            // set params for DOT
            await new Promise((resolve) => {
                provider.api.tx.sudo.sudo(ext).signAndSend(testPairs.alice.address, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                });
            })
        })

        it('e2e - transfer some tokens to test account(ferdie)', async () => {
            // transfer few DOT to Ferdie
            await new Promise((resolve) => {
                provider.api.tx.currencies.transfer(
                    { "Id": testPairs.ferdie.address },
                    { "Token": "DOT" },
                    new BN(15).shiftedBy(10).toFixed(0)
                ).signAndSend(testPairs.alice.address, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })

            // transfer some ACA to Ferdie
            await new Promise((resolve) => {
                provider.api.tx.currencies.transfer(
                    { "Id": testPairs.ferdie.address },
                    { "Token": "ACA" },
                    new BN(150).shiftedBy(12).toFixed(0)
                ).signAndSend(testPairs.alice.address, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })
        })

        it('e2e - redeploy fresh liquidation contract', async () => {
            const param = await txParams();
            liquidation = await Liquidation.deploy(
                signers[0].address,
                AUSD,
                DEX,
                ORACLE,
                {
                    gasPrice: param.txGasPrice,
                    gasLimit: param.txGasLimit,
                });
            await liquidation.deployed();
        })

        it('e2e - set liquidation contract evm address', async () => {
            await liquidation.setEvm(EVM_PALLET_ADDRESS).then(r => r.wait())
        })

        it('e2e - publish liquidation contract', async () => {
            const receipt = await publishContract({
                signer: signers[0],
                contractAddress: liquidation.address,
            });
            expect((receipt.events || []).find((e) => e.event === 'ContractPublished')).to.not.be.undefined;
        })

        it('e2e - transfer few aUSD and ACA to liquidation contract', async () => {
            console.log('Transferring 5000 aUSD to liquidation contract');
            const ausd = await ethers.getContractAt(IERC20ABI, AUSD);
            const res = await ausd.connect(signers[1]).transfer(liquidation.address, new BN(5000).shiftedBy(12).toFixed(0));
            await res.wait();
            console.log('Transferred 5000 aUSD to liquidation contract');

            console.log('Transferring 5000 aca to liquidation contract');
            const aca = await ethers.getContractAt(IERC20ABI, ACA);
            const res1 = await aca.connect(signers[1]).transfer(liquidation.address, new BN(5000).shiftedBy(12).toFixed(0));
            await res1.wait();
            console.log('Transferred 5000 aca to liquidation contract');
        })

        it('e2e - deregister old liquidation contracts', async () => {
            let contracts: any = await firstValueFrom(provider.api.rx.query.cdpEngine.liquidationContracts());
            for (let i = 0; i < contracts.length; i++) {
                await new Promise((resolve) => {
                    provider.api.tx.sudo.sudo(provider.api.tx.cdpEngine.deregisterLiquidationContract(contracts[i].toString()))
                        .signAndSend(testPairs.alice.address, (result) => {
                            if (result.status.isFinalized || result.status.isInBlock) {
                                resolve(undefined);
                            }
                        });
                })
            }
        })

        it('e2e - register liquidation contract', async () => {
            // register that liquidation contract
            await new Promise((resolve) => {
                provider.api.tx.sudo.sudo(provider.api.tx.cdpEngine.registerLiquidationContract(liquidation.address))
                    .signAndSend(testPairs.alice.address, (result) => {
                        if (result.status.isFinalized || result.status.isInBlock) {
                            resolve(undefined);
                        }
                    });
            })
        })

        it('e2e - (ferdie) mint aUSD loan by depositing DOT as collateral', async () => {
            let currentblockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
            let waitforBlocks = 1;
            // (Ferdie) mint aUSD by depositing DOT as collateral 
            await new Promise((resolve) => {
                provider.api.tx.honzon.adjustLoan(
                    { Token: 'DOT' },
                    "50000000000",
                    "414334815622508"
                ).signAndSend(testPairs.ferdie, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })

            const loanPosition: any = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.ferdie.address));
            // wait for blocks to pass
            await new Promise((resolve) => {
                const checkBlock = async () => {
                    const blockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
                    if (blockNumber - currentblockNumber >= waitforBlocks) {
                        resolve(undefined);
                    } else {
                        setTimeout(checkBlock, 1000);
                    }
                }
                checkBlock();
            })
            expect((+loanPosition.collateral).toString()).to.be.eq('50000000000');
            expect((+loanPosition.debit).toString()).to.be.eq('414334815622508');
        })

        it('e2e - (ferdie) get below collateral and liquidated', async () => {
            const dot = await ethers.getContractAt(IERC20ABI, DOT);
            const liquidationDotBalanceBefore = await dot.balanceOf(liquidation.address);
            expect(+liquidationDotBalanceBefore).to.be.eq(0);
            let currentblockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
            let waitforBlocks = 5;
            // Set DOT price to liquidation price
            await feedOraclePrice(provider, 'DOT', new BN(12.2).shiftedBy(18).toFixed(0));

            // wait for blocks to pass
            await new Promise((resolve) => {
                const checkBlock = async () => {
                    const blockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
                    if (blockNumber - currentblockNumber >= waitforBlocks) {
                        resolve(undefined);
                    } else {
                        setTimeout(checkBlock, 1000);
                    }
                }
                checkBlock();
            })

            const loanPositionAfter: any = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.ferdie.address));
            expect(+loanPositionAfter.debit).to.be.eq(0);
            expect(+loanPositionAfter.collateral).to.be.eq(0);

            const liquidationDotBalanceAfter = await dot.balanceOf(liquidation.address);
            // considering fee deduction
            expect(+liquidationDotBalanceAfter).to.be.gt(40000000000);
        })

        it('e2e - (ferdie) again mint aUSD loan by depositing DOT as collateral', async () => {
            await feedOraclePrice(provider, 'DOT', new BN(17.387).shiftedBy(18).toFixed(0));
            let currentblockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
            let waitforBlocks = 1;
            // (Ferdie) mint aUSD by depositing DOT as collateral 
            await new Promise((resolve) => {
                provider.api.tx.honzon.adjustLoan(
                    { Token: 'DOT' },
                    "50000000000",
                    "414334815622508"
                ).signAndSend(testPairs.ferdie, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })

            const loanPosition: any = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.ferdie.address));
            // wait for blocks to pass
            await new Promise((resolve) => {
                const checkBlock = async () => {
                    const blockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
                    if (blockNumber - currentblockNumber >= waitforBlocks) {
                        resolve(undefined);
                    } else {
                        setTimeout(checkBlock, 1000);
                    }
                }
                checkBlock();
            })
            expect((+loanPosition.collateral).toString()).to.be.eq('50000000000');
            expect((+loanPosition.debit).toString()).to.be.eq('414334815622508');
        })

        it('e2e - (ferdie) again get below collateral and liquidated with swap enabled', async () => {
            await liquidation.setCollateralSwapWithUSD(DOT, true).then(res => res.wait());
            const dot = await ethers.getContractAt(IERC20ABI, DOT);
            const liquidationDotBalanceBefore = await dot.balanceOf(liquidation.address);
            expect(+liquidationDotBalanceBefore).to.be.gt(40000000000);
            let currentblockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
            let waitforBlocks = 5;
            // Set DOT price to liquidation price
            await feedOraclePrice(provider, 'DOT', new BN(12.2).shiftedBy(18).toFixed(0));

            // wait for blocks to pass
            await new Promise((resolve) => {
                const checkBlock = async () => {
                    const blockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
                    if (blockNumber - currentblockNumber >= waitforBlocks) {
                        resolve(undefined);
                    } else {
                        setTimeout(checkBlock, 1000);
                    }
                }
                checkBlock();
            })

            const loanPositionAfter: any = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.ferdie.address));
            expect(+loanPositionAfter.debit).to.be.eq(0);
            expect(+loanPositionAfter.collateral).to.be.eq(0);

            const liquidationDotBalanceAfter = await dot.balanceOf(liquidation.address);
            expect(+liquidationDotBalanceAfter).to.be.eq(0);
        })

        it('e2e - (ferdie-liquidated-by-auction) again mint aUSD loan by depositing DOT as collateral', async () => {
            await feedOraclePrice(provider, 'DOT', new BN(17.387).shiftedBy(18).toFixed(0));
            let currentblockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
            let waitforBlocks = 1;
            // (Ferdie) mint aUSD by depositing DOT as collateral 
            await new Promise((resolve) => {
                provider.api.tx.honzon.adjustLoan(
                    { Token: 'DOT' },
                    "50000000000",
                    "414334815622508"
                ).signAndSend(testPairs.ferdie, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })

            const loanPosition: any = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.ferdie.address));
            // wait for blocks to pass
            await new Promise((resolve) => {
                const checkBlock = async () => {
                    const blockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
                    if (blockNumber - currentblockNumber >= waitforBlocks) {
                        resolve(undefined);
                    } else {
                        setTimeout(checkBlock, 1000);
                    }
                }
                checkBlock();
            })
            expect((+loanPosition.collateral).toString()).to.be.eq('50000000000');
            expect((+loanPosition.debit).toString()).to.be.eq('414334815622508');
        })

        it('e2e - (ferdie-liquidated-by-auction) again get below collateral but will not be liquidated by contract because discounted < minDiscount', async () => {
            await liquidation.setCollateralSwapWithUSD(DOT, false).then(res => res.wait());
            await liquidation.setCollateralMinDiscount(DOT, '200000000000000000').then(res => res.wait());

            const dot = await ethers.getContractAt(IERC20ABI, DOT);
            let currentblockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
            let waitforBlocks = 5;
            // Set DOT price to liquidation price
            await feedOraclePrice(provider, 'DOT', new BN(12.2).shiftedBy(18).toFixed(0));

            // wait for blocks to pass
            await new Promise((resolve) => {
                const checkBlock = async () => {
                    const blockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
                    if (blockNumber - currentblockNumber >= waitforBlocks) {
                        resolve(undefined);
                    } else {
                        setTimeout(checkBlock, 1000);
                    }
                }
                checkBlock();
            })

            const loanPositionAfter: any = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.ferdie.address));
            expect(+loanPositionAfter.debit).to.be.eq(0);
            expect(+loanPositionAfter.collateral).to.be.eq(0);

            const liquidationDotBalanceAfter = await dot.balanceOf(liquidation.address);
            expect(+liquidationDotBalanceAfter).to.be.eq(0);
        })
    })
});