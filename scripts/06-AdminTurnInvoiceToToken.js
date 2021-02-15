const { ethers } = require('hardhat')

let admin, supplier, anchor, trust
[admin, supplier, anchor, trust] = await ethers.getSigners()
await invoiceFactoryUpgrade.invoiceToToken(invoiceId)
