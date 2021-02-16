const { ethers } = require('hardhat')
const { signInvoice } = require('./signatrue')
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
const EthUtils = ethers.utils

async function main () {
  const [admin, , supplier, anchor] = await ethers.getSigners()

  const TWO = BigNumber.from(2)
  const now = BigNumber.from(await utils.getCurrentTimestamp())
  const time = now.mul(TWO.pow(128)).add(now).add(1000000)
  const negoResult = {
    txAmount: 100000,
    time: time,
    interest: '0.05',
    pdfhash: 'Invoice pdf hash',
    numberhash: 'Invoice number hash',
    anchorName: 'Anchor name',
    supplier: supplier.address,
    anchor: anchor.address,
  }
  const adminSig = await signInvoice(
    admin,
    negoResult.txAmount,
    negoResult.time,
    negoResult.interest,
    negoResult.pdfhash,
    negoResult.numberhash,
    negoResult.anchorName,
    negoResult.supplier,
    negoResult.anchor,
  )

  const web3provider = new Web3HttpProvider(url)
  const gsnProvider = await RelayProvider.newProvider({
    provider: web3provider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: paymasterAddr,
    },
  }).init()

  const supplierWallet = getWallet(2)
  gsnProvider.addAccount(supplierWallet.privateKey)

  const provider = new ethers.providers.Web3Provider(gsnProvider)

  const invoiceFactroyUpgrade = new ethers.Contract(invoiceFactoryAddr, invoiceFactoryAbi, provider)
  await invoiceFactroyUpgrade.connect(provider.getSigner(supplier.address)).uploadInvoice(
    100000,
    time,
    EthUtils.formatBytes32String('0.05'),
    EthUtils.formatBytes32String('Invoice pdf hash'),
    EthUtils.formatBytes32String('Invoice number hash'),
    EthUtils.formatBytes32String('Anchor name'),
    anchor.address,
    adminSig,
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
