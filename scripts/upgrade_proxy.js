const hre = require('hardhat')
const { ethers, upgrades } = require('hardhat')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('../build/InvoiceFactory.json')


async function main () {
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
