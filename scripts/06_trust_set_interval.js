const { ethers } = require('hardhat')
const hre = require('hardhat')
const utils = require('../test/utils')
const { RelayProvider } = require('@opengsn/gsn')
const { getWallet } = require('../test/utils')
const Web3HttpProvider = require('web3-providers-http')
const { address: paymasterAddr } = require('../build/Whitelist.json')
const { address: invoiceFactoryAddr } = require('../build/InvoiceFactory.json')

const url = hre.network.config.url

const BigNumber = ethers.BigNumber

async function main () {
  const [, trust] = await ethers.getSigners()

  const now = BigNumber.from(await utils.getCurrentTimestamp())

  const startTime = now.add(90)
  const endTime = now.add(1000000)

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

  const invoiceFactory = await ethers.getContractAt('InvoiceFactoryUpgrade', invoiceFactoryAddr)
  const setTimeInterval = await invoiceFactory.connect(provider.getSigner(trust.address)).setTimeInterval(
    0, startTime, endTime,
  )
  console.log('Trust set time interval: ', setTimeInterval.hash)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
