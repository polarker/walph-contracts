import { Deployments, waitTxConfirmed } from '@alephium/cli'
import { DUST_AMOUNT, web3, Project, NodeProvider } from '@alephium/web3'
import { PrivateKeyWallet} from '@alephium/web3-wallet'
import configuration from '../alephium.config'
import { Walphle, Distribute, WalphleTypes } from '../artifacts/ts'

// The `TokenFaucetTypes.WithdrawEvent` is generated in the getting-started guide
const events: WalphleTypes.PoolCloseEvent[] = []
const subscribeOptions = {
    // It will check for new events from the full node every `pollingInterval`
    pollingInterval: 500,
    // The callback function will be called for each event
    messageCallback: (event: WalphleTypes.PoolCloseEvent): Promise<void> => {
      events.push(event)
      return Promise.resolve()
    },
    // This callback function will be called when an error occurs
    errorCallback: (error: any, subscription): Promise<void> => {
      console.log(error)
      subscription.unsubscribe()
      return Promise.resolve()
    }
  }


function getCloseEvents(eventsObject){

const closeEvents = []
for (var event of eventsObject['events']) 
{
  if (event.eventIndex == 2)
    closeEvents.push(event)
}
    return closeEvents
}

async function distribute() {

  //Select our network defined in alephium.config.ts
  const network = configuration.networks.testnet

  //NodeProvider is an abstraction of a connection to the Alephium network
  const nodeProvider = new NodeProvider(network.nodeUrl)

  //Sometimes, it's convenient to setup a global NodeProvider for your project:
  web3.setCurrentNodeProvider(nodeProvider)

  //Connect our wallet, typically in a real application you would connect your web-extension or desktop wallet
  const wallet = new PrivateKeyWallet(new PrivateKeyWallet({privateKey: configuration.networks.testnet.privateKeys[0] , keyType: undefined, nodeProvider: web3.getCurrentNodeProvider()}))

  // Compile the contracts of the project if they are not compiled
  Project.build()

  //.deployments contains the info of our `TokenFaucet` deployement, as we need to now the contractId and address
  //This was auto-generated with the `cli deploy` of our `scripts/0_deploy_faucet.ts`
  const deployments = await Deployments.from('./artifacts/.deployments.testnet.json')
    console.log(deployments)
  //Make sure it match your address group
  const accountGroup = 0

  const deployed = deployments.getDeployedContractResult(accountGroup, 'Walphle')

  if(deployed !== undefined) {
    const walpheContractId = deployed.contractInstance.contractId
    const walpheContractAddress = deployed.contractInstance.address
    

    // Fetch the latest state of the token contract, `mut balance` should have change
    const walphe = Walphle.at(walpheContractAddress)
    let state = await walphe.fetchState()
    console.log(state.fields)

    // Subscribe the contract events from index 0
    const subscription =  walphe.subscribePoolCloseEvent(subscribeOptions, 0)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const numEventsClosePool = events.length
    // Submit a transaction to use the transaction script
    // It uses our `wallet` to sing the transaction.
    const timeout = setInterval(async function() {
        let state = await walphe.fetchState()
        const numEventsClosePool = events.length

        if(events.length > numEventsClosePool || (state.fields.balance >= state.fields.poolSize && !state.fields.open) ) {
            //clearInterval(timeout)
            state = await walphe.fetchState()
            const attendees = state.fields.attendees
            const winner = attendees[Math.floor(Math.random() * attendees.length)]

            console.log("Distribution started")
            const distributionTX = await Distribute.execute(wallet, {
                initialFields: { walpheContract: walpheContractId, winner: winner },
                attoAlphAmount: DUST_AMOUNT
              })
              console.log("Winner: "+winner)
              console.log("Waiting for tx distribution "+distributionTX.txId)

              await waitTxConfirmed(nodeProvider,distributionTX.txId,2,500)

     
        }
    }, 60000)

    console.log("Wait for close event")
    timeout
    // Unsubscribe
    subscription.unsubscribe()
 
    state = await walphe.fetchState()

    console.log(state.fields)

    // Fetch wallet balance see if token is there
    const balance = await wallet.nodeProvider.addresses.getAddressesAddressBalance(walpheContractAddress)
    console.log(balance)

  } else {
    console.log('`deployed` is undefined')
  }
}


distribute()