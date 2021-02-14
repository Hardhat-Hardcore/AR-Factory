const { ethers, upgrades } = require('hardhat')
const chai = require('chai')
const expect = chai.expect
const ChaiAsPromised = require('chai-as-promised')
const BigNumber = ethers.BigNumber
const EthUtils = ethers.utils
const utils = require('./utils')
chai.use(ChaiAsPromised)

describe('InvoiceFactoryUpgrade', () => {
  let admin, trust, trust2, user1, user2, user3, trustF
  let whitelist
  let Whitelist
  let tokenFactory
  let TokenFactory
  let invoiceFactoryUpgrade 
  let InvoiceFactoryUpgradeNew
  let invoiceFactoryUpgradeNew
  let invoiceTime
  let dueTime
  beforeEach(async () => {
    [admin, trust, trust2, user1, user2, user3, trustF] = await ethers.getSigners()
        
    Whitelist = await ethers.getContractFactory('Whitelist')
    whitelist = await Whitelist.deploy(trust.address)
    await whitelist.deployed()

    TokenFactory = await ethers.getContractFactory('TokenFactory')
    tokenFactory = await TokenFactory.deploy(user2.address)
    await tokenFactory.deployed()

    const initData = [3, trust.address, trustF.address, tokenFactory.address, whitelist.address]
    const InvoiceFactoryUpgrade = await ethers.getContractFactory('InvoiceFactoryUpgrade')
    invoiceFactoryUpgrade = await upgrades.deployProxy(
      InvoiceFactoryUpgrade,
      initData,
      { initializer: '__initialize'}
    )
    await invoiceFactoryUpgrade.deployed()
    // enroll anchor and supplier
    await whitelist.addAdmin(admin.address)
    await whitelist.addAdmin(invoiceFactoryUpgrade.address)
    await invoiceFactoryUpgrade.enrollAnchor(user1.address)
    await invoiceFactoryUpgrade.enrollSupplier(user2.address)
    // trust verify anchor and supplier
    await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
    await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
    // admin sign supplier data
    let now = BigNumber.from(parseInt(Date.now() / 1000))
    let two = BigNumber.from(2)
    let time = now.mul(two.pow(128)).add(now).add(1000000)

    invoiceTime = now
    dueTime = now.add(1000000)
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
    await invoiceFactoryUpgrade.connect(trust).setTimeInterval(0, invoiceTime + 1000, dueTime + 10000000)
  })

  describe('InvoiceFactoryUpgrade functions behavior after proxyUpgrade.', () => {

    beforeEach(async () => {
      InvoiceFactoryUpgradeNew = await ethers.getContractFactory('InvoiceFactoryUpgradeNew')
      invoiceFactoryUpgradeNew = await upgrades.upgradeProxy(
        invoiceFactoryUpgrade.address,
        InvoiceFactoryUpgradeNew
      )
    })

    it('should be able to hold the same data as before.', async () => {
      const ret = await invoiceFactoryUpgradeNew.queryInvoice(0)
      expect(ret[0]).to.be.eql(BigNumber.from(0))
      expect(ret[1]).to.be.eql(invoiceTime)
      expect(ret[2]).to.be.eql(BigNumber.from(100000))
      expect(ret[3]).to.be.eql(dueTime)
      expect(ret[4]).to.be.eql(EthUtils.formatBytes32String('Invoice pdf hash'))
      expect(ret[5]).to.be.eql(EthUtils.formatBytes32String('Invoice number hash'))
      expect(ret[6]).to.be.eql(EthUtils.formatBytes32String('anchor hash'))
    })

    it('should be able to call new logic function.', async () => {
      const curTokenFactory = await invoiceFactoryUpgradeNew.tokenFactory()
      const curWhitelist = await invoiceFactoryUpgradeNew.whitelist()
      const updateTokenFactory = await TokenFactory.deploy(user1.address)
      await updateTokenFactory.deployed()
      const updateWhitelist = await  Whitelist.deploy(trust.address)
      await updateWhitelist.deployed()
      await invoiceFactoryUpgradeNew.newTokenFactoryWhitelist(updateTokenFactory.address, updateWhitelist.address)
      const newTokenFactory = await invoiceFactoryUpgradeNew.tokenFactory()
      const newWhitelist = await invoiceFactoryUpgrade.whitelist()
      expect(curTokenFactory).to.be.not.eql(newTokenFactory)
      expect(curWhitelist).to.be.not.eql(newWhitelist)
    })

    it('should be able to call old logic function.', async () => {
      await whitelist.addAdmin(invoiceFactoryUpgradeNew.address)
      // trust verify anchor and supplier
      await invoiceFactoryUpgradeNew.connect(trust).trustVerifyAnchor(user1.address)
      await invoiceFactoryUpgradeNew.connect(trust).trustVerifySupplier(user2.address)
      // admin sign supplier data
      let now = BigNumber.from(parseInt(Date.now() / 1000))
      let two = BigNumber.from(2)
      let time = now.mul(two.pow(128)).add(now).add(1000000)

      invoiceTime = now
      dueTime = now.add(1000000)
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
      await invoiceFactoryUpgradeNew.connect(trust).setTimeInterval(1, invoiceTime + 1000, dueTime + 10000000)
      const invoiceData = await invoiceFactoryUpgradeNew.queryInvoice(1)
      expect(invoiceData[0]).to.be.eql(BigNumber.from(1))
      expect(invoiceData[1]).to.be.eql(BigNumber.from(invoiceTime))
      expect(invoiceData[2]).to.be.eql(BigNumber.from(100000))
      expect(invoiceData[3]).to.be.eql(BigNumber.from(dueTime))
      expect(invoiceData[4]).to.be.eql(EthUtils.formatBytes32String('Invoice pdf hash No.1'))
      expect(invoiceData[5]).to.be.eql(EthUtils.formatBytes32String('Invoice number hash No.1'))
      expect(invoiceData[6]).to.be.eql(EthUtils.formatBytes32String('anchor hash 1'))
    })
  })
})



