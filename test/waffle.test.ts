import { web3, Project, TestContractParams, addressFromContractId, AssetOutput, DUST_AMOUNT, addressFromPublicKey, ZERO_ADDRESS, ContractState, NamedVals } from '@alephium/web3'
import { PrivateKeyWallet } from '@alephium/web3-wallet'
import { expectAssertionError, randomContractId, testAddress, testPrivateKey } from '@alephium/web3-test'
import { Walphle, WalphleTypes } from '../artifacts/ts'

describe('unit tests', () => {
  let testContractId: string
  let testTokenId: string
  let testContractAddress: string
  let testParamsFixture: TestContractParams<WalphleTypes.Fields, { amount: bigint, winner: string}>


  // We initialize the fixture variables before all tests
  beforeAll(async () => {

    web3.setCurrentNodeProvider('http://127.0.0.1:22973', undefined, fetch)
    await Project.build()
    testContractId = randomContractId()
    
    testTokenId = testContractId
    testContractAddress = addressFromContractId(testContractId)
    testParamsFixture = {
      // a random address that the test contract resides in the tests
      address: testContractAddress,

      // initial state of the test contract
      initialFields: {
        poolSize: 10n * 10n ** 18n,
        poolOwner: testAddress,
        poolFees: 1n,
        ratioAlphAlf: 0n,
        open: false,
        balance: 0n,
        numAttendees: 0n,
        attendees: Array(10).fill(ZERO_ADDRESS) as WalphleTypes.Fields["attendees"],
        lastWinner: ZERO_ADDRESS
      },
      initialAsset: {
        alphAmount: 0n,
      },
      // arguments to test the target function of the test contract
      testArgs: { 
        amount: 1n * 10n ** 18n,
        winner: PrivateKeyWallet.Random(0,web3.getCurrentNodeProvider()).account.address
        
      },
      // assets owned by the caller of the function
      inputAssets: [
        { 
          address: testAddress, 
          asset: { alphAmount: 100n * 10n ** 18n }
        }
      ]
      
    }

  })


  it('test opening and closing pool', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))

     // open the pool
    let testResult = await Walphle.tests.openPool(testParams)
    let contractState = testResult.contracts[0] as WalphleTypes.State

    expect(contractState.address).toEqual(testContractAddress)
    expect(contractState.fields.open).toEqual(true)

    //assign new state to initial fields and close the pool
    testParams.initialFields = contractState.fields
    testResult = await Walphle.tests.closePool(testParams)

    contractState = testResult.contracts[0] as WalphleTypes.State
    expect(contractState.fields.open).toEqual(false)

  })


  it('test try to open an opened pool', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    testParams.initialFields.open = true

    await expectAssertionError(Walphle.tests.openPool(testParams),testContractAddress,2)
  })

  it('test try to close a closed pool', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    testParams.initialFields.open = false


    await expectAssertionError( Walphle.tests.closePool(testParams),testContractAddress,1)
  })


  it('test try to close a not full pool', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    testParams.initialFields.open = true
    const randomAddress = PrivateKeyWallet.Random(0,web3.getCurrentNodeProvider()).account.address
    testParams.inputAssets[0].address = randomAddress

    await expectAssertionError( Walphle.tests.closePoolWhenFull(testParams),testContractAddress,6)
  })

  it('test try to open the pool with wrong address', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    const wrongAddress = PrivateKeyWallet.Random(0,web3.getCurrentNodeProvider()).account.address
    testParams.inputAssets[0].address = wrongAddress
    testParams.initialFields.open = false

    await expectAssertionError(Walphle.tests.openPool(testParams),testContractAddress,4)
  })


  it('test buy a ticket', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    testParams.initialFields.open = true
   testParams.inputAssets[0] = { address: "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y", asset: { alphAmount: 100n * 10n ** 18n } }
    
    const testResult = await Walphle.tests.buyTicket(testParams)
    const contractState = testResult.contracts[0] as WalphleTypes.State

    expect(contractState.fields.balance).toEqual(10n**18n)
    expect(contractState.fields.attendees.length).toEqual(10)
    expect(contractState.fields.numAttendees).toEqual(1n)
    expect(contractState.fields.attendees).toEqual(['1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y',ZERO_ADDRESS,ZERO_ADDRESS,ZERO_ADDRESS,ZERO_ADDRESS,ZERO_ADDRESS,ZERO_ADDRESS,ZERO_ADDRESS,ZERO_ADDRESS,ZERO_ADDRESS])

  })


  it('test buy a ticket more than 1 ALPH', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    testParams.initialFields.open = true
   testParams.inputAssets[0] = { address: "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y", asset: { alphAmount: 100n * 10n ** 18n } }
   testParams.testArgs.amount = 11n * 10n ** 17n

    await expectAssertionError(Walphle.tests.buyTicket(testParams),testContractAddress,7)


  })

  it('test buy a ticket when pool full', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    testParams.initialFields.open = true
    testParams.initialFields.balance = 100n * 10n ** 18n
   
    testParams.inputAssets[0] = { address: "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y", asset: { alphAmount: 100n * 10n ** 18n } }
    
    await expectAssertionError(Walphle.tests.buyTicket(testParams),testContractAddress,0)

  })


  it('test buy a ticket and then close the pool', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    testParams.initialFields.open = true
    testParams.initialFields.balance = testParams.initialFields.poolSize - 1 * 10 ** 18
    testParams.inputAssets[0] = { address: "1GBvuTs4TosNB9xTCGJL5wABn2xTYCzwa7MnXHphjcj1y", asset: { alphAmount: 100n * 10n ** 18n } }
    
    const testResult = await Walphle.tests.buyTicket(testParams)
    const contractState = testResult.contracts[0] as WalphleTypes.State

    expect(contractState.fields.balance).toEqual(10n * 10n ** 18n)
    expect(contractState.fields.open).toEqual(false)

  })

  it('test distribute prize pool', async () => {
    const testParams = JSON.parse(JSON.stringify(testParamsFixture))
    testParams.initialFields.open = false
    testParams.initialFields.balance = testParams.initialFields.poolSize
    testParams.initialAsset.alphAmount = testParams.initialFields.poolSize + 1

    const testResult = await Walphle.tests.distributePrize(testParams)
    const contractState = testResult.contracts[0] as WalphleTypes.State

    expect(contractState.fields.balance).toEqual(0n)
    expect(contractState.fields.open).toEqual(true)
    expect(contractState.fields.numAttendees).toEqual(0n)
    expect(contractState.fields.attendees.length).toEqual(10)


  })


  /*
    // three transaction outputs in total
    expect(testResult.txOutputs.length).toEqual(3)

    // the first transaction output is for the token
    const tokenOutput = testResult.txOutputs[0] as AssetOutput
    expect(tokenOutput.type).toEqual('AssetOutput')
    expect(tokenOutput.address).toEqual(testAddress)
    expect(tokenOutput.alphAmount).toEqual(DUST_AMOUNT) // dust amount
    // the caller withdrawn 1 token from the contract
    expect(tokenOutput.tokens).toEqual([{ id: testTokenId, amount: 1n }])

    // the second transaction output is for the ALPH
    const alphOutput = testResult.txOutputs[1] as AssetOutput
    expect(alphOutput.type).toEqual('AssetOutput')
    expect(alphOutput.address).toEqual(testAddress)
    expect(alphOutput.alphAmount).toBeLessThan(10n ** 18n) // the caller paid gas
    expect(alphOutput.tokens).toEqual([])

    // the third transaction output is for the contract
    const contractOutput = testResult.txOutputs[2]
    expect(contractOutput.type).toEqual('ContractOutput')
    expect(contractOutput.address).toEqual(testContractAddress)
    expect(contractOutput.alphAmount).toEqual(10n ** 18n)
    // the contract has transferred 1 token to the caller
    expect(contractOutput.tokens).toEqual([{ id: testTokenId, amount: 9n }])

    // a `Withdraw` event is emitted when the test passes
    expect(testResult.events.length).toEqual(1)
    const event = testResult.events[0] as WalphleTypes.WithdrawEvent
    // the event is emitted by the test contract
    expect(event.contractAddress).toEqual(testContractAddress)
    // the name of the event is `Withdraw`
    expect(event.name).toEqual('Withdraw')
    // the first field of the event
    expect(event.fields.to).toEqual(testAddress)
    // the second field of the event
    expect(event.fields.amount).toEqual(1n)

    // the test framework support debug messages too
    // debug will be disabled automatically at the deployment to real networks
    expect(testResult.debugMessages).toEqual([
      { contractAddress: testContractAddress, message: 'The current balance is 10' }
    ])
  })

  it('test withdraw', async () => {
    const testParams = { ...testParamsFixture, testArgs: { amount: 3n } }
    // test that assertion failed in the withdraw function
    await expectAssertionError(Walphle.tests.withdraw(testParams), testContractAddress, 0)
  })
  */

})