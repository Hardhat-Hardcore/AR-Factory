const { ethers } = require('hardhat')
const sign = require('signature')

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
const adminSig = await sign.signInvoice(
  admin,
  negoResult.txAmount,
  negoResult.Time,
  negoResult.interest,
  negoResult.pdfhash,
  negoResult.numberhash,
  negoResult.supplier,
  negoResult.anchor,
  negoResult.list
)
