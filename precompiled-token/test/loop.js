const { ApiPromise, WsProvider } = require('@polkadot/api');

const sleep = async time => new Promise((resolve) => setTimeout(resolve, time));

const loop = async (interval = 1000) => {
  const provider = new WsProvider('ws://127.0.0.1:9944');

  const api = await ApiPromise.create({ provider });
  
  console.log('Started forced block generation loop!')

  let count = 0;

  while (true) {
    await sleep(interval);
    await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
    console.log(`Current number of force generated blocks: ${++count}`);
  }
};

loop();