const fs = require('fs')
const { ethers, upgrades } = require('hardhat')
const utils = require('./utils')
const Forwarder = require('../build/gsn/Forwarder.json')
const RelayHub = require('../build/gsn/RelayHub.json')
const { RELAYHUB, FORWARDER, NETWORK } = process.env
require('dotenv').config({ path: require('find-config')('.env') })

const relayHubAddress = NETWORK === 'localhost' ? RelayHub.address : RELAYHUB
const forwarderAddress = NETWORK === 'localhost' ? Forwarder.address : FORWARDER

const addressToJson = (name, address, txHash) => {
  const jsonString = JSON.stringify({ address, txHash })
  fs.writeFileSync(`./scripts/build/${name}.json`, jsonString)
}

async function main () {
  const [admin, trust] = await ethers.getSigners()

  console.log('Deploying whitelist...')
  console.log('===========================')
  const whitelistF = await ethers.getContractFactory('Whitelist', admin)
  const whitelist = await whitelistF.deploy()
  await whitelist.deployed()
  console.log('Whitelist address: ', whitelist.address)
  console.log('Transaction hash: ', whitelist.deployTransaction.hash)
  const addAdminToWhitelist = await whitelist.addWhitelist(admin.address)
  const addTrustToWhitelist = await whitelist.addWhitelist(trust.address)
  const setRelayHub = await whitelist.setRelayHub(relayHubAddress)
  const setTrustForward = await whitelist.setTrustedForwarder(forwarderAddress)
  console.log('Add admin to whitelist: ', addAdminToWhitelist.hash)
  console.log('Add trust to whitelist: ', addTrustToWhitelist.hash)
  console.log('Set Relay Hub: ', setRelayHub.hash)
  console.log('Set Trust Forward: ', setTrustForward.hash)
  console.log(' ')

  console.log('Deploying TokenFactory...')
  console.log('===========================')
  const tokenF = await ethers.getContractFactory('TokenFactory', admin)
  const tokenFactory = await tokenF.deploy(forwarderAddress)
  await tokenFactory.deployed()
  console.log('TokenFactory address: ', tokenFactory.address)
  console.log('Transaction hash: ', tokenFactory.deployTransaction.hash)
  console.log(' ')

  console.log('Deploying InvoiceFactory...')
  console.log('===========================')
  const initData = [3, trust.address, forwarderAddress, tokenFactory.address, whitelist.address]
  const invoiceF = await ethers.getContractFactory('InvoiceFactoryUpgrade', admin)
  const invoiceFactory = await upgrades.deployProxy(
    invoiceF,
    initData,
    { initializer: '__initialize' },
  )
  await invoiceFactory.deployed()
  console.log('InvoiceFactory address: ', invoiceFactory.address)
  console.log('Transaction hash: ', invoiceFactory.deployTransaction.hash)
  const addInvoiceFactoryToWhitelist = await whitelist.addAdmin(invoiceFactory.address)
  console.log('Add InvoiceFactory to whitelsit: ', addInvoiceFactoryToWhitelist.hash)
  console.log(' ')
  const tx = await admin.sendTransaction({
    from: admin.address,
    to: whitelist.address,
    value: ethers.utils.parseEther('1'),
  })
  await tx.wait(1)

  utils.addressToJson('Whitelist', 'Deploy Whitelist', whitelist.address, whitelist.deployTransaction.hash)
  utils.addressToJson('TokenFactory', 'Deploy TokenFactory', tokenFactory.address, tokenFactory.deployTransaction.hash)
  utils.addressToJson('InvoiceFactory', 'Deploy InvoiceFactory', invoiceFactory.address, invoiceFactory.deployTransaction.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
