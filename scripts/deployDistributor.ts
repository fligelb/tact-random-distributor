import { toNano } from '@ton/core';
import { Distributor } from '../wrappers/Distributor';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const maxDeposits = await ui.input('Enter maximum deposits: ');
    const deadline = await ui.input('Enter deadline(UNIX format): ');
    const index = await ui.input('Enter index: ');

    const distributor = provider.open(await Distributor.fromInit(BigInt(maxDeposits), BigInt(deadline), BigInt(index)));

    await distributor.send(
        provider.sender(),
        {
            value: toNano('0.01'),
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        },
    );

    await provider.waitForDeploy(distributor.address);

    // run methods on `distributor`
}
