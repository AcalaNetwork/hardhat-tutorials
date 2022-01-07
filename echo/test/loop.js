const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  console.log('Started the infinite Echo deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const Echo = await ethers.getContractFactory('Echo');
    await Echo.deploy();

    console.log(`Current number of Echo instances: ${++count}`);
  }
};

loop();