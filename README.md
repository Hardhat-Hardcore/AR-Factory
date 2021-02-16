# Development Guide

### Business Logic
1. Inherit `IWhitelist.sol`, 提供查詢白單節接口
2. 參考官方 `AccessControl.sol` 使用建議
3. 生成數位資產與設定參考 `ITokenFactory.sol`
4. GSN 參考 OpenGSN
5. Upgrade Proxy 參考 Hardhat upgrade
6. Inherit `Context.sol`

### TokenFactory
1. 繼承 `ITokenFactory.sol` 
2. 使用 `IWhitelist.sol` 查詢白名單
3. GSN 參考 OpenGSN
4. CloneFactory 參考 erc1167
5. Inherit `Context.sol`

### To show contract size
`npx hardhat size-contracts`

### To see test coverage
`npx hardhat coverage`

### To generate solidity document
`npx hardhat docgen`

### Deployment Steps
**RECOMMANDATION: The deploy address should deposit at least 0.5 ETH into RelayHub
1. Setup Mnemonic, relayhub, forwarder, and network in your .env file like the following example</br>
MNEMONIC=xxx xxx xxx xxx...</br>
RELAYHUB=Relayhub address</br>
FORWARDER=forwarder address</br>
NETWORK=the network you want to deploy on</br>
2. Run the following command: `npx hardhat run --network YOUR_CUSTOM_NETWORK script/00_deploy.js` to deploy whitelist, tokenFactory, invoiceFactory, their address will be store in json format in `scripts/build` 
3. To enroll user to supplier or anchor role, run `npx hardhat run --network YOUR_CUSTOM_NETWORK script/01_enroll_supplier.js` or `npx hardhat run --network YOUR_CUSTOM_NETWORK script/02_enroll_anchor.js` to enroll users into supplier, and anchor role
4. For supplier to upload invoice, change the negoResult in 03_admin_sign_and_upload_invoice.js file, and run `npx hardhat run --network YOUR_CUSTOM_NETWORK script/03_admin_sign_and_upload_invoice.js`
5. For anchor to verify the invoice information, run `npx hardhat run --network YOUR_CUSTOM_NETWORK script/07_update_proxy.js`
6. To turn the invoice that supplier uploaded to token, run ` npx hardhat run --network YOUR_CUSTOM_NETWORK script/05_admin_turn_invoice_to_token.js`
7. Then run `npx hardhat run --network YOUR_CUSTOM_NETWORK script/06_trust_set_interval.js` to set time interval
8. To update a modified invoiceFactory, run `npx hardhat run --network YOUR_CUSTOM_NETWORK script/07_update_proxy.js`
