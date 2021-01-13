const { ethers } = require("hardhat")
const chai = require("chai")
const ChaiAsPromised = require("chai-as-promised")
const utils = require("./utils")
const BigNumber = ethers.BigNumber
const expect = chai.expect

chai.use(ChaiAsPromised)


describe("ERC1155", async () => {
  const createToken = "createToken(uint256,address,address,bool,bool)"
  const balanceOf = "balanceOf(address,uint256)"
  const safeTransferFrom = "safeTransferFrom(address,address,uint256,uint256,bytes)"

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const MAXVAL = BigNumber.from(2).pow(256).sub(1)

  beforeEach(async () => {
    const TokenFactory = await ethers.getContractFactory("TokenFactory")
    tokenFactory = await TokenFactory.deploy()
    await tokenFactory.deployed()
  })

  describe("Getter functions", () => {
    it("balanceOf() should return correct balance for quried address", async () => {
      const [user1, user2, user3] = await ethers.getSigners()
      const tx1 = await tokenFactory[createToken](100, user1.address, user3.address, false, false)
      const tx2 = await tokenFactory[createToken](200, user2.address, user3.address, false, false)

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
      const tx1 = await tokenFactory[createToken](100, user1.address, user3.address, false, false)
      const tx2 = await tokenFactory[createToken](200, user2.address, user3.address, false, false)

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
      await tokenFactory[createToken](100, owner.address, operator.address, false, false)
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

    it("should revert if transfer leads to overflow", async () => {
      await tokenFactory[createToken](MAXVAL, receiver.address, operator.address, false, false)      
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
      const tx = tokenFactory[safeTransferFrom](owner.address, receiverContract.address, 0, 1, [])
      const events = await receiverContract.queryFilter(filter)
      
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
  })
})

