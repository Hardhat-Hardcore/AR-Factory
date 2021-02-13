const { ethers } = require('hardhat')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const utils = require('./utils')
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)

describe('TokenFactory', () => {
  const createToken = 'createToken(uint256,address,address,bool,bool)'
  const createTokenWithRecording = 
    'createTokenWithRecording(uint256,address,address,bool,address,bool)'
  const balanceOf = 'balanceOf(address,uint256)'
  const safeTransferFrom = 'safeTransferFrom(address,address,uint256,uint256,bytes)'

  const IS_NFT = BigNumber.from(2).pow(255)
  const NEED_TIME = BigNumber.from(2).pow(254)
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const TRUST_FORWARDER = '0x0000000000000000000000000000000000000001'
  const NAME = 'NAME'
  const SYMBOL = 'SYM'
  const DECIMALS = 3

  let owner, receiver, operator
  let tokenFactory

  beforeEach(async () => {
    [owner, receiver, operator] = await ethers.getSigners()
    const TokenFactory = await ethers.getContractFactory('TokenFactory')
    tokenFactory = await TokenFactory.deploy(TRUST_FORWARDER)
    await tokenFactory.deployed()
  })

  describe('createToken()', () => {
    it('should create token with correct token ID', async () => {
      // ft
      await tokenFactory[createToken](100, owner.address, operator.address, false, false)
      // nft
      await tokenFactory[createToken](1, owner.address, operator.address, false, false)
      // ft + need time
      await tokenFactory[createToken](100, owner.address, operator.address, true, false)
      // nft + need time
      await tokenFactory[createToken](1, owner.address, operator.address, true, false)
      
      const filter = tokenFactory.filters.TransferSingle()
      const events = await tokenFactory.queryFilter(filter)

      expect(events.length).to.be.eql(4)
      expect(events[0].args._tokenId).to.be.eql(BigNumber.from(1))
      expect(events[1].args._tokenId).to.be.eql(IS_NFT.add(2))
      expect(events[2].args._tokenId).to.be.eql(NEED_TIME.add(3))
      expect(events[3].args._tokenId).to.be.eql(IS_NFT.add(NEED_TIME).add(4))
    })

    it('should set operator correctly', async () => {
      const preSettingOperator = await tokenFactory.settingOperatorOf(1)
      const preRecordingOperator = await tokenFactory.recordingOperatorOf(1)
      expect(preSettingOperator).to.be.eql(ZERO_ADDRESS)
      expect(preRecordingOperator).to.be.eql(ZERO_ADDRESS)

      await tokenFactory[createToken](100, owner.address, operator.address, false, false)
      const postSettingOperator = await tokenFactory.settingOperatorOf(1)
      const postRecordingOperator = await tokenFactory.recordingOperatorOf(1)
      expect(postSettingOperator).to.be.eql(operator.address)
      expect(postRecordingOperator).to.be.eql(ZERO_ADDRESS)
    })

    it('should emit TransferSingle event when creating ft token', async () => {
      const tx = await tokenFactory[createToken](100, owner.address, ZERO_ADDRESS, false, false)
      const receipt = await tx.wait(1)
      const events = receipt.events
      
      expect(events.length).to.be.eql(1)
      const arg = events[0].args
      expect(arg._operator).to.be.eql(owner.address)
      expect(arg._from).to.be.eql(ZERO_ADDRESS)
      expect(arg._to).to.be.eql(owner.address)
      expect(arg._tokenId).to.be.eql(BigNumber.from(1))
      expect(arg._value).to.be.eql(BigNumber.from(100))
    })

    it('should emit TransferSingle and Transfer event when creating nft', async () => {
      const tokenId = IS_NFT.add(1)
      const tx = await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const receipt = await tx.wait(1)
      const events = receipt.events
      
      expect(events.length).to.be.eql(2)
      expect(events[0].event).to.be.eql('Transfer')
      expect(events[1].event).to.be.eql('TransferSingle')
      const transfer = events[0].args
      expect(transfer._from).to.be.eql(ZERO_ADDRESS)
      expect(transfer._to).to.be.eql(owner.address)
      expect(transfer._tokenId).to.be.eql(tokenId)
      const transferSingle = events[1].args
      expect(transferSingle._operator).to.be.eql(owner.address)
      expect(transferSingle._from).to.be.eql(ZERO_ADDRESS)
      expect(transferSingle._to).to.be.eql(owner.address)
      expect(transferSingle._tokenId).to.be.eql(tokenId)
      expect(transferSingle._value).to.be.eql(BigNumber.from(1))
    })

    it('should create correct amount of token', async () => {
      const ftId = 1
      const nftId = IS_NFT.add(2)
      await tokenFactory[createToken](100, owner.address, ZERO_ADDRESS, false, false)
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)

      const ftBalance = await tokenFactory[balanceOf](owner.address, ftId)
      const nftBalance = await tokenFactory[balanceOf](owner.address, nftId)
      expect(ftBalance).to.be.eql(BigNumber.from(100))
      expect(nftBalance).to.be.eql(BigNumber.from(1))
    })

    it('should set nft owner correctly', async () => {
      await tokenFactory[createToken](1, owner.address, ZERO_ADDRESS, false, false)
      const tokenOwner = await tokenFactory.ownerOf(IS_NFT.add(1))
      expect(tokenOwner).to.be.eql(owner.address)
    })

    it('should be able to send to receiver contract', async () => {
      const ReceiverFactory = await ethers.getContractFactory('ERC1155ReceiverMock')
      const receiverContract = await ReceiverFactory.deploy()
      await receiverContract.deployed()
      const nonReceiverTx = tokenFactory[createToken](
        100, tokenFactory.address, ZERO_ADDRESS, false, false
      )
      await expect(nonReceiverTx).to.be.reverted

      const tx = tokenFactory[createToken](
        100, receiverContract.address, ZERO_ADDRESS, false, false
      )
      await expect(tx).to.be.fulfilled.and
        .to.emit(receiverContract, 'TransferSingleReceiver')
    })
  })

  describe('createTokenWithRecording()', () => {
    it('should set operator correctly', async () => {
      const tokenId = NEED_TIME.add(1)
      const preSettingOperator = await tokenFactory.settingOperatorOf(tokenId)
      const preRecordingOperator = await tokenFactory.recordingOperatorOf(tokenId)
      expect(preSettingOperator).to.be.eql(ZERO_ADDRESS)
      expect(preRecordingOperator).to.be.eql(ZERO_ADDRESS)

      await tokenFactory[createTokenWithRecording](
        100, owner.address, operator.address, true, owner.address, false
      )
      const postSettingOperator = await tokenFactory.settingOperatorOf(tokenId)
      const postRecordingOperator = await tokenFactory.recordingOperatorOf(tokenId)
      expect(postSettingOperator).to.be.eql(operator.address)
      expect(postRecordingOperator).to.be.eql(owner.address)
    })

    it('should generate recording ft token', async () => {
      const ftId = 1
      const nftId = IS_NFT.add(2)
      await tokenFactory[createTokenWithRecording](
        100, owner.address, ZERO_ADDRESS, false, receiver.address, false
      )
      await tokenFactory[createTokenWithRecording](
        1, owner.address, ZERO_ADDRESS, false, receiver.address, false
      )

      const ftRecordingBalance = await tokenFactory.recordingBalanceOf(receiver.address, ftId)
      const nftRecordingBalance = await tokenFactory.recordingBalanceOf(receiver.address, nftId)
      expect(ftRecordingBalance).to.be.eql(BigNumber.from(100))
      expect(nftRecordingBalance).to.be.eql(BigNumber.from(1))
    })

    it('should generate RecordingTransferSingle event', async () => {
      const tokenId = 1
      const tx = tokenFactory[createTokenWithRecording](
        100, owner.address, ZERO_ADDRESS, false, receiver.address, false
      )

      await expect(tx).to.be.fulfilled.and
        .to.emit(tokenFactory, 'RecordingTransferSingle')
        .withArgs(owner.address, ZERO_ADDRESS, receiver.address, tokenId, 100)
    })
    
  })

  describe('setTimeInterval()', () => {
    it('should set time correctly', async () => {
      const tx = await tokenFactory[createTokenWithRecording](
        100, owner.address, operator.address, true, owner.address, false
      )
      const tokenId = NEED_TIME.add(1)
      const now = await utils.getTransactionTimestamp(tx)
      await tokenFactory.connect(operator).setTimeInterval(tokenId, now + 100, now + 1000)
      
      const time = await tokenFactory.timeIntervalOf(tokenId)
      expect(time[0]).to.be.eql(BigNumber.from(now + 100))
      expect(time[1]).to.be.eql(BigNumber.from(now + 1000))
    })
    
    it('should revert if start time is smaller than now', async () => {
      const createTx = await tokenFactory[createTokenWithRecording](
        100, owner.address, operator.address, true, owner.address, false
      )
      const tokenId = NEED_TIME.add(1)
      const now = await utils.getTransactionTimestamp(createTx)
      const tx = tokenFactory.connect(operator).setTimeInterval(tokenId, 0, now + 100)
      
      await expect(tx).to.be.revertedWith('Time smaller than now')
    })

    it('should revert if start time greater than end time', async () => {
      const createTx = await tokenFactory[createTokenWithRecording](
        100, owner.address, operator.address, true, owner.address, false
      )
      const tokenId = NEED_TIME.add(1)
      const now = await utils.getTransactionTimestamp(createTx)
      const tx = tokenFactory.connect(operator).setTimeInterval(tokenId, now + 1000, now + 100)

      await expect(tx).to.be.revertedWith('End greater than start')
    })

    it('should be able to set time even not recording token', async () => {
      const createTx = await tokenFactory[createTokenWithRecording](
        100, owner.address, operator.address, false, owner.address, false
      )
      const tokenId = 1
      const now = await utils.getTransactionTimestamp(createTx)
      const tx = tokenFactory.connect(operator).setTimeInterval(tokenId, now + 100, now + 1000)

      await expect(tx).to.be.fulfilled
    })

    it('should revert if token not generated yet', async () => {
      const tokenId = 1
      const tx = tokenFactory.connect(operator).setTimeInterval(tokenId, 1000, 2000)

      await expect(tx).to.be.revertedWith('Not authorized')
    })
  })

  describe('Recording Token', () => {
    it('should revert if not recording token operator', async () => {
      const tokenId = 1
      await tokenFactory[createTokenWithRecording](
        100, owner.address, ZERO_ADDRESS, false, receiver.address, false
      )
      
      const rejectTx = tokenFactory.recordingTransferFrom(receiver.address, owner.address, tokenId, 1)
      await expect(rejectTx).to.be.revertedWith('Not authorized')
      const tx = tokenFactory.connect(receiver).recordingTransferFrom(receiver.address, owner.address, tokenId, 1)
      await expect(tx).to.be.fulfilled

      const ownerTx = tokenFactory.recordingTransferFrom(owner.address, receiver.address, tokenId, 1)
      await expect(ownerTx).to.be.revertedWith('Not authorized')
    })

    it('should revert if insufficient balance', async () => {
      const tokenId = 1
      await tokenFactory[createTokenWithRecording](
        100, owner.address, ZERO_ADDRESS, false, receiver.address, false
      )
      
      const tx = tokenFactory.recordingTransferFrom(receiver.address, owner.address, tokenId, 101)
      await expect(tx).to.be.reverted
    })

    it('should update balance correctly', async () => {
      const tokenId = 1
      await tokenFactory[createTokenWithRecording](
        100, owner.address, ZERO_ADDRESS, false, owner.address, false
      )
      
      await tokenFactory.recordingTransferFrom(owner.address, receiver.address, tokenId, 42)
      const receiverBalance =  await tokenFactory.recordingBalanceOf(receiver.address, tokenId)
      const ownerBalance = await tokenFactory.recordingBalanceOf(owner.address, tokenId)

      expect(receiverBalance).to.be.eql(BigNumber.from(42))
      expect(ownerBalance).to.be.eql(BigNumber.from(58))
    })

    it('should emit RecordingTransferSingle when transfer', async () => {
      const tokenId = 1
      await tokenFactory[createTokenWithRecording](
        100, owner.address, ZERO_ADDRESS, false, owner.address, false
      )
      
      const tx = tokenFactory.recordingTransferFrom(owner.address, receiver.address, tokenId, 42)
      
      await expect(tx).to.be.fulfilled.and
        .to.emit(tokenFactory, 'RecordingTransferSingle')
        .withArgs(owner.address, owner.address, receiver.address, tokenId, 42)
    })
  })

  describe('Holding time', () => {
    describe('Recording Token', () => {
      it('should return zero if not started yet', async () => {
        const tokenId = 1
        const tx = await tokenFactory[createTokenWithRecording](
          100, owner.address, operator.address, false, owner.address, false
        )
        const now = await utils.getTransactionTimestamp(tx)
             
        await tokenFactory.connect(operator).setTimeInterval(tokenId, now + 100, now + 1000)
        const time = await tokenFactory.recordingHoldingTimeOf(owner.address, tokenId)
        expect(time).to.be.eql(BigNumber.from(0))
      })

      it('should return zero if not set time yet', async () => {
        const tokenId = 1
        await tokenFactory[createTokenWithRecording](
          100, owner.address, operator.address, false, owner.address, false
        )
             
        const time = await tokenFactory.recordingHoldingTimeOf(owner.address, tokenId)
        expect(time).to.be.eql(BigNumber.from(0))
      })

      it('should return correct holding time', async () => {
        const tokenId = 1
        const tx = await tokenFactory[createTokenWithRecording](
          100, owner.address, operator.address, false, owner.address, false
        )
        const timestamp = await utils.getTransactionTimestamp(tx)
        await tokenFactory.connect(operator).setTimeInterval(tokenId, timestamp + 100, timestamp + 1000) 

        await utils.mine(timestamp + 200)
        
        const holdingTime = await tokenFactory.recordingHoldingTimeOf(owner.address, tokenId)
        // 100 * 100s
        expect(holdingTime).to.be.eql(BigNumber.from(10000))

        await utils.setNextBlockTimestamp(timestamp + 300)

        await tokenFactory.recordingTransferFrom(owner.address, receiver.address, tokenId, 50)

        const preOwnerHoldingTime = await tokenFactory.recordingHoldingTimeOf(owner.address, tokenId)
        const preReceiverHoldingTime = await tokenFactory.recordingHoldingTimeOf(receiver.address, tokenId)
        // 100 * 200s
        expect(preOwnerHoldingTime).to.be.eql(BigNumber.from(20000))
        // 0 * 0s
        expect(preReceiverHoldingTime).to.be.eql(BigNumber.from(0))

        await utils.mine(timestamp + 400)

        const postOwnerHoldingTime = await tokenFactory.recordingHoldingTimeOf(owner.address, tokenId)
        const postReceiverHoldingTime = await tokenFactory.recordingHoldingTimeOf(receiver.address, tokenId)
        // 100 * 200s + 50 * 100s
        expect(postOwnerHoldingTime).to.be.eql(BigNumber.from(25000))
        // 0 * 0s + 50 * 100s
        expect(postReceiverHoldingTime).to.be.eql(BigNumber.from(5000))

        await utils.mine(timestamp + 1100)
        
        let finalOwnerHoldingTime = await tokenFactory.recordingHoldingTimeOf(owner.address, tokenId)
        let finalReceiverHoldingTime = await tokenFactory.recordingHoldingTimeOf(receiver.address, tokenId)
        // 100 * 200s + 50 * 100s + 50 * 600s
        expect(finalOwnerHoldingTime).to.be.eql(BigNumber.from(55000))
        // 0 * 0s + 50 * 100s + 50 * 600s
        expect(finalReceiverHoldingTime).to.be.eql(BigNumber.from(35000))

        await tokenFactory.recordingTransferFrom(owner.address, receiver.address, tokenId, 50)

        await utils.mine(timestamp + 1200)

        finalOwnerHoldingTime = await tokenFactory.recordingHoldingTimeOf(owner.address, tokenId)
        finalReceiverHoldingTime = await tokenFactory.recordingHoldingTimeOf(receiver.address, tokenId)
        // 100 * 200s + 50 * 100s + 50 * 600s
        expect(finalOwnerHoldingTime).to.be.eql(BigNumber.from(55000))
        // 0 * 0s + 50 * 100s + 50 * 600s
        expect(finalReceiverHoldingTime).to.be.eql(BigNumber.from(35000))
      })
    })

    describe('Normal Token', () => {
      it('should return zero if not started yet', async () => {
        const ftTx = await tokenFactory[createToken](
          100, owner.address, operator.address, true, false
        )
        const nftTx = await tokenFactory[createToken](
          1, owner.address, operator.address, true, false
        )
        const ftId = NEED_TIME.add(1)
        const nftId = NEED_TIME.add(2).add(IS_NFT)
        const now = await utils.getTransactionTimestamp(ftTx)
             
        await tokenFactory.connect(operator).setTimeInterval(ftId, now + 100, now + 1000)
        await tokenFactory.connect(operator).setTimeInterval(nftId, now + 100, now + 1000)
        const ftTime = await tokenFactory.recordingHoldingTimeOf(owner.address, ftId)
        const nftTime = await tokenFactory.recordingHoldingTimeOf(owner.address, nftId)
        expect(ftTime).to.be.eql(BigNumber.from(0))
        expect(nftTime).to.be.eql(BigNumber.from(0))
      })

      it('should revert if not a need time token', async () => {
        const ftTx = await tokenFactory[createToken](
          100, owner.address, operator.address, false, false)
        const nftTx = await tokenFactory[createToken](
          1, owner.address, operator.address, false, false
        )
        const ftId = 0
        const nftId = IS_NFT.add(1)

        const ftHoldingTimeTx = tokenFactory.holdingTimeOf(owner.address, ftId)
        const nftHoldingTimeTx = tokenFactory.holdingTimeOf(owner.address, nftId)
        await expect(ftHoldingTimeTx).to.be.revertedWith('Doesn\'t support this token')
        await expect(nftHoldingTimeTx).to.be.revertedWith('Doesn\'t support this token')

        const ftUpdateTx = tokenFactory.updateHoldingTime(owner.address, ftId)
        const nftUpdateTx = tokenFactory.updateHoldingTime(owner.address, nftId)
        await expect(ftUpdateTx).to.be.revertedWith('Doesn\'t support this token')
        await expect(nftUpdateTx).to.be.revertedWith('Doesn\'t support this token')
      })
      
      it('should return zero if not set time yet', async () => {
        await tokenFactory[createToken](
          100, owner.address, operator.address, true, false
        )
        await tokenFactory[createToken](
          1, owner.address, operator.address, true, false
        )
        const ftId = NEED_TIME
        const nftId = IS_NFT.add(1).add(NEED_TIME)
             
        const ftTime = await tokenFactory.holdingTimeOf(owner.address, ftId)
        const nftTime = await tokenFactory.holdingTimeOf(owner.address, nftId)
        expect(ftTime).to.be.eql(BigNumber.from(0))
        expect(nftTime).to.be.eql(BigNumber.from(0))
      })

      it('should return correct holding time for ft token', async () => {
        const tokenId = NEED_TIME.add(1)
        const tx = await tokenFactory[createToken](
          100, owner.address, operator.address, true, false
        )
        const timestamp = await utils.getTransactionTimestamp(tx)
        await tokenFactory.connect(operator).setTimeInterval(tokenId, timestamp + 100, timestamp + 1000)

        await utils.mine(timestamp + 200)

        const holdingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        // 100 * 100s
        expect(holdingTime).to.be.eql(BigNumber.from(10000))

        // safeTransferFrom
        await utils.setNextBlockTimestamp(timestamp + 300)

        await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, 10, [])
        let preOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        let preReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 100 * 100s + 100 * 100s
        expect(preOwnerHoldingTime).to.be.eql(BigNumber.from(20000))
        // 0 * 0s
        expect(preReceiverHoldingTime).to.be.eql(BigNumber.from(0))

        await utils.mine(timestamp + 400)

        let postOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        let postReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 100 * 100s + 100 * 100s + 90 * 100s
        expect(postOwnerHoldingTime).to.be.eql(BigNumber.from(29000))
        // 0 * 0s + 10 * 100s
        expect(postReceiverHoldingTime).to.be.eql(BigNumber.from(1000))

        // safeBatchTransferFrom
        await utils.setNextBlockTimestamp(timestamp + 500)

        await tokenFactory.safeBatchTransferFrom(owner.address, receiver.address, [tokenId], [10], [])
        preOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        preReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 100 * 100s + 100 * 100s + 90 * 100s + 90 * 100s
        expect(preOwnerHoldingTime).to.be.eql(BigNumber.from(38000))
        // 0 * 0s + 10 * 100s + 10 * 100s
        expect(preReceiverHoldingTime).to.be.eql(BigNumber.from(2000))

        await utils.mine(timestamp + 600)

        postOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        postReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 100 * 100s + 100 * 100s + 90 * 100s + 90 * 100s + 80 * 100s
        expect(postOwnerHoldingTime).to.be.eql(BigNumber.from(46000))
        // 0 * 0s + 10 * 100s + 10 * 100s + 20 * 100s
        expect(postReceiverHoldingTime).to.be.eql(BigNumber.from(4000))

        // After the period end
        await utils.mine(timestamp + 1100)

        let finalOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        let finalReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 100 * 100s + 100 * 100s + 90 * 100s + 90 * 100s + 80 * 100s + 80 * 400s
        expect(finalOwnerHoldingTime).to.be.eql(BigNumber.from(78000))
        // 0 * 0s + 10 * 100s + 10 * 100s + 20 * 100s + 20 * 400s
        expect(finalReceiverHoldingTime).to.be.eql(BigNumber.from(12000))

        // The transfer after the period end should not change the holding time
        await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, 10, [])

        await utils.mine(timestamp + 1200)

        finalOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        finalReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 100 * 100s + 100 * 100s + 90 * 100s + 90 * 100s + 80 * 100s + 80 * 400s
        expect(finalOwnerHoldingTime).to.be.eql(BigNumber.from(78000))
        // 0 * 0s + 10 * 100s + 10 * 100s + 20 * 100s + 20 * 400s
        expect(finalReceiverHoldingTime).to.be.eql(BigNumber.from(12000))
      })

      it('should return correct holding time for nft token', async () => {
        const tokenId = NEED_TIME.add(IS_NFT).add(1)
        const tx = await tokenFactory[createToken](
          1, owner.address, operator.address, true, false
        )
        const timestamp = await utils.getTransactionTimestamp(tx)
        await tokenFactory.connect(operator).setTimeInterval(tokenId, timestamp + 100, timestamp + 1000)

        await utils.mine(timestamp + 200)

        const holdingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        // 1 * 100s
        expect(holdingTime).to.be.eql(BigNumber.from(100))

        // safeTransferFrom
        await utils.setNextBlockTimestamp(timestamp + 300)

        await tokenFactory[safeTransferFrom](owner.address, receiver.address, tokenId, 1, [])
        let preOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        let preReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 1 * 100s + 1 * 100s
        expect(preOwnerHoldingTime).to.be.eql(BigNumber.from(200))
        // 0 * 0s
        expect(preReceiverHoldingTime).to.be.eql(BigNumber.from(0))

        await utils.mine(timestamp + 400)

        let postOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        let postReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 1 * 100s + 1 * 100s + 0 * 100s
        expect(postOwnerHoldingTime).to.be.eql(BigNumber.from(200))
        // 0 * 0s + 1 * 100s
        expect(postReceiverHoldingTime).to.be.eql(BigNumber.from(100))

        // safeBatchTransferFrom
        await utils.setNextBlockTimestamp(timestamp + 500)

        await tokenFactory.connect(receiver).safeBatchTransferFrom(
          receiver.address, owner.address, [tokenId], [1], [])
        preOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        preReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s
        expect(preOwnerHoldingTime).to.be.eql(BigNumber.from(200))
        // 0 * 0s + 1 * 100s + 1 * 100s
        expect(preReceiverHoldingTime).to.be.eql(BigNumber.from(200))

        await utils.mine(timestamp + 600)

        postOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        postReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s + 1 * 100s
        expect(postOwnerHoldingTime).to.be.eql(BigNumber.from(300))
        // 0 * 0s + 1 * 100s + 1 * 100s + 0 * 100s
        expect(postReceiverHoldingTime).to.be.eql(BigNumber.from(200))

        // transferFrom
        await utils.setNextBlockTimestamp(timestamp + 700)

        await tokenFactory.transferFrom(owner.address, receiver.address, tokenId)
        preOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        preReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s + 1 * 100s + 1 * 100s
        expect(preOwnerHoldingTime).to.be.eql(BigNumber.from(400))
        // 0 * 0s + 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s
        expect(preReceiverHoldingTime).to.be.eql(BigNumber.from(200))

        await utils.mine(timestamp + 800)

        postOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        postReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s + 1 * 100s + 1 * 100s + 0 * 100s
        expect(postOwnerHoldingTime).to.be.eql(BigNumber.from(400))
        // 0 * 0s + 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s + 1 * 100s
        expect(postReceiverHoldingTime).to.be.eql(BigNumber.from(300))

        // After the period end
        await utils.mine(timestamp + 1100)

        let finalOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        let finalReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s + 1 * 100s + 1 * 100s + 0 * 100s + 0 * 200s
        expect(finalOwnerHoldingTime).to.be.eql(BigNumber.from(400))
        // 0 * 0s + 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s + 1 * 100s + 1 * 200s
        expect(finalReceiverHoldingTime).to.be.eql(BigNumber.from(500))

        // The transfer after the period end should not change the holding time
        await tokenFactory.connect(receiver).transferFrom(receiver.address, owner.address, tokenId)

        await utils.mine(timestamp + 1200)

        finalOwnerHoldingTime = await tokenFactory.holdingTimeOf(owner.address, tokenId)
        finalReceiverHoldingTime = await tokenFactory.holdingTimeOf(receiver.address, tokenId)
        // 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s + 1 * 100s + 1 * 100s + 0 * 100s + 0 * 200s
        expect(finalOwnerHoldingTime).to.be.eql(BigNumber.from(400))
        // 0 * 0s + 1 * 100s + 1 * 100s + 0 * 100s + 0 * 100s + 1 * 100s + 1 * 200s
        expect(finalReceiverHoldingTime).to.be.eql(BigNumber.from(500))
      })
    })
  })

  describe("setERC20Attribute", () => {
    it("should revert if try to create erc20 adapter not by setting operator", async () => {
      const tokenId = 1
      await tokenFactory[createToken](100, owner.address, operator.address, false, true)
      const tx = tokenFactory.setERC20Attribute(tokenId, NAME, SYMBOL, DECIMALS)

      await expect(tx).to.be.revertedWith('Not authorized')
    })
  })
})
