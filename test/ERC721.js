const { ethers } = require("hardhat")
const chai = require("chai")
const ChaiAsPromised = require("chai-as-promised")
const utils = require("./utils")
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)

describe("ERC721", () => {
  const createToken = "createToken(uint256,address,address,bool)"
  const balanceOf = "balanceOf(address)"
  const safeTransferFrom = "safeTransferFrom(address,address,uint256,bytes)"

  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" 
  const MAX_VAL = BigNumber.from(2).pow(256).sub(1)
  const IS_NFT = BigNumber.from(2).pow(255)

  let tokenFactory
  let owner, receiver, operator

  beforeEach(async () => {
    [owner, receiver, operator] = await ethers.getSigners()
    const TokenFactory = await ethers.getContractFactory("TokenFactory")
    tokenFactory = await TokenFactory.deploy()
    await tokenFactory.deployed()
  })

  describe("Getter functions", async () => {
    it("balanceOf() should return correct balance for quried address", async () => {
      await tokenFactory[createToken](1, owner.address, operator.address, false)
      await tokenFactory[createToken](1, owner.address, operator.address, false)
      await tokenFactory[createToken](1, receiver.address, operator.address, false)
      
      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      expect(ownerBalance).to.be.eql(BigNumber.from(2))
      const receiverBalance = await tokenFactory[balanceOf](receiver.address)
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
      const operatorBalance = await tokenFactory[balanceOf](operator.address)
      expect(operatorBalance).to.be.eql(BigNumber.from(0))
    })

    it("ownerOf() should return correct token owner address", async () => {
      await tokenFactory[createToken](1, owner.address, operator.address, false)
      const tokenId = IS_NFT
      const tokenOwner = await tokenFactory.ownerOf(tokenId)
      expect(tokenOwner).to.be.eql(owner.address)

      const nullOwner = tokenFactory.ownerOf(0)
      await expect(nullOwner).to.be.revertedWith("Not nft or not exist")
    })

    it("supportsInterface() should support erc721 and erc165", async () => {
      const erc721 = await tokenFactory.supportsInterface("0x80ac58cd")
      const erc165 = await tokenFactory.supportsInterface("0x01ffc9a7")
      const other = await tokenFactory.supportsInterface("0x12345678")

      expect(erc721).to.be.eql(true)
      expect(erc165).to.be.eql(true)
      expect(other).to.be.eql(false)
    })
  })

  describe("safeTransferFrom()", async () => {
    beforeEach(async () => {
      await tokenFactory[createToken](1, owner.address, operator.address, false)
    })

    it("shoud update balance correctly", async () => {
      const tokenId = IS_NFT
      await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      const receiverBalance = await tokenFactory[balanceOf](receiver.address)

      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
    })

    it("should update ownership correctly", async () => {
      const tokenId = IS_NFT
      await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      const tokenOwner = await tokenFactory.ownerOf(tokenId)
      expect(tokenOwner).to.be.eql(receiver.address)
    })

    it("should revert if _from is not token owner", async () => {
      const user = (await ethers.getSigners())[3]
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFrom](user.address, receiver.address, tokenId, [])
      await expect(tx).to.be.revertedWith("Not authorized")
    })

    it("should revert if not authorized operator", async () => {
      const user = (await ethers.getSigners())[3]
      const tokenId = IS_NFT
      const tx = tokenFactory.connect(user)[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      await expect(tx).to.be.revertedWith("Not authorized")
    })

    it("should revert if _from is not token owner but sent by authorized operator", async () => {
      const user = (await ethers.getSigners())[3]
      await tokenFactory.connect(user).setApprovalForAll(operator.address, true)
      const tokenId = IS_NFT
      const tx = tokenFactory.connect(operator)[safeTransferFrom](user.address, receiver.address, tokenId, [])
      await expect(tx).to.be.revertedWith("Not owner or it's not nft")
    })

    it("should be able to transfer if is auhtorized operator", async () => {
      await tokenFactory.setApprovalForAll(operator.address, true)
      const tokenId = IS_NFT
      const tx = tokenFactory.connect(operator)[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      await expect(tx).to.be.fulfilled

      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      const receiverBalance = await tokenFactory[balanceOf](receiver.address)
      const tokenOwner = await tokenFactory.ownerOf(tokenId)
      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
      expect(tokenOwner).to.be.eql(receiver.address)
    })
  })
})
