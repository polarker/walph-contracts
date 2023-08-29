import { web3, Project, stringToHex, ONE_ALPH, DUST_AMOUNT, sleep, ZERO_ADDRESS } from '@alephium/web3'
import { testNodeWallet,  } from '@alephium/web3-test'
import { NodeWallet, PrivateKeyWallet } from '@alephium/web3-wallet'
import { Walphle, Distribute, Buy, Open,Close, WalphleTypes, Destroy } from '../../artifacts/ts'
import configuration, { Settings } from '../../alephium.config'
import * as dotenv from 'dotenv'

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

  signer = new PrivateKeyWallet({privateKey: configuration.networks[networkToUse].privateKeys[0] , keyType: undefined, nodeProvider: web3.getCurrentNodeProvider()})
  
  rndSignerBuy = new PrivateKeyWallet({privateKey: configuration.networks[networkToUse].privateKeys[1] , keyType: undefined, nodeProvider: web3.getCurrentNodeProvider()})

  signerAddress = await signer.account.address
  testGroup = signer.account.group
  
  })
  

  it('should test Walphe', async () => {
    
    const deployResult = await Walphle.deploy(
      signer,
      {
        initialFields: {
            poolSize: 10n * 10n ** 18n,
            poolOwner: signerAddress,
            poolFees: 10n,
            minTokenAmountToHold: 0n,
            tokenIdToHold: "47504df5a7b18dcecdbf1ea00b7e644d0a7c93919f2d2061ba153f241f03b801",
            open: true,
            balance: 0n,
            numAttendees: 0n,
            attendees: Array(10).fill(ZERO_ADDRESS) as WalphleTypes.Fields["attendees"],
            lastWinner: ZERO_ADDRESS

          },
      }
    )

    
    const walphe = deployResult.contractInstance
    const walphleContractId = deployResult.contractInstance.contractId
    const walpheContractAddress = deployResult.contractInstance.address

    console.log("Contract deployed at: "+walphleContractId+" "+walpheContractAddress)
    expect(deployResult.contractInstance.groupIndex).toEqual(testGroup)

    const walphleDeployed = Walphle.at(walpheContractAddress)


    const initialState = await walphleDeployed.fetchState()
    const initialBalance = initialState.fields.balance
    expect(initialBalance).toEqual(0n)

    const getPoolSize = await walphe.methods.getPoolSize()
    expect(getPoolSize.returns).toEqual(10n * 10n ** 18n)
  
    const ticketBoughtEvents: WalphleTypes.TicketBoughtEvent[] = []
    const subscription = walphe.subscribeTicketBoughtEvent({
      pollingInterval: 1,
      messageCallback: async (event: WalphleTypes.TicketBoughtEvent) => {
        ticketBoughtEvents.push(event)
        return Promise.resolve()
      },
      errorCallback: async (error, subscription) => {
        console.error(error)
        subscription.unsubscribe()
        return Promise.resolve()
      }
    })

      // simulate someone buying tickets until pool full
      for (let i = 0; i < 10; i++) {
        await Buy.execute(rndSignerBuy, {
          initialFields: {walpheContract: walphleContractId , amount: ONE_ALPH},
          attoAlphAmount: ONE_ALPH + 3n * DUST_AMOUNT
        })
        
      }

      const afterPoolFull = await walphleDeployed.fetchState()
      const afterPoolFullOpenState = afterPoolFull.fields.open
      const afterPoolFullBalanceState = afterPoolFull.fields.balance
      const afterPoolFullNumAttendeesState = afterPoolFull.fields.numAttendees
      const afterPoolFullAttendeesState = afterPoolFull.fields.attendees


      console.log("Pool state: "+afterPoolFullOpenState + " Balance: "+afterPoolFullBalanceState/10n**18n)
      expect(afterPoolFullOpenState).toEqual(false)
      expect(afterPoolFullBalanceState).toEqual(10n * 10n ** 18n)
      expect(afterPoolFullNumAttendeesState).toEqual(10n)
      expect(afterPoolFullAttendeesState).toEqual(Array(10).fill(rndSignerBuy.address) as WalphleTypes.Fields["attendees"])


      expect(ticketBoughtEvents.length).toEqual(10)
      
      await Distribute.execute(signer, {
        initialFields: { walpheContract: walphleContractId, winner: "18vsJ3xDBnSt2aXRSQ7QRTPrVVkjZuTXtxvV1x8mvm3Nz"},
        attoAlphAmount: ONE_ALPH + 5n * DUST_AMOUNT

      })

      const afterPoolDistribution = await walphleDeployed.fetchState()
      const afterPoolDistributionOpenState = afterPoolDistribution.fields.open
      const afterPoolDistributionBalanceState = afterPoolDistribution.fields.balance
      const afterPoolDistributionNumAttendeesState = afterPoolDistribution.fields.numAttendees
      const afterPoolDistributionWinner = afterPoolDistribution.fields.lastWinner

      console.log("Pool state: "+afterPoolDistributionOpenState + " Balance: "+afterPoolDistributionBalanceState/10n**18n)
      expect(afterPoolDistributionOpenState).toEqual(true)
      expect(afterPoolDistributionBalanceState).toEqual(0n)
      expect(afterPoolDistributionNumAttendeesState).toEqual(0n)
      expect(afterPoolDistributionWinner).toEqual('18vsJ3xDBnSt2aXRSQ7QRTPrVVkjZuTXtxvV1x8mvm3Nz')

      subscription.unsubscribe()

      await Destroy.execute(signer, {
        initialFields: { walpheContract: walphleContractId},
        attoAlphAmount: DUST_AMOUNT

      })

      /*
      const contractBalance = await web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(walpheContractAddress)
      expect(web3.getCurrentNodeProvider().addresses.getAddressesAddressBalance(walpheContractAddress)).toEqual(0n)*/

  }
)


