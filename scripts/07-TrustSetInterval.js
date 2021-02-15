const { ethers } = require('hardhat')

let admin, supplier, anchor, trust
[admin, supplier, anchor, trust] = await ethers.getSigners()
await invoiceFactoryUpgrade.connect(trust).setTimeInterval(0, invoiceTime + 1000, dueTime + 10000000)

