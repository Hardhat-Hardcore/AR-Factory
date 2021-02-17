const { ethers } = require('hardhat')

const signInvoice = async (signer, txAmount, time, interest, pdfhash, numberhash, anchorName, supplier, anchor) => {
  const solidityKeccak256 = ethers.utils.solidityKeccak256(
    [
      'bytes4', 'uint256', 'uint256',
      'bytes32', 'bytes32', 'bytes32',
      'bytes32', 'address', 'address',
    ],
    [
      '0xa18b7c27', txAmount, time,
      ethers.utils.formatBytes32String(interest),
      ethers.utils.formatBytes32String(pdfhash),
      ethers.utils.formatBytes32String(numberhash),
      ethers.utils.formatBytes32String(anchorName),
      supplier, anchor
    ])
  let sigHashBytes = await ethers.utils.arrayify(solidityKeccak256)
  let sig = await signer.signMessage(sigHashBytes)
  return sig
}

module.exports = {
  signInvoice,
}
