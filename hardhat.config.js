require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-web3");
require("hardhat-contract-sizer")
require("hardhat-spdx-license-identifier")
require("solidity-coverage")

/**
 * @type import("hardhat/config").HardhatUserConfig
 */

const mnemonic = process.env.MNEMONIC || "test test test test test test test test test test test junk"

module.exports = {
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
        "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
        "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
      ],
    },
    hardhat: {
      accounts: {
        mnemonic,
        path: "m/44'/60'/0'/0",
        count: 5,
        gasPrice: 0,
        gasLimit: 0x1fffffffffffff,
      }
    },
    forking: {
      url: "https://eth-mainnet.alchemyapi.io/v2/wOanzc8-3oDY4oNTJxmbwuijaJ6QILFH",
    }
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
  }
}
