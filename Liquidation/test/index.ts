import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ApiPromise } from "@polkadot/api";
import { expect } from "chai";
import { BigNumber } from "ethers";
import BN from 'bignumber.js'
import { ethers } from "hardhat";
import { publishContract, txParams } from "../utils/deployUtil";
import { feedOraclePrice, feedTestOraclePrices, getTestProvider, testPairs } from "../utils/testUtil";
import { DOT, AUSD, ACA, DEX } from "@acala-network/contracts/utils/MandalaAddress";
import { abi as IERC20ABI } from "@openzeppelin/contracts/build/contracts/IERC20Metadata.json";
import { TestProvider } from "@acala-network/bodhi";
import { Liquidation, Liquidation__factory } from "../typechain";
import { ZERO_ADDRESS } from "../utils/constants";


describe("Liquidation", () => {
    let signers: SignerWithAddress[];
    let provider: TestProvider;
    let Liquidation: Liquidation__factory;
    let liquidation: Liquidation;

    before(async () => {
        const param = await txParams();
        signers = await ethers.getSigners();
        provider = await getTestProvider();
        Liquidation = await ethers.getContractFactory("Liquidation");
        liquidation = await Liquidation.deploy(signers[0].address, {
            gasPrice: param.txGasPrice,
            gasLimit: param.txGasLimit,
        });
        await liquidation.deployed();
    })

    beforeEach(async () => {

    })

    it("Should fail if collateral is not allowed", async () => {
        await (await liquidation.setCollateralLimitedSupply(liquidation.address, true)).wait();
        try {
            await (await liquidation.liquidate(liquidation.address, liquidation.address, '0', '0')).wait()
        } catch (e: any) {
            expect(e.message).to.include('Liquidation: Collateral is not allowed');
        }
    })

    it('Do All', async () => {
        const param = await txParams();

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
                // console.log(result)
                if (result.status.isFinalized || result.status.isInBlock) {
                    resolve(undefined);
                }
            });
        })

        // // transfer few DOT to Ferdie
        await new Promise((resolve) => {
            provider.api.tx.currencies.transfer(
                { "Id": testPairs.ferdie.address },
                { "Token": "DOT" },
                new BN(5).shiftedBy(10).toFixed(0)
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

        // feed default test Oracle Price
        await feedTestOraclePrices(provider);
        // set DOT price to 17.387
        // await feedOraclePrice(provider, 'DOT', new BN(17.387).shiftedBy(18).toFixed(0));

        // // (Ferdie) mint aUSD by depositing DOT as collateral 
        await new Promise((resolve) => {
            provider.api.tx.honzon.adjustLoan(
                { Token: 'DOT' },
                "50000000000",
                "414334815622508"
            ).signAndSend(testPairs.ferdie, (result) => {
                // console.log(result)
                if (result.status.isFinalized || result.status.isInBlock) {
                    resolve(undefined);
                }
            })
        })

        const Liquidation = await ethers.getContractFactory("Liquidation");
        const liquidation = await Liquidation.connect(signers[0]).deploy(signers[0].address, {
            gasPrice: param.txGasPrice,
            gasLimit: param.txGasLimit,
        });
        await liquidation.deployed();

        await publishContract({
            signer: signers[0],
            contractAddress: liquidation.address,
        });


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

        // register that liquidation contract
        await new Promise((resolve) => {
            provider.api.tx.sudo.sudo(provider.api.tx.cdpEngine.registerLiquidationContract(liquidation.address))
                .signAndSend(testPairs.alice.address, (result) => {
                    // console.log(result)
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                });
        })

        // // Set DOT price to liquidation price
        // await feedOraclePrice(provider, 'DOT', new BN(12.85).shiftedBy(18).toFixed(0));
    })
});