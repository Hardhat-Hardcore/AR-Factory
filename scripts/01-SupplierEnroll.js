const { ethers } = require('hardhat')

let admin, supplier, anchor
[admin, supplier, anchor] = await ethers.getSigners()
await invoiceFactroyUpgrade.enrollSupplier(supplier.address)
await invoiceFactoryUpgrade.connect(trust).trustVerifySupplier(supplier.address)
