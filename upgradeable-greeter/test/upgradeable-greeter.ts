import { ethers, upgrades } from 'hardhat';
import { expect } from 'chai';

import { Greeter, GreeterV2, GreeterV2__factory, Greeter__factory } from '../typechain-types';

describe('UpgradeableGreeter contract', () => {
  let Greeter: Greeter__factory;
  let GreeterV2: GreeterV2__factory;
  let instance: Greeter;
  let instanceV2: GreeterV2;

  beforeEach(async () => {
    Greeter = await ethers.getContractFactory('Greeter');
    GreeterV2 = await ethers.getContractFactory('GreeterV2');
    instance = await upgrades.deployProxy(Greeter, ['Hello, Goku!']) as Greeter;
  });

  describe('Deployment', () => {
    it('should return the greeting set at deployment', async () => {
      expect(await instance.greet()).to.equal('Hello, Goku!');
    });

    it('should return a new greeting when one is set', async () => {
      await instance.setGreeting('Hello, Kakarot!');
      expect(await instance.greet()).to.equal('Hello, Kakarot!');
    });
  });

  describe('Upgrade', () => {
    beforeEach(async () => {
      instanceV2 = await upgrades.upgradeProxy(instance.address, GreeterV2) as GreeterV2;
    });

    it('should maintain the greeting after the upgrade', async () => {
      expect(await instanceV2.greet()).to.equal('Hello, Goku!');
    });

    it('should add a new method', async () => {
      await instanceV2.setGreetingV2('Konichiwa, Kakarot!');
      expect(await instanceV2.greet()).to.equal('Konichiwa, Kakarot! - V2');
    });

    it('should maintain the original method', async () => {
      await instanceV2.setGreetingV2('Konichiwa, Kakarot!');
      const updatedGreeting = await instance.greet();

      await instanceV2.setGreeting('Goodbye, Goku!');
      const originalGreeting = await instance.greet();

      expect(updatedGreeting).to.equal('Konichiwa, Kakarot! - V2');
      expect(originalGreeting).to.equal('Goodbye, Goku!');
    });
  });
});
