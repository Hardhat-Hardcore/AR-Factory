const { expect } = require("chai");
const private_key = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
let adminAccount = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";
let mockAccount = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";

describe("Whitelist", function() {
	beforeEach(async function() {
		const Whitelist = await ethers.getContractFactory("Whitelist");
		this.whitelist = await Whitelist.deploy(adminAccount);
		await this.whitelist.deployed();
	});

	it("The admin should be correct.", async function() {
		expect(await this.whitelist.isAdmin(adminAccount)).to.equal(true);
		expect(await this.whitelist.isAdmin(mockAccount)).to.equal(false);
	});
	
	it("Should be able to add anchor into whitelist", async function() {
		expect(await this.whitelist.inAnchor(mockAccount)).to.equal(false);
		await this.whitelist.addAnchor(mockAccount);
		expect(await this.whitelist.inAnchor(mockAccount)).to.equal(true);	
	});
	
	it("Should be able to add supplier into whitelist", async function() {
		expect(await this.whitelist.inAnchor(mockAccount)).to.equal(false);
		await this.whitelist.addSupplier(mockAccount);
		expect(await this.whitelist.inSupplier(mockAccount)).to.equal(true);
	});
	
	it("Should be able to remove supplier from whitelist", async function() {
		await this.whitelist.addSupplier(mockAccount);
		expect(await this.whitelist.inSupplier(mockAccount)).to.equal(true);
		await this.whitelist.removeSupplier(mockAccount);
		expect(await this.whitelist.inSupplier(mockAccount)).to.equal(false);
	});

	it("Should be able to remove anchor from whitelist", async function() {
		await this.whitelist.addAnchor(mockAccount);
		expect(await this.whitelist.inAnchor(mockAccount)).to.equal(true);
		await this.whitelist.removeAnchor(mockAccount);
		expect(await this.whitelist.inAnchor(mockAccount)).to.equal(false);
	});
});
