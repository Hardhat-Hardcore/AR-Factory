const { ethers } = require('hardhat')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const expect = chai.expect

chai.use(ChaiAsPromised)

describe('ERC20', () => {
  const createToken = 'createToken(uint256,address,address,bool,bool)'

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
  const TRUST_FORWARDER = '0x0000000000000000000000000000000000000001'
  const NAME = 'TOKEN'
  const SYMBOL = 'TOKEN'
  const DECIMALS = 3

  let owner, receiver, operator
  let tokenFactory
  let erc20

  beforeEach(async () => {
    [owner, receiver, operator] = await ethers.getSigners()
    const TokenFactory = await ethers.getContractFactory('TokenFactory')
    tokenFactory = await TokenFactory.deploy(TRUST_FORWARDER)
    await tokenFactory.deployed()
    await tokenFactory[createToken](100, owner.address, operator.address, false, true)
    await tokenFactory.connect(operator).setERC20Attribute(1, NAME, SYMBOL, DECIMALS)
    let adapter = await tokenFactory.getAdapter(1)
    erc20 = await ethers.getContractAt('ERC20Adapter', adapter)
  })

  describe('totalSupply', () => {
    it('returns the total amount of tokens', async () => {
      expect(await erc20.totalSupply()).to.be.equal(100)
    })
  })

  describe('balanceOf', () => {
    describe('when account has no token', () => {
      it('returns zero', async () => {
        expect(await erc20.balanceOf(receiver.address)).to.be.equal(0)
      })
    })

    describe('when account has token', () => {
      it('returns initial amount', async () => {
        expect(await erc20.balanceOf(owner.address)).to.be.equal(100)
      })
    })
  })

  describe('transfer', () => {
    describe('when recipient is zero address', () => {
      it('reverts', async () => {
        const tx = erc20.transfer(ZERO_ADDRESS, 1)

        await expect(tx).to.be.revertedWith('_to must be non-zero')
      })
    })

    describe('when recipient is not zero address', () => {
      describe('when sender does not have enough balance', () => {
        const amount = 101
        it('reverts', async () => {
          const tx = erc20.transfer(receiver.address, amount)

          await expect(tx).to.be.reverted
        })
      })

      describe('when sender have enough balance', () => {
        const amount = 10
        it('transfers the requested amount', async () => {
          await erc20.transfer(receiver.address, amount)

          expect(await erc20.balanceOf(owner.address)).to.be.equal(90)
          expect(await erc20.balanceOf(receiver.address)).to.be.equal(10)
        })

        it('emits a transfer event', async () => {
          const tx = erc20.transfer(receiver.address, amount)

          await expect(tx).to.emit(erc20, 'Transfer')
            .withArgs(owner.address, receiver.address, amount)
        })
      })
    })

    describe('when transfer to contract address', () => {
      it('should be fulfilled', async () => {
        await erc20.transfer(tokenFactory.address, 10)
        const balance = await erc20.balanceOf(tokenFactory.address)
        
        expect(balance).to.be.equal(10)
      })
    })
  })

  describe('transferFrom', () => {
    describe('when recipient is zero address', () => {
      it('reverts', async () => {
        const tx = erc20.transferFrom(owner.address, ZERO_ADDRESS, 1)

        await expect(tx).to.be.revertedWith('_to must be non-zero')
      })
    })

    describe('when recipient is not zero address', () => {
      describe('when sender does not have enough balance', () => {
        const amount = 101
        it('reverts', async () => {
          await erc20.approve(operator.address, amount)
          const tx = erc20.transferFrom(operator.address, receiver.address, amount)

          await expect(tx).to.be.reverted
        })
      })

      describe('when sender have enough balance', () => {
        const amount = 10
        it('transfers the requested amount', async () => {
          await erc20.approve(operator.address, amount)
          await erc20.connect(operator).transferFrom(owner.address, receiver.address, amount)

          expect(await erc20.balanceOf(owner.address)).to.be.equal(90)
          expect(await erc20.balanceOf(receiver.address)).to.be.equal(10)
        })

        it('emits a transfer event', async () => {
          await erc20.approve(operator.address, amount)
          const tx = erc20.connect(operator).transferFrom(owner.address, receiver.address, amount)

          await expect(tx).to.emit(erc20, 'Transfer')
            .withArgs(owner.address, receiver.address, amount)
        })
      })
    })
  })

  describe('approve', () => {
    describe('when spender is zero address', () => {
      it('reverts', async () => {
        const tx = erc20.approve(ZERO_ADDRESS, 10)

        await expect(tx).to.be.revertedWith('Approve to zero address')
      })
    })

    describe('when spender is not zero address', () => {
      it('emits an approval event', async () => {
        const tx = erc20.approve(operator.address, 10)

        await expect(tx).to.emit(erc20, 'Approval')
          .withArgs(owner.address, operator.address, 10)
      })

      describe('when there was no approved history before', () => {
        it('approves the requested amount', async () => {
          await erc20.approve(operator.address, 10)
          
          const allowance = await erc20.allowance(owner.address, operator.address)
          expect(allowance).to.be.equal(10)
        })
      })

      describe('when spender had an approved history', () => {
        beforeEach(async () => {
          await erc20.approve(operator.address, 10)
        })

        it('approves the requested amount and replaces the previous history', async () => {
          await erc20.approve(operator.address, 20)

          const allowance = await erc20.allowance(owner.address, operator.address)
          expect(allowance).to.be.equal(20)
        })
      })
    })
  })
})
