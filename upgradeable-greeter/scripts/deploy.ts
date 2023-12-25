import { ethers, upgrades } from 'hardhat';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`deploying contracts with the account: ${deployer.address}`);

  const Greeter = await ethers.getContractFactory('Greeter');
  const proxy = await upgrades.deployProxy(Greeter, ['Hello, Goku!']);
  const greeterImplAddr = await getImplementationAddress(ethers.provider, await proxy.getAddress());

  console.log('deployed Greeter with proxy:', {
    proxyAddr: await proxy.getAddress(),
    greeterImplAddr,
  });

  const greeting = await proxy.greet();
  console.log('Greeting is:', greeting);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
