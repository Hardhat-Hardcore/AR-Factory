const { ethers, web3 } = require("hardhat")
const bigInt = require("big-integer")
const chai = require("chai")
const expect = chai.expect
const ChaiAsPromised = require("chai-as-promised")
const BigNumber = ethers.BigNumber
const EthUtils = ethers.utils
const utils = require("./utils")
chai.use(ChaiAsPromised)

describe("InvoiceFactoryUpgrade", () => {

    let admin, whitelistAdmin, trust, trust2, user1, user2, user3, trustF
    let whitelist
    let Whitelist
    let invoiceFactory
    let tokenFactory

    beforeEach(async () => {

        [admin, whitelistAdmin, trust, trust2, user1, user2, user3, trustF] = await ethers.getSigners()
        Whitelist = await ethers.getContractFactory("Whitelist")
        const InvoiceFactoryUpgrade = await ethers.getContractFactory("InvoiceFactoryUpgrade")
        const TokenFactory = await ethers.getContractFactory("TokenFactory")
        whitelist = await Whitelist.deploy(trust.address)
        invoiceFactoryUpgrade = await InvoiceFactoryUpgrade.deploy()
        tokenFactory = await TokenFactory.deploy(user2.address)
        await whitelist.deployed()
        await invoiceFactoryUpgrade.deployed()
        await tokenFactory.deployed()
        await invoiceFactoryUpgrade.__initialize(3, trust.address, trustF.address)

    })

    describe("__initialize", () => {

        it("Should initialize the trust address correctly", async () => {
            const trustAddr = await invoiceFactoryUpgrade.trustAddress()
            expect(trustAddr).to.be.eql(trust.address)
        })

        it("Should not be able to initialize more than once", async () => { 
            const tx = invoiceFactoryUpgrade.__initialize(3, trust2.address, trustF.address)
            await expect(tx).to.be.revertedWith("Initializable: contract is already initialized")
        })

    })

    describe("Getter functions", () => {

        beforeEach(async () => {
            whitelist = await Whitelist.deploy(trust.address)
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
        })

        it("isAnchor() should return true if the account is Anchor", async () => {
            await invoiceFactoryUpgrade.enrollAnchor(user2.address)
            const ret = await invoiceFactoryUpgrade.isAnchor(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("isAnchor() should return false if the account is not Anchor", async () => {
            const ret = await invoiceFactoryUpgrade.isAnchor(user2.address)
            expect(ret).to.be.eql(false)
        })

        it("isSupplier() should return true if the account is Supplier", async () => {
            await invoiceFactoryUpgrade.enrollSupplier(user2.address)
            const ret = await invoiceFactoryUpgrade.isSupplier(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("isSupplier() should return false if the account is not Supplier", async () => {
            const ret = await invoiceFactoryUpgrade.isSupplier(user2.address)
            expect(ret).to.be.eql(false)
        })
        
        it("queryAnchorVerified() should return true if the account is verified", async () => {
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
            const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user1.address)
            expect(ret).to.be.eql(true)
        })
        
        it("queryAnchorVerified() should return false if the account is verified", async () => {
            const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user1.address)
            expect(ret).to.be.eql(false)
        })

        it("querySupplierVerified() should return true if the account is verified", async () => {
            await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user1.address)
            const ret = await invoiceFactoryUpgrade.querySupplierVerified(user1.address)
            expect(ret).to.be.eql(true)
        })
        
        it("queryAnchorVerified() should return false if the account is verified", async () => {
            const ret = await invoiceFactoryUpgrade.querySupplierVerified(user1.address)
            expect(ret).to.be.eql(false)
        })

        describe("This need lot to init", () => {
      
            beforeEach(async () => { 
                await invoiceFactoryUpgrade.updateTokenFactory(tokenFactory.address)
                await invoiceFactoryUpgrade.enrollAnchor(user1.address)
                await invoiceFactoryUpgrade.enrollSupplier(user2.address)
                await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
                await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
                let time = Date.now()
                let now = BigNumber.from(time)
                let two = BigNumber.from(2)
                let _time = now.mul(two.pow(128)).add(time + 1000000)

                const sigEJS = await utils.adminSign(
                     100000,
                    _time,
                    "0.05",
                    "Invoice pdf hash",
                    "Invoice number hash",
                    "anchor",
                    user2.address,
                    user1.address,
                    true
                )
                const upret = await invoiceFactoryUpgrade.connect(user2).uploadInvoice(
                    100000,
                    _time,
                    EthUtils.formatBytes32String("0.05"),
                    EthUtils.formatBytes32String("Invoice pdf hash"),
                    EthUtils.formatBytes32String("Invoice number hash"),
                    EthUtils.formatBytes32String("anchor"),
                    user1.address,
                    true,
                    sigEJS
                )
            })

            it("queryInvoiceId() should return correct invoiceId", async () => {
                const ret = await invoiceFactoryUpgrade.queryInvoiceId(0)
                expect(ret).to.be.eql(BigNumber.from(0))
            })
        
            it("queryTokenId() should return correct invoiceId", async () => { 
                const ret = await invoiceFactoryUpgrade.queryInvoiceId(0)
                expect(ret).to.be.eql(BigNumber.from(0))
            })

            it("queryInvoiceInform() should return correct invoiceId", async () => {
                const ret = await invoiceFactoryUpgrade.queryInvoiceInform(0)
                expect(ret[4]).to.be.eql(EthUtils.formatBytes32String("Invoice pdf hash"))
                expect(ret[5]).to.be.eql(EthUtils.formatBytes32String("Invoice number hash"))
                expect(ret[6]).to.be.eql(EthUtils.formatBytes32String("anchor"))
            })

            it("queryInvoiceData() should return correct invoiceId", async () => {
                const ret = await invoiceFactoryUpgrade.queryInvoiceData(0)
                expect(ret[2]).to.be.eql(EthUtils.formatBytes32String("0.05"))
                expect(ret[3]).to.be.eql(user2.address)
                expect(ret[4]).to.be.eql(user1.address)
                expect(ret[5]).to.be.eql(true)
            })
        })

    })

    describe("Check Authorities", () => {

        it("updateTrustAddress() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactoryUpgrade.connect(user1).updateTrustAddress(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("updateTokenFactory() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactoryUpgrade.connect(user1).updateTokenFactory(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("updateWhitelist() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactoryUpgrade.connect(user1).updateWhitelist(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("enrollAnchor() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactoryUpgrade.connect(user1).enrollAnchor(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("enrollSupplier() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactoryUpgrade.connect(user1).enrollSupplier(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })

        it("trustVerifyAnchor() should revert if the operator isn't trust", async () => {
            const tx = invoiceFactoryUpgrade.connect(user1).trustVerifyAnchor(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to only trust by verify")
        })

        it("trustVerifySupplier() should revert if the operator isn't trust", async () => {
            const tx = invoiceFactoryUpgrade.connect(user1).trustVerifySupplier(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to only trust by verify")
        })
        
        it("restoreAccount() should revert if the operator isn't admin", async () => {
            const tx = invoiceFactoryUpgrade.connect(user1).restoreAccount(user1.address, user2.address)
            await expect(tx).to.be.revertedWith("Restricted to admins.")
        })
        /*
        it("anchorVerify() should revert if the operator isn't anchor",  async () => {
            const tx = invoiceFactory.connect(user1).anchorVerify(trust2.address)
            await expect(tx).to.be.revertedWith("Restricted to anchor.")
        })
        */
    })

    describe("Update utils addresses", () => {

        it("updateTrustAddress() should be able to update address to a new trustAddress.", async () => {
            let curTrustAddress = await invoiceFactoryUpgrade.trustAddress()
            expect(curTrustAddress).to.be.eql(trust.address)
            await invoiceFactoryUpgrade.updateTrustAddress(trust2.address)
            let futureTrustAddress = await invoiceFactoryUpgrade.trustAddress()
            expect(futureTrustAddress).to.be.eql(trust2.address)
        })

        it("updateTokenFactory should be able to update address to a new ITokenFactory", async () => {
            let curUpdateTokenFactory = await invoiceFactoryUpgrade.tempTokenFactory()
            expect(curUpdateTokenFactory).to.be.eql("0x0000000000000000000000000000000000000000")
            await invoiceFactoryUpgrade.updateTokenFactory(tokenFactory.address)
            let nxtTokenFactoryAddress = await invoiceFactoryUpgrade.tempTokenFactory()
            expect(nxtTokenFactoryAddress).to.be.eql(tokenFactory.address)
        })

        it("updateWhitelist() should be able to update address to a new IWhitelist", async () => {
            let curWhitelistAddress = await invoiceFactoryUpgrade.tempWhitelist()
            expect(curWhitelistAddress).to.be.eql("0x0000000000000000000000000000000000000000")
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            let nxtWhitelistAddress = await invoiceFactoryUpgrade.tempWhitelist()
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
            const tx1 = invoiceFactoryUpgrade.enrollAnchor(user2.address)
            expect(tx1).to.be.revertedWith("Whitelist not initialized yet.")
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            const tx2 = invoiceFactoryUpgrade.enrollAnchor(user2.address)
            expect(tx2).to.be.fulfilled
        })

        it("should revert if the new anchor had already been add to Anchor role.", async () => {
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            const tx1 = await invoiceFactoryUpgrade.enrollAnchor(user2.address)
            const tx2 = invoiceFactoryUpgrade.enrollAnchor(user2.address)
            expect(tx2).to.be.revertedWith("Duplicated enroll on anchor")
        })

        it("should add into if the user hasn't been add into whitelist.", async () => {
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            await invoiceFactoryUpgrade.enrollAnchor(user2.address)
            const ret = await whitelist.inWhitelist(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("should add account into anchor correctly.", async () => {
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            await invoiceFactoryUpgrade.enrollAnchor(user2.address)
            const ret = await invoiceFactoryUpgrade.isAnchor(user2.address)
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
            const tx1 = invoiceFactoryUpgrade.enrollSupplier(user2.address)
            expect(tx1).to.be.revertedWith("Whitelist not initialized yet.")
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            const tx2 = invoiceFactoryUpgrade.enrollSupplier(user2.address)
            expect(tx2).to.be.fulfilled
        })

        it("should revert if the new anchor had already been add to Supplier role.", async () => {
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            const tx1 = await invoiceFactoryUpgrade.enrollSupplier(user2.address)
            const tx2 = invoiceFactoryUpgrade.enrollSupplier(user2.address)
            expect(tx2).to.be.revertedWith("Duplicated enroll on supplier")
        })

        it("should add into if the user hasn't been add into whitelist.", async () => {
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            await invoiceFactoryUpgrade.enrollSupplier(user2.address)
            const ret = await whitelist.inWhitelist(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("should add account into supplier correctly.", async () => {
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            await invoiceFactoryUpgrade.enrollSupplier(user2.address)
            const ret = await invoiceFactoryUpgrade.isSupplier(user2.address)
            expect(ret).to.be.eql(true)
        })

    })


    describe("Trust verfiy Anchor and Supplier", () => {

        it("should be false before verified by TRUST.", async () => {
            const ret1 = await invoiceFactoryUpgrade.queryAnchorVerified(user2.address)
            expect(ret1).to.be.eql(false)
            const ret2 = await invoiceFactoryUpgrade.queryAnchorVerified(user2.address)
            expect(ret2).to.be.eql(false)
        })

        it("should be able to verify anchor by TRUST.", async () => {
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user2.address)
            const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user2.address)
            expect(ret).to.be.eql(true)
        })

        it("should be able to verify supplier by TRUST.", async () => {
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user2.address)
            const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user2.address)
            expect(ret).to.be.eql(true)
        })

    })
    
    describe("RestoreAccount", () => {

        beforeEach(async () => {
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
            await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
        })

        it("should not be able to restore if the address isn't ernoll to anything.", async () => {
            const ret = invoiceFactoryUpgrade.restoreAccount(user3.address, admin.address)
            await expect(ret).to.be.revertedWith("You hadn't enroll yet")
        })

        it("should be able to restore account if the address had been enroll in anchor.", async () => {
            const retBefore = await invoiceFactoryUpgrade.queryAnchorVerified(user3.address)
            expect(retBefore).to.eql(false)
            await invoiceFactoryUpgrade.restoreAccount(user1.address, user3.address)
            const ret = await invoiceFactoryUpgrade.queryAnchorVerified(user3.address)
            expect(ret).to.eql(true)
        })

        it("should be add to whitelist as the same time.", async () => {
            await invoiceFactoryUpgrade.restoreAccount(user2.address, user3.address)
            const ret = await whitelist.inWhitelist(user3.address)
            expect(ret).to.eql(true)
        })

        it("should be able to restore account if the address had been enroll in supplier.", async () => {
            const retBefore = await invoiceFactoryUpgrade.querySupplierVerified(user3.address)
            expect(retBefore).to.eql(false)
            await invoiceFactoryUpgrade.restoreAccount(user2.address, user3.address)
            const ret = await invoiceFactoryUpgrade.querySupplierVerified(user3.address)
            expect(ret).to.eql(true)
        })

    })
    
    describe("uploadPreSignedHash() funciton", () => {

        it("should return same as input.", async () => {
            let time = Date.now()
            let now = BigNumber.from(time)
            let two = BigNumber.from(2)
            let _time = now.mul(two.pow(128)).add(time + 1000000)
            const ret = await invoiceFactoryUpgrade.uploadPreSignedHash(
                100000,
                _time,
                EthUtils.formatBytes32String("0.05"),
                EthUtils.formatBytes32String("Invoice pdf hash"),
                EthUtils.formatBytes32String("Invoice number hash"),
                EthUtils.formatBytes32String("anchor"),
                user1.address,
                user2.address,
                true
            )
            const soliditySha3Expect = web3.utils.soliditySha3(
                { type: 'bytes4' , value: 'a18b7c27'},
                { type: 'uint256', value: '100000' },
                { type: 'uint256', value: _time },
                { type: 'bytes32', value: EthUtils.formatBytes32String("0.05")},
                { type: 'bytes32', value: EthUtils.formatBytes32String("Invoice pdf hash")},
                { type: 'bytes32', value: EthUtils.formatBytes32String("Invoice number hash")},
                { type: 'bytes32', value: EthUtils.formatBytes32String("anchor")},
                { type: 'address', value: user1.address},
                { type: 'address', value: user2.address},
                { type: 'bool'   , value: true}
            )

            expect(ret).to.be.eql(soliditySha3Expect)
        })
    })

    describe("uploadInvoice() function", () => {
        beforeEach(async () => {
            await invoiceFactoryUpgrade.updateTokenFactory(tokenFactory.address)
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            await invoiceFactoryUpgrade.enrollAnchor(user1.address)
            await invoiceFactoryUpgrade.enrollSupplier(user2.address)
        })

        it("should revert if the anchor wasn't verified.", async () => { 
            await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
            let time = Date.now()
            let now = BigNumber.from(time)
            let two = BigNumber.from(2)
            let _time = now.mul(two.pow(128)).add(time + 1000000)
            const sigEJS = await utils.adminSign(
                100000,
                _time,
                "0.05",
                "Invoice pdf hash",
                "Invoice number hash",
                "anchor",
                user2.address,
                user1.address,
                true
            )
            const upret = invoiceFactoryUpgrade.connect(user2).uploadInvoice(
                100000,
                _time,
                EthUtils.formatBytes32String("0.05"),
                EthUtils.formatBytes32String("Invoice pdf hash"),
                EthUtils.formatBytes32String("Invoice number hash"),
                EthUtils.formatBytes32String("anchor"),
                user1.address,
                true,
                sigEJS
            )
            expect(upret).to.be.revertedWith("Anchor not verified by trust.")
        })

        it("should revert if the signature isn't correct.", async () => {
            await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
            let time = Date.now()
            let now = BigNumber.from(time)
            let two = BigNumber.from(2)
            let _time = now.mul(two.pow(128)).add(time + 1000000)
            const sigEJS = await utils.adminSign(
                100000,
                _time,
                "0.05",
                "Invoice pdf hash",
                "Invoice number hash",
                "anchor",
                user2.address,
                user2.address,
                true
            )
            const upret = invoiceFactoryUpgrade.connect(user2).uploadInvoice(
                100000,
                _time,
                EthUtils.formatBytes32String("0.05"),
                EthUtils.formatBytes32String("Invoice pdf hash"),
                EthUtils.formatBytes32String("Invoice number hash"),
                EthUtils.formatBytes32String("anchor"),
                user1.address,
                true,
                sigEJS
            )
            expect(upret).to.be.revertedWith("Not authorized by admin")
        })
       
        it("should be able to uploadInvoice.", async () => {
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
            await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
            let time = Date.now()
            let now = BigNumber.from(time)
            let two = BigNumber.from(2)
            let _time = now.mul(two.pow(128)).add(time + 1000000)
            const sigEJS = await utils.adminSign(
                100000,
                _time,
                "0.05",
                "Invoice pdf hash",
                "Invoice number hash",
                "anchor",
                user2.address,
                user1.address,
                true
            )
            const upret = await invoiceFactoryUpgrade.connect(user2).uploadInvoice(
                100000,
                _time,
                EthUtils.formatBytes32String("0.05"),
                EthUtils.formatBytes32String("Invoice pdf hash"),
                EthUtils.formatBytes32String("Invoice number hash"),
                EthUtils.formatBytes32String("anchor"),
                user1.address,
                true,
                sigEJS
            )
        })    

    })
    
    

    describe("Anchor verify the Invoice", () => {

        beforeEach(async () => {
            await invoiceFactoryUpgrade.updateTokenFactory(tokenFactory.address)
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            await invoiceFactoryUpgrade.enrollAnchor(user1.address)
            await invoiceFactoryUpgrade.enrollSupplier(user2.address)
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
            await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
            let time = Date.now()
            let now = BigNumber.from(time)
            let two = BigNumber.from(2)
            let _time = now.mul(two.pow(128)).add(time + 1000000)
            const sigEJS = await utils.adminSign(
                100000,
                _time,
                "0.05",
                "Invoice pdf hash",
                "Invoice number hash",
                "anchor",
                user2.address,
                user1.address,
                true
            )
            // supplier upload invoice (with invoice pdf and anchor)
            await invoiceFactoryUpgrade.connect(user2).uploadInvoice(
                100000,
                _time,
                EthUtils.formatBytes32String("0.05"),
                EthUtils.formatBytes32String("Invoice pdf hash"),
                EthUtils.formatBytes32String("Invoice number hash"),
                EthUtils.formatBytes32String("anchor"),
                user1.address,
                true,
                sigEJS
            )
        })

        it("should not be execute if anchor wasn't verified.", async () => {
            const ret = invoiceFactoryUpgrade.connect(user3).anchorVerify(0)
            expect(ret).to.be.revertedWith("You have't been verified yet")
        })

        it("should be able to execute correctly.", async () => {
            const ret = invoiceFactoryUpgrade.connect(user1).anchorVerify(0)
            expect(ret).to.be.fulfilled
        })
    })

    describe("invoiceToToken() function", () => {
        
        beforeEach(async () => {
            await invoiceFactoryUpgrade.updateTokenFactory(tokenFactory.address)
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            await invoiceFactoryUpgrade.enrollAnchor(user1.address)
            await invoiceFactoryUpgrade.enrollSupplier(user2.address)
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
            await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
            let time = Date.now()
            let now = BigNumber.from(time)
            let two = BigNumber.from(2)
            let _time = now.mul(two.pow(128)).add(time + 1000000)
            const sigEJS = await utils.adminSign(
                100000,
                _time,
                "0.05",
                "Invoice pdf hash",
                "Invoice number hash",
                "anchor",
                user2.address,
                user1.address,
                true
            )
            // supplier upload invoice (with invoice pdf and anchor)
            await invoiceFactoryUpgrade.connect(user2).uploadInvoice(
                100000,
                _time,
                EthUtils.formatBytes32String("0.05"),
                EthUtils.formatBytes32String("Invoice pdf hash"),
                EthUtils.formatBytes32String("Invoice number hash"),
                EthUtils.formatBytes32String("anchor"),
                user1.address,
                true,
                sigEJS
            )
        })

        it("should revert if anchor hasn't verify.", async () => {
            const ret = invoiceFactoryUpgrade.invoiceToToken(
                0,
                "INVOICE",
                "INV"
            )
            expect(ret).to.be.revertedWith("Anchor hasn't confirm")
        })

        it("should revert if it already been tranfer to token.", async () => {
            await invoiceFactoryUpgrade.connect(user1).anchorVerify(0)
            await invoiceFactoryUpgrade.invoiceToToken(
                0,
                "INVOICE",
                "INV"
            )
            const ret = invoiceFactoryUpgrade.invoiceToToken(
                0,
                "INVOICE",
                "INV"
            )
            expect(ret).to.be.revertedWith("Token already created")
        })

        it("should be able fullfill", async () => {
            await invoiceFactoryUpgrade.connect(user1).anchorVerify(0)
            const ret = invoiceFactoryUpgrade.invoiceToToken(
                0,
                "INVOICE",
                "INV"
            )
            expect(ret).to.be.fulfilled
        })

    })

    describe("Business logic workflow", () => {

        beforeEach(async () => {
            await invoiceFactoryUpgrade.updateTokenFactory(tokenFactory.address)
            await invoiceFactoryUpgrade.updateWhitelist(whitelist.address)
        })

        it("It should follow the correct logic", async () => {
            // enroll anchor and supplier
            await whitelist.addAdmin(invoiceFactoryUpgrade.address)
            await invoiceFactoryUpgrade.enrollAnchor(user1.address)
            await invoiceFactoryUpgrade.enrollSupplier(user2.address)
            // trust verify anchor and supplier
            await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(user1.address)
            await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(user2.address)
            // admin sign supplier data
            let time = Date.now()
            let now = BigNumber.from(time)
            let two = BigNumber.from(2)
            let _time = now.mul(two.pow(128)).add(time + 1000000)
            const sigEJS = await utils.adminSign(
                100000,
                _time,
                "0.05",
                "Invoice pdf hash",
                "Invoice number hash",
                "anchor",
                user2.address,
                user1.address,
                true
            )
            // supplier upload invoice (with invoice pdf and anchor)
            await invoiceFactoryUpgrade.connect(user2).uploadInvoice(
                100000,
                _time,
                EthUtils.formatBytes32String("0.05"),
                EthUtils.formatBytes32String("Invoice pdf hash"),
                EthUtils.formatBytes32String("Invoice number hash"),
                EthUtils.formatBytes32String("anchor"),
                user1.address,
                true,
                sigEJS
            )
            // anchor verify invoice
            await invoiceFactoryUpgrade.connect(user1).anchorVerify(0)
            await invoiceFactoryUpgrade.invoiceToToken(0, "INVOICE", "INV")

            
        })

    })
})
