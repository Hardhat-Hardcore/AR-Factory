const fs = require('fs')
const addressToJson = (name, action, address, txHash) => {
  const jsonString = JSON.stringify({ action, address, txHash })
  fs.writeFileSync(`./scripts/build/${name}.json`, jsonString)
}

module.exports = {
  addressToJson
}
