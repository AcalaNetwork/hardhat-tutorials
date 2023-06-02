import { ethers, upgrades } from 'hardhat';
import { formatEther } from 'ethers/lib/utils';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

// replace with your proxy address
const proxyAddr = '0xf80A32A835F79D7787E8a8ee5721D0fEaFd78108';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`upgrading proxy ${proxyAddr} with the account: ${deployer.address}`);
  console.log(`account balance: ${(formatEther(await deployer.getBalance()))}`);

  const GreeterV2 = await ethers.getContractFactory('GreeterV2');
  const proxy = await upgrades.upgradeProxy(proxyAddr, GreeterV2);
  const greeterV2ImplAddr = await getImplementationAddress(ethers.provider, proxy.address);

  console.log('upgraded Greeter from V1 => V2:', {
    proxyAddr: proxy.address,
    greeterV2ImplAddr,
  });

  const greetingV1 = await proxy.greet();
  console.log('V1 Greeting:', greetingV1);

  await proxy.setGreetingV2('Konichiwa, Kakarot!');
  const greetingV2 = await proxy.greet();
  console.log('V2 greeting:', greetingV2);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
