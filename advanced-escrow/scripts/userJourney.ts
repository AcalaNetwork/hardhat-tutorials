import { ACA, AUSD, DOT } from '@acala-network/contracts/utils/MandalaTokens';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { Contract, formatUnits } from 'ethers';
import { ethers } from 'hardhat';
import { options } from '@acala-network/api';
import TokenContract from '@acala-network/contracts/build/contracts/Token.json';

const ENDPOINT_URL = process.env.ENDPOINT_URL || 'ws://127.0.0.1:9944';

async function main() {
  const api = await ApiPromise.create(options({
    provider: new WsProvider(ENDPOINT_URL),
  }));

  console.log('Getting signers');
  const [initiator, beneficiary] = await ethers.getSigners();

  const initiatorAddress = initiator.address;
  const beneficiaryAddress = beneficiary.address;

  console.log('Address of the initiator is', initiatorAddress);
  console.log('Address of the beneficiary is', beneficiaryAddress);

  console.log('Deploying AdvancedEscrow smart contract');
  const instance = await ethers.deployContract('AdvancedEscrow');
  await instance.waitForDeployment();

  console.log('AdvancedEscrow is deployed at address:', await instance.getAddress());

  console.log('Instantiating ACA predeployed smart contract');
  const primaryTokenInstance = new Contract(ACA, TokenContract.abi, initiator);

  const intialPrimaryTokenBalance = await primaryTokenInstance.balanceOf(initiatorAddress);
  const primaryTokenName = await primaryTokenInstance.name();
  const primaryTokenSymbol = await primaryTokenInstance.symbol();
  const primaryTokenDecimals = await primaryTokenInstance.decimals();
  console.log(
    'Initial initiator %s token balance: %s %s',
    primaryTokenName,
    formatUnits(intialPrimaryTokenBalance, primaryTokenDecimals),
    primaryTokenSymbol
  );

  console.log('');
  console.log('');

  console.log('Scenario #1: Escrow funds are released by Schedule');

  console.log('');
  console.log('');

  console.log('Transferring primary token to Escrow instance');

  await primaryTokenInstance.connect(initiator).transfer(
    await instance.getAddress(),
    intialPrimaryTokenBalance / 10_000n,
  );

  console.log('Initiating escrow');

  await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance / 100_000n, 10);

  const escrowBlockNumber = await ethers.provider.getBlockNumber();

  console.log(
    'Escrow initiation successful in block %s. Expected automatic completion in block %s',
    escrowBlockNumber,
    escrowBlockNumber + 10
  );

  const escrow = await instance.escrows(0);

  console.log('Escrow initiator:', escrow.initiator);
  console.log('Escrow beneficiary:', escrow.beneficiary);
  console.log('Escrow ingress token:', escrow.ingressToken);
  console.log('Escrow egress token:', escrow.egressToken);
  console.log('Escrow AUSD value:', escrow.AusdValue);
  console.log('Escrow deadline:', escrow.deadline);
  console.log('Escrow completed:', escrow.completed);

  console.log('Instantiating AUSD instance');
  const AusdInstance = new Contract(AUSD, TokenContract.abi, initiator);

  const initalBeneficiatyAusdBalance = await AusdInstance.balanceOf(beneficiaryAddress);

  console.log('Initial aUSD balance of beneficiary: %s AUSD', formatUnits(initalBeneficiatyAusdBalance, 12));

  console.log('Waiting for automatic release of funds');

  let currentBlockNumber = await ethers.provider.getBlockNumber();

  while (currentBlockNumber <= escrowBlockNumber + 10) {
    console.log(
      'Still waiting. Current block number is %s. Target block number is %s.',
      currentBlockNumber,
      escrowBlockNumber + 10
    );
    currentBlockNumber = await ethers.provider.getBlockNumber();
    await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
  }

  const finalBeneficiaryAusdBalance = await AusdInstance.balanceOf(beneficiaryAddress);

  console.log('Final aUSD balance of beneficiary: %s AUSD', formatUnits(finalBeneficiaryAusdBalance, 12));
  console.log(
    'Beneficiary aUSD balance has increased for %s AUSD',
    formatUnits(finalBeneficiaryAusdBalance - initalBeneficiatyAusdBalance, 12)
  );

  console.log('');
  console.log('');

  console.log('Scenario #2: Escrow initiator releases the funds before the deadline');

  console.log('');
  console.log('');

  console.log('Initiating escrow');

  await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance / 100_000n, 10);

  const escrowBlockNumber2 = await ethers.provider.getBlockNumber();

  console.log(
    'Escrow initiation successful in block %s. Expected automatic completion in block %s',
    escrowBlockNumber2,
    escrowBlockNumber2 + 10
  );

  const escrow2 = await instance.escrows(1);

  console.log('Escrow initiator:', escrow2.initiator);
  console.log('Escrow beneficiary:', escrow2.beneficiary);
  console.log('Escrow ingress token:', escrow2.ingressToken);
  console.log('Escrow egress token:', escrow2.egressToken);
  console.log('Escrow AUSD value:', escrow2.AusdValue);
  console.log('Escrow deadline:', escrow2.deadline);
  console.log('Escrow completed:', escrow2.completed);

  const initalBeneficiatyAusdBalance2 = await AusdInstance.balanceOf(beneficiaryAddress);

  console.log(
    'Initial aUSD balance of beneficiary: %s AUSD',
    formatUnits(initalBeneficiatyAusdBalance2, 12)
  );

  console.log('Manually releasing the funds');

  await instance.connect(initiator).completeEscrow();

  const currentBlockNumber2 = await ethers.provider.getBlockNumber();

  const finalBeneficiaryAusdBalance2 = await AusdInstance.balanceOf(beneficiaryAddress);

  console.log('Escrow funds released at block %s, while the deadline was %s', currentBlockNumber2, escrow2.deadline);
  console.log('Final aUSD balance of beneficiary: %s AUSD', formatUnits(finalBeneficiaryAusdBalance2, 12));
  console.log(
    'Beneficiary aUSD balance has increased for %s AUSD',
    formatUnits(finalBeneficiaryAusdBalance2 - initalBeneficiatyAusdBalance2, 12)
  );

  console.log('');
  console.log('');

  console.log('Scenario #3: Beneficiary decided to be paid out in DOT');

  console.log('');
  console.log('');

  console.log('Initiating escrow');

  await instance.connect(initiator).initiateEscrow(beneficiaryAddress, ACA, intialPrimaryTokenBalance / 100_000n, 10);

  const escrowBlockNumber3 = await ethers.provider.getBlockNumber();

  console.log(
    'Escrow initiation successful in block %s. Expected automatic completion in block %s',
    escrowBlockNumber3,
    escrowBlockNumber3 + 10
  );

  const escrow3 = await instance.escrows(2);

  console.log('Escrow initiator:', escrow3.initiator);
  console.log('Escrow beneficiary:', escrow3.beneficiary);
  console.log('Escrow ingress token:', escrow3.ingressToken);
  console.log('Escrow egress token:', escrow3.egressToken);
  console.log('Escrow AUSD value:', escrow3.AusdValue);
  console.log('Escrow deadline:', escrow3.deadline);
  console.log('Escrow completed:', escrow3.completed);

  console.log('Beneficiary setting the desired escrow egress token');

  await instance.connect(beneficiary).setEgressToken(DOT);

  console.log('Instantiating DOT instance');
  const DotInstance = new Contract(DOT, TokenContract.abi, initiator);

  const initalBeneficiatyDotBalance = await DotInstance.balanceOf(beneficiaryAddress);

  console.log('Initial DOT balance of beneficiary: %s DOT', formatUnits(initalBeneficiatyDotBalance, 12));

  console.log('Waiting for automatic release of funds');

  let currentBlockNumber3 = await ethers.provider.getBlockNumber();
  while (currentBlockNumber3 <= escrowBlockNumber3 + 10) {
    console.log(
      'Still waiting. Current block number is %s. Target block number is %s.',
      currentBlockNumber3,
      escrowBlockNumber3 + 10
    );
    currentBlockNumber3 = await ethers.provider.getBlockNumber();
    await api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
  }

  const finalBeneficiaryDotBalance = await DotInstance.balanceOf(beneficiaryAddress);

  console.log('Final DOT balance of beneficiary: %s DOT', formatUnits(finalBeneficiaryDotBalance, 12));
  console.log(
    'Beneficiary DOT balance has increased for %s DOT',
    formatUnits(finalBeneficiaryDotBalance - initalBeneficiatyDotBalance, 12)
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
