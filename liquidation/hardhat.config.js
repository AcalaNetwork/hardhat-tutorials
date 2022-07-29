require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.14",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    mandala: {
      url: 'http://127.0.0.1:8545',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0"
      },
      chainId: 595
    },
    mandalaPubDev: {
      url: 'https://acala-mandala-adapter.api.onfinality.io/public',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0"
      },
      chainId: 595
    }
  },
  mocha: {
    timeout: 100000000
  },
};
