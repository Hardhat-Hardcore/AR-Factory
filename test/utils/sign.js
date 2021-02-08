const { ethers, web3 } = require("hardhat")

const sign = async ( anchorAddress, invoiceId ) => {
    const [ admin ] = await ethers.getSigners()
    invoice_message = web3.utils.sha3(anchorAddress + invoiceId)
    let sigHashBytes = ethers.utils.arrayify(invoice_message)
    let sig = await user.signMessage(sigHashBytes)
    sig = ethers.utils.formatBytes32String(sig) 
    return sig
}

module.exports = {
    sign
}
