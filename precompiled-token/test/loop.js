const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  console.log('Started the infinite PrecompiledToken deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const PrecompiledToken = await ethers.getContractFactory('PrecompiledToken');
    await PrecompiledToken.deploy(1234567890);

    console.log(`Current number of PrecompiledToken instances: ${++count}`);
  }
};

loop();