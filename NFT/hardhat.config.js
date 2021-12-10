require("@nomiclabs/hardhat-waffle");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.9",
  networks: {
    mandala: {
      url: 'http://127.0.0.1:3330',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0",
      },
      chainId: 595,
      gasPrice: 429496729610000, // storage_limit = 100000, validUntil = 10000, 100000 << 32 | 10000
    },
  }
};


