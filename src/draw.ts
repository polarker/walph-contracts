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
import { Destroy, Draw, Walph, WalphTimed, WalphTimedTypes, WithdrawFees } from "../artifacts/ts";

// The `TokenFaucetTypes.WithdrawEvent` is generated in the getting-started guide

async function draw(privKey: string, group: number, contractName: string) {

  Project.build();
  const wallet = new PrivateKeyWallet({
    privateKey: privKey,
    keyType: undefined,
    nodeProvider: web3.getCurrentNodeProvider(),
  });

  //.deployments contains the info of our `TokenFaucet` deployement, as we need to now the contractId and address
  //This was auto-generated with the `cli deploy` of our `scripts/0_deploy_faucet.ts`
  const deployments = await Deployments.from(
    "./artifacts/.deployments." + networkToUse + ".json"
  );
  //Make sure it match your address group
  const accountGroup = group;
  const deployed = deployments.getDeployedContractResult(
    accountGroup,
    contractName
  );
  const walpheContractId = deployed.contractInstance.contractId;
  const walpheContractAddress = deployed.contractInstance.address;
  let drawInProgress = false

  const drawChecker = async function() {
    const balanceContract = await nodeProvider.addresses.getAddressesAddressBalance(walpheContractAddress)
    console.log(walpheContractAddress+" - Balance contract is " + balanceContract.balanceHint )

    const WalphState = WalphTimed.at(walpheContractAddress)

    const initialState = await WalphState.fetchState()
    console.log(walpheContractAddress + " - Next draw: "+ new Date(Number(initialState.fields.drawTimestamp)))
    if (initialState.fields.drawTimestamp <= Date.now() && !drawInProgress){
        drawInProgress = true
    const txDraw = await Draw.execute(wallet, {
      initialFields: { walphContract: walpheContractId},
      attoAlphAmount: 10n + 8n * DUST_AMOUNT,
    });
    console.log(walpheContractAddress+" - "+"Draw tx: "+ txDraw.txId)
    await waitTxConfirmed(nodeProvider, txDraw.txId,1 ,10000 )

    drawInProgress = false
    console.log(walpheContractAddress + " drawn")
    
  }

    setTimeout(drawChecker, Number(initialState.fields.drawTimestamp) - Date.now());
}

drawChecker()

    
}


const networkToUse = "devnet";
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
  draw(configuration.networks[networkToUse].privateKeys[group], group, "WalphTimed");

});
