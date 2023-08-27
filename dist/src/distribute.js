"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("@alephium/cli");
const web3_1 = require("@alephium/web3");
const web3_wallet_1 = require("@alephium/web3-wallet");
const alephium_config_1 = __importDefault(require("../alephium.config"));
const ts_1 = require("../artifacts/ts");
// The `TokenFaucetTypes.WithdrawEvent` is generated in the getting-started guide
const events = [];
const subscribeOptions = {
    // It will check for new events from the full node every `pollingInterval`
    pollingInterval: 50,
    // The callback function will be called for each event
    messageCallback: (event) => {
        events.push(event);
        return Promise.resolve();
    },
    // This callback function will be called when an error occurs
    errorCallback: (error, subscription) => {
        console.log(error);
        subscription.unsubscribe();
        return Promise.resolve();
    }
};
function getCloseEvents(eventsObject) {
    const closeEvents = [];
    for (var event of eventsObject['events']) {
        if (event.eventIndex == 2)
            closeEvents.push(event);
    }
    return closeEvents;
}
async function distribute() {
    //Select our network defined in alephium.config.ts
    const network = alephium_config_1.default.networks.testnet;
    //NodeProvider is an abstraction of a connection to the Alephium network
    const nodeProvider = new web3_1.NodeProvider(network.nodeUrl);
    //Sometimes, it's convenient to setup a global NodeProvider for your project:
    web3_1.web3.setCurrentNodeProvider(nodeProvider);
    //Connect our wallet, typically in a real application you would connect your web-extension or desktop wallet
    const wallet = new web3_wallet_1.PrivateKeyWallet(new web3_wallet_1.PrivateKeyWallet({ privateKey: alephium_config_1.default.networks.testnet.privateKeys[0], keyType: undefined, nodeProvider: web3_1.web3.getCurrentNodeProvider() }));
    // Compile the contracts of the project if they are not compiled
    web3_1.Project.build();
    //.deployments contains the info of our `TokenFaucet` deployement, as we need to now the contractId and address
    //This was auto-generated with the `cli deploy` of our `scripts/0_deploy_faucet.ts`
    const deployments = await cli_1.Deployments.from('./artifacts/.deployments.testnet.json');
    console.log(deployments);
    //Make sure it match your address group
    const accountGroup = 0;
    const deployed = deployments.getDeployedContractResult(accountGroup, 'Walphle');
    if (deployed !== undefined) {
        const walpheContractId = deployed.contractInstance.contractId;
        const walpheContractAddress = deployed.contractInstance.address;
        // Fetch the latest state of the token contract, `mut balance` should have change
        const walphe = ts_1.Walphle.at(walpheContractAddress);
        let state = await walphe.fetchState();
        console.log(state.fields);
        // Subscribe the contract events from index 0
        const subscription = walphe.subscribePoolCloseEvent(subscribeOptions, 0);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const numEventsClosePool = events.length;
        // Submit a transaction to use the transaction script
        // It uses our `wallet` to sing the transaction.
        const timeout = setInterval(async function () {
            let state = await walphe.fetchState();
            if (events.length > numEventsClosePool || (state.fields.balance >= state.fields.poolSize && !state.fields.open)) {
                clearInterval(timeout);
                state = await walphe.fetchState();
                const attendees = state.fields.attendees;
                const winner = attendees[Math.floor(Math.random() * attendees.length)];
                console.log("Distribution started");
                const distributionTX = await ts_1.Distribute.execute(wallet, {
                    initialFields: { walpheContract: walpheContractId, winner: winner },
                    attoAlphAmount: web3_1.DUST_AMOUNT
                });
                console.log("Winner: " + winner);
                console.log("Waiting for tx distribution " + distributionTX.txId);
                await (0, cli_1.waitTxConfirmed)(nodeProvider, distributionTX.txId, 2, 10);
                // Unsubscribe
                subscription.unsubscribe();
            }
        }, 10000);
        console.log("Wait for close event");
        timeout;
        state = await walphe.fetchState();
        console.log(state.fields);
        // Fetch wallet balance see if token is there
        const balance = await wallet.nodeProvider.addresses.getAddressesAddressBalance(walpheContractAddress);
        console.log(balance);
    }
    else {
        console.log('`deployed` is undefined');
    }
}
distribute();
