const fs = require('fs')
const { ethers, upgrades } = require('hardhat')
const utils = require('../test/utils')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('./build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('./build/InvoiceFactory.json')
const { abi: invoiceFactoryAbi } = require('../artifacts/contracts/InvoiceFactoryUpgrade.sol/InvoiceFactoryUpgrade.json')
const { NETWORK, BSCTESTNETRPC } = process.env
require('dotenv').config({ path: require('find-config')('.env') })

const url = NETWORK === 'localhost' ? 'http://127.0.0.1:8545' : BSCTESTNETRPC

const BigNumber = ethers.BigNumber

const addressToJson = (name, address) => {
  const jsonString = JSON.stringify({ address })
  fs.writeFileSync(`./scripts/build/${name}.json`, jsonString)
}

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

  const InvoiceFactoryUpgradeNew = await ethers.getContractFactory('InvoiceFactoryUpgradeNew')
  const invoiceFactoryUpgradeNew = await upgrades.upgradeProxy(
    invoiceFactoryAddr,
    InvoiceFactoryUpgradeNew
  )
  await invoiceFactoryUpgradeNew.deployed()

  addressToJson('InvoiceFactory', invoiceFactoryUpgradeNew.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
