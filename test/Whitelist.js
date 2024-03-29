const { ethers } = require('hardhat')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const expect = chai.expect

chai.use(ChaiAsPromised)

describe('Whitelis', () => {
  let whitelist
  let admin, admin2, trust, user1
  let adminAddress, trustAddress, user1Address
    
  before(async () => {
    [admin, admin2, trust, user1] = await ethers.getSigners()
    adminAddress = admin.address
    trustAddress = trust.address
    user1Address = user1.address
  })

  beforeEach(async () => {
    const WhitelistFactory = await ethers.getContractFactory('Whitelist')
    whitelist = await WhitelistFactory.deploy()
  })

  describe('Getter function', () => {
    it('isAdmin() should check if it is admin correctly', async () => {
      const correct = await whitelist.isAdmin(adminAddress)
      expect(correct).to.be.eql(true)
      const other = await whitelist.isAdmin(user1Address)
      expect(other).to.be.eql(false)
    })
        
    it('inWhitelist() should check if account is in whitelist or not', async () => {
      const adminRet = await whitelist.inWhitelist(adminAddress)
      const otherRet = await whitelist.inWhitelist(user1Address)
      expect(adminRet).to.be.eql(false)
      expect(otherRet).to.be.eql(false)
    })
  })

  describe('addWhitelist() function', () => {
    it('should be able to add user into whitelist', async () => {
      const before = await whitelist.inWhitelist(user1Address)
      expect(before).to.eql(false)
      await whitelist.addWhitelist(user1Address)
      const after = await whitelist.inWhitelist(user1Address)
      expect(after).to.eql(true)
    })

    it('should revert if not operate by admin', async () => {
      const tx = whitelist.connect(user1).addWhitelist(user1Address)
      await expect(tx).to.be.revertedWith('AccessControl: sender must be an admin to grant')
    })
  })

  describe('removeWhitelist() function', () => {
    it('should be able to remove user in whitelist', async () => {
      await whitelist.addWhitelist(trustAddress)
      const before = await whitelist.inWhitelist(trustAddress)
      expect(before).to.eql(true)
      await whitelist.removeWhitelist(trustAddress)
      const after = await whitelist.inWhitelist(trustAddress)
      expect(after).to.eql(false)
    })

    it('should revert if not operate by admin', async () => {
      const tx = whitelist.connect(user1).removeWhitelist(user1Address)
      await expect(tx).to.be.revertedWith('AccessControl: sender must be an admin to revoke')
    })
  })

  describe('addAdmin() function', () => {
    it('should add target address into admin', async () => {
      const before = await whitelist.isAdmin(user1Address)
      await whitelist.addAdmin(user1Address)
      const after = await whitelist.isAdmin(user1Address)

      expect(before).to.be.eql(false)
      expect(after).to.be.eql(true)
    })
  })

  describe('removeAdmin() function', () => {
    beforeEach(async () => {
      await whitelist.addAdmin(admin2.address)
    })

    it('should be able to remove admin', async () => {
      const beforeAdmin = await whitelist.isAdmin(adminAddress)
      expect(beforeAdmin).to.eql(true)
      await whitelist.connect(admin2).removeAdmin(adminAddress)
      const afterAdmin = await whitelist.isAdmin(adminAddress)
      expect(afterAdmin).to.eql(false)
    })

    it('should revert if not operate by admin', async () => {
      const tx = whitelist.connect(user1).removeAdmin(adminAddress)
      await expect(tx).to.be.revertedWith('AccessControl: sender must be an admin to revoke')
    })
  })
})
