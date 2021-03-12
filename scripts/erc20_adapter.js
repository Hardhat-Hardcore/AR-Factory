const { ethers } = require('hardhat')
const { address: tokenFactoryAddr } = require('../build/TokenFactory.json')

const DECIMALS = 3
const amount = 100

async function main () {
  const [owner, receiver, operator] = await ethers.getSigners()

  const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddr)
  const create = await tokenFactory["createToken(uint256,address,address,bool,bool)"](amount, owner.address, operator.address, false, true)
  const receipt = await create.wait()

  const filter = tokenFactory.filters.TransferSingle()
  const events = await tokenFactory.queryFilter(filter, receipt.blockNumber)

  const tokenId = events[0].args._tokenId
  console.log("Token ID:", tokenId.toString())

  // Token ID, name, symbol, decimals
  // Should set gas limit manually because it involves some assembly operations so that gas estimation
  //  will not be accurate
  const setAttribute = await tokenFactory.connect(operator).setERC20Attribute(
    tokenId, "My token", "COIN", DECIMALS, { gasLimit: 1000000 }
  )
  await setAttribute.wait()

  const adapter = await tokenFactory.getAdapter(tokenId)
  const erc20 = await ethers.getContractAt('ERC20Adapter', adapter)

  console.log("ERC20 Address:", adapter)

  const tx = await erc20.transfer(receiver.address, 100)
  console.log("ERC20 transfer tx hash:", tx.hash) 
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
