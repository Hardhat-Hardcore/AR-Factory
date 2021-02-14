require('@nomiclabs/hardhat-waffle')
require('@nomiclabs/hardhat-web3')
require('@nomiclabs/hardhat-etherscan')
require('hardhat-contract-sizer')
require('hardhat-spdx-license-identifier')
require('hardhat-docgen')
require('solidity-coverage')
require('@openzeppelin/hardhat-upgrades')
require('dotenv').config()

const mnemonic = process.env.MNEMONIC || 'test test test test test test test test test test test junk'
const scanApiKey = process.env.SCAN_API_KEY

/**
 * @type import("hardhat/config").HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      accounts: {
        mnemonic: mnemonic,
        path: 'm/44\'/60\'/0\'/0',
      },
      chainId: 1337
    },
    bscTestnet: {
      url: 'https://data-seed-prebsc-2-s1.binance.org:8545',
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {
        mnemonic: mnemonic,
        path: 'm/44\'/60\'/0\'/0',
      }
    },
    forking: {
      url: 'https://eth-mainnet.alchemyapi.io/v2/wOanzc8-3oDY4oNTJxmbwuijaJ6QILFH',
    },
    ropsten: {
      url: 'https://ropsten.infura.io/v3/5891425d7ae8410f8c2ec2dc8e3238c4',
      accounts: ['3a286a3762e61a28536ed3ae3f1ce0a46f9b036127e7b952c09f7c99bede1a56'],
    }
  },
  solidity: {
    version: '0.8.0',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  spdxLicenseIdentifier: {
    overwrite: true,
    runOnCompile: false,
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: scanApiKey,
  },
  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: false,
  },
}
