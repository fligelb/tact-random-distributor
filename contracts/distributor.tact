import "@stdlib/deploy";
import "@stdlib/ownable";

struct UserDeposit {
    value: Int as coins;
    address: Address;
}

contract Distributor with Deployable, Ownable {
    const minTonForStorage: Int = ton("0.01");

    index: Int as uint256;
    owner: Address;
    distributionEnded: Bool;

    deadline: Int as uint32;
    deposits: map<Int as uint8, UserDeposit>;
    maxDeposits: Int as uint8;
    depositLength: Int as uint8;
 
    init(maxDeposits: Int, deadline: Int, index: Int) {
        require(maxDeposits < 255, "maxDeposits should be lower than 255");

        self.owner = sender();
        self.distributionEnded = false;
        self.index = index;

        self.maxDeposits = maxDeposits;
        self.deadline = now() + deadline;
        self.deposits = emptyMap();
        self.depositLength = 0;
    }

    fun checkIsUserAlreadyDeposited(address: Address): Bool {
        let i: Int = 0;
        repeat(self.depositLength) {
            let deposit = self.deposits.get(i);

            if(deposit == null) {
                return false;
            }

            if(deposit!!.address == address) {
                return true;
            }

            i = i + 1;
        }

        return false;
    }

    fun calculateWinValue(balanceAfterDeadline: Int, i: Int): Int {
        if(i == 1) {
            return (balanceAfterDeadline / 100) * 50;
        } else if(i == 2) {
            return (balanceAfterDeadline / 100) * 30;
        } else if (i == 3) {
            return (balanceAfterDeadline / 100) * 20;
        } else {
            return -1;
        }
    }

    receive("deposit") {
        require(self.depositLength < self.maxDeposits, "Deposit limit have been reached");
        require(self.checkIsUserAlreadyDeposited(sender()) == false, "User already deposited");
        require(self.distributionEnded == false, "Distribution ended");
        require(self.deadline - now() > 0, "Deadline was reached");
        
        self.deposits.set(self.depositLength, UserDeposit{value: context().value, address: sender()});
        self.depositLength += 1;
    }

    receive("startDistribution") {
        require(self.deadline - now() <= 0, "Deadline was not reached");
        require(self.distributionEnded == false, "Distribution ended");
        self.requireOwner();

        let balanceAfterDeadline: Int = myBalance() - context().value - self.minTonForStorage;
        let lastWinner: Int = -1;
        let i: Int = 1;
        while(i != 4) {
            let winner = random(0, self.depositLength);

            if(winner != lastWinner) {
                let winnerDeposit = self.deposits.get(winner);
                let winValue = self.calculateWinValue(balanceAfterDeadline, i);
                
                send(SendParameters{
                    to: winnerDeposit!!.address,
                    bounce: false,
                    value: winValue,
                    mode: SendIgnoreErrors
                });

                lastWinner = winner;
                i = i + 1;
            }
        }

        self.distributionEnded = true;
    }

    get fun deadline(): Int {
        return self.deadline;
    }

    get fun deposits(): map<Int as uint8, UserDeposit> {
        return self.deposits;
    }

    get fun maxDeposits(): Int {
        return self.maxDeposits;
    }

    get fun currentDepositsLength(): Int {
        return self.depositLength;
    }

    get fun isUserDeposited(address: Address): Bool {
        return self.checkIsUserAlreadyDeposited(address);
    }

    get fun isDistributionEnded(): Bool {
        return self.distributionEnded;
    }

    get fun balance(): Int {
        return myBalance();
    }
}
