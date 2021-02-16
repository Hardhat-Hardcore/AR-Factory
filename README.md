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
First you have to create a `docs` folder at the root directory of the project.

`npx hardhat docgen`

### Smart contact
There are three main smart contracts in this architecture.
1. `InvoiceFactoryUpgrade.sol`: Responsible for all the factor quick workflow implementation.
2. `TokenFactory.sol`: A multi-token management contract. It supports both ERC1155 and ERC721, and can create
ERC20 adapter contract for each token.
3. `Whitelist.sol`: A contract that manages the whitelit for GSN.


### Rules for invoice ID and token ID
Every invoice's invoice ID is unique. It starts from number 0, and then 1, 2, 3... and so on.

There are two attributes in token ID rules:
1. *IS_NFT* = 2^255
2. *NEED_TIME* = 2^254

By default, token ID starts from number 1, but if if token is a NFT(Total supply = 1), then its ID becomes 1 + *IS_NFT*.
Similarly, if token holding time calculation is needed for the next token, then its ID becomes 2 + *NEED_TIME*.
For the next token, if it hold both properties, its token ID becomes 3 + *IS_NFT* + *NEED_TIME*.

### Run test

Run all test files excludind `GSN.js` in `test/` folder:

`npm run test`

Run GSN test:

`npm run test-gsn`

### Run example scripts on ropten network
1. Setup mnemonic, relayhub, forwarder, and network in your .env file like the following example
```
MNEMONIC=xxx xxx xxx xxx...
RELAYHUB=0x29e41C2b329fF4921d8AC654CEc909a0B575df20
FORWARDER=0x25CEd1955423BA34332Ec1B60154967750a0297D
```
you can find the address of relayhub and forwarder on different networks at: [GSN List](https://docs.opengsn.org/contracts/addresses.html#ethereum)

2. To deploy contract `Whitelist`, `TokenFactory` and `InvoiceFactory`, run:

`npx hardhat run --network ropsten scripts/00_deploy.js`

Their address will be stored in json format in `scripts/build`.

3. To enroll user to supplier or anchor role, run:

`npx hardhat run --network ropsten scripts/01_enroll_supplier.js` or

`npx hardhat run --network ropsten scripts/02_enroll_anchor.js`

4. For supplier to upload invoice, change the `negotiationResult` object in `scripts/03_admin_sign_and_upload_invoice.js`, and run:

`npx hardhat run --network ropsten scripts/03_admin_sign_and_upload_invoice.js`

5. For anchor to verify the invoice information, run: 

`npx hardhat run --network ropsten scripts/04_anchor_verify_invoice.js`

6. To create token for invoice, run:

`npx hardhat run --network ropsten scripts/05_admin_create_token_for_invoice.js`

7. To set time interval for token holding time calculation, run:

`npx hardhat run --network ropsten scripts/06_trust_set_interval.js`

8. To upgrade invoiceFactory, run:

`npx hardhat run --network ropsten scripts/upgrade_proxy.js`

### Security nalysis report
