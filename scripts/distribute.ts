import { toNano } from '@ton/core';
import { Distributor } from '../wrappers/Distributor';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const distributionAddress = await ui.inputAddress('Enter distribution address: ');

    const distributor = provider.open(await Distributor.fromAddress(distributionAddress));

    await distributor.send(
        provider.sender(),
        {
            value: toNano('0.1'),
        },
        'startDistribution',
    );

    await provider.waitForDeploy(distributor.address);

    // run methods on `distributor`
}
