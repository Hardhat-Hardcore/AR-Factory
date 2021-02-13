const { ethers } = require('hardhat')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const utils = require('./utils')
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)

describe('ERC721', () => {
  const createToken = 'createToken(uint256,address,address,bool,bool)'
  const balanceOf = 'balanceOf(address)'
  const safeTransferFrom = 'safeTransferFrom(address,address,uint256,bytes)'

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const TRUST_FORWARDER = '0x0000000000000000000000000000000000000001'
  const MAX_VAL = BigNumber.from(2).pow(256).sub(1)
  const IS_NFT = BigNumber.from(2).pow(255)

  let tokenFactory
  let owner, receiver, operator

  beforeEach(async () => {
    [owner, receiver, operator] = await ethers.getSigners()
    const TokenFactory = await ethers.getContractFactory('TokenFactory')
    tokenFactory = await TokenFactory.deploy(TRUST_FORWARDER)
    await tokenFactory.deployed()
  })

  describe('Getter functions', () => {
    it('balanceOf() should return correct balance for quried address', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      await tokenFactory[createToken](1, receiver.address, ZERO_ADDRESS, false, false)

      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      expect(ownerBalance).to.be.eql(BigNumber.from(2))
      const receiverBalance = await tokenFactory[balanceOf](receiver.address)
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
      const operatorBalance = await tokenFactory[balanceOf](operator.address)
      expect(operatorBalance).to.be.eql(BigNumber.from(0))
    })

    it('ownerOf() should return correct token owner address', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT.add(1)
      const tokenOwner = await tokenFactory.ownerOf(tokenId)
      expect(tokenOwner).to.be.eql(owner.address)

      const nullOwner = tokenFactory.ownerOf(0)
      await expect(nullOwner).to.be.revertedWith('Not nft or not exist')
    })

    it('supportsInterface() should support erc721 and erc165', async () => {
      const erc721 = await tokenFactory.supportsInterface('0x80ac58cd')
      const erc165 = await tokenFactory.supportsInterface('0x01ffc9a7')
      const other = await tokenFactory.supportsInterface('0x12345678')

      expect(erc721).to.be.eql(true)
      expect(erc165).to.be.eql(true)
      expect(other).to.be.eql(false)
    })
  })

  describe('safeTransferFrom()', () => {
    let receiverContract
    let tokenId

    beforeEach(async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      tokenId = IS_NFT.add(1)
      const ReceiverContract = await ethers.getContractFactory('ERC721ReceiverMock')
      receiverContract = await ReceiverContract.deploy()
      await receiverContract.deployed()
    })

    it('shoud update balance correctly', async () => {
      await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      const receiverBalance = await tokenFactory[balanceOf](receiver.address)

      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
    })

    it('should update ownership correctly', async () => {
      await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      const tokenOwner = await tokenFactory.ownerOf(tokenId)
      expect(tokenOwner).to.be.eql(receiver.address)
    })

    it('should revert if _from is not token owner', async () => {
      const user = (await ethers.getSigners())[3]
      const tx = tokenFactory[safeTransferFrom](user.address, receiver.address, tokenId, [])
      await expect(tx).to.be.revertedWith('Not authorized')
    })

    it('should revert if not authorized operator', async () => {
      const user = (await ethers.getSigners())[3]
      const tx = tokenFactory.connect(user)[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      await expect(tx).to.be.revertedWith('Not authorized')
    })

    it('should revert if _from is not token owner but sent by authorized operator', async () => {
      const user = (await ethers.getSigners())[3]
      await tokenFactory.connect(user).setApprovalForAll(operator.address, true)
      const tx = tokenFactory.connect(operator)[safeTransferFrom](user.address, receiver.address, tokenId, [])
      await expect(tx).to.be.revertedWith('Not owner or it\'s not nft')
    })

    it('should be able to transfer if is auhtorized operator', async () => {
      await tokenFactory.setApprovalForAll(operator.address, true)
      const tx = tokenFactory.connect(operator)[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      await expect(tx).to.be.fulfilled

      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      const receiverBalance = await tokenFactory[balanceOf](receiver.address)
      const tokenOwner = await tokenFactory.ownerOf(tokenId)
      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
      expect(tokenOwner).to.be.eql(receiver.address)
    })

    it('should revert if _to is not a receiver contract', async () => {
      const tx = tokenFactory[safeTransferFrom](owner.address, tokenFactory.address, tokenId, [])
      expect(tx).to.be.reverted
    })

    it('should be able to transfer if _to is a receiver contract', async () => {
      const tx = tokenFactory[safeTransferFrom](owner.address, receiverContract.address, tokenId, [])
      await expect(tx).to.be.fulfilled

      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      const receiverBalance = await tokenFactory[balanceOf](receiverContract.address)
      const tokenOwner = await tokenFactory.ownerOf(tokenId)
      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
      expect(tokenOwner).to.be.eql(receiverContract.address)
    })

    it('should revert if receiver contract reject', async () => {
      await receiverContract.setShouldReject(true)
      const tx = tokenFactory[safeTransferFrom](owner.address, receiverContract.address, tokenId, [])
      await expect(tx).to.be.revertedWith('Transfer rejected')
    })

    it('should be able to transfer to receiver contract with data', async () => {
      const rejectData = ethers.utils.toUtf8Bytes('Hello')
      const rejectTx = tokenFactory[safeTransferFrom](owner.address, receiverContract.address, tokenId, rejectData)
      await expect(rejectTx).to.be.reverted

      const data = ethers.utils.toUtf8Bytes('Hello from the other side')
      const tx = tokenFactory[safeTransferFrom](owner.address, receiverContract.address, tokenId, data)
      await expect(tx).to.be.fulfilled
    })

    it('should have balances and ownership updated before external call', async () => {
      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      const receiverBalance = await tokenFactory[balanceOf](receiver.address)
      const filter = receiverContract.filters.TransferReceiver()
      await tokenFactory[safeTransferFrom](owner.address, receiverContract.address, tokenId, [])
      const events = await receiverContract.queryFilter(filter)

      expect(events.length).to.be.eql(1)
      expect(events[0].args._from).to.be.eql(owner.address)
      expect(events[0].args._to).to.be.eql(receiverContract.address)
      expect(events[0].args._fromBalance).to.be.eql(ownerBalance.sub(1))
      expect(events[0].args._toBalance).to.be.eql(receiverBalance.add(1))
      expect(events[0].args._tokenOwner).to.be.eql(receiverContract.address)
    })

    it('should emit Transfer event', async () => {
      const filter = tokenFactory.filters.Transfer()
      const tx = await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, [])
      const events = await tokenFactory.queryFilter(filter, tx.blockNumber)

      expect(events.length).to.be.eql(1)
      expect(events[0].args._from).to.be.eql(owner.address)
      expect(events[0].args._to).be.to.eql(receiver.address)
      expect(events[0].args._tokenId).to.be.eql(tokenId)
    })

    it('should reset nft operator after a transfer', async () => {
      await tokenFactory.approve(operator.address, tokenId)
      await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, [])

      const approvedOperator = await tokenFactory.getApproved(tokenId)
      expect(approvedOperator).to.be.eql(ZERO_ADDRESS)
    })

    it('should be able to transfer without data', async () => {
      const tx = tokenFactory['safeTransferFrom(address,address,uint256)'](
        owner.address, receiver.address, tokenId
      )

      await expect(tx).to.be.fulfilled
    })
  })

  describe('transferFrom()', () => {
    let receiverContract
    let tokenId

    beforeEach(async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      tokenId = IS_NFT.add(1)
      const ReceiverContract = await ethers.getContractFactory('ERC721ReceiverMock')
      receiverContract = await ReceiverContract.deploy()
      await receiverContract.deployed()
    })
    
    it('should be able to transfer with balances updated', async () => {
      const tx = tokenFactory.transferFrom(owner.address, receiver.address, tokenId)
      
      await expect(tx).to.be.fulfilled
      const ownerBalance = await tokenFactory[balanceOf](owner.address)
      const receiverBalance = await tokenFactory[balanceOf](receiver.address)

      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
    })

    it('should not call receiver contract\'s onReceived function', async () => {
      const tx = tokenFactory.transferFrom(owner.address, receiverContract.address, tokenId)
      
      await expect(tx).not.to.emit(receiverContract, 'TransferReceiver')
    })
  })

  describe('approve()', () => {
    let tokenId

    beforeEach(async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      tokenId = IS_NFT.add(1)
    })

    it('should update token\'s approved operator', async () => {
      const defaultOperator = await tokenFactory.getApproved(tokenId)
      expect(defaultOperator).to.be.eql(ZERO_ADDRESS)

      await tokenFactory.approve(operator.address, tokenId)
      const approvedOperator = await tokenFactory.getApproved(tokenId)
      expect(approvedOperator).to.be.eql(operator.address)
    })

    it('should revert if not sent by token owner or authorized operator', async () => {
      const notAuthorizedTx = tokenFactory.connect(receiver).approve(operator.address, tokenId)
      await expect(notAuthorizedTx).to.be.revertedWith('Not authorized or not a nft')

      await tokenFactory.setApprovalForAll(receiver.address, true)
      const authorizedTx = tokenFactory.connect(receiver).approve(operator.address, tokenId)
      await expect(authorizedTx).to.be.fulfilled
    })

    it('should revert it token is not nft or not exist', async () => {
      const tx = tokenFactory.approve(operator.address, 0)
      await expect(tx).to.be.revertedWith('Not authorized or not a nft')
    })

    it('should emit Approval event', async () => {
      const tx = tokenFactory.approve(operator.address, tokenId)
      await expect(tx).to.emit(tokenFactory, 'Approval')
        .withArgs(owner.address, operator.address, tokenId)
    })
  })
})
