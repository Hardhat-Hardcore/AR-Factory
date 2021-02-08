const { ethers, web3 } = require('hardhat')

async function getTransactionTimestamp (tx) {
  const block = await ethers.provider.getBlock(tx.blockNumber)
  return block.timestamp
}

async function mine (timestamp) {
  if (timestamp) { return ethers.provider.send('evm_mine', [timestamp]) }
  return ethers.provider.send('evm_mine')
}

async function setNextBlockTimestamp (timestamp) {
  return ethers.provider.send('evm_setNextBlockTimestamp', [timestamp])
}

async function increaseTime (timestamp) {
  return ethers.provider.send('evm_increaseTime', [timestamp])
}

const getWallet = (mnemonic, index = 0) => {
  return ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`)
}

async function getNextContractAddress(address, prev=false) {
  let nonce = await ethers.provider.getTransactionCount(address)
  if (prev)
    nonce -= 1
  const newAddress = ethers.utils.getContractAddress({from: address, nonce})
  return newAddress
}

const adminSign = async (txAmount, time, interest, pdfhash, numberhash, anchorName, supplier, anchor, list) => {
  const [ admin ] = await ethers.getSigners()
  const soliditySha3Expect = web3.utils.soliditySha3(
      { type: 'bytes4' , value: 'a18b7c27' },
      { type: 'uint256', value: txAmount },
      { type: 'uint256', value: time },
      { type: 'bytes32', value: ethers.utils.formatBytes32String(interest) },
      { type: 'bytes32', value: ethers.utils.formatBytes32String(pdfhash) },
      { type: 'bytes32', value: ethers.utils.formatBytes32String(numberhash) },
      { type: 'bytes32', value: ethers.utils.formatBytes32String(anchorName) },
      { type: 'address', value: supplier },
      { type: 'address', value: anchor },
      { type: 'bool'   , value: list}
  )
  let sigHashBytes = await ethers.utils.arrayify(soliditySha3Expect)
  let sigEJS = await admin.signMessage(sigHashBytes)
  return sigEJS
}


module.exports = {
  getTransactionTimestamp,
  mine,
  setNextBlockTimestamp,
  increaseTime,
  getWallet,
  getNextContractAddress,
  adminSign 
}
