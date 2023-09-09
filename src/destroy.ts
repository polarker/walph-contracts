import { Deployments, waitTxConfirmed } from "@alephium/cli";
import {
  DUST_AMOUNT,
  web3,
  Project,
  NodeProvider,
  SignerProvider,
  Contract,
  ONE_ALPH,
} from "@alephium/web3";
import { PrivateKeyWallet } from "@alephium/web3-wallet";
import configuration from "../alephium.config";
import { Destroy, Provision, Walph, WalphTypes } from "../artifacts/ts";

// The `TokenFaucetTypes.WithdrawEvent` is generated in the getting-started guide
const events: WalphTypes.PoolCloseEvent[] = [];
const subscribeOptions = {
  // It will check for new events from the full node every `pollingInterval`
  pollingInterval: 40000,
  // The callback function will be called for each event
  messageCallback: (event: WalphTypes.PoolCloseEvent): Promise<void> => {
    events.push(event);
    return Promise.resolve();
  },
  // This callback function will be called when an error occurs
  errorCallback: (
    error: any,
    subscription: { unsubscribe: () => void }
  ): Promise<void> => {
    console.log(error);
    subscription.unsubscribe();
    return Promise.resolve();
  },
};


async function destroy(privKey: string, group: number, contractName: string) {

  Project.build();
  const wallet = new PrivateKeyWallet({
    privateKey: privKey,
    keyType: undefined,
    nodeProvider: web3.getCurrentNodeProvider(),
  });

  //.deployments contains the info of our `TokenFaucet` deployement, as we need to now the contractId and address
  //This was auto-generated with the `cli deploy` of our `scripts/0_deploy_faucet.ts`
  const deployments = await Deployments.from(
    "./to-destroy/.deployments." + networkToUse + ".json"
  );
  //Make sure it match your address group
  const accountGroup = group;
  const deployed = deployments.getDeployedContractResult(
    accountGroup,
    contractName
  );
  const walpheContractId = deployed.contractInstance.contractId;
  const walpheContractAddress = deployed.contractInstance.address;


    const balanceContract = await nodeProvider.addresses.getAddressesAddressBalance(walpheContractAddress)
    console.log(walpheContractAddress+" - Balance contract is " + balanceContract.balanceHint )
    await Destroy.execute(wallet, {
      initialFields: { walphContract: walpheContractId},
      attoAlphAmount:  21n * DUST_AMOUNT,
    });
    console.log(walpheContractAddress + " destroyed")
  console.log("\n")
}


const networkToUse = "testnet";
//Select our network defined in alephium.config.ts
const network = configuration.networks[networkToUse];

//NodeProvider is an abstraction of a connection to the Alephium network
const nodeProvider = new NodeProvider(network.nodeUrl);

//Sometimes, it's convenient to setup a global NodeProvider for your project:
web3.setCurrentNodeProvider(nodeProvider);

const numberOfKeys = configuration.networks[networkToUse].privateKeys.length

Array.from(Array(numberOfKeys).keys()).forEach((group) => {
  //distribute(configuration.networks[networkToUse].privateKeys[group], group, "Walph");
  //distribute(configuration.networks[networkToUse].privateKeys[group], group, "Walph50HodlAlf");
  destroy(configuration.networks[networkToUse].privateKeys[group], group, "Walph");

});
