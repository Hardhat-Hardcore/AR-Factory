const { ethers } = require('hardhat')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('./build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('./build/InvoiceFactory.json')
const { abi: invoiceFactoryAbi } = require('../artifacts/contracts/InvoiceFactoryUpgrade.sol/InvoiceFactoryUpgrade.json')
const { NETWORK, BSCTESTNETRPC } = process.env
require('dotenv').config({ path: require('find-config')('.env') })

const url = NETWORK === 'localhost' ? 'http://127.0.0.1:8545' : BSCTESTNETRPC

async function main () {
  const [admin, trust, , anchor] = await ethers.getSigners()

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

  const invoiceFactroyUpgrade = new ethers.Contract(invoiceFactoryAddr, invoiceFactoryAbi, provider)
  const enrollWa = await invoiceFactroyUpgrade.connect(provider.getSigner(admin.address)).enrollAnchor(anchor.address)
  const trustVerifyWa = await invoiceFactroyUpgrade.connect(provider.getSigner(trust.address)).trustVerifyAnchor(anchor.address)
  console.log('Admin enroll anchor: ', enrollWa.hash)
  console.log('Trust Verify anchor: ', trustVerifyWa.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
