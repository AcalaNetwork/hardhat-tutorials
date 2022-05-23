const { expect } = require('chai');
const { ethers, upgrades } = require('hardhat');

const { providerOverrides } = require('../utils/overrideProvider');

require('console.mute');

describe('UpgradeableGreeter contract', function () {
  let Greeter;
  let GreeterV2;
  let instance;
  let deployer;

  beforeEach(async function () {
    console.mute();
    deployer = await providerOverrides();
    console.resume();
    Greeter = await ethers.getContractFactory('Greeter', deployer);
    GreeterV2 = await ethers.getContractFactory('GreeterV2', deployer);
    instance = await upgrades.deployProxy(Greeter, ['Hello, Goku!']);
  });

  describe('Deployment', function () {
    it('should return the greeting set at deployment', async function () {
      expect(await instance.greet()).to.equal('Hello, Goku!');
    });

    it('should return a new greeting when one is set', async function () {
      await instance.setGreeting('Hello, Kakarot!')
      expect(await instance.greet()).to.equal('Hello, Kakarot!');
    });
  });

  describe('Upgrade', function () {
    it('should maintain the greeting after the upgrade', async function () {
      const upgradedInstance = await upgrades.upgradeProxy(instance.address, GreeterV2);

      expect(await upgradedInstance.greet()).to.equal('Hello, Goku!');
    });

    it('should add a new method', async function () {
      const upgradedInstance = await upgrades.upgradeProxy(instance.address, GreeterV2);

      await upgradedInstance.setGreetingV2('Konichiwa, Kakarot!');

      expect(await upgradedInstance.greet()).to.equal('Konichiwa, Kakarot! - V2');
    });

    it('should maintain the original method', async function () {
      const upgradedInstance = await upgrades.upgradeProxy(instance.address, GreeterV2);

      await upgradedInstance.setGreetingV2('Konichiwa, Kakarot!');

      const updatedGreeting = await instance.greet();

      await upgradedInstance.setGreeting('Goodbye, Goku!');

      const originalGreeting = await instance.greet();

      expect(updatedGreeting).to.equal('Konichiwa, Kakarot! - V2');
      expect(originalGreeting).to.equal('Goodbye, Goku!');
    });
  });
});
