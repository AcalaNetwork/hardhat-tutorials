require('@nomiclabs/hardhat-waffle');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: '0.8.9',
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
    },
    mandalaCI: {
      url: 'http://eth-rpc-adapter-server-rich:8545',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0"
      },
      chainId: 595
    }
  },
  mocha: {
    timeout: 100000
  }
};
