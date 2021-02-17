const gsn = require('@opengsn/gsn')
const ethers = require('ethers')

const paymasterAddr = '0x14912F704b4Eaa1Eb62fd76eD72FA9A0B61d9C16'
const contractAddr = '0x9aDa76938FaA7483520EB5237E08547C7579bc9e'
const { abi: contractAbi } = require('../artifacts/contracts/mock/TokenFactoryMock.sol/TokenFactoryMock.json')

let provider
let userAddr

const connectToGsn = async () => {
  await window.ethereum.enable()

  let gsnProvider = await gsn.RelayProvider.newProvider({
    provider: window.web3.currentProvider,
    config: { paymasterAddress: paymasterAddr },
  }).init()

  provider = new ethers.providers.Web3Provider(gsnProvider)
  userAddr = gsnProvider.origProvider.selectedAddress

  window.app.gsnProvider = gsnProvider
  window.app.provider = provider
  window.app.userAddr = userAddr
}

const gsnContractCall = async () => {
  await connectToGsn()
  await provider.ready

  const contract = await new ethers.Contract(
    contractAddr, contractAbi, provider.getSigner(userAddr))

  await contract.relayCall()
}

window.app = {
  gsnContractCall: gsnContractCall,
}
