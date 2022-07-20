
import { TestProvider, AccountSigningKey } from '@acala-network/bodhi';
import { WsProvider } from '@polkadot/api';
import { createTestPairs } from '@polkadot/keyring/testingPairs';

export const LOCAL_WS_URL = 'ws://127.0.0.1:9944';
export const testPairs = createTestPairs();
export const DEFAULT_ORACLE_PRICE = [
    [{ Token: 'AUSD' }, '1000000000000000000'],
    [{ Token: 'DOT' }, '17387000000000000000'],
    [{ Token: 'ACA' }, '10267010356479'],
    [{ Token: 'LDOT' }, '7015000000000000000'],
    [{ Token: 'RENBTC' }, '25559881000000002000000'],
    [{ Token: 'CASH' }, '766705100327601'],
    [{ Token: 'KAR' }, '414399529583857728'],
    [{ Token: 'KUSD' }, '1000000000000000000'],
    [{ Token: 'KSM' }, '46910000000000000000'],
    [{ Token: 'LKSM' }, '46910000000000000000'],
    [{ Token: 'TAI' }, '15000000000000000'],
    [{ Token: 'BNC' }, '247651000000000000'],
    [{ Token: 'VSKSM' }, '46910000000000000000'],
    [{ Token: 'KBTC' }, '25559881000000002000000'],
] as [{ Token: string }, string][];



export const getTestProvider = async (urlOverwrite?: string): Promise<TestProvider> => {
    const url = urlOverwrite || process.env.ENDPOINT_URL || LOCAL_WS_URL;

    const provider = new TestProvider({
        provider: new WsProvider(url),
    });

    console.log(`test provider connected to ${url}`);
    await provider.isReady();
    const pair = testPairs.alice;
    const signingKey = new AccountSigningKey(provider.api.registry);
    signingKey.addKeyringPair(pair);
    provider.api.setSigner(signingKey);
    return provider;
};

export const feedOraclePrice = async (provider: TestProvider, token: string, price: string) => {
    console.log(`feeding oracle price ${token} ${price}`);
    return new Promise((resolve) => {
        provider.api.tx.acalaOracle
            .feedValues([[{ Token: token }, price]])
            .signAndSend(testPairs.alice.address, (result) => {
                if (result.status.isFinalized || result.status.isInBlock) {
                    resolve(undefined);
                }
            });
    });
};

export const feedTestOraclePrices = async (provider: TestProvider) => {
    console.log(`feeding test oracle default prices ${DEFAULT_ORACLE_PRICE.map(([{ Token }, price]) => `${Token} ${price}`).join(', ')}`);
    return new Promise((resolve) => {
        provider.api.tx.acalaOracle
            .feedValues(DEFAULT_ORACLE_PRICE)
            .signAndSend(testPairs.alice.address, (result) => {
                if (result.status.isFinalized || result.status.isInBlock) {
                    resolve(undefined);
                }
            });
    });
}