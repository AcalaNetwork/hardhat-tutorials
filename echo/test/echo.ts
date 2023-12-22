import { ethers } from 'hardhat';
import { expect } from 'chai';

import { Echo } from '../typechain-types';

describe('Echo contract', function () {
  let instance: Echo;

  beforeEach(async () => {
    instance = await ethers.deployContract('Echo', []);
    await instance.waitForDeployment();
  });

  it('should set the value of the echo when deploying', async () => {
    expect(await instance.echo()).to.equal('Deployed successfully!');
  });

  describe('Operation', function () {
    it('should update the echo variable', async () => {
      await instance.scream('Hello World!');

      expect(await instance.echo()).to.equal('Hello World!');
    });

    it('should emit a NewEcho event', async () => {
      await expect(instance.scream('Hello World!'))
        .to.emit(instance, 'NewEcho')
        .withArgs('Hello World!', 1);
    });

    it('should increment echo counter in the NewEcho event', async () => {
      await instance.scream('Hello World!');

      await expect(instance.scream('Goodbye World!'))
        .to.emit(instance, 'NewEcho')
        .withArgs('Goodbye World!', 2);
    });

    it('should return input value', async () => {
      const response = await instance.scream.staticCall('Hello World!');

      expect(response).to.equal('Hello World!');
    });
  });
});
