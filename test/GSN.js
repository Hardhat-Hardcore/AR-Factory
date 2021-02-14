const { RelayProvider } = require('@opengsn/gsn')
const { GsnTestEnvironment } = require('@opengsn/gsn/dist/GsnTestEnvironment')
const { ethers } = require('hardhat')
const Web3HttpProvider = require('web3-providers-http')
const chai = require('chai')
const ChaiAsPromised = require('chai-as-promised')
const { getWallet } = require('./utils')

const expect = chai.expect

chai.use(ChaiAsPromised)

describe('GSN', () => {
  let trust, userInWitelist, userNotInWitelist
  let deploymentProvider, clientProvider, gsnProvider
  let whitelist, tokenFactory, invoiceFactory
  let forwarderAddress, relayHubAddress

  /**
   * Paymaster : Whitelist
   * - Set RelayHub and TrustedForwarder after gsn env start
   * - Send 1 ETH to Paymaster to support relay call tx fee
   * - Paymaster will agree to pay if senderTx satisfied all condition on preRelayedCall
   *
   * BaseRelayRecipient : TokenFactory, InvoiceFactory
   * - Set TrustedForwarder on constructor
   */
  before('GSN environment start', async () => {
    [trust, userInWitelist, userNotInWitelist] = await ethers.getSigners()

    const env = await GsnTestEnvironment.startGsn('localhost')
    forwarderAddress = env.contractsDeployment.forwarderAddress
    relayHubAddress = env.contractsDeployment.relayHubAddress

    const web3provider = new Web3HttpProvider('http://localhost:8545')
    deploymentProvider = new ethers.providers.Web3Provider(web3provider)

    const whitelistF = await ethers.getContractFactory('Whitelist', trust, deploymentProvider.getSigner())
    whitelist = await whitelistF.deploy(trust.address)
    await whitelist.deployed()
    await whitelist.setRelayHub(relayHubAddress)
    await whitelist.setTrustedForwarder(forwarderAddress)
    await whitelist.addWhitelist(userInWitelist.address)

    const tx = await trust.sendTransaction({
      from: trust.address,
      to: whitelist.address,
      value: ethers.utils.parseEther('2'),
    })
    await tx.wait(1)

    gsnProvider = await RelayProvider.newProvider({
      provider: web3provider,
      config: {
        loggerConfiguration: { logLevel: 'error' },
        paymasterAddress: whitelist.address
      },
    }).init()
  })

  beforeEach('Deploy baseRelayRecipient contract', async () => {
    const tokenF = await ethers.getContractFactory('TokenFactoryMock', trust, deploymentProvider.getSigner())
    tokenFactory = await tokenF.deploy(forwarderAddress)
    await tokenFactory.deployed()



    const invoiceF = await ethers.getContractFactory('InvoiceFactoryMock', trust, deploymentProvider.getSigner())
    invoiceFactory = await invoiceF.deploy(
      trust.address,
      forwarderAddress,
      tokenFactory.address,
      whitelist.address
    )
    await invoiceFactory.deployed()
  })

  describe('BasePaymaster', () => {
    describe('preRelayedCall()', () => {
      it('should be revert if sender is not in whitelist', async () => {
        const walletNotInWitelist = getWallet(2)
        const privateKey = walletNotInWitelist.privateKey
        const gsnProviderTmp = gsnProvider

        gsnProviderTmp.addAccount(privateKey)
        clientProvider = new ethers.providers.Web3Provider(gsnProviderTmp)

        const tokenF = tokenFactory.connect(clientProvider.getSigner(userNotInWitelist.address))
        const invoiceF = invoiceFactory.connect(clientProvider.getSigner(userNotInWitelist.address))

        try {
          await invoiceF.relayCall()
          expect.fail()
        } catch (e) {
          expect(e.message).to.include('Address is not in whitelist')
        }

        try {
          await tokenF.relayCall()
          expect.fail()
        } catch (e) {
          expect(e.message).to.include('Address is not in whitelist')
        }
      })
    })
    describe('versionPaymaster()', () => {
      it('paymaster version shuold be correct', async () => {
        const versionPaymaster = await whitelist.versionPaymaster()

        expect(versionPaymaster).to.be.eql('2.1.0')
      })
    })
  })

  describe('BaseRelayRecipient', () => {
    describe('_msgSender()', () => {
      it('should return msg.sender if the call is not from trusted forwarder', async () => {
        const tokenF = tokenFactory.connect(userInWitelist)
        const invoiceF = invoiceFactory.connect(userInWitelist)

        await tokenF.msgSender()
        await invoiceF.msgSender()

        const filterToken = tokenFactory.filters.MsgSender()
        const filterInvoice = invoiceFactory.filters.MsgSender()
        const eventsToken = await tokenFactory.queryFilter(filterToken)
        const eventsInvoice = await invoiceFactory.queryFilter(filterInvoice)

        expect(eventsToken.length).to.be.eql(1)
        expect(eventsInvoice.length).to.be.eql(1)
        expect(eventsToken[0].args._msgSender).to.be.eql(userInWitelist.address)
        expect(eventsInvoice[0].args._msgSender).to.be.eql(userInWitelist.address)
        expect(eventsToken[0].args._realSender).to.be.eql(userInWitelist.address)
        expect(eventsInvoice[0].args._realSender).to.be.eql(userInWitelist.address)
      })

      it('should return original sender if the call is from trusted forwarder', async () => {
        const walletInWitelist = getWallet(1)
        const privateKey = walletInWitelist.privateKey
        const gsnProviderTmp = gsnProvider

        gsnProviderTmp.addAccount(privateKey)
        clientProvider = new ethers.providers.Web3Provider(gsnProviderTmp)

        const tokenF = tokenFactory.connect(clientProvider.getSigner(userInWitelist.address))
        const invoiceF = invoiceFactory.connect(clientProvider.getSigner(userInWitelist.address))
        await tokenF.msgSender()
        await invoiceF.msgSender()

        const filterToken = tokenFactory.filters.MsgSender()
        const filterInvoice = invoiceFactory.filters.MsgSender()
        const eventsToken = await tokenFactory.queryFilter(filterToken)
        const eventsInvoice = await invoiceFactory.queryFilter(filterInvoice)

        expect(eventsToken.length).to.be.eql(1)
        expect(eventsInvoice.length).to.be.eql(1)
        expect(eventsToken[0].args._msgSender).to.be.eql(forwarderAddress)
        expect(eventsInvoice[0].args._msgSender).to.be.eql(forwarderAddress)
        expect(eventsToken[0].args._realSender).to.be.eql(userInWitelist.address)
        expect(eventsInvoice[0].args._realSender).to.be.eql(userInWitelist.address)
      })
    })

    describe('_msgData()', () => {
      it('should return msg.data if the call is not from trusted forwarder', async () => {
        const tokenF = tokenFactory.connect(userInWitelist)
        const invoiceF = invoiceFactory.connect(userInWitelist)

        await tokenF.msgData()
        await invoiceF.msgData()

        const filterToken = tokenFactory.filters.MsgData()
        const filterInvoice = invoiceFactory.filters.MsgData()
        const eventsToken = await tokenFactory.queryFilter(filterToken)
        const eventsInvoice = await invoiceFactory.queryFilter(filterInvoice)

        expect(eventsToken[0].args._msgData).to.be.eql(eventsToken[0].args._realData)
        expect(eventsInvoice[0].args._msgData).to.be.eql(eventsInvoice[0].args._realData)
      })
    })

    describe('versionRecipient', () => {
      it('recipient version should be correct', async () => {
        const ifVersionRecipient = await invoiceFactory.versionRecipient()
        const tfVersionRecipient = await tokenFactory.versionRecipient()

        expect(ifVersionRecipient).to.be.eql('2.1.0')
        expect(tfVersionRecipient).to.be.eql('2.1.0')
      })
    })
  })

  describe('Flow test', () => {
    before('add account userInWitelist to gsnProvider', async () => {
      const walletInWitelist = getWallet(1)
      const privateKey = walletInWitelist.privateKey
      const gsnProviderTmp = gsnProvider

      gsnProviderTmp.addAccount(privateKey)
      clientProvider = new ethers.providers.Web3Provider(gsnProviderTmp)
    })

    it('should be relay successfully', async () => {
      const tokenF = tokenFactory.connect(clientProvider.getSigner(userInWitelist.address))
      const invoiceF = invoiceFactory.connect(clientProvider.getSigner(userInWitelist.address))

      await tokenF.relayCall()
      await invoiceF.relayCall()
    })

    it('should not pay for gas after a successful relay call', async () => {
      const tokenF = tokenFactory.connect(clientProvider.getSigner(userInWitelist.address))
      const invoiceF = invoiceFactory.connect(clientProvider.getSigner(userInWitelist.address))

      const beforeGas = await clientProvider.getBalance(userInWitelist.address)

      await tokenF.relayCall()
      await invoiceF.relayCall()

      const afterGas = await clientProvider.getBalance(userInWitelist.address)

      expect(beforeGas).to.be.eql(afterGas)
    })

    it('should withdraw successfully from relayHub', async () => {
      const BigNumber = ethers.BigNumber

      const beforeWithdraw = BigNumber.from(await userInWitelist.getBalance())
      const relayHub = await ethers.getContractAt('IRelayHub', relayHubAddress)
      const balanceOfPaymaster = BigNumber.from(await relayHub.balanceOf(whitelist.address))

      await whitelist.withdrawRelayHubDepositTo(balanceOfPaymaster, userInWitelist.address)
      const afterWithdraw = BigNumber.from(await userInWitelist.getBalance())

      expect(afterWithdraw).to.be.eql(beforeWithdraw.add(balanceOfPaymaster))

    })
  })

})
