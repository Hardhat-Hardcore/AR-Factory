const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("Whitelist", () => {

    let adminAddress
    let trustAddress
    let usrAddress
    let whitelist

    beforeEach(async () => {
        const Whitelist = await ethers.getContractFactory("Whitelist")
        const [admin, trust, usr1] = await ethers.getSigners()
        adminAddress = admin.address
        trustAddress = trust.address
        usrAddress = usr1.address
        whitelist = await Whitelist.deploy(trustAddress)
        await whitelist.deployed()
    })

    it("The admin should be correct.", async () => {
        expect(await whitelist.isAdmin(adminAddress)).to.equal(true)
        expect(await whitelist.isAdmin(trustAddress)).to.equal(false)
    })

    it("Should be able to add user into whitelist", async () => {
        expect(await whitelist.inWhitelist(usrAddress)).to.equal(false)
        await whitelist.addWhitelist(usrAddress)
        expect(await whitelist.inWhitelist(usrAddress)).to.equal(true)
    })

    it("Should be able to remove user from whitelist", async () => {
        await whitelist.addWhitelist(usrAddress)
        expect(await whitelist.inWhitelist(usrAddress)).to.equal(true)
        await whitelist.removeWhitelist(usrAddress)
        expect(await whitelist.inWhitelist(usrAddress)).to.equal(false)
    })

})
