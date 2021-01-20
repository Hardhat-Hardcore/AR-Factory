require("@nomiclabs/hardhat-waffle")
require('hardhat-contract-sizer')
require('hardhat-spdx-license-identifier')
require("solidity-coverage")

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
	networks: {
		localhost: {
			url: "http://127.0.0.1:8545",
			accounts: [
				"0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
				"0x9c50ad240ce6754cd811acc24ee64e00055ec8c00ce33a2f7106ac27056c74eb",
				"0x1b836492a0524013e039b94184be9fead819053e32979d9d672e534b6c9740b9"
			],
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
