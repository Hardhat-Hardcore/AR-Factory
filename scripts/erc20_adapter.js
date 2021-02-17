const { ethers } = require('hardhat')
const { address: tokenFactoryAddr } = require('../build/TokenFactory.json')

async function main () {
  const tokenId = 5
  const [owner, receiver, operator] = await ethers.getSigners()

  const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddr)
  const create = await tokenFactory["createToken(uint256,address,address,bool,bool)"](100, owner.address, operator.address, false, true)
  await create.wait()

  // Token ID, name, symbol, decimals
  const setAttribute = await tokenFactory.connect(operator).setERC20Attribute(
    tokenId, "My token", "COIN", 3, { gasLimit: 1000000 }
  )
  await setAttribute.wait()

  const adapter = await tokenFactory.getAdapter(tokenId) // Token ID
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
