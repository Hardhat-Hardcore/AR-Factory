const hre = require('hardhat')
const { ethers, upgrades } = require('hardhat')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('../build/InvoiceFactory.json')
require('dotenv').config({ path: require('find-config')('.env') })

const url = hre.network.config.url

async function main () {
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

  console.log('Deploying InvoiceFactory...')
  console.log('===========================')
  const InvoiceFactoryUpgradeNew = await ethers.getContractFactory('InvoiceFactoryUpgradeNew')
  const invoiceFactoryUpgradeNew = await upgrades.upgradeProxy(
    invoiceFactoryAddr,
    InvoiceFactoryUpgradeNew
  )
  console.log(invoiceFactoryUpgradeNew)
  await invoiceFactoryUpgradeNew.deployed()

  console.log('New InvoiceFactory address:', invoiceFactoryUpgradeNew.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