it('should close and open pool', async () => {


  const deployResult = await Walphle.deploy(
    signer,
    {
      initialFields: {
          poolSize: 10n * 10n ** 18n,
          poolOwner: signerAddress,
          poolFees: 10n,
          minTokenAmountToHold: 0n,
          tokenIdToHold: "47504df5a7b18dcecdbf1ea00b7e644d0a7c93919f2d2061ba153f241f03b801",
          open: true,
          balance: 0n,
          numAttendees: 0n,
          attendees: Array(10).fill(ZERO_ADDRESS) as WalphleTypes.Fields["attendees"],
          lastWinner: ZERO_ADDRESS

        },
    }
  )

  
  const walphe = deployResult.contractInstance
  const walphleContractId = deployResult.contractInstance.contractId
  const walpheContractAddress = deployResult.contractInstance.address

  console.log("Contract deployed at: "+walphleContractId+" "+walpheContractAddress)
  expect(deployResult.contractInstance.groupIndex).toEqual(testGroup)

  const walphleDeployed = Walphle.at(walpheContractAddress)

  const closePoolEvents: WalphleTypes.PoolCloseEvent[] = []
      const subscription = walphe.subscribePoolCloseEvent({
        pollingInterval: 10,
        messageCallback: async (event: WalphleTypes.PoolCloseEvent) => {
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
    initialFields: {walpheContract: walphleContractId}
  })


  const closePoolState = await walphleDeployed.fetchState()
  const closeState = closePoolState.fields.open
  expect(closeState).toEqual(false)

  expect(closePoolEvents.length).toEqual(1)
  subscription.unsubscribe()

  const openPoolEvents: WalphleTypes.PoolOpenEvent[] = []
  const subscriptionPoolOpen = walphe.subscribePoolCloseEvent({
    pollingInterval: 10,
    messageCallback: async (event: WalphleTypes.PoolOpenEvent) => {

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
    initialFields: {walpheContract: walphleContractId}
  })
  
  const poolState = await walphleDeployed.fetchState()
  const openState = poolState.fields.open
  expect(openState).toEqual(true)
  
  expect(openPoolEvents.length).toEqual(1)
  subscriptionPoolOpen.unsubscribe()


})


})