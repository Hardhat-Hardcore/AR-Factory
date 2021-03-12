const { ethers } = require('hardhat')
const hre = require('hardhat')
const { signInvoice } = require('./signatrue')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('../build/InvoiceFactory.json')
require('dotenv').config({ path: require('find-config')('.env') })

const url = hre.network.config.url

const BigNumber = ethers.BigNumber
const EthUtils = ethers.utils

async function main () {
  const [admin, , supplier, anchor] = await ethers.getSigners()

  const TWO = BigNumber.from(2)
  const invoiceTime = BigNumber.from(123456)
  const dueDate = BigNumber.from(1234567)
  const time = invoiceTime.mul(TWO.pow(128)).add(dueDate)

  const negotiationResult = {
    txAmount: 100000,
    time: time,
    interest: '0.05',
    pdfhash: 'Invoice pdf hash',
    numberhash: 'Invoice number hash',
    anchorName: 'Anchor name hash',
    supplier: supplier.address,
    anchor: anchor.address,
  }

  const adminSig = await signInvoice(
    admin,
    negotiationResult.txAmount,
    negotiationResult.time,
    negotiationResult.interest,
    negotiationResult.pdfhash,
    negotiationResult.numberhash,
    negotiationResult.anchorName,
    negotiationResult.supplier,
    negotiationResult.anchor,
  )

  const web3provider = new Web3HttpProvider(url)
  const gsnProvider = await RelayProvider.newProvider({
    provider: web3provider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: paymasterAddr,
      preferredRelays: hre.network.config.relayerUrl ? [hre.network.config.relayerUrl] : [],
    },
  }).init()

  const supplierWallet = getWallet(2)
  gsnProvider.addAccount(supplierWallet.privateKey)

  const provider = new ethers.providers.Web3Provider(gsnProvider)

  const invoiceFactroy = await ethers.getContractAt('InvoiceFactoryUpgrade', invoiceFactoryAddr)
  const uploadInvoice = await invoiceFactroy.connect(provider.getSigner(supplier.address)).uploadInvoice(
    100000,
    time,
    EthUtils.formatBytes32String('0.05'),
    EthUtils.formatBytes32String('Invoice pdf hash'),
    EthUtils.formatBytes32String('Invoice number hash'),
    EthUtils.formatBytes32String('Anchor name hash'),
    anchor.address,
    adminSig,
  )
  console.log('Upload Invoice: ', uploadInvoice.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
