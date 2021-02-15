const { ethers, upgrades } = require('hardhat')
const deployed = require('./build')
require('dotenv').config()

const relayHubAddress = process.env.RELAYHUB
const forwarderAddress = process.env.FORWARDER

async function main () {
  const [admin] = await ethers.getSigners()

  const whitelistF = await ethers.getContractFactory('Whitelist', admin)

  let whitelist = await whitelistF.deploy(admin.address)
  await whitelist.deployed()
  await whitelist.addWhitelist(trust.address)
  await whitelist.setRelayHub(relayHubAddress)
  await whitelist.setTrustedForwarder(forwarderAddress)
  deployed.:

  const tokenF = await ethers.getContractFactory('TokenFactory', admin)
  let tokenFactory = await tokenF.deploy(forwarderAddress)
  await tokenFactory.deployed()

  const initData = [3, admin.address , forwarderAddress]
  const invoiceF = await ethers.getContractFactory('InvoiceFactoryUpgrade', admin)
  //invoiceFactory = await invoiceF.deploy(3, admin.address, forwarderAddress)
  let invoiceFactory = await upgrades.deployProxy(
    invoiceF,
    initData,
    { initializer: '__initialize'}
  )
  await invoiceFactory.deployed()

  /*  const tokenFM = await ethers.getContractFactory('TokenFactoryMock', admin)
  tokenFactory = await tokenFM.deploy(forwarderAddress)
  await tokenFactory.deployed()
  const invoiceFM = await ethers.getContractFactory('InvoiceFactoryMock', admin)
  invoiceFactory = await invoiceFM.deploy(admin.address, forwarderAddress)
  await invoiceFactory.deployed()*/

  const tx = await admin.sendTransaction({
    from: admin.address,
    to: whitelist.address,
    value: ethers.utils.parseEther('1'),
  })
  await tx.wait(1)

  console.log('Whitelist address: ', whitelist.address) 
  console.log('TokenFactory address: ', tokenFactory.address)
  console.log('InvoiceFactory proxy address: ', invoiceFactory.address)
  //console.log("TokenFactoryMock address: ", tokenFM.address)
  //console.log("InvoiceFacotryMock address ", invoiceFM.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
