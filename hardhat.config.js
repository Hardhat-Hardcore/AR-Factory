require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-web3")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-contract-sizer")
require("hardhat-spdx-license-identifier")
require("solidity-coverage")
require("@openzeppelin/hardhat-upgrades")
require('dotenv').config()

const mnemonic = process.env.MNEMONIC || "test test test test test test test test test test test junk"
const scanApiKey = process.env.SCAN_API_KEY

/**
 * @type import("hardhat/config").HardhatUserConfig
 */
module.exports = {
  networks: {
    hardhat: {
      accounts: {
        mnemonic: mnemonic,
        path: "m/44'/60'/0'/0",
      }
    },
    bsc_testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {
        mnemonic: mnemonic,
        path: "m/44'/60'/0'/0",
      }
    },
    forking: {
      url: "https://eth-mainnet.alchemyapi.io/v2/wOanzc8-3oDY4oNTJxmbwuijaJ6QILFH",
    },
  },
  solidity: {
    version: "0.8.0",
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
  }
}
