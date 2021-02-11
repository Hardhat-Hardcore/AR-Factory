const { ethers } = require('hardhat')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const expect = chai.expect

chai.use(ChaiAsPromised)

describe('Whitelist', () => {

  let whitelist
  let admin, trust, user1
  let adminAddress, trustAddress, user1Address
    
  before(async () => {
    [admin, trust, user1] = await ethers.getSigners()
    adminAddress = admin.address
    trustAddress = trust.address
    user1Address = user1.address
  })

  beforeEach(async () => {
    const WhitelistFactory = await ethers.getContractFactory('Whitelist')
    whitelist = await WhitelistFactory.deploy(trustAddress)
  })

  describe('Getter functions', () => {
        
    it('isAdmin() should check if its admin correctly.', async () => {
      const correct = await whitelist.isAdmin(adminAddress)
      expect(correct).to.be.eql(true)
      const wrong = await whitelist.isAdmin(user1Address)
      expect(wrong).to.be.eql(false)
    })
        
    it('inWhitelist() should check if account is in Whitelist or not.', async () => {
      const correct = await whitelist.inWhitelist(trustAddress)
      expect(correct).to.be.eql(true)
      const wrong = await whitelist.inWhitelist(user1Address)
      expect(wrong).to.be.eql(false)
    })

  })

  describe('addWhitelist() function', () => {
        
    it('should be able to add user in whitelist.', async () => {
      const beforeFunc = await whitelist.inWhitelist(user1Address)
      expect(beforeFunc).to.eql(false)
      await whitelist.addWhitelist(user1Address)
      const afterFunc = await whitelist.inWhitelist(user1Address)
      expect(afterFunc).to.eql(true)
    })

    it('should revert if not operate by admin.', async () => {
      const tx = whitelist.connect(user1).addWhitelist(user1Address)
      await expect(tx).to.be.revertedWith('Restricted to admins.')
    })

  })

  describe('removeWhitelist() function', () => {
        
    it('should be able to remove user in whitelist.', async () => {
      const beforeFunc = await whitelist.inWhitelist(trustAddress)
      expect(beforeFunc).to.eql(true)
      await whitelist.removeWhitelist(trustAddress)
      const afterFunc = await whitelist.inWhitelist(trustAddress)
      expect(afterFunc).to.eql(false)
    })

    it('should revert if not operate by admin.', async () => {
      const tx = whitelist.connect(user1).removeWhitelist(user1Address)
      await expect(tx).to.be.revertedWith('Restricted to admins.')
    })

  })

  describe('renounceAdmin() function', () => {
        
    it('should be able to renounce admin of whitelist.', async () => {
      const beforeFuncAdmin = await whitelist.isAdmin(adminAddress)
      expect(beforeFuncAdmin).to.eql(true)
      await whitelist.renounceAdmin(adminAddress)
      const afterFuncAdmin = await whitelist.isAdmin(adminAddress)
      expect(afterFuncAdmin).to.eql(false)
    })
  })
})
