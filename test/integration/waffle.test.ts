import { web3, Project, stringToHex, ONE_ALPH, DUST_AMOUNT, sleep, ZERO_ADDRESS } from '@alephium/web3'
import { NodeWallet, PrivateKeyWallet } from '@alephium/web3-wallet'
import { Walph, Buy, Open,Close, WalphTypes, Destroy, BuyWithoutToken } from '../../artifacts/ts'
import configuration, { Settings } from '../../alephium.config'
import * as dotenv from 'dotenv'

dotenv.config()


let signer
let signerAddress
let rndSignerBuy
let testGroup

const tokenIdToHold = "3f52b6bdb8678b8931d683bbae1bd7c5296f70a2ab87bbd1792cb24f9b1d1500"
const networkToUse = 'devnet'

describe('integration tests', () => {
  beforeAll(async () => {
    web3.setCurrentNodeProvider(configuration.networks[networkToUse].nodeUrl, undefined, fetch)
    await Project.build()

  signer = new PrivateKeyWallet({privateKey: configuration.networks[networkToUse].privateKeys[0] , keyType: undefined, nodeProvider: web3.getCurrentNodeProvider()})
  
  rndSignerBuy = new PrivateKeyWallet({privateKey: configuration.networks[networkToUse].privateKeys[1] , keyType: undefined, nodeProvider: web3.getCurrentNodeProvider()})

  signerAddress = await signer.account.address
  testGroup = signer.account.group
  
  })
  

  it('should test Walph', async () => {
    
    const deployResult = await Walph.deploy(
      signer,
      {
        initialFields: {
            poolSize: 10n * 10n ** 18n,
            poolOwner: signerAddress,
            poolFees: 10n,
            ticketPrice: 10n ** 18n,
            minTokenAmountToHold: 0n,
            tokenIdToHold: tokenIdToHold,
            open: true,
            balance: 0n,
            numAttendees: 0n,
            attendees: Array(10).fill(ZERO_ADDRESS) as WalphTypes.Fields["attendees"],
            lastWinner: ZERO_ADDRESS

          },
      }
    )

    
    const walph = deployResult.contractInstance
    const walphleContractId = deployResult.contractInstance.contractId
    const walphContractAddress = deployResult.contractInstance.address

    console.log("Contract deployed at: "+walphleContractId+" "+walphContractAddress)
    expect(deployResult.contractInstance.groupIndex).toEqual(testGroup)

    const walphleDeployed = Walph.at(walphContractAddress)


    const initialState = await walphleDeployed.fetchState()
    const initialBalance = initialState.fields.balance
    expect(initialBalance).toEqual(0n)

    const getPoolSize = await walph.methods.getPoolSize()
    expect(getPoolSize.returns).toEqual(10n * 10n ** 18n)
  
    const ticketBoughtEvents: WalphTypes.TicketBoughtEvent[] = []
    const subscription = walph.subscribeTicketBoughtEvent({
      pollingInterval: 1,
      messageCallback: async (event: WalphTypes.TicketBoughtEvent) => {
        ticketBoughtEvents.push(event)
        return Promise.resolve()
      },
      errorCallback: async (error, subscription) => {
        console.error(error)
        subscription.unsubscribe()
        return Promise.resolve()
      }
    })

      // simulate someone buying tickets
      for (let i = 0; i < 9; i++) {
        await BuyWithoutToken.execute(rndSignerBuy, {
          initialFields: {walphContract: walphleContractId , amount: ONE_ALPH},
          attoAlphAmount: ONE_ALPH + 3n * DUST_AMOUNT,
          
        })
        
      }

      const afterPoolFull = await walphleDeployed.fetchState()
      const afterPoolFullOpenState = afterPoolFull.fields.open
      const afterPoolFullBalanceState = afterPoolFull.fields.balance
      const afterPoolFullNumAttendeesState = afterPoolFull.fields.numAttendees
      const afterPoolFullAttendeesState = afterPoolFull.fields.attendees


      console.log("Pool state: "+afterPoolFullOpenState + " Balance: "+afterPoolFullBalanceState/10n**18n+ " Attendees: " + afterPoolFullAttendeesState)
      let expectedArray = Array(9).fill(rndSignerBuy.address) as WalphTypes.Fields["attendees"]
      expectedArray[9] = ZERO_ADDRESS

      expect(afterPoolFullOpenState).toEqual(true)
      expect(afterPoolFullBalanceState).toEqual(9n * 10n ** 18n)
      expect(afterPoolFullNumAttendeesState).toEqual(9n)
      expect(afterPoolFullAttendeesState).toEqual(expectedArray)


      expect(ticketBoughtEvents.length).toEqual(9)
      
      //buy last ticket to draw the pool
      await BuyWithoutToken.execute(rndSignerBuy, {
        initialFields: {walphContract: walphleContractId , amount: ONE_ALPH},
        attoAlphAmount: 21n * 10n ** 18n + 3n * DUST_AMOUNT,
        
      })

      const afterPoolDistribution = await walphleDeployed.fetchState()
      const afterPoolDistributionOpenState = afterPoolDistribution.fields.open
      const afterPoolDistributionBalanceState = afterPoolDistribution.fields.balance
      const afterPoolDistributionNumAttendeesState = afterPoolDistribution.fields.numAttendees
      const afterPoolDistributionWinner = afterPoolDistribution.fields.lastWinner

      console.log("Pool state: "+afterPoolDistributionOpenState + " Balance: "+afterPoolDistributionBalanceState/10n**18n + " Fields: "+ afterPoolDistribution.fields)
      expect(afterPoolDistributionOpenState).toEqual(true)
      expect(afterPoolDistributionBalanceState).toEqual(0n)
      expect(afterPoolDistributionNumAttendeesState).toEqual(0n)
      expect(afterPoolDistributionWinner).toEqual('18vsJ3xDBnSt2aXRSQ7QRTPrVVkjZuTXtxvV1x8mvm3Nz')

      subscription.unsubscribe()

      await Destroy.execute(signer, {
        initialFields: { walphContract: walphleContractId},
        attoAlphAmount: DUST_AMOUNT

      })

      /*
      const contractBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(walphContractAddress)
      expect(web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(walphContractAddress)).toEqual(0n)*/

  }
)


it('should close and open pool', async () => {


  const deployResult = await Walph.deploy(
    signer,
    {
      initialFields: {
          poolSize: 10n * 10n ** 18n,
          poolOwner: signerAddress,
          poolFees: 10n,
          minTokenAmountToHold: 0n,
          ticketPrice: 10n ** 18n,
          tokenIdToHold: tokenIdToHold,
          open: true,
          balance: 0n,
          numAttendees: 0n,
          attendees: Array(10).fill(ZERO_ADDRESS) as WalphTypes.Fields["attendees"],
          lastWinner: ZERO_ADDRESS

        },
    }
  )

  
  const walph = deployResult.contractInstance
  const walphleContractId = deployResult.contractInstance.contractId
  const walphContractAddress = deployResult.contractInstance.address

  console.log("Contract deployed at: "+walphleContractId+" "+walphContractAddress)
  expect(deployResult.contractInstance.groupIndex).toEqual(testGroup)

  const walphleDeployed = Walph.at(walphContractAddress)

  const closePoolEvents: WalphTypes.PoolCloseEvent[] = []
      const subscription = walph.subscribePoolCloseEvent({
        pollingInterval: 10,
        messageCallback: async (event: WalphTypes.PoolCloseEvent) => {
          closePoolEvents.push(event)
          return Promise.resolve()
        },
        errorCallback: async (error, subscription) => {
          console.error(error)
          subscription.unsubscribe()
          return Promise.resolve()
        }
      })

  await Close.execute(signer, {
    initialFields: {walphContract: walphleContractId}
  })


  const closePoolState = await walphleDeployed.fetchState()
  const closeState = closePoolState.fields.open
  expect(closeState).toEqual(false)

  expect(closePoolEvents.length).toEqual(1)
  subscription.unsubscribe()

  const openPoolEvents: WalphTypes.PoolOpenEvent[] = []
  const subscriptionPoolOpen = walph.subscribePoolCloseEvent({
    pollingInterval: 10,
    messageCallback: async (event: WalphTypes.PoolOpenEvent) => {

      openPoolEvents.push(event)
      return Promise.resolve()
    },
    errorCallback: async (error, subscriptionPoolOpen) => {
      console.error(error)
      subscriptionPoolOpen.unsubscribe()
      return Promise.resolve()
    }
  })


  await Open.execute(signer, {
    initialFields: {walphContract: walphleContractId}
  })
  
  const poolState = await walphleDeployed.fetchState()
  const openState = poolState.fields.open
  expect(openState).toEqual(true)
  
  expect(openPoolEvents.length).toEqual(1)
  subscriptionPoolOpen.unsubscribe()


})


})
