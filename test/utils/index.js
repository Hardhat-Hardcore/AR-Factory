const { ethers } = require('hardhat')
const BigNumber = ethers.BigNumber
require('dotenv').config({ path: require('find-config')('.env') })

const mnemonic = process.env.MNEMONIC || 'test test test test test test test test test test test junk'

async function getTransactionTimestamp (tx) {
  const block = await ethers.provider.getBlock(tx.blockNumber)
  return block.timestamp
}

async function mine (timestamp) {
  if (BigNumber.isBigNumber(timestamp))
    timestamp = timestamp.toNumber()
  if (timestamp) { return ethers.provider.send('evm_mine', [timestamp]) }
  return ethers.provider.send('evm_mine')
}

async function setNextBlockTimestamp (timestamp) {
  if (BigNumber.isBigNumber(timestamp))
    timestamp = timestamp.toNumber()
  return ethers.provider.send('evm_setNextBlockTimestamp', [timestamp])
}

async function increaseTime (timestamp) {
  if (BigNumber.isBigNumber(timestamp))
    timestamp = timestamp.toNumber()
  return ethers.provider.send('evm_increaseTime', [timestamp])
}

function getWallet (index=0) {
  return ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${index}`)
}

async function getNextContractAddress (address, prev = false) {
  let nonce = await ethers.provider.getTransactionCount(address)
  if (prev)
    nonce -= 1
  const newAddress = ethers.utils.getContractAddress({ from: address, nonce })
  return newAddress
}

async function getCurrentTimestamp() {
  const { timestamp } = await ethers.provider.getBlock()
  return timestamp
}

async function signInvoice 
(signer, invoiceAmount, time, interest, pdfHash, invoiceNumberHash, anchorNameHash, supplier, anchor) {
  const solidityKeccak256 = ethers.utils.solidityKeccak256(
    [
      'bytes4', 'uint256', 'uint256', 
      'bytes32', 'bytes32', 'bytes32', 
      'bytes32', 'address', 'address',
    ], 
    [
      '0xa18b7c27', invoiceAmount ,time,
      ethers.utils.formatBytes32String(interest),
      ethers.utils.formatBytes32String(pdfHash),
      ethers.utils.formatBytes32String(invoiceNumberHash),
      ethers.utils.formatBytes32String(anchorNameHash),
      supplier, anchor
    ]
  )

  let sigHashBytes = await ethers.utils.arrayify(solidityKeccak256)
  let sig = await signer.signMessage(sigHashBytes)
  return sig
}

module.exports = {
  getTransactionTimestamp,
  mine,
  setNextBlockTimestamp,
  increaseTime,
  getWallet,
  getNextContractAddress,
  signInvoice,
  getCurrentTimestamp,
}
