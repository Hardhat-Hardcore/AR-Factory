const { ethers } = require('hardhat')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('../build/InvoiceFactory.json')

const url = hre.network.config.url

async function main () {
  const [admin, trust, supplier] = await ethers.getSigners()

  const web3provider = new Web3HttpProvider(url)
  const gsnProvider = await RelayProvider.newProvider({
    provider: web3provider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: paymasterAddr,
    },
  }).init()

  const adminWallet = getWallet(0)
  const trustWallet = getWallet(1)
  gsnProvider.addAccount(adminWallet.privateKey)
  gsnProvider.addAccount(trustWallet.privateKey)

  const provider = new ethers.providers.Web3Provider(gsnProvider)

  const invoiceFactroy = await ethers.getContractAt("InvoiceFactoryUpgrade", invoiceFactoryAddr)

  const enrollWs =
    await invoiceFactroy.connect(provider.getSigner(admin.address)).enrollSupplier(supplier.address)

  const trustVerifyWs =
    await invoiceFactroy.connect(provider.getSigner(trust.address)).trustVerifySupplier(supplier.address)

  console.log('Admin enroll supplier: ', enrollWs.hash)
  console.log('Trust verify supplier: ', trustVerifyWs.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
