import { Deployer, DeployFunction, Network } from '@alephium/cli'
import { Settings } from '../alephium.config'
import { Walphle, WalphleTypes } from '../artifacts/ts'
import { ZERO_ADDRESS } from '@alephium/web3'



const deployWalphe: DeployFunction<Settings> = async (
  deployer: Deployer
): Promise<void> => {
 
  const poolSize = 21
  const result = await deployer.deployContract(Walphle, {

    // The initial states of the faucet contract
    initialFields: {
        poolSize: BigInt(poolSize) * 10n ** 18n,
        poolOwner: deployer.account.address,
        poolFees: 10n,
        minTokenAmountToHold: 1n,
        ticketPrice: 10n ** 18n,
        tokenIdToHold: "47504df5a7b18dcecdbf1ea00b7e644d0a7c93919f2d2061ba153f241f03b801",
        open: true,
        balance: 0n,
        numAttendees: 0n,
        attendees: Array(poolSize).fill(ZERO_ADDRESS) as WalphleTypes.Fields["attendees"],
        lastWinner: ZERO_ADDRESS

      },
  })
  console.log('Walphle contract id: ' + result.contractInstance.contractId)
  console.log('Walphle contract address: ' + result.contractInstance.address)
}

export default deployWalphe