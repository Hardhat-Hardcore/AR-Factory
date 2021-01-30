const { ethers } = require("hardhat")
const chai = require("chai")
const ChaiAsPromised = require("chai-as-promised")
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)

describe("ERC1155ERC721Metadata", () => {
  const createToken = "createToken(uint256,address,address,bool)"
  const createTokenURI = "createToken(uint256,address,address,bool,string)"
  const createTokenWithRecording = "createTokenWithRecording(uint256,address,address,bool,address)"
  const createTokenWithRecordingURI = 
    "createTokenWithRecording(uint256,address,address,bool,address,string)"

  const IS_NFT = BigNumber.from(2).pow(255)
  const TRUST_FORWARDER = "0x0000000000000000000000000000000000000001"
  const NAME = "TOKEN"
  const SYMBOL = "TOKEN"
  const URI = "http://metadata.io/metadata.json"

  beforeEach(async () => {
    [owner, receiver, operator] = await ethers.getSigners()
    const TokenFactory = await ethers.getContractFactory("TokenFactory")
    tokenFactory = await TokenFactory.deploy(TRUST_FORWARDER)
    await tokenFactory.deployed()
  })

  describe("ERC165", () => {
    it("should register interface id for erc165, erc721 metadata and erc1155 metadata", async () => {
      const erc165 = await tokenFactory.supportsInterface("0x01ffc9a7")
      const erc721Metadata = await tokenFactory.supportsInterface("0x5b5e139f")
      const erc1155Metadata = await tokenFactory.supportsInterface("0x0e89341c")
      const other = await tokenFactory.supportsInterface("0x12345678")

      expect(erc165).to.be.eql(true)
      expect(erc721Metadata).to.be.eql(true)
      expect(erc1155Metadata).to.be.eql(true)
      expect(other).to.be.eql(false)
    })
  })

  describe("ERC721 Metadata", () => {
    it("should return correct name", async () => {
      const name = await tokenFactory.name()
      expect(name).to.be.eql(NAME)
    })

    it("should return correct symbol", async () => {
      const symbol = await tokenFactory.symbol()
      expect(symbol).to.be.eql(SYMBOL)
    })

    it("should revert if not a nft", async () => {
      await tokenFactory[createToken](100, owner.address, operator.address, false)
      const tokenId = 0
      const tx = tokenFactory.tokenURI(tokenId)
      await expect(tx).to.be.revertedWith("Nft not exist")
    })

    it("should return empty string if metadata is not set", async () => {
      await tokenFactory[createToken](1, owner.address, operator.address, false)
      const tokenId = IS_NFT
      const uri = await tokenFactory.tokenURI(tokenId)
      await expect(uri).to.be.eql("")
    })

    it("should return correct uri if metadata is set through createToken", async () => {
      await tokenFactory[createTokenURI](1, owner.address, operator.address, false, URI)
      const tokenId = IS_NFT
      const uri = await tokenFactory.tokenURI(tokenId)
      await expect(uri).to.be.eql(URI)
    })

    it("should return correct uri if metadata is set through createTokenWithRecording", async () => {
      await tokenFactory[createTokenWithRecordingURI](
        1, owner.address, operator.address, false, owner.address, URI)
      const tokenId = IS_NFT
      const uri = await tokenFactory.tokenURI(tokenId)
      await expect(uri).to.be.eql(URI)
    })
  })

  describe("ERC1155 Metadata", () => {
    it("should return empty string if metadata is not set", async () => {
      const ftId = 0
      const nftId = IS_NFT.add(1)
      await tokenFactory[createToken](100, owner.address, operator.address, false)
      await tokenFactory[createToken](1, owner.address, operator.address, false)
      const ftURI = await tokenFactory.uri(ftId)
      const nftURI = await tokenFactory.uri(nftId)
      await expect(ftURI).to.be.eql("")
      await expect(nftURI).to.be.eql("")
    })

    it("should return correct uri if metadata is set through createToken", async () => {
      const ftId = 0
      const nftId = IS_NFT.add(1)
      await tokenFactory[createTokenURI](100, owner.address, operator.address, false, URI)
      await tokenFactory[createTokenURI](1, owner.address, operator.address, false, URI)
      const ftURI = await tokenFactory.uri(ftId)
      const nftURI = await tokenFactory.uri(nftId)
      await expect(ftURI).to.be.eql(URI)
      await expect(nftURI).to.be.eql(URI)
    })
    
    it("should return correct uri if metadata is set through createTokenWithRecording", async () => {
      const ftId = 0
      const nftId = IS_NFT.add(1)
      await tokenFactory[createTokenWithRecordingURI](
        100, owner.address, operator.address, false, owner.address, URI)
      await tokenFactory[createTokenWithRecordingURI](
        1, owner.address, operator.address, false, owner.address, URI)
      const ftURI = await tokenFactory.uri(ftId)
      const nftURI = await tokenFactory.uri(nftId)
      await expect(ftURI).to.be.eql(URI)
      await expect(nftURI).to.be.eql(URI)
    })
  })
})
