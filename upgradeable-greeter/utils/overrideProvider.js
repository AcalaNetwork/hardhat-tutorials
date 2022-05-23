const { ethers } = require('hardhat');
const { EvmRpcProvider } = require('@acala-network/eth-providers');

async function providerOverrides() {
    const ENDPOINT_URL = process.env.ENDPOINT_URL || "ws://localhost:9944";
    const MNEMONIC = process.env.MNEMONIC || "fox sight canyon orphan hotel grow hedgehog build bless august weather swarm";

    const provider = EvmRpcProvider.from(ENDPOINT_URL);
    await provider.isReady();

    const gasPriceOverrides = (await provider._getEthGas()).gasPrice;

    provider.getFeeData = async () => ({
        maxFeePerGas: null,
        maxPriorityFeePerGas: null,
        gasPrice: gasPriceOverrides,
    });

    const signer = ethers.Wallet.fromMnemonic(MNEMONIC).connect(provider);

    return{
        provider: provider,
        signer: signer
    };
}

module.exports = { providerOverrides };