import { Deployer, DeployFunction, Network } from '@alephium/cli'
import { Settings } from '../alephium.config'
import { Walphle, WalphleTypes } from '../artifacts/ts'
import { ZERO_ADDRESS } from '@alephium/web3'

// This deploy function will be called by cli deployment tool automatically
// Note that deployment scripts should prefixed with numbers (starting from 0)
const deployWalphe: DeployFunction<Settings> = async (
  deployer: Deployer
): Promise<void> => {
 

  const result = await deployer.deployContract(Walphle, {

    // The initial states of the faucet contract
    initialFields: {
        poolSize: 10n * 10n ** 18n,
        poolOwner: "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y",
        poolFees: 10n,
        minTokenAmountToHold: 0n,
        tokenIdToHold: "3f52b6bdb8678b8931d683bbae1bd7c5296f70a2ab87bbd1792cb24f9b1d1500",
        open: true,
        balance: 0n,
        numAttendees: 0n,
        attendees: Array(10).fill(ZERO_ADDRESS) as WalphleTypes.Fields["attendees"],
        lastWinner: ZERO_ADDRESS

      },
  })
  console.log('Walphle contract id: ' + result.contractInstance.contractId)
  console.log('Walphle contract address: ' + result.contractInstance.address)
}

export default deployWalphe