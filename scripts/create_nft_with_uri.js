const { ethers } = require('hardhat')
const { address: tokenFactoryAddr } = require('../build/TokenFactory.json')

const uri = "https://api.forge.lootex.io/v1/assets/0xb4ef476397a544db0261be5814c07f7eb2de09b5/1"
const recipient = "0x75458d07dBC996f16b68a596D52602728E7E67f5"

async function main () {
  const [owner, receiver, operator] = await ethers.getSigners()

  const tokenFactory = await ethers.getContractAt('TokenFactory', tokenFactoryAddr)
  const create = await tokenFactory["createToken(uint256,address,address,bool,string,bool)"](
    1, owner.address, operator.address, false, uri, false
  )
  const receipt = await create.wait()

  const filter = tokenFactory.filters.TransferSingle()
  const events = await tokenFactory.queryFilter(filter, receipt.blockNumber)

  const tokenId = events[0].args._tokenId
  console.log("Token ID:", tokenId.toString())

  const tx = await tokenFactory["safeTransferFrom(address,address,uint256,uint256,bytes)"](
    owner.address, recipient, tokenId, 1, []
  )
  await tx.wait()
  console.log("Transfer tx hash:", tx.hash) 
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
