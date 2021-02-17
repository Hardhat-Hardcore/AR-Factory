const { ethers } = require('hardhat')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('../build/InvoiceFactory.json')

const url = hre.network.config.url

async function main () {
  const [, , , anchor] = await ethers.getSigners()

  const web3provider = new Web3HttpProvider(url)
  const gsnProvider = await RelayProvider.newProvider({
    provider: web3provider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: paymasterAddr,
    },
  }).init()

  const anchorWallet = getWallet(3)
  gsnProvider.addAccount(anchorWallet.privateKey)

  const provider = new ethers.providers.Web3Provider(gsnProvider)

  const invoiceFactroy = await ethers.getContractAt("InvoiceFactoryUpgrade", invoiceFactoryAddr)
  const anchorVerifyInvoice = await invoiceFactroy.connect(provider.getSigner(anchor.address)).anchorVerifyInvoice(0)
  console.log("Anchor Verify Invoice: ", anchorVerifyInvoice.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
