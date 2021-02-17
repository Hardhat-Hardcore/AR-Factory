const fs = require('fs')
const { ethers, upgrades } = require('hardhat')
const utils = require('../test/utils')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('../build/InvoiceFactory.json')
require('dotenv').config({ path: require('find-config')('.env') })

const url = hre.network.config.url

const BigNumber = ethers.BigNumber

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

  const adminWallet = getWallet(1)
  gsnProvider.addAccount(adminWallet.privateKey)

  const provider = new ethers.providers.Web3Provider(gsnProvider)

  console.log('Deploying InvoiceFactory...')
  console.log('===========================')
  const InvoiceFactoryUpgradeNew = await ethers.getContractFactory('InvoiceFactoryUpgradeNew')
  const invoiceFactoryUpgradeNew = await upgrades.upgradeProxy(
    invoiceFactoryAddr,
    InvoiceFactoryUpgradeNew
  )
  console.log(invoiceFactoryUpgradeNew)
  await invoiceFactoryUpgradeNew.deployed()

  console.log("New InvoiceFactory address:", invoiceFactoryUpgradeNew.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
