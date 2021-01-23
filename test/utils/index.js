const { ethers } = require("hardhat")

async function getTransactionTimestamp(tx) {
  const block = await ethers.provider.getBlock(tx.blockNumber)
  return block.timestamp
}

async function mine(timestamp) {
  if (timestamp)
    return ethers.provider.send("evm_mine", [timestamp])
  return ethers.provider.send("evm_mine")
}

async function setNextBlockTimestamp(timestamp) {
  return ethers.provider.send("evm_setNextBlockTimestamp", [timestamp])
}

async function increaseTime(timestamp) {
  return ethers.provider.send("evm_increaseTime", [timestamp])
}

module.exports = {
  getTransactionTimestamp,
  mine,
  setNextBlockTimestamp,
  increaseTime,
}
