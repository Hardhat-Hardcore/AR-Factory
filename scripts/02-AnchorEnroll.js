const { ethers } = require('hardhat')

let admin, supplier, anchor, trust
[admin, supplier, anchor, trust] = await ethers.getSigners()
await invoiceFactroyUpgrade.enrollAnchor(anchor.address)
await invoiceFactoryUpgrade.connect(trust).trustVerifyAnchor(anchor.address)
