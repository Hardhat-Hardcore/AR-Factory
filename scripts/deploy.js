const { ethers } = require("hardhat");
require('dotenv').config()

const relayHubAddress = process.env.RELAYHUB
const forwarderAddress = process.env.FORWARDER

async function main () {
  const [admin] = await ethers.getSigners()

  const whitelistF = await ethers.getContractFactory('Whitelist', admin)
  whitelist = await whitelistF.deploy(admin.address)
  await whitelist.deployed()
  await whitelist.setRelayHub(relayHubAddress)
  await whitelist.setTrustedForwarder(forwarderAddress)
  await whitelist.addWhitelist(admin.address)

  const tokenF = await ethers.getContractFactory('TokenFactory', admin)
  tokenFactory = await tokenF.deploy(forwarderAddress)
  await tokenFactory.deployed()

  const invoiceF = await ethers.getContractFactory('InvoiceFactory', admin)
  invoiceFactory = await invoiceF.deploy(admin.address, forwarderAddress)
  await invoiceFactory.deployed()

  const tokenFM = await ethers.getContractFactory('TokenFactoryMock', admin)
  tokenFactory = await tokenFM.deploy(forwarderAddress)
  await tokenFactory.deployed()

  const invoiceFM = await ethers.getContractFactory('InvoiceFactoryMock', admin)
  invoiceFactory = await invoiceFM.deploy(admin.address, forwarderAddress)
  await invoiceFactory.deployed()

  const tx = await admin.sendTransaction({
    from: admin.address,
    to: whitelist.address,
    value: ethers.utils.parseEther('1'),
  })
  await tx.wait(1)

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  })