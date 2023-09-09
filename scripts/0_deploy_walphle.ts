import { Deployer, DeployFunction, Network } from '@alephium/cli'
import { Settings } from '../alephium.config'
import { Walph, Walph50HodlAlf, WalphTypes, Walph50HodlAlfTypes, Provision } from '../artifacts/ts'
import { DUST_AMOUNT, ZERO_ADDRESS } from '@alephium/web3'



const deployWalph: DeployFunction<Settings> = async (
  deployer: Deployer
): Promise<void> => {
 
  let poolSize = 21
  let ticketPrice = 10
  const result = await deployer.deployContract(Walph, {

    // The initial states of the faucet contract
    initialFields: {
        poolSize: BigInt(poolSize * ticketPrice) * 10n ** 18n ,
        poolOwner: deployer.account.address,
        poolFees: 1n,
        minTokenAmountToHold: 0n,
        ticketPrice: BigInt(ticketPrice) * 10n ** 18n,
        tokenIdToHold: "",
        open: true,
        balance: 0n,
        numAttendees: 0n,
        attendees: Array(poolSize).fill(ZERO_ADDRESS) as WalphTypes.Fields["attendees"],
        lastWinner: ZERO_ADDRESS

      },
  })
  console.log('Walph contract id: ' + result.contractInstance.contractId)
  console.log('Walph contract address: ' + result.contractInstance.address)


  poolSize = 50
  ticketPrice = 10
  const resultSecond = await deployer.deployContract(Walph50HodlAlf, {

    // The initial states of the faucet contract
    initialFields: {
        poolSize: BigInt(poolSize * ticketPrice) * 10n ** 18n,
        poolOwner: deployer.account.address,
        poolFees: 10n,
        minTokenAmountToHold: 1n,
        ticketPrice: BigInt(ticketPrice) * 10n ** 18n,
        tokenIdToHold: "47504df5a7b18dcecdbf1ea00b7e644d0a7c93919f2d2061ba153f241f03b801",
        open: true,
        balance: 0n,
        numAttendees: 0n,
        attendees: Array(poolSize).fill(ZERO_ADDRESS) as Walph50HodlAlfTypes.Fields["attendees"],
        lastWinner: ZERO_ADDRESS

      },
  })


  console.log('Walph 50 Hodl Alf contract id: ' + resultSecond.contractInstance.contractId)
  console.log('Walph 50 Hodl Alf contract address: ' + resultSecond.contractInstance.address)



}

export default deployWalph