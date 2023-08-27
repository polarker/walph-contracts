import { Configuration } from '@alephium/cli'
import { PrivateKeyWallet } from '@alephium/web3-wallet'
import * as dotenv from 'dotenv'

export type Settings = {}

dotenv.config()
const configuration: Configuration<Settings> = {
  networks: {
    testnet: {
      //Make sure the two values match what's in your devnet configuration
      nodeUrl: 'http://127.0.0.1:12973',
      settings: {
        privateKeys: []
      },
      privateKeys: [process.env.PRIVKEY_TESTNET, process.env.PRIVKEY_BUY]
    },
    mainnet: undefined,
    devnet: {//Make sure the two values match what's in your devnet configuration
    nodeUrl: 'http://127.0.0.1:22973',
    settings: {
      privateKeys: []
    },
    privateKeys: [process.env.PRIVKEY_TESTNET]
    //privateKeys: [process.env.PRIVKEY_TESTNET, process.env.PRIVKEY_BUY] to pass the test uncomment
    
  }
  }
}

export default configuration