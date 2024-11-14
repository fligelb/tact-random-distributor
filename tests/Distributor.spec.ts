import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, fromNano, SendMode, toNano } from '@ton/core';
import { Distributor } from '../wrappers/Distributor';
import '@ton/test-utils';

describe('Distributor', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let distributor: SandboxContract<Distributor>;

    let maxDeposits: number = 4;
    let deadline: number = 60 * 60 * 24 * 3; // 3 days after

    let user1: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let user3: SandboxContract<TreasuryContract>;
    let user4: SandboxContract<TreasuryContract>;
    let user5: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        blockchain.now = Math.floor(Date.now() / 1000);

        distributor = blockchain.openContract(await Distributor.fromInit(BigInt(maxDeposits), BigInt(deadline), 1n));

        deployer = await blockchain.treasury('deployer');
        user1 = await blockchain.treasury('user1');
        user2 = await blockchain.treasury('user2');
        user3 = await blockchain.treasury('user3');
        user4 = await blockchain.treasury('user4');
        user5 = await blockchain.treasury('user5');

        const deployResult = await distributor.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            },
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: distributor.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and distributor are ready to use
    });

    it('it should deposit', async () => {
        const depositResult = await distributor.send(user1.getSender(), { value: toNano('0.1') }, 'deposit');

        expect(depositResult.transactions).toHaveTransaction({
            from: user1.address,
            to: distributor.address,
            success: true,
        });

        const isUserDeposited = await distributor.getIsUserDeposited(user1.address);
        expect(isUserDeposited).toBeTruthy();
    });

    it('it should not deposit because of deposit limit', async () => {
        const userArray = [user1, user2, user3, user4];
        for (const user of userArray) {
            const depositResult = await distributor.send(user.getSender(), { value: toNano('0.1') }, 'deposit');

            expect(depositResult.transactions).toHaveTransaction({
                from: user.address,
                to: distributor.address,
                success: true,
            });

            const isUserDeposited = await distributor.getIsUserDeposited(user.address);
            expect(isUserDeposited).toBeTruthy();
        }

        const depositResult = await distributor.send(user5.getSender(), { value: toNano('0.1') }, 'deposit');

        expect(depositResult.transactions).toHaveTransaction({
            from: user5.address,
            to: distributor.address,
            success: false,
            exitCode: 33949,
        });
    });

    it('it should not deposit because user already deposited', async () => {
        const depositResult = await distributor.send(user1.getSender(), { value: toNano('0.1') }, 'deposit');

        expect(depositResult.transactions).toHaveTransaction({
            from: user1.address,
            to: distributor.address,
            success: true,
        });

        const isUserDeposited = await distributor.getIsUserDeposited(user1.address);
        expect(isUserDeposited).toBeTruthy();

        const depositResult2 = await distributor.send(user1.getSender(), { value: toNano('0.1') }, 'deposit');

        expect(depositResult2.transactions).toHaveTransaction({
            from: user1.address,
            to: distributor.address,
            success: false,
            exitCode: 6556,
        });
    });

    it('it should not deposit because deadline was reached', async () => {
        blockchain.now! += 60 * 60 * 24 * 3 + 10;

        const depositResult = await distributor.send(user1.getSender(), { value: toNano('0.1') }, 'deposit');

        expect(depositResult.transactions).toHaveTransaction({
            from: user1.address,
            to: distributor.address,
            success: false,
            exitCode: 31386,
        });
    });

    // distribution ended test

    it('it should distribute', async () => {
        const userArray = [user1, user2, user3, user4];
        for (const user of userArray) {
            const depositResult = await distributor.send(user.getSender(), { value: toNano('2.6') }, 'deposit');

            expect(depositResult.transactions).toHaveTransaction({
                from: user.address,
                to: distributor.address,
                success: true,
            });

            const isUserDeposited = await distributor.getIsUserDeposited(user.address);
            expect(isUserDeposited).toBeTruthy();
        }

        blockchain.now! += 60 * 60 * 24 * 3 + 10;

        const distributeResult = await distributor.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            'startDistribution',
        );
        expect(distributeResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: distributor.address,
            success: true,
        });
    });

    it('it should not distribute because distribution was ended', async () => {
        const userArray = [user1, user2, user3, user4];
        for (const user of userArray) {
            const depositResult = await distributor.send(user.getSender(), { value: toNano('2.6') }, 'deposit');

            expect(depositResult.transactions).toHaveTransaction({
                from: user.address,
                to: distributor.address,
                success: true,
            });

            const isUserDeposited = await distributor.getIsUserDeposited(user.address);
            expect(isUserDeposited).toBeTruthy();
        }

        blockchain.now! += 60 * 60 * 24 * 3 + 10;

        const distributeResult = await distributor.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            'startDistribution',
        );
        expect(distributeResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: distributor.address,
            success: true,
        });

        const distributeResult2 = await distributor.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            'startDistribution',
        );
        expect(distributeResult2.transactions).toHaveTransaction({
            from: deployer.address,
            to: distributor.address,
            success: false,
            exitCode: 11683,
        });
    });

    it('it should not distribute because distribution deadline was not reached', async () => {
        const userArray = [user1, user2, user3, user4];
        for (const user of userArray) {
            const depositResult = await distributor.send(user.getSender(), { value: toNano('2.6') }, 'deposit');

            expect(depositResult.transactions).toHaveTransaction({
                from: user.address,
                to: distributor.address,
                success: true,
            });

            const isUserDeposited = await distributor.getIsUserDeposited(user.address);
            expect(isUserDeposited).toBeTruthy();
        }

        const distributeResult = await distributor.send(
            deployer.getSender(),
            { value: toNano('0.1') },
            'startDistribution',
        );
        expect(distributeResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: distributor.address,
            success: false,
            exitCode: 62214,
        });
    });
});
