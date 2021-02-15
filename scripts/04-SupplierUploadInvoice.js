const { ethers } = require('hardhat')
const sign = require('signature')
const EthUtils = ethers.utils

let admin, supplier, anchor, trust
[admin, supplier, anchor, trust] = await ethers.getSigners()
const startTime = BigNumber.from(parseInt(Date.now() / 1000))
const endTime = BigNumber.from(parseInt((Date.now() + 1000000) / 1000))
const time = now.mul(BigNumber.from(2).pow(128)).add(endTime)
const negoResult = {
  txAmount: '1000',
  Time: time,
  interest: 'interest rate',
  pdfhash: 'pdf hash',
  numberhash: 'number hash',
  anchorName: 'anchor name',
  supplier: supplier.address,
  anchor: anchor.address,
  list: tolist
}
adminSig
await invoiceFactory.connect(supplier).uploadInvoice(
  negoResult.txAmount,
  negoResult.time,
  EthUtils.formatBytes32String(negoResult.interest),
  EthUtils.formatBytes32String(negoResult.pdfhash),
  EthUtils.formatBytes32String(negoResult.numberhash),
  EthUtils.formatBytes32String(negoResult.anchorName),
  anchor.address,
  negoResult.list,
  adminSig
}
