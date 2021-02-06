const { ethers } = require('hardhat')

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

async function getNextContractAddress(address) {
  const nonce = await ethers.provider.getTransactionCount(address)
  const newAddress = ethers.utils.getContractAddress({from: address, nonce})
  return newAddress
}

module.exports = {
  getTransactionTimestamp,
  mine,
  setNextBlockTimestamp,
  increaseTime,
  getWallet,
  getNextContractAddress,
}
