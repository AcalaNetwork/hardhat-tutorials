const { ACA } = require('@acala-network/contracts/utils/MandalaAddress');
const { Contract } = require('ethers');

const TokenContract = require('@acala-network/contracts/build/contracts/Token.json');

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log('Getting contract info with the account:', deployer.address);

  console.log('Account balance:', (await deployer.getBalance()).toString());

  const instance = new Contract(ACA, TokenContract.abi, deployer);

  console.log('PrecompiledToken address:', instance.address);

  const name = await instance.name();
  const symbol = await instance.symbol();
  const decimals = await instance.decimals();
  const value = await instance.totalSupply();
  const balance = await instance.balanceOf(await deployer.getAddress());

  console.log('Token name:', name);
  console.log('Token symbol:', symbol);
  console.log('Token decimal spaces:', decimals.toString());
  console.log('Total supply:', value.toString());
  console.log('Our account token balance:', balance.toString());

  const formattedSuppy = balanceFormatting(value.toString(), decimals);
  const formattedBalance = balanceFormatting(balance.toString(), decimals);

  console.log('Total formatted supply: %s %s', formattedSuppy, symbol);
  console.log('Total formatted account token balance: %s %s', formattedBalance, symbol);
}

function balanceFormatting(balance, decimals) {
  const balanceLength = balance.length;
  let output = '';

  if (balanceLength > decimals) {
    for (i = 0; i < balanceLength - decimals; i++) {
      output += balance[i];
    }
    output += '.';
    for (i = balanceLength - decimals; i < balanceLength; i++) {
      output += balance[i];
    }
  } else {
    output += '0.';
    for (i = 0; i < decimals - balanceLength; i++) {
      output += '0';
    }
    output += balance;
  }
  return output;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
