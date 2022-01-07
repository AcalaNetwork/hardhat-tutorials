const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  console.log('Started the infinite NFT deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const NFT = await ethers.getContractFactory('NFT');
    await NFT.deploy();

    console.log(`Current number of NFT instances: ${++count}`);
  }
};

loop();