const { ethers } = require('hardhat')
const utils = require('./utils')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)

describe('ERC1155ERC721WithAdapter', () => {
  const createToken = 'createToken(uint256,address,address,bool,bool)'
  const safeTransferFromERC1155 = 'safeTransferFrom(address,address,uint256,uint256,bytes)'
  const safeTransferFromERC721 = 'safeTransferFrom(address,address,uint256,bytes)'
  const balanceOfERC1155 = 'balanceOf(address,uint256)'
  const balanceOfERC721 = 'balanceOf(address)'

  const IS_NFT = BigNumber.from(2).pow(255)
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const TRUST_FORWARDER = '0x0000000000000000000000000000000000000001'
  const NAME = 'TOKEN'
  const SYMBOL = 'TOKEN'
  const DECIMALS = 3

  let owner, receiver, operator
  let tokenFactory

  beforeEach(async () => {
    [owner, receiver, operator] = await ethers.getSigners()
    const TokenFactory = await ethers.getContractFactory('TokenFactory')
    tokenFactory = await TokenFactory.deploy(TRUST_FORWARDER)
    await tokenFactory.deployed()
  })

  it('should deploy erc20 template', async () => {
    const template = await tokenFactory.template()
    const addr = await utils.getNextContractAddress(tokenFactory.address, true)
    expect(template).to.be.eql(addr)
  })

  it('should be able to create erc20 adapter', async () => {
    const tokenId = 1
    const addr = await utils.getNextContractAddress(tokenFactory.address)
    const tx = tokenFactory[createToken](100, owner.address, operator.address, false, true)

    await expect(tx).to.be.fulfilled.and
      .to.emit(tokenFactory, 'NewAdapter').and
      .withArgs(tokenId, addr)
  })

  it('erc20 adapter should have correct attributes', async () => {
    const tokenId = 1
    const addr = await utils.getNextContractAddress(tokenFactory.address)
    await tokenFactory[createToken](100, owner.address, operator.address, false, true)
    await tokenFactory.connect(operator).setERC20Attribute(
      tokenId, NAME, SYMBOL, DECIMALS)

    const erc20 = await ethers.getContractAt('ERC20Adapter', addr)

    const entity = await erc20.entity()
    expect(entity).to.be.eql(tokenFactory.address)

    const name = await erc20.name()
    expect(name).to.be.eql(NAME)

    const symbol = await erc20.symbol()
    expect(symbol).to.be.eql(SYMBOL)

    const decimals = await erc20.decimals()
    expect(decimals).to.be.eql(DECIMALS)

    const supply = await erc20.totalSupply()
    expect(supply).to.be.eql(BigNumber.from(100))

    const balance = await erc20.balanceOf(owner.address)
    expect(balance).to.be.eql(BigNumber.from(100))
  })

  it('should revert if try to initialize erc20 adapter again', async () => {
    const tokenId = 1
    const addr = await utils.getNextContractAddress(tokenFactory.address)
    await tokenFactory[createToken](100, owner.address, operator.address, false, true)
    await tokenFactory.connect(operator).setERC20Attribute(
      tokenId, NAME, SYMBOL, DECIMALS)

    const erc20 = await ethers.getContractAt('ERC20Adapter', addr)
    const tx = erc20.initialize(tokenId)
    await expect(tx).to.be.revertedWith('Already initialized')
  })

  describe('when there is no erc20 adapter', () => {
    const ftId = 1
    const nftId = IS_NFT.add(2)
    beforeEach(async () => {
      await tokenFactory[createToken](100, owner.address, operator.address, false, false)
      await tokenFactory[createToken](1, owner.address, operator.address, false, false)
    })

    describe('transfer through erc1155', () => {
      it('does not emit erc20 Transfer', async () => {
        const tx = tokenFactory[safeTransferFromERC1155](
          owner.address, receiver.address, ftId, 10, []
        )
        
        const adapter = await tokenFactory.getAdapter(ftId)
        const erc20 = await ethers.getContractAt('ERC20Adapter', adapter)
        await expect(tx).not.to.emit(erc20, 'Transfer')
      })
    })

    describe('transfer through erc721', () => {
      it('does not emit erc20 Transfer', async () => {
        const tx = tokenFactory[safeTransferFromERC721](
          owner.address, receiver.address, nftId, []
        )
        
        const adapter = await tokenFactory.getAdapter(nftId)
        const erc20 = await ethers.getContractAt('ERC20Adapter', adapter)
        await expect(tx).not.to.emit(erc20, 'Transfer')
      })
    })
  })

  describe('when there is a erc20 adapter', () => {
    const ftId = 1
    const nftId = IS_NFT.add(2)
    beforeEach(async () => {
      await tokenFactory[createToken](100, owner.address, operator.address, false, true)
      await tokenFactory[createToken](1, owner.address, operator.address, false, true)
    })

    describe('transfer through erc1155', () => {
      it('emits an erc20 transfer event', async () => {
        const tx = tokenFactory[safeTransferFromERC1155](
          owner.address, receiver.address, ftId, 10, []
        )
        
        const adapter = await tokenFactory.getAdapter(ftId)
        const erc20 = await ethers.getContractAt('ERC20Adapter', adapter)
        await expect(tx).to.emit(erc20, 'Transfer')
          .withArgs(owner.address, receiver.address, 10)
      })

      it('changes the erc20 balance', async () => {
        await tokenFactory[safeTransferFromERC1155](
          owner.address, receiver.address, ftId, 10, []
        )
        
        const adapter = await tokenFactory.getAdapter(ftId)
        const erc20 = await ethers.getContractAt('ERC20Adapter', adapter)

        expect(await erc20.balanceOf(owner.address)).to.be.equal(90)
        expect(await erc20.balanceOf(receiver.address)).to.be.equal(10)
      })
    })
    describe('transfer through erc721', () => {
      it('emits erc20 Transfer', async () => {
        const tx = tokenFactory[safeTransferFromERC721](
          owner.address, receiver.address, nftId, []
        )
        
        const adapter = await tokenFactory.getAdapter(nftId)
        const erc20 = await ethers.getContractAt('ERC20Adapter', adapter)
        await expect(tx).to.emit(erc20, 'Transfer')
          .withArgs(owner.address, receiver.address, 1)
      })

      it('changes the erc20 balance', async () => {
        await tokenFactory[safeTransferFromERC721](
          owner.address, receiver.address, nftId, []
        )
        
        const adapter = await tokenFactory.getAdapter(nftId)
        const erc20 = await ethers.getContractAt('ERC20Adapter', adapter)

        expect(await erc20.balanceOf(owner.address)).to.be.equal(0)
        expect(await erc20.balanceOf(receiver.address)).to.be.equal(1)
      })
    })
  })
})

