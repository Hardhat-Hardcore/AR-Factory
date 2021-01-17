const { ethers } = require("hardhat")
const chai = require("chai")
const ChaiAsPromised = require("chai-as-promised")
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)

describe("ERC1155ERC721", () => {
  const createToken = "createToken(uint256,address,address,bool)"
  const safeTransferFromERC1155 = "safeTransferFrom(address,address,uint256,uint256,bytes)"
  const safeTransferFromERC721 = "safeTransferFrom(address,address,uint256,bytes)"
  const balanceOfERC1155 = "balanceOf(address,uint256)"
  const balanceOfERC721 = "balanceOf(address)"
  const IS_NFT = BigNumber.from(2).pow(255)
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
  let owner, receiver, operator
  let tokenFactory

  beforeEach(async () => {
    [owner, receiver, operator] = await ethers.getSigners()
    const TokenFactory = await ethers.getContractFactory("TokenFactory")
    tokenFactory = await TokenFactory.deploy()
    await tokenFactory.deployed()
  })

  describe("balanceOf()", () => {
    it("should return the same nft balance from both erc1155 and erc721", async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const tokenId = IS_NFT
      const balance1155 = await tokenFactory[balanceOfERC1155](owner.address, tokenId)
      const balance721 = await tokenFactory[balanceOfERC721](owner.address)

      expect(balance1155).to.be.eql(BigNumber.from(1))
      expect(balance721).to.be.eql(BigNumber.from(1))
    })

    it("should only return nft balance through erc721", async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false)
      const tokenId = 0
      const balance = await tokenFactory[balanceOfERC721](owner.address)
      expect(balance).to.be.eql(BigNumber.from(0)) 
    })

    it("should return zero if not nft owner through erc1155", async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const tokenId = IS_NFT
      const balance = await tokenFactory[balanceOfERC1155](receiver.address, tokenId)

      expect(balance).to.be.eql(BigNumber.from(0))
    })
  })

  describe("balanceOfBatch()", () => {
    it("should return correct balance for nft", async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false)
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const ftId = BigNumber.from(0)
      const nftId = IS_NFT.add(1)
      const balances = await tokenFactory.balanceOfBatch(
        [owner.address, owner.address], [ftId, nftId])

      expect(balances[0]).to.be.eql(BigNumber.from(2))
      expect(balances[1]).to.be.eql(BigNumber.from(1))
    })
  })

  describe("safeTransferFrom()", () => {
    it("should be able to transfer nft through erc1155 function", async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 1, [])

      await expect(tx).to.be.fulfilled
      const ownerBalance = await tokenFactory[balanceOfERC1155](owner.address, tokenId)
      const receiverBalance = await tokenFactory[balanceOfERC1155](receiver.address, tokenId)
      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
    })

    it("should revert if transfer nft with value more than one", async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 2, [])
      
      await expect(tx).to.be.revertedWith("NFT amount more than 1")
    })

    it("should be able to transfer nft with zero value", async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 0, [])
      
      await expect(tx).to.be.fulfilled
    })

    it("should update nft balance and owner correctly", async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const tokenId = IS_NFT
      await tokenFactory[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 1, [])

      const ownerBalance = await tokenFactory[balanceOfERC721](owner.address)
      const receiverBalance = await tokenFactory[balanceOfERC721](receiver.address)
      const nftOwner = await tokenFactory.ownerOf(tokenId)
      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
      expect(nftOwner).to.be.eql(receiver.address)
    })

    it("should revert if _from is not nft owner", async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](
        operator.address, receiver.address, tokenId, 1, [])
      
      await expect(tx).to.be.revertedWith("Not authorized")
    })

    it("should revert if not sent by authorized operator", async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false)
      const tokenId = IS_NFT
      const rejectTx = tokenFactory.connect(operator)[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 1, [])
      await expect(rejectTx).to.be.revertedWith("Not authorized") 

      await tokenFactory.approve(operator.address, tokenId)
      const approvedTx = tokenFactory.connect(operator)[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 1, [])
      await expect(approvedTx).to.be.fulfilled

      await tokenFactory.connect(receiver).setApprovalForAll(operator.address, true)
      const approvalForAllTx = tokenFactory.connect(operator)[safeTransferFromERC1155](
        receiver.address, owner.address, tokenId, 1, [])
      await expect(approvalForAllTx).to.be.fulfilled
    })
  })
})
