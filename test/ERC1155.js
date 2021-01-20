const { ethers } = require("hardhat")
const chai = require("chai")
const ChaiAsPromised = require("chai-as-promised")
const utils = require("./utils")
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)


describe("ERC1155", () => {
  const createToken = "createToken(uint256,address,address,bool)"
  const balanceOf = "balanceOf(address,uint256)"
  const safeTransferFrom = "safeTransferFrom(address,address,uint256,uint256,bytes)"

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const TRUST_FORWARDER = "0x0000000000000000000000000000000000000001"
  const MAXVAL = BigNumber.from(2).pow(256).sub(1)

  let tokenFactory

  beforeEach(async () => {
    const TokenFactory = await ethers.getContractFactory("TokenFactory")
    tokenFactory = await TokenFactory.deploy(TRUST_FORWARDER)
    await tokenFactory.deployed()
  })

  describe("Getter functions", () => {
    it("balanceOf() should return correct balance for quried address", async () => {
      const [user1, user2, user3] = await ethers.getSigners()
      const tx1 = await tokenFactory[createToken](100, user1.address, user3.address, false)
      const tx2 = await tokenFactory[createToken](200, user2.address, user3.address, false)

      const receipt1 = await tx1.wait(1)
      const receipt2 = await tx2.wait(1)

      const event1 = receipt1.events.pop()
      const event2 = receipt2.events.pop()

      // 0
      const tokenId1 = event1.args._tokenId
      // 1
      const tokenId2 = event2.args._tokenId

      const balance1 = await tokenFactory[balanceOf](user1.address, tokenId1)
      expect(balance1).to.be.eql(BigNumber.from(100))
      const balance2 = await tokenFactory[balanceOf](user2.address, tokenId2)
      expect(balance2).to.be.eql(BigNumber.from(200))
      const balance3 = await tokenFactory[balanceOf](user3.address, tokenId1)
      expect(balance3).to.be.eql(BigNumber.from(0))
    })

    it("balanceOfBatch() should return balances for quries addresses", async () => {
      const [user1, user2, user3] = await ethers.getSigners()
      const tx1 = await tokenFactory[createToken](100, user1.address, user3.address, false)
      const tx2 = await tokenFactory[createToken](200, user2.address, user3.address, false)

      const receipt1 = await tx1.wait(1)
      const receipt2 = await tx2.wait(1)

      const event1 = receipt1.events.pop()
      const event2 = receipt2.events.pop()

      const tokenId1 = event1.args._tokenId
      const tokenId2 = event2.args._tokenId

      const balances = await tokenFactory.balanceOfBatch(
        [user1.address, user2.address], [tokenId1, tokenId2]
      )
      expect(balances[0]).to.be.eql(BigNumber.from(100))
      expect(balances[1]).to.be.eql(BigNumber.from(200))

      const balancesNull = await tokenFactory.balanceOfBatch(
        [user1.address, user2.address], [42, 42]
      )
      expect(balancesNull[0]).to.be.eql(BigNumber.from(0))
      expect(balancesNull[1]).to.be.eql(BigNumber.from(0))
    })

    it("supportsInterface(0xd9b67a26) for erc1155 should return true", async () => {
      const ret = await tokenFactory.supportsInterface(0xd9b67a26)
      expect(ret).to.be.eql(true)
    })

    it("supportsInterface(0x01ffc9a7) for erc165 should return true", async () => {
      const ret = await tokenFactory.supportsInterface(0x01ffc9a7)
      expect(ret).to.be.eql(true)
    })

    it("supportsInterface(0x12345678) should return false", async () => {
      const ret = await tokenFactory.supportsInterface(0x12345678)
      expect(ret).to.be.eql(false)
    })
  })

  describe("safeTransferFrom() function", () => {
    let receiverContract
    let owner, receiver, operator

    beforeEach(async () => {
      [owner, receiver, operator] = await ethers.getSigners()
      const ReceiverContract = await ethers.getContractFactory("ERC1155ReceiverMock")
      receiverContract = await ReceiverContract.deploy()
      await receiverContract.deployed()
      await tokenFactory[createToken](100, owner.address, operator.address, false)
    })

    it("should be able to transfer if balance is sufficient", async () => {
      const tx = tokenFactory[safeTransferFrom](owner.address, receiver.address, 0, 1, [])
      await expect(tx).to.be.fulfilled
    })

    it("should revert if balance is insufficient", async () => {
      const tx = tokenFactory[safeTransferFrom](owner.address, receiver.address, 0, 101, [])
      await expect(tx).to.be.reverted
    })

    it("should revert if sending to zero address", async () => {
      const tx = tokenFactory[safeTransferFrom](owner.address, ZERO_ADDRESS, 0, 1, [])
      await expect(tx).to.be.revertedWith("_to must be non-zero")
    })

    it("should revert if not approved operator", async () => {
      const tx = tokenFactory.connect(operator)[safeTransferFrom](owner.address, receiver.address, 0, 1, [])
      await expect(tx).to.be.revertedWith("Not authorized")
    })

    it("should be able to transfer if operator is approved", async () => {
      await tokenFactory.setApprovalForAll(operator.address, true)
      const tx = tokenFactory.connect(operator)[safeTransferFrom](owner.address, receiver.address, 0, 1, [])
      await expect(tx).to.be.fulfilled
    })

    it("should revert if transfer leads to overflow or underflow", async () => {
      await tokenFactory[createToken](MAXVAL, receiver.address, operator.address, false)
      const tx = tokenFactory[safeTransferFrom](owner.address, receiver.address, 1, 1, [])
      await expect(tx).to.be.reverted
    })

    it("should revert if sending to non receiver contract", async () => {
      const tx = tokenFactory[safeTransferFrom](owner.address, tokenFactory.address, 0, 1, [])
      await expect(tx).to.be.reverted
    })

    it("should revert if receiver contract return invalid response", async () => {
      await receiverContract.setShouldReject(true)
      const tx = tokenFactory[safeTransferFrom](owner.address, receiverContract.address, 0, 1, [])
      await expect(tx).to.be.revertedWith("Transfer rejected")
    })

    it("should be able to transfer if receiver contract return valid response", async () => {
      const tx = tokenFactory[safeTransferFrom](owner.address, receiverContract.address, 0, 1, [])
      await expect(tx).to.be.fulfilled
    })

    it("should be able to transfer if receiver contract receives data", async () => {
      const data = ethers.utils.toUtf8Bytes("Hello from the other side")
      const tx = tokenFactory[safeTransferFrom](owner.address, receiverContract.address, 0, 1, data)
      await expect(tx).to.be.fulfilled
    })

    it("should have balance updated before onERC1155Received is called", async () => {
      const ownerBalance = await tokenFactory[balanceOf](owner.address, 0)
      const receiverBalance = await tokenFactory[balanceOf](receiverContract.address, 0)
      const filter = receiverContract.filters.TransferSingleReceiver()
      await tokenFactory[safeTransferFrom](owner.address, receiverContract.address, 0, 1, [])
      const events = await receiverContract.queryFilter(filter)

      expect(events.length).to.be.eql(1)
      expect(events[0].args._from).to.be.eql(owner.address)
      expect(events[0].args._to).to.be.eql(receiverContract.address)
      expect(events[0].args._fromBalance).to.be.eql(ownerBalance.sub(1))
      expect(events[0].args._toBalance).to.be.eql(receiverBalance.add(1))
    })

    it("should update balance correctly", async () => {
      await tokenFactory[safeTransferFrom](owner.address, receiver.address, 0, 1, [])
      const ownerBalance = await tokenFactory[balanceOf](owner.address, 0)
      const receiverBalance = await tokenFactory[balanceOf](receiver.address, 0)

      expect(ownerBalance).to.be.eql(BigNumber.from(99))
      expect(receiverBalance).to.be.eql(BigNumber.from(1))
    })

    it("should emit TransferSingle event correctly", async () => {
      const filter = tokenFactory.filters.TransferSingle()
      const tx = await tokenFactory[safeTransferFrom](owner.address, receiver.address, 0, 1, [])
      const events = await tokenFactory.queryFilter(filter, tx.blockNumber)

      expect(events.length).to.be.eql(1)
      expect(events[0].args._operator).to.be.eql(owner.address)
      expect(events[0].args._from).to.be.eql(owner.address)
      expect(events[0].args._to).to.be.eql(receiver.address)
      expect(events[0].args._tokenId).to.be.eql(BigNumber.from(0))
      expect(events[0].args._value).to.be.eql(BigNumber.from(1))
    })

    it("should have `msg.sender` as `_operator` field in TransferSingle event", async () => {
      await tokenFactory.setApprovalForAll(operator.address, true)
      const filter = tokenFactory.filters.TransferSingle()
      const tx = await tokenFactory.connect(operator)[safeTransferFrom](owner.address, receiver.address, 0, 1, [])
      const events = await tokenFactory.queryFilter(filter, tx.blockNumber)

      expect(events.length).to.be.eql(1)
      expect(events[0].args._operator).to.be.eql(operator.address)
      expect(events[0].args._from).to.be.eql(owner.address)
      expect(events[0].args._to).to.be.eql(receiver.address)
      expect(events[0].args._tokenId).to.be.eql(BigNumber.from(0))
      expect(events[0].args._value).to.be.eql(BigNumber.from(1))
    })
  })

  describe("safeBatchTransferFrom() function", () => {
    let tokenIds
    let values
    let owner
    let receiver
    let operator
    let receiverContract

    beforeEach(async () => {
      [owner, receiver, operator] = await ethers.getSigners()
      tokenIds = []
      values = []
      for (let i = 0; i < 30; i++) {
        values.push(10)
        tokenIds.push(i)
        await tokenFactory[createToken](10, owner.address, operator.address, false)
      }
      const ReceiverContract = await ethers.getContractFactory("ERC1155ReceiverMock")
      receiverContract = await ReceiverContract.deploy()
      await receiverContract.deployed()
    })

    it("should be able to transfer if balances are sufficient", async () => {
      const tx = tokenFactory.safeBatchTransferFrom(owner.address, receiver.address, tokenIds, values, [])
      await expect(tx).to.be.fulfilled
      for (let i = 0; i < 30; i++) {
        const ownerBalance = await tokenFactory[balanceOf](owner.address, i)
        const receiverBalance = await tokenFactory[balanceOf](receiver.address, i)
        expect(ownerBalance).to.be.eql(BigNumber.from(0))
        expect(receiverBalance).to.be.eql(BigNumber.from(10))
      }
    })

    it("should revert if balances are insufficient", async () => {
      values[0] += 1
      const tx = tokenFactory.safeBatchTransferFrom(owner.address, receiver.address, tokenIds, values, [])
      await expect(tx).to.be.reverted
    })

    it("should be able to call with empty arrays", async () => {
      const tx = tokenFactory.safeBatchTransferFrom(owner.address, receiver.address, [], [], [])
      await expect(tx).to.be.fulfilled
    })

    it("should be able to transfer if operator is approved", async () => {
      let tx = tokenFactory.connect(operator).safeBatchTransferFrom(owner.address, receiver.address, tokenIds, values, [])
      await expect(tx).to.be.revertedWith("Not authorized")
      await tokenFactory.setApprovalForAll(operator.address, true)
      tx = tokenFactory.connect(operator).safeBatchTransferFrom(owner.address, receiver.address, tokenIds, values, [])
      await expect(tx).to.be.fulfilled
      for (let i = 0; i < 30; i++) {
        const ownerBalance = await tokenFactory[balanceOf](owner.address, i)
        const receiverBalance = await tokenFactory[balanceOf](receiver.address, i)
        expect(ownerBalance).to.be.eql(BigNumber.from(0))
        expect(receiverBalance).to.be.eql(BigNumber.from(10))
      }
    })

    it("should revert if array length of tokenids and values are not equal", async () => {
      values.push(10)
      const tx = tokenFactory.safeBatchTransferFrom(owner.address, receiver.address, tokenIds, values, [])
      await expect(tx).to.be.revertedWith("Array length must match")
    })

    it("should revert if transfer to a non-receiver contract", async () => {
      const tx = tokenFactory.safeBatchTransferFrom(owner.address, tokenFactory.address, tokenIds, values, [])
      await expect(tx).to.be.reverted
    })

    it("should revert it receiver contract reject the transfer", async () => {
      await receiverContract.setShouldReject(true)
      const tx = tokenFactory.safeBatchTransferFrom(owner.address, receiverContract.address, tokenIds, values, [])
      await expect(tx).to.be.revertedWith("BatchTransfer rejected")
    })

    it("should be able to transfer with data is not null", async () => {
      const data = ethers.utils.toUtf8Bytes("Hello from the other side")
      const tx = tokenFactory.safeBatchTransferFrom(owner.address, receiverContract.address, tokenIds, values, data)
      await expect(tx).to.be.fulfilled
      const wrongData = ethers.utils.toUtf8Bytes("Hello")
      const revertTx = tokenFactory.safeBatchTransferFrom(owner.address, receiverContract.address, tokenIds, values, data)
      await expect(revertTx).to.be.reverted
    })

    it("should have balances updated before external call", async () => {
      const ownerAddresses = Array(tokenIds.length).fill(owner.address)
      const receiverAddresses = Array(tokenIds.length).fill(receiverContract.address)
      const ownerBalances = await tokenFactory.balanceOfBatch(ownerAddresses, tokenIds)
      const receiverBalances = await tokenFactory.balanceOfBatch(receiverAddresses, tokenIds)

      const filter = receiverContract.filters.TransferBatchReceiver()
      await tokenFactory.safeBatchTransferFrom(owner.address, receiverContract.address, tokenIds, values, [])
      const events = await receiverContract.queryFilter(filter)

      expect(events.length).to.be.eql(1)
      expect(events[0].args._from).to.be.eql(owner.address)
      expect(events[0].args._to).to.be.eql(receiverContract.address)
      for (let i = 0; i < tokenIds.length; i++) {
        expect(events[0].args._fromBalances[i]).to.be.eql(BigNumber.from(0))
        expect(events[0].args._toBalances[i]).to.be.eql(BigNumber.from(values[i]))
      }
    })

    it("should emit TransferBatch event", async () => {
      const tx = await tokenFactory.safeBatchTransferFrom(owner.address, receiver.address, tokenIds, values, [])
      const receipt = await tx.wait(1)
      expect(receipt.events.length).to.be.eql(1)

      const ev = receipt.events[0]
      expect(ev.event).to.be.eql("TransferBatch")
      expect(ev.args._operator).to.be.eql(owner.address)
      expect(ev.args._from).to.be.eql(owner.address)
      expect(ev.args._to).to.be.eql(receiver.address)
      expect(ev.args._tokenIds.length).to.be.eql(tokenIds.length)
      expect(ev.args._values.length).to.be.eql(tokenIds.length)
      for (let i = 0; i < tokenIds.length; i++) {
        expect(ev.args._tokenIds[i]).to.be.eql(BigNumber.from(tokenIds[i]))
        expect(ev.args._values[i]).to.be.eql(BigNumber.from(values[i]))
      }
    })

    it("should have `msg.sender` as `_operator` field in TransferBatch event", async () => {
      await tokenFactory.setApprovalForAll(operator.address, true)
      const tx = await tokenFactory.connect(operator).safeBatchTransferFrom(owner.address, receiver.address, tokenIds, values, [])
      const receipt = await tx.wait(1)
      expect(receipt.events.length).to.be.eql(1)

      const ev = receipt.events[0]
      expect(ev.event).to.be.eql("TransferBatch")
      expect(ev.args._operator).to.be.eql(operator.address)
    })
  })

  describe("setApprovalForAll() function", () => {
    beforeEach(async () => {
      [owner, receiver, operator] = await ethers.getSigners()
    })

    it("should emit ApprovalForAll event", async () => {
      const approveTx = await tokenFactory.setApprovalForAll(operator.address, true)
      const approveReceipt = await approveTx.wait(1)

      expect(approveReceipt.events.length).to.be.eql(1)
      expect(approveReceipt.events[0].event).to.be.eql("ApprovalForAll")
      expect(approveReceipt.events[0].args._owner).to.be.eql(owner.address)
      expect(approveReceipt.events[0].args._operator).to.be.eql(operator.address)
      expect(approveReceipt.events[0].args._approved).to.be.eql(true)

      const disapproveTx = await tokenFactory.setApprovalForAll(operator.address, false)
      const disapproveReceipt = await disapproveTx.wait(1)

      expect(disapproveReceipt.events.length).to.be.eql(1)
      expect(disapproveReceipt.events[0].event).to.be.eql("ApprovalForAll")
      expect(disapproveReceipt.events[0].args._owner).to.be.eql(owner.address)
      expect(disapproveReceipt.events[0].args._operator).to.be.eql(operator.address)
      expect(disapproveReceipt.events[0].args._approved).to.be.eql(false)
    })

    it("should set the operator status correctly", async () => {
      const preStatus = await tokenFactory.isApprovedForAll(owner.address, operator.address)
      expect(preStatus).to.be.eql(false)

      await tokenFactory.setApprovalForAll(operator.address, true)
      const status = await tokenFactory.isApprovedForAll(owner.address, operator.address)
      expect(status).to.be.eql(true)
    })

    it("should be able to set operator status again", async () => {
      await tokenFactory.setApprovalForAll(operator.address, true)
      const status1 = await tokenFactory.isApprovedForAll(owner.address, operator.address)
      expect(status1).to.be.eql(true)

      await tokenFactory.setApprovalForAll(operator.address, true)
      const status2 = await tokenFactory.isApprovedForAll(owner.address, operator.address)
      expect(status2).to.be.eql(true)
    })
  })
})

