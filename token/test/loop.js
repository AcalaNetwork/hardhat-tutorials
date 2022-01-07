const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 2000) => {
  console.log('Started the infinite Token deployment loop!');

  let count = 0;

  while (true) {
    await sleep(interval);
    const Token = await ethers.getContractFactory('Token');
    await Token.deploy(1234567890);

    console.log(`Current number of Token instances: ${++count}`);
  }
};

loop();