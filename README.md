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
1. Setup mnemonic in your .env file like the following: 
```
MNEMONIC=xxx xxx xxx xxx...
```

You can also setup network config at `hardhat.config.js`.
you can find the address of relayhub and forwarder on different networks at: [GSN List](https://docs.opengsn.org/contracts/addresses.html#ethereum)

2. To deploy contract `Whitelist`, `TokenFactory` and `InvoiceFactory`, run:

`npx hardhat run --network ropsten scripts/00_deploy.js`

Their address will be stored in json format in `scripts/build`.

3. To enroll user to supplier or anchor role, run:

`npx hardhat run --network ropsten scripts/01_enroll_supplier.js` or

`npx hardhat run --network ropsten scripts/02_enroll_anchor.js`

4. For supplier to upload invoice, you can change the `negotiationResult` object in `scripts/03_admin_sign_and_upload_invoice.js`, and run:

`npx hardhat run --network ropsten scripts/03_admin_sign_and_upload_invoice.js`

5. For anchor to verify the invoice information, run: 

`npx hardhat run --network ropsten scripts/04_anchor_verify_invoice.js`

6. To create token for invoice, run:

`npx hardhat run --network ropsten scripts/05_admin_create_token_for_invoice.js`

7. To set time interval for token holding time calculation, run:

`npx hardhat run --network ropsten scripts/06_trust_set_interval.js`

8. To transfer recording token, run:

`npx hardhat run --network ropsten scripts/07_transfer_recording_token.js`

9. To upgrade invoiceFactory, run:

`npx hardhat run --network ropsten scripts/upgrade_proxy.js`

10. To create a erc20 adapter, run:

`npx hardhat run --network ropsten scripts/erc20_adapter.js`

### GSN

#### relayed call example
- The GSN relayed call example is in `client` folder

#### configuration for smart contracts 
- Set trusted forwarder address in the constructor of contracts: `InvoiceFactoryUpgrade.sol` and `TokenFactory.sol`
- Set trusted forwarder address and relayHub address at `Whitelist.sol` through `setTrustedForwarder()` and `setRelayHub()` function.

#### deposit and withdraw ETH to paymaster(Whitelist) in order to pay for relayed request
- After deployment and address configuration, send ETH directly to the address of `Whitelist.sol`

#### run GSN server on localhost
1. Run the local chain
2. `npx gsn start`, will run a GSN server and show addresses of `RelayHub`, `Forwader`, `Paymaster`

### Security analysis report

The report of `TokenFactory.sol`, `InvoiceFactory.sl` an `Whitelist.sol` can be found in the `report` folder.

The analysis process including static analysis, dynamic analysis and symbolic execution.
