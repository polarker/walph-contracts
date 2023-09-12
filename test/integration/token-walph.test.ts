import { web3, Project, stringToHex, ONE_ALPH, DUST_AMOUNT, sleep, ZERO_ADDRESS, sign } from '@alephium/web3'
import { NodeWallet, PrivateKeyWallet } from '@alephium/web3-wallet'
import { Walf, Buy, Open,Close, WalfInstance, Destroy, BuyWithoutToken, WalfTypes, BuyTicketToken } from '../../artifacts/ts'
import configuration, { Settings } from '../../alephium.config'
import * as dotenv from 'dotenv'
import { waitTxConfirmed } from '@alephium/cli'
import { testPrivateKey, mintToken, transfer, getSigner } from '@alephium/web3-test'

dotenv.config()


let signer
let signerAddress
let rndSignerBuy
let testGroup

const networkToUse = 'devnet'

describe('integration tests', () => {
  beforeAll(async () => {
    web3.setCurrentNodeProvider(configuration.networks[networkToUse].nodeUrl, undefined, fetch)
    await Project.build()
  
 // rndSignerBuy = new PrivateKeyWallet({privateKey: configuration.networks[networkToUse].privateKeys[1] , keyType: undefined, nodeProvider: web3.getCurrentNodeProvider()})

  signer = new PrivateKeyWallet({ privateKey: testPrivateKey })

  signerAddress = await signer.account.address
  testGroup = signer.account.group
  
  })
  

  it('should test Walf', async () => {


   const tokenTest = await mintToken(signer.address, 20n * 10n ** 9n)

    const deployResult = await Walf.deploy(
      signer,
      {
        initialFields: {
            poolSize: 10n * 10n ** 9n,
          poolOwner: signerAddress,
          poolFees: 1n,
          ticketPrice: 1n * 10n ** 9n,
          tokenId:
            tokenTest.contractId,
          open: true,
          balance: 0n,
          numAttendees: 0n,
          attendees: Array(10).fill(
            ZERO_ADDRESS
          ) as WalfTypes.Fields["attendees"],
          lastWinner: ZERO_ADDRESS,

          },
      }
    )

    
    const walf = deployResult.contractInstance
    const walfContractId = deployResult.contractInstance.contractId
    const walfContractAddress = deployResult.contractInstance.address

    console.log("Contract deployed at: "+walfContractId+" "+walfContractAddress)
    expect(deployResult.contractInstance.groupIndex).toEqual(testGroup)

    const walfDeployed = Walf.at(walfContractAddress)


    const initialState = await walfDeployed.fetchState()
    const initialBalance = initialState.fields.balance
    expect(initialBalance).toEqual(0n)

    const getPoolSize = await walf.methods.getPoolSize()
    expect(getPoolSize.returns).toEqual(10n * 10n ** 9n)
  
    const ticketBoughtEvents: WalfTypes.TicketBoughtEvent[] = []
    const subscription = walf.subscribeTicketBoughtEvent({
      pollingInterval: 1,
      messageCallback: async (event: WalfTypes.TicketBoughtEvent) => {
        ticketBoughtEvents.push(event)
        return Promise.resolve()
      },
      errorCallback: async (error, subscription) => {
        console.error(error)
        subscription.unsubscribe()
        return Promise.resolve()
      }
    })

      const contractBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(walfContractAddress)
      expect(contractBalance.balanceHint).toEqual("1 ALPH")

      const signerBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(signer.address)
      // simulate someone buying tickets
      for (let i = 0; i < 9; i++) {
        await BuyTicketToken.execute(signer, {
          initialFields: {walfContract: walfContractId , amount: 1n * 10n ** 9n, tokenId: tokenTest.contractId},
          tokens: [{ id: tokenTest.contractId, amount: BigInt(1n * 10n ** 9n) }],
          attoAlphAmount:  DUST_AMOUNT,
          
        })
        
      }

      const afterPoolFull = await walfDeployed.fetchState()
      const afterPoolFullOpenState = afterPoolFull.fields.open
      const afterPoolFullBalanceState = afterPoolFull.fields.balance
      const afterPoolFullNumAttendeesState = afterPoolFull.fields.numAttendees
      const afterPoolFullAttendeesState = afterPoolFull.fields.attendees


      console.log("Pool state: "+afterPoolFullOpenState + " Balance: "+afterPoolFullBalanceState/10n**18n+ " Attendees: " + afterPoolFullAttendeesState)
      let expectedArray = Array(9).fill(signer.address) as WalfTypes.Fields["attendees"]
      expectedArray[9] = ZERO_ADDRESS

      expect(afterPoolFullOpenState).toEqual(true)
      expect(afterPoolFullBalanceState).toEqual(9n * 10n ** 9n)
      expect(afterPoolFullNumAttendeesState).toEqual(9n)
      expect(afterPoolFullAttendeesState).toEqual(expectedArray)


      expect(ticketBoughtEvents.length).toEqual(9)
      
      //buy last ticket to draw the pool
      const lastOne = await getSigner()
        await transfer(signer, lastOne.address, tokenTest.contractId, 1n * 10n ** 9n)
      await BuyTicketToken.execute(lastOne, {
        initialFields: {walfContract: walfContractId , amount: 1n * 10n ** 9n, tokenId: tokenTest.contractId},
        tokens: [{ id: tokenTest.contractId, amount: BigInt(1n * 10n ** 9n) }],
        attoAlphAmount: DUST_AMOUNT,
        
      })

      const contractAfterPoolDistributionBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(walfContractAddress)
      expect(contractAfterPoolDistributionBalance.balanceHint).toEqual("1 ALPH")
      const winnerBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(signer.address)

      const afterPoolDistribution = await walfDeployed.fetchState()
      const afterPoolDistributionOpenState = afterPoolDistribution.fields.open
      const afterPoolDistributionBalanceState = afterPoolDistribution.fields.balance
      const afterPoolDistributionNumAttendeesState = afterPoolDistribution.fields.numAttendees
      const afterPoolDistributionWinner = afterPoolDistribution.fields.lastWinner

      console.log("Pool state: "+afterPoolDistributionOpenState + " Balance: "+afterPoolDistributionBalanceState/10n**18n + " Fields: "+ JSON.stringify(afterPoolDistribution.fields))
      expect(afterPoolDistributionOpenState).toEqual(true)
      expect(afterPoolDistributionBalanceState).toEqual(0n)
      expect(afterPoolDistributionNumAttendeesState).toEqual(0n)
      expect(afterPoolDistributionWinner).toEqual(signer.account.address)

      subscription.unsubscribe()

     await Destroy.execute(signer, {
        initialFields: { walphContract: walfContractId },
        attoAlphAmount: DUST_AMOUNT

      })
      /*
      const contractBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(WalfContractAddress)
      expect(web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(WalfContractAddress)).toEqual(0n)*/

  }
)

})
