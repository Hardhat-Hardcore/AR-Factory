const { ethers } = require('hardhat')
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

async function main () {
  const [, trust] = await ethers.getSigners()

  const now = BigNumber.from(await utils.getCurrentTimestamp())

  const invoiceTime = now
  const dueTime = now.add(1000000)

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

  const invoiceFactroyUpgrade = new ethers.Contract(invoiceFactoryAddr, invoiceFactoryAbi, provider)
  const setTimeInterval = await invoiceFactroyUpgrade.connect(provider.getSigner(trust.address)).setTimeInterval(
    0, invoiceTime + 1000, dueTime + 10000000,
  )
  console.log('Trust set time interval: ', setTimeInterval.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
