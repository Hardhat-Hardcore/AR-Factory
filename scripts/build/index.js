let address = { 
  whitelist: '', 
  tokenFactory: '',
  invoiceFactory: '',
}

const updateAddress = ( type, address) => {
  switch (type) {
    case 'whitelist':
        address.whitelist = address
    case 'tokenFactory':
        address.tokenFactory = address
    case 'invoiceFactory':
        address.invoiceFactory = address
    default:
        return
  }
}

module.exports = {
  address,
  updateAddress
}
