import { ethers, upgrades } from 'hardhat';
import { formatEther } from 'ethers/lib/utils';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`deploying contracts with the account: ${deployer.address}`);
  console.log(`account balance: ${(formatEther(await deployer.getBalance()))}`);

  const Greeter = await ethers.getContractFactory('Greeter');
  const proxy = await upgrades.deployProxy(Greeter, ['Hello, Goku!']);
  const greeterImplAddr = await getImplementationAddress(ethers.provider, proxy.address);

  console.log('deployed Greeter with proxy:', {
    proxyAddr: proxy.address,
    greeterImplAddr,
  });

  const greeting = await proxy.greet();
  console.log('Greeting is:', greeting);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
