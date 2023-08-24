import { web3, Project, stringToHex, ONE_ALPH, DUST_AMOUNT, sleep } from '@alephium/web3'
import { testNodeWallet,  } from '@alephium/web3-test'
import { NodeWallet, PrivateKeyWallet } from '@alephium/web3-wallet'
import { Walphle, Distribute, Buy, Open,Close } from '../../artifacts/ts'
import configuration, { Settings } from '../../alephium.config'

jest.setTimeout(1000000)
const fullTest = false

let signer
let signerAddress
let testGroup
let deployResult
let walphe
let walphleContractId
let walpheContractAddress
let walphleDeployed

describe('integration tests', () => {
  beforeAll(async () => {
    web3.setCurrentNodeProvider('http://127.0.0.1:12973', undefined, fetch)
    await Project.build()

  signer = new PrivateKeyWallet({privateKey: configuration.networks.testnet.privateKeys[0] , keyType: undefined, nodeProvider: web3.getCurrentNodeProvider()})

  signerAddress = await signer.account.address
  testGroup = signer.account.group
  })
  

  it('should test Walphe', async () => {
    // Create a node wallet by wallet name
    // Create a PrivateKeyWallet from private key
    
    deployResult = await Walphle.deploy(
      signer,
      {
        initialFields: {
            poolSize: 10n * 10n ** 18n,
            poolOwner: signerAddress,
            poolFees: 1n,
            ratioAlphAlf: 0n,
            open: true,
            balance: 0n
          },
      }
    )

    
    walphe = deployResult.contractInstance
    walphleContractId = deployResult.contractInstance.contractId
    walpheContractAddress = deployResult.contractInstance.address
    await sleep(95000)

    console.log("Contract deployed at: "+walphleContractId+" "+walpheContractAddress)
    expect(deployResult.contractInstance.groupIndex).toEqual(testGroup)

    walphleDeployed = Walphle.at(walpheContractAddress)
    await sleep(80000)

    const initialState = await walphleDeployed.fetchState()
    const initialBalance = initialState.fields.balance
    expect(initialBalance).toEqual(0n)

    //const getDecimalResult = await walphe.methods.getPoolSize()
    //expect(getDecimalResult.returns).toEqual(10n * 10n ** 18n)
    if (fullTest){
    await Close.execute(signer, {
      initialFields: {walpheContract: walphleContractId}
    })
    await sleep(70000)

    const closePoolState = await walphleDeployed.fetchState()
    const closeState = closePoolState.fields.open
    expect(closeState).toEqual(false)

    await Open.execute(signer, {
      initialFields: {walpheContract: walphleContractId}
    })
    await sleep(75000)
    
    const poolState = await walphleDeployed.fetchState()
    const openState = poolState.fields.open
    expect(openState).toEqual(true)
    
    await sleep(70000)
    await Buy.execute(signer, {
        initialFields: {walpheContract: walphleContractId , amount: ONE_ALPH },
        attoAlphAmount: ONE_ALPH + 5n * DUST_AMOUNT
      })

      await sleep(70000)
      const newInitialState = await walphleDeployed.fetchState()
      const newBalance = newInitialState.fields.balance
      expect(newBalance).toEqual(2n * 10n ** 18n) // 2 ALPH because 1 ALPH is for contract creation
    }

      for (let i = 0; i <= 10; i++) {
        await Buy.execute(signer, {
          initialFields: {walpheContract: walphleContractId , amount: ONE_ALPH },
          attoAlphAmount: ONE_ALPH + 3n * DUST_AMOUNT
        })
      }
      await sleep(70000)

      const afterPoolFull = await walphleDeployed.fetchState()
      const afterPoolFullOpenState = afterPoolFull.fields.open
      const afterPoolFullBalanceState = afterPoolFull.fields.balance
      console.log("Pool state: "+afterPoolFullOpenState + "Balance: "+afterPoolFullBalanceState)
      expect(afterPoolFullOpenState).toEqual(false)
      expect(afterPoolFullBalanceState).toEqual(deployResult.initialFields.poolSize)
  }
  
)

/*
it('should close and open pool', async () => {

  await Close.execute(signer, {
    initialFields: {walpheContract: walphleContractId}
  })
  await sleep(70000)

  const closePoolState = await walphleDeployed.fetchState()
  const closeState = closePoolState.fields.open
  expect(closeState).toEqual(false)

  await Open.execute(signer, {
    initialFields: {walpheContract: walphleContractId}
  })
  await sleep(75000)
  
  const poolState = await walphleDeployed.fetchState()
  const openState = poolState.fields.open
  expect(openState).toEqual(true)
  

})
*/

})