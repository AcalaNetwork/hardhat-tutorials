const { providerOverrides } = require('../utils/overrideProvider');
const { ethers, upgrades } = require('hardhat');

const proxyAddress = '0x721DbA5CE403DC1b04c7C2Bf8235761dDac1ebBb';

async function main() {
  const overrides = await providerOverrides();

  const deployer = overrides.signer;

  console.log('Upgrading contract with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const GreeterV2 = await ethers.getContractFactory('GreeterV2', deployer);
  const instance = await upgrades.upgradeProxy(proxyAddress, GreeterV2);

  console.log('GreeterV2 address:', instance.address);

  const originalGreeting = await instance.greet();

  await instance.setGreetingV2('Konichiwa, Kakarot!');

  const updatedGreeting = await instance.greet();

  console.log('Greeting is:', originalGreeting);
  console.log('Updated greeting:', updatedGreeting);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
