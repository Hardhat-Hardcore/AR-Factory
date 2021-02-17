const { ethers } = require('hardhat')
const hre = require('hardhat')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: tokenFactoryAddr } = require('../build/TokenFactory.json')

const url = hre.network.config.url

async function main () {
  const [, trust, , , other] = await ethers.getSigners()

  const web3provider = new Web3HttpProvider(url)
  const gsnProvider = await RelayProvider.newProvider({
    provider: web3provider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: paymasterAddr,
    },
  }).init()

  const adminWallet = getWallet(1)
  gsnProvider.addAccount(adminWallet.privateKey)

  const provider = new ethers.providers.Web3Provider(gsnProvider)

  const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddr)
  const tx = await tokenFactory.connect(provider.getSigner(trust.address)).recordingTransferFrom(
    trust.address, other.address, 1, 10
  )
  console.log('Transfer recording token from:', trust.address, ', to:', other.address)
  console.log('Transaction Hash:', tx.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
