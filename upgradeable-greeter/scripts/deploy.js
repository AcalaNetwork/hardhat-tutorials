const { providerOverrides } = require('../utils/overrideProvider');
const { ethers, upgrades } = require('hardhat');

async function main() {
  const overrides = await providerOverrides();

  const deployer = overrides.signer;

  console.log('Deploying contract with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const Greeter = await ethers.getContractFactory('Greeter', deployer);
  const instance = await upgrades.deployProxy(Greeter, ["Hello, Goku!"]);

  console.log('Greeter address:', instance.address);

  const greeting = await instance.greet();

  console.log('Greeting is:', greeting);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
