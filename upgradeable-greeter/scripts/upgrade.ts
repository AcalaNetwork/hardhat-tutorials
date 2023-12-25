import { ethers, upgrades } from 'hardhat';
import { getImplementationAddress } from '@openzeppelin/upgrades-core';

// replace with your proxy address
const proxyAddr = '0x0aF4FE8C80F9457a4B6C92986aC7eBA3376273bc';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`upgrading proxy ${proxyAddr} with the account: ${deployer.address}`);

  const GreeterV2 = await ethers.getContractFactory('GreeterV2');
  const proxy = await upgrades.upgradeProxy(proxyAddr, GreeterV2);
  const greeterV2ImplAddr = await getImplementationAddress(ethers.provider, await proxy.getAddress());

  console.log('upgraded Greeter from V1 => V2:', {
    proxyAddr: await proxy.getAddress(),
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
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
