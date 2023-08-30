import { Configuration } from '@alephium/cli'
import { PrivateKeyWallet } from '@alephium/web3-wallet'
import * as dotenv from 'dotenv'

export type Settings = {}

dotenv.config()
console.log()
const configuration: Configuration<Settings> = {
  networks: {
    testnet: {
      nodeUrl: 'https://wallet.testnet.alephium.org',
      settings: {
        privateKeys: []
      },
      privateKeys: process.env.PRIVKEY_TESTNET.split(',')  //to pass the test uncomment
    },
    mainnet: undefined,
    devnet: {//Make sure the two values match what's in your devnet configuration
    nodeUrl: 'http://127.0.0.1:22973',
    settings: {
      privateKeys: []
    },
    privateKeys: process.env.PRIVKEY_DEVNET !== undefined ? process.env.PRIVKEY_DEVNET.split(',') : process.env.PRIVKEY_DEVNET_TEST.split(',')  //to pass the test uncomment
    
  }
  }
}

export default configuration
