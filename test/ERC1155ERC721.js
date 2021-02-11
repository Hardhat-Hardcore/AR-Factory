const { ethers } = require('hardhat')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)

describe('ERC1155ERC721', () => {
  const createToken = 'createToken(uint256,address,address,bool,bool)'
  const safeTransferFromERC1155 = 'safeTransferFrom(address,address,uint256,uint256,bytes)'
  const safeTransferFromERC721 = 'safeTransferFrom(address,address,uint256,bytes)'
  const balanceOfERC1155 = 'balanceOf(address,uint256)'
  const balanceOfERC721 = 'balanceOf(address)'
  const IS_NFT = BigNumber.from(2).pow(255)
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const TRUST_FORWARDER = '0x0000000000000000000000000000000000000001'
  let owner, receiver, operator
  let tokenFactory

  beforeEach(async () => {
    [owner, receiver, operator] = await ethers.getSigners()
    const TokenFactory = await ethers.getContractFactory('TokenFactory')
    tokenFactory = await TokenFactory.deploy(TRUST_FORWARDER)
    await tokenFactory.deployed()
  })

  describe('balanceOf()', () => {
    it('should return the same nft balance from both erc1155 and erc721', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT
      const balance1155 = await tokenFactory[balanceOfERC1155](owner.address, tokenId)
      const balance721 = await tokenFactory[balanceOfERC721](owner.address)

      expect(balance1155).to.be.eql(BigNumber.from(1))
      expect(balance721).to.be.eql(BigNumber.from(1))
    })

    it('should only return nft balance through erc721', async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = 0
      const balance = await tokenFactory[balanceOfERC721](owner.address)
      expect(balance).to.be.eql(BigNumber.from(0))
    })

    it('should return zero if not nft owner through erc1155', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT
      const balance = await tokenFactory[balanceOfERC1155](receiver.address, tokenId)

      expect(balance).to.be.eql(BigNumber.from(0))
    })
  })

  describe('balanceOfBatch()', () => {
    it('should return correct balance for nft', async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const ftId = BigNumber.from(0)
      const nftId = IS_NFT.add(1)
      const balances = await tokenFactory.balanceOfBatch(
        [owner.address, owner.address], [ftId, nftId])

      expect(balances[0]).to.be.eql(BigNumber.from(2))
      expect(balances[1]).to.be.eql(BigNumber.from(1))
    })
  })

  describe('safeTransferFrom()', () => {
    it('should be able to transfer nft through erc1155', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 1, [])

      await expect(tx).to.be.fulfilled
      const ownerBalance = await tokenFactory[balanceOfERC1155](owner.address, tokenId)
      const receiverBalance = await tokenFactory[balanceOfERC1155](receiver.address, tokenId)
      expect(ownerBalance).to.be.eql(BigNumber.from(0))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
    })

    it('should revert if transfer nft with value more than one through erc1155', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 2, [])

      await expect(tx).to.be.revertedWith('NFT amount more than 1')
    })

    it('should be able to transfer nft with zero value through erc1155', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 0, [])

      await expect(tx).to.be.fulfilled
    })

    it('should update nft balance and owner correctly through erc1155', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
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

    it('should revert if _from is not nft owner through erc1155', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](
        operator.address, receiver.address, tokenId, 1, [])

      await expect(tx).to.be.revertedWith('Not authorized')
    })

    it('should revert if not sent by authorized operator through erc1155', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT
      const rejectTx = tokenFactory.connect(operator)[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 1, [])
      await expect(rejectTx).to.be.revertedWith('Not authorized')

      await tokenFactory.approve(operator.address, tokenId)
      const approvedTx = tokenFactory.connect(operator)[safeTransferFromERC1155](
        owner.address, receiver.address, tokenId, 1, [])
      await expect(approvedTx).to.be.fulfilled

      await tokenFactory.connect(receiver).setApprovalForAll(operator.address, true)
      const approvalForAllTx = tokenFactory.connect(operator)[safeTransferFromERC1155](
        receiver.address, owner.address, tokenId, 1, [])
      await expect(approvalForAllTx).to.be.fulfilled
    })

    it('should emit Transfer and TransferSingle event when transfer nft through erc1155', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = IS_NFT
      const tx = tokenFactory[safeTransferFromERC1155](owner.address, receiver.address, tokenId, 1, [])

      await expect(tx).to
        .emit(tokenFactory, 'Transfer')
        .withArgs(owner.address, receiver.address, tokenId).and
        .emit(tokenFactory, 'TransferSingle')
        .withArgs(owner.address, owner.address, receiver.address, tokenId, 1)
    })

    it('should revert if transfer non nft through erc721', async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = 0
      const tx = tokenFactory[safeTransferFromERC721](owner.address, receiver.address, tokenId, [])

      await expect(tx).to.be.revertedWith('Not owner or it\'s not nft')
    })

    describe('receiver is a contract', () => {
      let erc1155Receiver
      let erc721Receiver
      let hybridReceiver

      beforeEach(async () => {
        const erc1155ReceiverFactory = await ethers.getContractFactory('ERC1155ReceiverMock')
        const erc721ReceiverFactory = await ethers.getContractFactory('ERC721ReceiverMock')
        const hybridReceiverFactory = await ethers.getContractFactory('ERC1155ERC721ReceiverMock')
        erc1155Receiver = await erc1155ReceiverFactory.deploy()
        erc721Receiver = await erc721ReceiverFactory.deploy()
        hybridReceiver = await hybridReceiverFactory.deploy()
        await erc1155Receiver.deployed()
        await erc721Receiver.deployed()
        await hybridReceiver.deployed()
      })

      it('should be able to transfer nft to erc1155 receiver contract through erc1155', async () => {
        await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
        const tokenId = IS_NFT
        const tx = tokenFactory[safeTransferFromERC1155](owner.address, erc1155Receiver.address, tokenId, 1, [])

        await expect(tx).to.be.fulfilled.and
          .to.emit(erc1155Receiver, 'TransferSingleReceiver')
      })

      it('should be able to transfer nft to erc721 receiver contract through erc1155', async () => {
        await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
        const tokenId = IS_NFT
        const tx = tokenFactory[safeTransferFromERC1155](owner.address, erc721Receiver.address, tokenId, 1, [])

        await expect(tx).to.be.fulfilled.and
          .to.emit(erc721Receiver, 'TransferReceiver')
      })

      it('should be able to transfer nft to erc1155erc721 receiver contract through erc721', async () => {
        await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
        const tokenId = IS_NFT
        const tx = tokenFactory[safeTransferFromERC721](owner.address, hybridReceiver.address, tokenId, [])
        const filter = {
          address: hybridReceiver.address
        }

        await expect(tx).to.be.fulfilled.and
          .to.emit(hybridReceiver, 'TransferSingleReceiver')

        const events = await hybridReceiver.queryFilter(filter)
        expect(events.length).to.be.eql(1)
      })

      it('should revert if transfer nft to non receiver contract through erc721', async () => {
        const EmptyFactory = await ethers.getContractFactory('Empty')
        const empty = await EmptyFactory.deploy()
        await empty.deployed()

        await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
        const tokenId = IS_NFT
        const tx = tokenFactory[safeTransferFromERC721](owner.address, empty.address, tokenId, [])

        await expect(tx).to.be.reverted
      })

      it('should revert if transfer nft to non receiver contract through erc1155', async () => {
        await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
        const tokenId = IS_NFT
        const tx = tokenFactory[safeTransferFromERC1155](owner.address, tokenFactory.address, tokenId, 1, [])

        await expect(tx).to.be.reverted
      })

      it('should revert if transfer non nft to erc721 receiver contract through erc1155', async () => {
        await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
        const tokenId = 0
        const tx = tokenFactory[safeTransferFromERC1155](owner.address, erc721Receiver.address, tokenId, 1, [])

        await expect(tx).to.be.reverted
      })
    })
  })

  describe('safeBatchTransferFrom()', () => {
    let ftId
    let nftId

    beforeEach(async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      ftId = BigNumber.from(0)
      nftId = IS_NFT.add(1)
    })

    it('should be able to transfer nft', async () => {
      const tx = tokenFactory.safeBatchTransferFrom(
        owner.address, receiver.address, [ftId, nftId], [2, 1], [])
      await expect(tx).to.be.fulfilled

      const erc1155Balances = await tokenFactory.balanceOfBatch(
        [owner.address, owner.address, receiver.address, receiver.address],
        [ftId, nftId, ftId, nftId]
      )
      expect(erc1155Balances[0]).to.be.eql(BigNumber.from(0))
      expect(erc1155Balances[1]).to.be.eql(BigNumber.from(0))
      expect(erc1155Balances[2]).to.be.eql(BigNumber.from(2))
      expect(erc1155Balances[3]).to.be.eql(BigNumber.from(1))

      const ownerNftBalance = await tokenFactory[balanceOfERC721](owner.address)
      const receiverNftBalance = await tokenFactory[balanceOfERC721](receiver.address)
      expect(ownerNftBalance).to.be.eql(BigNumber.from(0))
      expect(receiverNftBalance).to.be.eql(BigNumber.from(1))

      const nftOwner = await tokenFactory.ownerOf(nftId)
      expect(nftOwner).to.be.eql(receiver.address)

      const nftOperator = await tokenFactory.getApproved(nftId)
      expect(nftOperator).to.be.eql(ZERO_ADDRESS)
    })

    it('should emit Transfer and TransferBatch event when transfer nft', async () => {
      const tx = tokenFactory.safeBatchTransferFrom(
        owner.address, receiver.address, [ftId, nftId], [2, 1], [])
      await expect(tx).to
        .emit(tokenFactory, 'Transfer')
        .withArgs(owner.address, receiver.address, nftId).and
        .emit(tokenFactory, 'TransferBatch')
        .withArgs(owner.address, owner.address, receiver.address, [ftId, nftId], [2, 1])
    })

    it('should revert if transfer non nft to erc721 receiver contract', async () => {
      const erc721ReceiverFactory = await ethers.getContractFactory('ERC721ReceiverMock')
      const erc721Receiver = await erc721ReceiverFactory.deploy()
      await erc721Receiver.deployed()
      const tx = tokenFactory.safeBatchTransferFrom(
        owner.address, erc721Receiver.address, [ftId, nftId], [2, 1], [])

      await expect(tx).to.be.reverted
    })
  })

  describe('transferFrom()', () => {
    it('should revert if transfer non nft', async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = 0
      const tx = tokenFactory.transferFrom(owner.address, receiver.address, tokenId)

      await expect(tx).to.be.revertedWith('Not owner or it\'s not nft')
    })
  })

  describe('ownerOf()', () => {
    it('should revert if is not nft', async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = 0
      const tx = tokenFactory.ownerOf(tokenId)

      await expect(tx).to.be.revertedWith('Not nft or not exist')
    })
  })

  describe('approve()', () => {
    it('should revert if is not nft', async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = 0
      const tx = tokenFactory.approve(operator.address, tokenId)

      await expect(tx).to.be.revertedWith('Not authorized or not a nft')
    })
  })

  describe('getApproved()', () => {
    it('should revert if is not nft', async () => {
      await tokenFactory[createToken](2, owner.address, ZERO_ADDRESS, false, false)
      const tokenId = 0
      const tx = tokenFactory.getApproved(tokenId)

      await expect(tx).to.be.revertedWith('Not a nft')
    })
  })
})

