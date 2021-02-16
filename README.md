# Factor Quick 

### Development environment
* Node: v12.0.0

### Packge install
`npm install`


### List contract bytecode size
`npx hardhat size-contracts`

### Generate test coverage report
`npx hardhat coverage` 

It creates a `coverage` folder that contains a web-format report.

Note that because of the network setting, gsn test(test/GSN.jss  will fail during coverage test. 


### Generate solidity document
Create a `docs` folder at the root directory of the project.

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
