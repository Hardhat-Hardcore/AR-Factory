const fs = require('fs')
const { ethers, upgrades } = require('hardhat')
const Forwarder = require('../build/gsn/Forwarder.json')
const RelayHub = require('../build/gsn/RelayHub.json')
const { RELAYHUB, FORWARDER, NETWORK } = process.env
require('dotenv').config({ path: require('find-config')('.env') })

const relayHubAddress = NETWORK === 'localhost' ? RelayHub.address : RELAYHUB
const forwarderAddress = NETWORK === 'localhost' ? Forwarder.address : FORWARDER

const addressToJson = (name, address) => {
  const jsonString = JSON.stringify({ address })
  fs.writeFileSync(`./scripts/build/${name}.json`, jsonString)
}

async function main () {
  const [admin, trust] = await ethers.getSigners()
  const whitelistF = await ethers.getContractFactory('Whitelist', admin)
  const whitelist = await whitelistF.deploy()
  await whitelist.deployed()
  await whitelist.addWhitelist(admin.address)
  await whitelist.addWhitelist(trust.address)
  await whitelist.setRelayHub(relayHubAddress)
  await whitelist.setTrustedForwarder(forwarderAddress)

  const tokenF = await ethers.getContractFactory('TokenFactory', admin)
  const tokenFactory = await tokenF.deploy(forwarderAddress)
  await tokenFactory.deployed()

  const initData = [3, trust.address, forwarderAddress, tokenFactory.address, whitelist.address]
  const invoiceF = await ethers.getContractFactory('InvoiceFactoryUpgrade', admin)

  const invoiceFactory = await upgrades.deployProxy(
    invoiceF,
    initData,
    { initializer: '__initialize' },
  )
  await invoiceFactory.deployed()
  const tx = await admin.sendTransaction({
    from: admin.address,
    to: whitelist.address,
    value: ethers.utils.parseEther('1'),
  })
  await tx.wait(1)
  await whitelist.addAdmin(invoiceFactory.address)

  addressToJson('Whitelist', whitelist.address)
  addressToJson('TokenFactory', tokenFactory.address)
  addressToJson('InvoiceFactory', invoiceFactory.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
