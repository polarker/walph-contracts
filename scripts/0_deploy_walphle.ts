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
        minTokenAmountToHold: 0n,
        tokenIdToHold: "3f52b6bdb8678b8931d683bbae1bd7c5296f70a2ab87bbd1792cb24f9b1d1500",
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