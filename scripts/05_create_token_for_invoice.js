const { ethers } = require('hardhat')
const hre = require('hardhat')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('../build/InvoiceFactory.json')

const url = hre.network.config.url

async function main () {
  const [admin] = await ethers.getSigners()

  const web3provider = new Web3HttpProvider(url)
  const gsnProvider = await RelayProvider.newProvider({
    provider: web3provider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: paymasterAddr,
    },
  }).init()

  const adminWallet = getWallet(0)
  gsnProvider.addAccount(adminWallet.privateKey)

  const provider = new ethers.providers.Web3Provider(gsnProvider)

  const invoiceFactroy = await ethers.getContractAt('InvoiceFactoryUpgrade', invoiceFactoryAddr)
  const invoiceToToken = await invoiceFactroy.connect(provider.getSigner(admin.address)).invoiceToToken(0)
  console.log('Create token for invoice: ', invoiceToToken.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
