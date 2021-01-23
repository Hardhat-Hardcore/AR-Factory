const { ethers } = require("hardhat")
const chai = require("chai")
const expect = chai.expect
const ChaiAsPromised = require("chai-as-promised")
const BigNumber = ethers.BigNumber

chai.use(ChaiAsPromised)

describe("InvoiceFactory", () => {

    let admin, whitelistAdmin, trust, trust2, user1, user2, trustF
    let whitelist
    let Whitelist
    let invoiceFactory
    let tokenFactory

    beforeEach(async () => {
        [admin, whitelistAdmin, trust, trust2, user1, user2, trustF] = await ethers.getSigners()
        Whitelist = await ethers.getContractFactory("Whitelist")
        const InvoiceFactory = await ethers.getContractFactory("InvoiceFactory")
        const TokenFactory = await ethers.getContractFactory("TokenFactory")
        whitelist = await Whitelist.deploy(trust.address)
        invoiceFactory = await InvoiceFactory.deploy(trust.address, trustF.address)
        tokenFactory = await TokenFactory.deploy(user2.address)
        await whitelist.deployed()
        await invoiceFactory.deployed()
        await tokenFactory.deployed()
    })

    describe("Constructor", () => {

        it("Should initialize the trust address correctly", async () => {
            const trustAddr = await invoiceFactory.TRUST_ADDRESS()
            expect(trustAddr).to.be.eql(trust.address)
        })

    })

    describe("Getter functions", () => {

        beforeEach(async () => {
            whitelist = await Whitelist.deploy(trust.address)
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
        })

        it("isAnchor() should return true if the account is Anchor", async () => {
            await invoiceFactory.enrollAnchor(user2.address)
            const ret = await invoiceFactory.isAnchor(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("isAnchor() should return false if the account is not Anchor", async () => {
            const ret = await invoiceFactory.isAnchor(user2.address)
            expect(ret).to.be.eql(false)
        })

        it("isSupplier() should return true if the account is Supplier", async () => {
            await invoiceFactory.enrollSupplier(user2.address)
            const ret = await invoiceFactory.isSupplier(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("isSupplier() should return false if the account is not Supplier", async () => {
            const ret = await invoiceFactory.isSupplier(user2.address)
            expect(ret).to.be.eql(false)
        })

    })

    describe("Check Authorities", () => {

        it("updateTrustAddress() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactory.connect(user1).updateTrustAddress(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("updateTokenFactory() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactory.connect(user1).updateTokenFactory(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("updateWhitelist() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactory.connect(user1).updateWhitelist(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("enrollAnchor() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactory.connect(user1).enrollAnchor(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("enrollSupplier() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactory.connect(user1).enrollSupplier(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("trustVerifyAnchor() should revert if the operator isn't trust", async () => {
            const tx = invoiceFactory.connect(user1).trustVerifyAnchor(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to only trust to verify.")
        })

        it("trustVerifySupplier() should revert if the operator isn't trust", async () => {
            const tx = invoiceFactory.connect(user1).trustVerifySupplier(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to only trust to verify.")
        })

        /*
        it("anchorVerify() should revert if the operator isn't anchor",  async () => {
            const tx = invoiceFactory.connect(user1).anchorVerify(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to anchor.")
        })
        */
    })

    describe("Update utils addresses", () => {

        it("updateTrustAddress() should be able to update address to a new TRUST_Address.", async () => {
            let curTrustAddress = await invoiceFactory.TRUST_ADDRESS()
            expect(curTrustAddress).to.be.eql(trust.address)
            await invoiceFactory.updateTrustAddress(trust2.address)
            let futureTrustAddress = await invoiceFactory.TRUST_ADDRESS()
            expect(futureTrustAddress).to.be.eql(trust2.address)
        })

        it("updateTokenFactory should be able to update address to a new ITokenFactory", async () => {
            let curUpdateTokenFactory = await invoiceFactory.tempTokenFactory()
            expect(curUpdateTokenFactory).to.be.eql("0x0000000000000000000000000000000000000000")
            await invoiceFactory.updateTokenFactory(tokenFactory.address)
            let nxtTokenFactoryAddress = await invoiceFactory.tempTokenFactory()
            expect(nxtTokenFactoryAddress).to.be.eql(tokenFactory.address)
        })

        it("updateWhitelist() should be able to update address to a new IWhitelist", async () => {
            let curWhitelistAddress = await invoiceFactory.tempWhitelist()
            expect(curWhitelistAddress).to.be.eql("0x0000000000000000000000000000000000000000")
            await invoiceFactory.updateWhitelist(whitelist.address)
            let nxtWhitelistAddress = await invoiceFactory.tempWhitelist()
            expect(nxtWhitelistAddress).to.be.eql(whitelist.address)
        })

    })

    describe("Enroll Anchor", () => {

        beforeEach(async () => {
            whitelist = await Whitelist.deploy(trust.address)
            //await invoiceFactory.updateWhitelist(whitelist.address)
            //await whitelist.addAdmin(invoiceFactory.address)
        })

        it("should check if whitelist was initialized.", async () => {
            const tx1 = invoiceFactory.enrollAnchor(user2.address)
            expect(tx1).to.be.revertedWith("Whitelist hasn't initialized yet.")
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
            const tx2 = invoiceFactory.enrollAnchor(user2.address)
            expect(tx2).to.be.fulfilled
        })

        it("should revert if the new anchor had already been add to Anchor role.", async () => {
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
            const tx1 = await invoiceFactory.enrollAnchor(user2.address)
            const tx2 = invoiceFactory.enrollAnchor(user2.address)
            expect(tx2).to.be.revertedWith("This account has already been added to the anchor.")
        })

        it("should add into if the user hasn't been add into whitelist.", async () => {
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
            await invoiceFactory.enrollAnchor(user2.address)
            const ret = await whitelist.inWhitelist(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("should add account into anchor correctly.", async () => {
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
            await invoiceFactory.enrollAnchor(user2.address)
            const ret = await invoiceFactory.isAnchor(user2.address)
            expect(ret).to.be.eql(true)
        })

    })

    describe("Enroll Supplier", () => {

        beforeEach(async () => {
            whitelist = await Whitelist.deploy(trust.address)
            //await invoiceFactory.updateWhitelist(whitelist.address)
            //await whitelist.addAdmin(invoiceFactory.address)
        })

        it("should check if whitelist was initialized.", async () => {
            const tx1 = invoiceFactory.enrollSupplier(user2.address)
            expect(tx1).to.be.revertedWith("Whitelist hasn't initialized yet.")
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
            const tx2 = invoiceFactory.enrollSupplier(user2.address)
            expect(tx2).to.be.fulfilled
        })

        it("should revert if the new anchor had already been add to Supplier role.", async () => {
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
            const tx1 = await invoiceFactory.enrollSupplier(user2.address)
            const tx2 = invoiceFactory.enrollSupplier(user2.address)
            expect(tx2).to.be.revertedWith("This account has already been added to the supplier.")
        })

        it("should add into if the user hasn't been add into whitelist.", async () => {
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
            await invoiceFactory.enrollSupplier(user2.address)
            const ret = await whitelist.inWhitelist(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("should add account into supplier correctly.", async () => {
            await invoiceFactory.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactory.address)
            await invoiceFactory.enrollSupplier(user2.address)
            const ret = await invoiceFactory.isSupplier(user2.address)
            expect(ret).to.be.eql(true)
        })

    })


    describe("Trust verfiy Anchor and Supplier", () => {

        it("should be 0 before verified by TRUST.", async () => {
            const ret1 = await invoiceFactory.verifiedAnchor(user2.address)
            expect(ret1).to.be.eql(BigNumber.from(0))
            const ret2 = await invoiceFactory.verifiedSupplier(user2.address)
            expect(ret2).to.be.eql(BigNumber.from(0))
        })

        it("should be able to verify anchor by TRUST.", async () => {
            await invoiceFactory.connect(trust).trustVerifyAnchor(user2.address)
            const ret = await invoiceFactory.verifiedAnchor(user2.address)
            expect(ret).to.not.eql(BigNumber.from(0))
        })

        it("should be able to verify supplier by TRUST.", async () => {
            await invoiceFactory.connect(trust).trustVerifyAnchor(user2.address)
            const ret = await invoiceFactory.verifiedAnchor(user2.address)
            expect(ret).to.not.eql(BigNumber.from(0))
        })

    })

    describe("RestoreAccount", () => {
    })

    describe("Anchor verify the Invoice", () => {

    })
})
