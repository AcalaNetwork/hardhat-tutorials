import '@nomicfoundation/hardhat-toolbox';
import { HardhatUserConfig } from 'hardhat/config';

const commonConfig = {
  accounts: {
    mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
    path: 'm/44\'/60\'/0\'/0',
  },
  chainId: 595,
};

const config: HardhatUserConfig = {
  solidity: '0.8.9',
  networks: {
    mandala: {
      ...commonConfig,
      url: 'http://127.0.0.1:8545',
    },
    mandalaPub: {
      ...commonConfig,
      url: 'https://eth-rpc-tc9.aca-staging.network',
      // accounts: ['your private key'],
    },
    mandalaCI: {
      ...commonConfig,
      url: 'http://eth-rpc-adapter-server-rich:8545',
    },
  },
  mocha: {
    timeout: 100000,
  },
};

export default config;
