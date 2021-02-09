require('dotenv').config()
const { ethers } = require('hardhat')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const bscTestnetRpc = process.env.BSCTESTNETRPC

const paymasterAddr = ""
const contractAddr = ""
const contractAbi = []

/**
 * - Initialize gsn provider
 * - Get the private key of the user in the whitelist
 * - Add the private key to client provider
 * - Interacting with contract without paying gas fee
 */
async function main () {
  const [_, userInWhitelist] = await ethers.getSigners()

  const web3provider = new Web3HttpProvider(bscTestnetRpc)
  const gsnProvider = await RelayProvider.newProvider({
    provider: web3provider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: paymasterAddr
    },
  }).init()

  const walletInWitelist = getWallet(1)
  const privateKey = walletInWitelist.privateKey

  gsnProvider.addAccount(privateKey)
  clientProvider = new ethers.providers.Web3Provider(gsnProvider)

  const contract = new ethers.Contract(contractAddr, contractAbi, clientProvider)
  const contractInstance = contract.connect(clientProvider.getSigner(userInWhitelist.address))

  // await contractInstance.METHOD_NAME(...args)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })