import { Configuration } from '@alephium/cli'

export type Settings = {}

const configuration: Configuration<Settings> = {
  networks: {
    testnet: {
      //Make sure the two values match what's in your devnet configuration
      nodeUrl: 'http://127.0.0.1:12973',
      networkId: 1
    }
  }
}

export default configuration