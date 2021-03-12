const hre = require('hardhat')
const { ethers, upgrades } = require('hardhat')
const utils = require('./utils')
require('dotenv').config({ path: require('find-config')('.env') })

const DECIMALS = 3
const GSN_DEPOSIT = '2'

let relayHubAddress 
let forwarderAddress

if (hre.network.name === 'localhost') {
  relayHubAddress = require('../build/gsn/RelayHub.json').address  
  forwarderAddress = require('../build/gsn/Forwarder.json').address  
} else {
  relayHubAddress = hre.network.config.relayhub
  forwarderAddress = hre.network.config.forwarder
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

  const addTrustToWhitelist = await whitelist.addWhitelist(trust.address)
  // GSN
  const setRelayHub = await whitelist.setRelayHub(relayHubAddress)
  const setTrustForward = await whitelist.setTrustedForwarder(forwarderAddress)

  console.log('Add trust to whitelist: ', addTrustToWhitelist.hash)
  console.log('Set Relay Hub: ', setRelayHub.hash)
  console.log('Set Trust Forwarder: ', setTrustForward.hash)
  console.log(' ')

  console.log('Deploying TokenFactory...')
  console.log('===========================')
  const TokenFactory = await ethers.getContractFactory('TokenFactory', admin)
  const tokenFactory = await TokenFactory.deploy(forwarderAddress)
  await tokenFactory.deployed()
  console.log('TokenFactory address: ', tokenFactory.address)
  console.log('Transaction hash: ', tokenFactory.deployTransaction.hash)
  console.log('')

  console.log('Deploying InvoiceFactory...')
  console.log('===========================')
  const initData = [DECIMALS, trust.address, forwarderAddress, tokenFactory.address, whitelist.address]
  const InvoiceFactory = await ethers.getContractFactory('InvoiceFactoryUpgrade', admin)
  const invoiceFactory = await upgrades.deployProxy(
    InvoiceFactory,
    initData,
    { initializer: '__initialize' },
  )
  await invoiceFactory.deployed()

  console.log('InvoiceFactory address: ', invoiceFactory.address)
  console.log('Transaction hash: ', invoiceFactory.deployTransaction.hash)

  const addInvoiceFactoryToWhitelist = await whitelist.addAdmin(invoiceFactory.address)
  console.log('Add InvoiceFactory to whitelsit: ', addInvoiceFactoryToWhitelist.hash)
  console.log('')

  // GSN
  const tx = await admin.sendTransaction({
    from: admin.address,
    to: whitelist.address,
    value: ethers.utils.parseEther(GSN_DEPOSIT),
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
