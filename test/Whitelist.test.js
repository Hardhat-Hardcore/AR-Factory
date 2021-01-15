const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("Whitelist", () => {

	let adminAddress
	let usr1Address
	let whitelist

	beforeEach(async () => {
		const Whitelist = await ethers.getContractFactory("Whitelist")
		const [admin, usr1] = await ethers.getSigners()
		adminAddress = admin.address
		usr1Address = usr1.address
		whitelist = await Whitelist.deploy(adminAddress)
		await whitelist.deployed()
	})

	it("The admin should be correct.", async () => {
		const [admin, usr1] = await ethers.getSigners()
		expect(await whitelist.isAdmin(adminAddress)).to.equal(true)
		expect(await whitelist.isAdmin(usr1Address)).to.equal(false)
	})
	
	it("Should be able to add anchor into whitelist", async () => {
		expect(await whitelist.inAnchor(usr1Address)).to.equal(false)
		await whitelist.addAnchor(usr1Address)
		expect(await whitelist.inAnchor(usr1Address)).to.equal(true)
	})
	
	it("Should be able to add supplier into whitelist", async () => {
		expect(await whitelist.inAnchor(usr1Address)).to.equal(false)
		await whitelist.addSupplier(usr1Address)
		expect(await whitelist.inSupplier(usr1Address)).to.equal(true)
	})
	
	it("Should be able to remove supplier from whitelist", async () => {
		await whitelist.addSupplier(usr1Address)
		expect(await whitelist.inSupplier(usr1Address)).to.equal(true)
		await whitelist.removeSupplier(usr1Address)
		expect(await whitelist.inSupplier(usr1Address)).to.equal(false)
	})

	it("Should be able to remove anchor from whitelist", async () => {
		await whitelist.addAnchor(usr1Address)
		expect(await whitelist.inAnchor(usr1Address)).to.equal(true)
		await whitelist.removeAnchor(usr1Address)
		expect(await whitelist.inAnchor(usr1Address)).to.equal(false)
	})
})
