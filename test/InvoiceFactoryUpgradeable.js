const { ethers, web3, upgrades } = require('hardhat')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const utils = require('./utils')
const expect = chai.expect
const BigNumber = ethers.BigNumber
const EthUtils = ethers.utils
chai.use(ChaiAsPromised)

describe('InvoiceFactoryUpgrade', () => {
  let admin, trust, trust2, user1, user2, user3, forwarder
  let whitelist, Whitelist
  let tokenFactory, TokenFactory
  let invoiceFactoryUpgrade 

  beforeEach(async () => {
    [admin, trust, trust2, user1, user2, user3, forwarder] = await ethers.getSigners()
        
    Whitelist = await ethers.getContractFactory('Whitelist')
    whitelist = await Whitelist.deploy(trust.address)
    await whitelist.deployed()

    TokenFactory = await ethers.getContractFactory('TokenFactory')
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
    await whitelist.addAdmin(invoiceFactoryUpgrade.address)
  })

  describe('__initialize', () => {
    it('Should initialize the trust address correctly', async () => {
      const trustAddr = await invoiceFactoryUpgrade.trustAddress()
      expect(trustAddr).to.be.eql(trust.address)
    })

    it('Should not be able to initialize more than once', async () => { 
      const tx = invoiceFactoryUpgrade.__initialize(3, trust2.address, forwarder.address, tokenFactory.address, whitelist.address)
      await expect(tx).to.be.revertedWith('Initializable: contract is already initialized')
    })
  })

  describe('Getter functions', () => {
    it('isAnchor() should return true if the account is Anchor', async () => {
      await invoiceFactoryUpgrade.enrollAnchor(user2.address)
      const ret = await invoiceFactoryUpgrade.isAnchor(user2.address)
      expect(ret).to.be.eql(true)
    })

    it('isAnchor() should return false if the account is not Anchor', async () => {
      const ret = await invoiceFactoryUpgrade.isAnchor(user2.address)
      expect(ret).to.be.eql(false)
    })

    it('isSupplier() should return true if the account is Supplier', async () => {
      await invoiceFactoryUpgrade.enrollSupplier(user2.address)
      const ret = await invoiceFactoryUpgrade.isSupplier(user2.address)
      expect(ret).to.be.eql(true)
    })

    it('isSupplier() should return false if the account is not Supplier', async () => {
      const ret = await invoiceFactoryUpgrade.isSupplier(user2.address)
      expect(ret).to.be.eql(false)
    })
        
    // TODO: check if return value equal to timestamp
    it('queryAnchorVerified() should return true if the account is verified', async () => {
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
      const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user1.address)
      expect(ret).to.be.eql(true)
    })
        
    // TODO: check if return value equal to 0
    it('queryAnchorVerified() should return false if the account is verified', async () => {
      const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user1.address)
      expect(ret).to.be.eql(false)
    })

    // TODO: check if return value equal to timestamp
    it('querySupplierVerified() should return true if the account is verified', async () => {
      await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user1.address)
      const ret = await invoiceFactoryUpgrade.querySupplierVerified(user1.address)
      expect(ret).to.be.eql(true)
    })
        
    // TODO: check if return value equal to 0
    it('queryAnchorVerified() should return false if the account is verified', async () => {
      const ret = await invoiceFactoryUpgrade.querySupplierVerified(user1.address)
      expect(ret).to.be.eql(false)
    })

    // TODO: Rename describe
    describe('This need lot to init', () => {
      beforeEach(async () => { 
        await invoiceFactoryUpgrade.enrollAnchor(user1.address)
        await invoiceFactoryUpgrade.enrollSupplier(user2.address)
        await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
        await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
        let now = BigNumber.from(parseInt(Date.now() / 1000))
        let two = BigNumber.from(2)
        let time = now.mul(two.pow(128)).add(now).add(1000000)

        const sig = await utils.signInvoice(
          user1,
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
      })

      // TODO: It hasn't generate token yet
      it("queryInvoiceId() should return correct invoiceId", async () => {
        const ret = await invoiceFactoryUpgrade.queryInvoiceId(0)
        expect(ret).to.be.eql(BigNumber.from(0))
      })
        
      // TODO: It hasn't generate token yet
      it("queryTokenId() should return correct invoiceId", async () => { 
        const ret = await invoiceFactoryUpgrade.queryInvoiceId(0)
        expect(ret).to.be.eql(BigNumber.from(0))
      })

      // TODO: ret[0 ~ 3]
      it('queryInvoice() should return correct invoice information', async () => {
        const ret = await invoiceFactoryUpgrade.queryInvoice(0)
        expect(ret[4]).to.be.eql(EthUtils.formatBytes32String('Invoice pdf hash'))
        expect(ret[5]).to.be.eql(EthUtils.formatBytes32String('Invoice number hash'))
        expect(ret[6]).to.be.eql(EthUtils.formatBytes32String('anchor'))
      })

      // TODO: ret[0 ~ 1]
      it('queryInvoiceData() should return correct invoice data', async () => {
        const ret = await invoiceFactoryUpgrade.queryInvoiceData(0)
        expect(ret[2]).to.be.eql(EthUtils.formatBytes32String('0.05'))
        expect(ret[3]).to.be.eql(user2.address)
        expect(ret[4]).to.be.eql(user1.address)
        expect(ret[5]).to.be.eql(true)
      })
    })
  })

  describe('Check Authorization', () => {
    it('updateTrustAddress() should revert if the operator isn\'t admin', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).updateTrustAddress(trust2.address)
      await expect(tx).to.be.revertedWith('Restricted to admins.')
    })

    it('updateTokenFactory() should revert if the operator isn\'t admin', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).updateTokenFactory(trust2.address)
      await expect(tx).to.be.revertedWith('Restricted to admins.')
    })

    it('updateWhitelist() should revert if the operator isn\'t admin', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).updateWhitelist(trust2.address)
      await expect(tx).to.be.revertedWith('Restricted to admins.')
    })

    it('enrollAnchor() should revert if the operator isn\'t admin', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).enrollAnchor(trust2.address)
      await expect(tx).to.be.revertedWith('Restricted to admins.')
    })

    it('enrollSupplier() should revert if the operator isn\'t admin', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).enrollSupplier(trust2.address)
      await expect(tx).to.be.revertedWith('Restricted to admins.')
    })

    // TODO: enrollAdmin
    // TODO: removeAdmin

    it('trustVerifyAnchor() should revert if the operator isn\'t trust', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).trustVerifyAnchor(trust2.address)
      await expect(tx).to.be.revertedWith('Restricted to only trust by verify')
    })

    it('trustVerifySupplier() should revert if the operator isn\'t trust', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).trustVerifySupplier(trust2.address)
      await expect(tx).to.be.revertedWith('Restricted to only trust by verify')
    })
        
    it('restoreAccount() should revert if the operator isn\'t admin', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).restoreAccount(user1.address, user2.address)
      await expect(tx).to.be.revertedWith('Restricted to admins.')
    })

    it("anchorVerifyInvoice() should revert if the operator isn't anchor",  async () => {
        const tx = invoiceFactory.connect(user1).anchorVerifyTrust(0)
        await expect(tx).to.be.revertedWith("Restricted to anchor.")
    })
  })

  describe('Update contract addresses', () => {
    it('updateTrustAddress() should be able to update address to a new trustAddress', async () => {
      let curTrustAddress = await invoiceFactoryUpgrade.trustAddress()
      expect(curTrustAddress).to.be.eql(trust.address)
      await invoiceFactoryUpgrade.updateTrustAddress(trust2.address)
      let futureTrustAddress = await invoiceFactoryUpgrade.trustAddress()
      expect(futureTrustAddress).to.be.eql(trust2.address)
    })

    it('updateTokenFactory should be able to update address to a new ITokenFactory', async () => {
      let curUpdateTokenFactory = await invoiceFactoryUpgrade.tokenFactory()
      expect(curUpdateTokenFactory).to.be.eql(tokenFactory.address)
      let newTokenFactory = await TokenFactory.deploy(forwarder.address)
      await invoiceFactoryUpgrade.updateTokenFactory(newTokenFactory.address)
      let nxtTokenFactoryAddress = await invoiceFactoryUpgrade.tokenFactory()
      expect(nxtTokenFactoryAddress).to.be.eql(newTokenFactory.address)
    })

    it('updateWhitelist() should be able to update address to a new IWhitelist', async () => {
      let curWhitelistAddress = await invoiceFactoryUpgrade.whitelist()
      expect(curWhitelistAddress).to.be.eql(whitelist.address)
      const newWhitelist = await Whitelist.deploy(forwarder.address)
      await invoiceFactoryUpgrade.updateWhitelist(newWhitelist.address)
      let nxtWhitelistAddress = await invoiceFactoryUpgrade.whitelist()
      expect(nxtWhitelistAddress).to.be.eql(newWhitelist.address)
    })
  })

  describe('Enroll Anchor', () => {
    // TODO: Not sure what is being tested
    it('should check if whitelist was initialized', async () => {
      const tx1 = invoiceFactoryUpgrade.enrollAnchor(user2.address)
      expect(tx1).to.be.revertedWith('Restricted to admins.')
      await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
      await whitelist.addAdmin(invoiceFactoryUpgrade.address)
      const tx2 = invoiceFactoryUpgrade.enrollAnchor(user2.address)
      expect(tx2).to.be.fulfilled
    })

    it('should revert if the new anchor have already been added to Anchor role', async () => {
      await invoiceFactoryUpgrade.enrollAnchor(user2.address)
      const tx = invoiceFactoryUpgrade.enrollAnchor(user2.address)
      expect(tx).to.be.revertedWith('Duplicated enrollment')
    })

    it('should be added into whitelist', async () => {
      await invoiceFactoryUpgrade.enrollAnchor(user2.address)
      const ret = await whitelist.inWhitelist(user2.address)
      expect(ret).to.be.eql(true)
    })

    it('should add account into anchor', async () => {
      await invoiceFactoryUpgrade.enrollAnchor(user2.address)
      const ret = await invoiceFactoryUpgrade.isAnchor(user2.address)
      expect(ret).to.be.eql(true)
    })
  })

  // TODO: same as above
  describe('Enroll Supplier', () => {
    it('should check if whitelist was initialized', async () => {
      const tx1 = invoiceFactoryUpgrade.enrollSupplier(user2.address)
      expect(tx1).to.be.revertedWith('Restricted to admins.')
      await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
      await whitelist.addAdmin(invoiceFactoryUpgrade.address)
      const tx2 = invoiceFactoryUpgrade.enrollSupplier(user2.address)
      expect(tx2).to.be.fulfilled
    })

    it('should revert if the new anchor had already been add to Supplier role', async () => {
      await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
      await whitelist.addAdmin(invoiceFactoryUpgrade.address)
      await invoiceFactoryUpgrade.enrollSupplier(user2.address)
      const tx2 = invoiceFactoryUpgrade.enrollSupplier(user2.address)
      expect(tx2).to.be.revertedWith('Duplicated enrollment')
    })

    it('should add into if the user hasn\'t been add into whitelist', async () => {
      await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
      await whitelist.addAdmin(invoiceFactoryUpgrade.address)
      await invoiceFactoryUpgrade.enrollSupplier(user2.address)
      const ret = await whitelist.inWhitelist(user2.address)
      expect(ret).to.be.eql(true)
    })

    it('should add account into supplier correctly', async () => {
      await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
      await whitelist.addAdmin(invoiceFactoryUpgrade.address)
      await invoiceFactoryUpgrade.enrollSupplier(user2.address)
      const ret = await invoiceFactoryUpgrade.isSupplier(user2.address)
      expect(ret).to.be.eql(true)
    })
  })


  // TODO: Duplicate of test starting at line 74?
  describe('Trust verfiy anchor and supplier', () => {
    it('should be zero before verified by TRUST', async () => {
      const ret1 = await invoiceFactoryUpgrade.queryAnchorVerified(user2.address)
      expect(ret1).to.be.equal(0)
      const ret2 = await invoiceFactoryUpgrade.queryAnchorVerified(user2.address)
      expect(ret2).to.be.equal(0)
    })

    
    it('should be able to verify anchor by TRUST', async () => {
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user2.address)
      const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user2.address)
      expect(ret).to.be.eql(true)
    })

    it('should be able to verify supplier by TRUST', async () => {
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user2.address)
      const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user2.address)
      expect(ret).to.be.eql(true)
    })
  })

  describe('RestoreAccount', () => {
    beforeEach(async () => {
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
    })

    it('should not be able to restore if the address haven\'t ernolled to anything', async () => {
      const tx = invoiceFactoryUpgrade.restoreAccount(user3.address, admin.address)
      await expect(tx).to.be.revertedWith('Not enrolled yet')
    })

    it('should be able to restore account if the address has been enrolled in anchor', async () => {
      const retBefore = await invoiceFactoryUpgrade.queryAnchorVerified(user3.address)
      expect(retBefore).to.equal(0)
      await invoiceFactoryUpgrade.restoreAccount(user1.address, user3.address)
      const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user3.address)
      // TODO: tx timestamp
      expect(ret).to.eql(true)
    })

    it('should be add to whitelist as the same time', async () => {
      await invoiceFactoryUpgrade.restoreAccount(user2.address, user3.address)
      const ret = await whitelist.inWhitelist(user3.address)
      expect(ret).to.eql(true)
    })

    it('should be able to restore account if the address has been enrolled in supplier', async () => {
      const retBefore = await invoiceFactoryUpgrade.querySupplierVerified(user3.address)
      expect(retBefore).to.equal(0)
      await invoiceFactoryUpgrade.restoreAccount(user2.address, user3.address)
      const ret = await invoiceFactoryUpgrade.querySupplierVerified(user3.address)
      // TODO: tx timestamp
      expect(ret).to.eql(true)
    })
  })
    
  describe('uploadPreSignedHash() funciton', () => {
    it('should do abi encode and hash correctly', async () => {
      let now = BigNumber.from(parseInt(Date.now() / 1000))
      let two = BigNumber.from(2)
      let time = now.mul(two.pow(128)).add(now).add(1000000)

      const ret = await invoiceFactoryUpgrade.uploadPreSignedHash(
        100000,
        time,
        EthUtils.formatBytes32String('0.05'),
        EthUtils.formatBytes32String('Invoice pdf hash'),
        EthUtils.formatBytes32String('Invoice number hash'),
        EthUtils.formatBytes32String('anchor hash'),
        user1.address,
        user2.address,
        true
      )
      const solidityKeccak256 = EthUtils.solidityKeccak256(
        { type: 'bytes4' , value: 'a18b7c27'},
        { type: 'uint256', value: '100000' },
        { type: 'uint256', value: time },
        { type: 'bytes32', value: EthUtils.formatBytes32String('0.05')},
        { type: 'bytes32', value: EthUtils.formatBytes32String('Invoice pdf hash')},
        { type: 'bytes32', value: EthUtils.formatBytes32String('Invoice number hash')},
        { type: 'bytes32', value: EthUtils.formatBytes32String('anchor')},
        { type: 'address', value: user1.address},
        { type: 'address', value: user2.address},
        { type: 'bool'   , value: true}
      )

      expect(ret).to.be.eql(soliditySha3Expect)
    })
  })

  describe('uploadInvoice() function', () => {
    beforeEach(async () => {
      await invoiceFactoryUpgrade.enrollAnchor(user1.address)
      await invoiceFactoryUpgrade.enrollSupplier(user2.address)
    })

    it('should revert if the anchor isn\'t verified', async () => { 
      await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
      let now = BigNumber.from(parseInt(Date.now() / 1000))
      let two = BigNumber.from(2)
      let time = now.mul(two.pow(128)).add(now).add(1000000)

      const sig = await utils.signMessage(
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
      const tx = invoiceFactoryUpgrade.connect(user2).uploadInvoice(
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
      expect(tx).to.be.revertedWith('Anchor not verified by trust.')
    })

    it('should revert if the signature isn\'t correct', async () => {
      await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
      let now = BigNumber.from(parseInt(Date.now() / 1000))
      let two = BigNumber.from(2)
      let time = now.mul(two.pow(128)).add(now).add(1000000)

      const sig = await utils.signMessage(
        admin,
        100000,
        time,
        '0.012345678',
        'Invoice pdf hash',
        'Invoice number hash',
        'anchor hash',
        user2.address,
        user1.address,
        true
      )

      const tx = invoiceFactoryUpgrade.connect(user2).uploadInvoice(
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
      expect(tx).to.be.revertedWith('Not authorized by admin')
    })
       
    it('should be able to uploadInvoice if signature match', async () => {
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
      let now = BigNumber.from(parseInt(Date.now() / 1000))
      let two = BigNumber.from(2)
      let time = now.mul(two.pow(128)).add(now).add(1000000)

      const sig = await utils.signMessage(
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
      const tx = invoiceFactoryUpgrade.connect(user2).uploadInvoice(
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

      await expect(tx).to.be.fulfilled.and
        .to.emit(invoiceFactoryUpgrade, "UploadInvoice")
        .withArgs(0, user2.address, user1.address)
      expect(await invoiceFactoryUpgrade.invoiceCount()).to.be.equal(1)
    })    
  })

  describe('Anchor verify invoice', () => {
    beforeEach(async () => {
      await invoiceFactoryUpgrade.enrollAnchor(user1.address)
      await invoiceFactoryUpgrade.enrollSupplier(user2.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)

      let now = BigNumber.from(parseInt(Date.now() / 1000))
      let two = BigNumber.from(2)
      let time = now.mul(two.pow(128)).add(now).add(1000000)

      const sig = await utils.signMessage(
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
    })

    it('should revert if anchor isn\'t verified', async () => {
      const tx = invoiceFactoryUpgrade.connect(user3).anchorVerifyInvoice(0)

      expect(tx).to.be.revertedWith('Restricted to anchors.')
    })

    it('should revert if operator does not match the anchor on invoice', async () => {
      await invoiceFactoryUpgrade.enrollAnchor(user3.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user3.address)
      const tx = invoiceFactoryUpgrade.connect(user3).anchorVerifyInvoice(0)
      
      expect(tx).to.be.revertedWith("Not authorized")
    })

    it('should be able to verify by correct anchor', async () => {
      const tx = invoiceFactoryUpgrade.connect(user1).anchorVerifyInvoice(0)
      expect(ret).to.be.fulfilled
      // TODO: Check anchorConfirmTime and event
    })
  })

  describe('invoiceToToken() function', () => {
    beforeEach(async () => {
      await invoiceFactoryUpgrade.enrollAnchor(user1.address)
      await invoiceFactoryUpgrade.enrollSupplier(user2.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)

      let now = BigNumber.from(parseInt(Date.now() / 1000))
      let two = BigNumber.from(2)
      let time = now.mul(two.pow(128)).add(now).add(1000000)

      const sig = await utils.signMessage(
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
    })

    it('should revert if anchor hasn\'t verified invoice', async () => {
      const tx = invoiceFactoryUpgrade.invoiceToToken(0)
      expect(tx).to.be.revertedWith('Anchor hasn\'t confirmed')
    })

    it('should be able create token after verified by anchor', async () => {
      await invoiceFactoryUpgrade.connect(user1).anchorVerifyInvoice(0)
      const tx = invoiceFactoryUpgrade.invoiceToToken(0)
      expect(ret).to.be.fulfilled
      // TODO: Check invoiceId to tokenId and vice versa
      // TODO: Check tokenId field in invoice
      // TODO: Check event
    })

    it('should revert if token has already been created', async () => {
      await invoiceFactoryUpgrade.connect(user1).anchorVerifyInvoice(0)
      await invoiceFactoryUpgrade.invoiceToToken(0)
      const tx = invoiceFactoryUpgrade.invoiceToToken(0)
      expect(tx).to.be.revertedWith('Token already created')
    })
  })

  // TODO: add test for set time

  describe('Business logic workflow', () => {
    it('It should follow the correct logic', async () => {
      // enroll anchor and supplier
      await invoiceFactoryUpgrade.enrollAnchor(user1.address)
      await invoiceFactoryUpgrade.enrollSupplier(user2.address)
      // trust verify anchor and supplier
      await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
      await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
      // admin sign supplier data
      let now = BigNumber.from(parseInt(Date.now() / 1000))
      let two = BigNumber.from(2)
      let time = now.mul(two.pow(128)).add(now).add(1000000)

      const sig = await utils.signInvoice(
        user1,
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

      // supplier upload invoice (with invoice pdf and anchor)
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
      // anchor verify invoice
      await invoiceFactoryUpgrade.connect(user1).anchorVerifyInvoice(0)

      await invoiceFactoryUpgrade.invoiceToToken(0) 

      // TODO: Set time interval
    })
  })
})
