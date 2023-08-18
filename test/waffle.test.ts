import { web3, Project, TestContractParams, addressFromContractId, AssetOutput, DUST_AMOUNT } from '@alephium/web3'
import { expectAssertionError, randomContractId, testAddress } from '@alephium/web3-test'
import { Walphle, WalphleTypes } from '../artifacts/ts'

describe('unit tests', () => {
  let testContractId: string
  let testTokenId: string
  let testContractAddress: string
  let testParamsFixture: TestContractParams<WalphleTypes.Fields, { amount: bigint }>

  // We initialize the fixture variables before all tests
  beforeAll(async () => {
    web3.setCurrentNodeProvider('http://127.0.0.1:12973', undefined, fetch)
    await Project.build()
    testContractId = randomContractId()
    testTokenId = testContractId
    testContractAddress = addressFromContractId(testContractId)
    testParamsFixture = {
      // a random address that the test contract resides in the tests
      address: testContractAddress,

      // initial state of the test contract
      initialFields: {
        poolSize: 100n * 10n * 18n,
        poolOwner: testAddress,
        poolFees: 1n,
        ratioAlphAlf: 10n,
        open: false,
      },
      // arguments to test the target function of the test contract
      testArgs: { amount: 1n },
      // assets owned by the caller of the function
      inputAssets: [{ address: testAddress, asset: { alphAmount: 10n ** 18n } }]
    }
  })

  it('test opening pool', async () => {
    const testParams = testParamsFixture

     // open the pool
    const testResult = await Walphle.tests.openPool(testParams)
    const contractState = testResult.contracts[0] as WalphleTypes.State

    expect(contractState.address).toEqual(testContractAddress)
    expect(contractState.fields.open).toEqual(true)
  })

  it('test closing pool', async () => {
    const testParams = testParamsFixture
    const testResultOpen = await Walphle.tests.openPool(testParams)
    
    // close the pool
    const testResult = await Walphle.tests.closePool(testParams)
    const contractState = testResult.contracts[0] as WalphleTypes.State
    console.log(contractState)
    expect(contractState.fields.open).toEqual(false)
  })

  it('test try to open an opened pool', async () => {
    const testParams = testParamsFixture
    const openPooltestResult = await Walphle.tests.openPool(testParams)
    console.log(openPooltestResult)
    await expectAssertionError(Walphle.tests.openPool(testParams),testContractAddress,2)
  })

  it('test try to close a closed pool', async () => {
    const testParams = testParamsFixture
    await Walphle.tests.openPool(testParams)

    await expectAssertionError( Walphle.tests.closePool(testParams),testContractAddress,1)
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