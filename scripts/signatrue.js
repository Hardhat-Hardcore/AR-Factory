const { ethers, web3 } = require('hardhat')
require('dotenv').config()

const adminSign = async (txAmount, time, interest, pdfhash, numberhash, anchorName, supplier, anchor, list) => {
  const [admin] = await ethers.getSigners()
  const soliditySha3Expect = web3.utils.soliditySha3(
    { type: 'bytes4', value: 'a18b7c27' },
    { type: 'uint256', value: txAmount },
    { type: 'uint256', value: time },
    { type: 'bytes32', value: ethers.utils.formatBytes32String(interest) },
    { type: 'bytes32', value: ethers.utils.formatBytes32String(pdfhash) },
    { type: 'bytes32', value: ethers.utils.formatBytes32String(numberhash) },
    { type: 'bytes32', value: ethers.utils.formatBytes32String(anchorName) },
    { type: 'address', value: supplier },
    { type: 'address', value: anchor },
    { type: 'bool', value: list }
  )
  let sigHashBytes = await ethers.utils.arrayify(soliditySha3Expect)
  let sigEJS = await admin.signMessage(sigHashBytes)
  return sigEJS
}

module.exports = {
  adminSign
}
