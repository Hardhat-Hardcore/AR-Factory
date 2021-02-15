const { ethers, upgrades } = require('hardhat')
const chai = require('chai')
const expect = chai.expect
const ChaiAsPromised = require('chai-as-promised')
const BigNumber = ethers.BigNumber
const EthUtils = ethers.utils
const utils = require('./utils')
chai.use(ChaiAsPromised)

describe('InvoiceFactoryUpgradeable', () => {
  let admin, trust, user1, user2, forwarder
  let whitelist
  let Whitelist
  let tokenFactory
  let invoiceFactoryUpgrade 
  let invoiceFactoryUpgradeNew
  let invoiceTime, dueTime
  let startTime, endTime

  const TWO = BigNumber.from(2)

  beforeEach(async () => {
    [admin, trust, user1, user2, forwarder] = await ethers.getSigners()

    Whitelist = await ethers.getContractFactory('Whitelist')
    whitelist = await Whitelist.deploy()
    await whitelist.deployed()
    await whitelist.addWhitelist(trust.address)

    const TokenFactory = await ethers.getContractFactory('TokenFactory')
    tokenFactory = await TokenFactory.deploy(forwarder.address)
    await tokenFactory.deployed()

    const initData = [3, trust.address, forwarder.address, tokenFactory.address, whitelist.address]
    const InvoiceFactoryUpgrade = await ethers.getContractFactory('InvoiceFactoryUpgrade')
    invoiceFactoryUpgrade = await upgrades.deployProxy(
      InvoiceFactoryUpgrade,
      initData,
      { initializer: '__initialize'}
    )
    await invoiceFactoryUpgrade.deployed()

    // enroll anchor and supplier
    await whitelist.addAdmin(invoiceFactoryUpgrade.address)
    await invoiceFactoryUpgrade.enrollAnchor(user1.address)
    await invoiceFactoryUpgrade.enrollSupplier(user2.address)

    // trust verify anchor and supplier
    await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
    await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)

    // admin sign supplier data
    let now = BigNumber.from(await utils.getCurrentTimestamp())
    invoiceTime = now
    dueTime = now.add(1000000)
    let time = invoiceTime.mul(TWO.pow(128)).add(dueTime)

    startTime = now.add(100)
    endTime = now.add(1000000)

    const sig = await utils.signInvoice(
      admin,
      100000,
      time,
      '0.05',
      'Invoice pdf hash',
      'Invoice number hash',
      'anchor hash',
      user2.address,
      user1.address,
      true
    )
    await invoiceFactoryUpgrade.connect(user2).uploadInvoice(
      100000,
      time,
      EthUtils.formatBytes32String('0.05'),
      EthUtils.formatBytes32String('Invoice pdf hash'),
      EthUtils.formatBytes32String('Invoice number hash'),
      EthUtils.formatBytes32String('anchor hash'),
      user1.address,
      true,
      sig
    )
    await invoiceFactoryUpgrade.connect(user1).anchorVerifyInvoice(0)
    await invoiceFactoryUpgrade.invoiceToToken(0) 
    await invoiceFactoryUpgrade.connect(trust).setTimeInterval(0, startTime, endTime)
  })

  describe('InvoiceFactoryUpgrade functions behavior after proxyUpgrade', () => {
    beforeEach(async () => {
      const InvoiceFactoryUpgradeNew = await ethers.getContractFactory('InvoiceFactoryUpgradeNew')
      invoiceFactoryUpgradeNew = await upgrades.upgradeProxy(
        invoiceFactoryUpgrade.address,
        InvoiceFactoryUpgradeNew
      )
      await invoiceFactoryUpgradeNew.deployed()
    })

    it('should be able to hold the same data as before', async () => {
      const ret = await invoiceFactoryUpgradeNew.queryInvoice(0)
      expect(ret[0]).to.be.eql(BigNumber.from(0))
      expect(ret[1]).to.be.eql(invoiceTime)
      expect(ret[2]).to.be.eql(BigNumber.from(100000))
      expect(ret[3]).to.be.eql(dueTime)
      expect(ret[4]).to.be.eql(EthUtils.formatBytes32String('Invoice pdf hash'))
      expect(ret[5]).to.be.eql(EthUtils.formatBytes32String('Invoice number hash'))
      expect(ret[6]).to.be.eql(EthUtils.formatBytes32String('anchor hash'))
    })

    it('should be able to call new logic function', async () => {
      const TokenFactory = await ethers.getContractFactory('TokenFactory')
      const newTokenFactory = await TokenFactory.deploy(forwarder.address)
      await newTokenFactory.deployed()
      const newWhitelist = await Whitelist.deploy()
      await newWhitelist.deployed()

      await invoiceFactoryUpgradeNew.newTokenFactoryWhitelist(newTokenFactory.address, newWhitelist.address)

      const updatedTokenFactory = await invoiceFactoryUpgradeNew.tokenFactory()
      const updatedWhitelist = await invoiceFactoryUpgrade.whitelist()

      expect(updatedTokenFactory).to.be.eql(newTokenFactory.address)
      expect(updatedWhitelist).to.be.eql(newWhitelist.address)
    })

    it('should be able to call old logic function', async () => {
      await whitelist.addAdmin(invoiceFactoryUpgradeNew.address)
      // trust verify anchor and supplier
      await invoiceFactoryUpgradeNew.connect(trust).trustVerifyAnchor(user1.address)
      await invoiceFactoryUpgradeNew.connect(trust).trustVerifySupplier(user2.address)
      // admin sign supplier data
      let now = BigNumber.from(await utils.getCurrentTimestamp())
      invoiceTime = now
      dueTime = now.add(1000000)
      let time = invoiceTime.mul(TWO.pow(128)).add(dueTime)

      startTime = now.add(100)
      endTime = now.add(1000000)
      const sig = await utils.signInvoice(
        admin,
        100000,
        time,
        '0.05',
        'Invoice pdf hash No.1',
        'Invoice number hash No.1',
        'anchor hash 1',
        user2.address,
        user1.address,
        true
      )
      await invoiceFactoryUpgradeNew.connect(user2).uploadInvoice(
        100000,
        time,
        EthUtils.formatBytes32String('0.05'),
        EthUtils.formatBytes32String('Invoice pdf hash No.1'),
        EthUtils.formatBytes32String('Invoice number hash No.1'),
        EthUtils.formatBytes32String('anchor hash 1'),
        user1.address,
        true,
        sig
      )
      await invoiceFactoryUpgradeNew.connect(user1).anchorVerifyInvoice(1)
      await invoiceFactoryUpgradeNew.invoiceToToken(1) 
      await invoiceFactoryUpgradeNew.connect(trust).setTimeInterval(1, startTime, endTime)
      const invoiceData = await invoiceFactoryUpgradeNew.queryInvoice(1)

      expect(invoiceData[0]).to.be.eql(BigNumber.from(1))
      expect(invoiceData[1]).to.be.eql(invoiceTime)
      expect(invoiceData[2]).to.be.eql(BigNumber.from(100000))
      expect(invoiceData[3]).to.be.eql(dueTime)
      expect(invoiceData[4]).to.be.eql(EthUtils.formatBytes32String('Invoice pdf hash No.1'))
      expect(invoiceData[5]).to.be.eql(EthUtils.formatBytes32String('Invoice number hash No.1'))
      expect(invoiceData[6]).to.be.eql(EthUtils.formatBytes32String('anchor hash 1'))
    })
  })
})

