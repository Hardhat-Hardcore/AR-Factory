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
ROPSTEN_RPC=<ropsten rpc endpoint>
```

You can also setup network config at `hardhat.config.js`.
you can find the address of relayhub and forwarder on different networks at: [GSN List](https://docs.opengsn.org/contracts/addresses.html#ethereum)

2. To deploy contract `Whitelist`, `TokenFactory` and `InvoiceFactory`, run:

`npx hardhat run --network ropsten scripts/00_deploy.js`

Their address will be stored in json format in `build/` folder.

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

11. To create a token with uri, you can run:

`npx hardhat run --network ropsten scripts/create_nft_with_uri.js`  

The script sets a uri for created token and transfers it to a recipient address. The example uri contains a
image. To view the image, you can use a wallet that is compatible with NFT image like Metamask mobile app.

You can change the token name and symbol in `name` and `symbol` function in `contracts/ERC1155ERC721Metadata.sol`.

Here is a ERC721 metadata standard guide: [Metadata structure](https://docs.opensea.io/docs/metadata-standards#section-metadata-structure), 
 you could also add your own fields base on the needs.

### GSN

#### To run a relay server
* Follow the tutorial at [relay server deployment](https://docs.opengsn.org/relay-server/tutorial.html#directions)
* You can find a config example for ropsten network in `config` folder
* Once it's deployed, add relay server url to `preferredRelays` field when initializing `RelayProvider`:
```
  const web3provider = new Web3HttpProvider(url)
  const gsnProvider = await RelayProvider.newProvider({
    provider: web3provider,
    config: {
      loggerConfiguration: { logLevel: 'error' },
      paymasterAddress: paymasterAddr,
      preferredRelays: hre.network.config.relayerUrl ? [hre.network.config.relayerUrl] : [],
    },
  }).init()
```
You can find the full source code in `scripts/01_enroll_supplier.js`

#### Relayed call example
- The GSN relayed call example is in `client` folder

#### Configuration for smart contracts 
- Set trusted forwarder address in the constructor of contracts: `InvoiceFactoryUpgrade.sol` and `TokenFactory.sol`
- Set trusted forwarder address and relayHub address at `Whitelist.sol` through `setTrustedForwarder()` and `setRelayHub()` function.

#### Deposit ETH to paymaster(Whitelist) in order to pay for relayed request
- After deployment and address configuration, send ETH directly to the address of `Whitelist.sol`.  
- Note that these ETH will be used to pay for relayed transactions, so its balance will be deducted over time and will need to fund it
 again once its balance is not enough to pay for the gas. To see its balance state, call `alanceOf`  in `RelayHub` contract with the address of
   paymaster(Whitelist) as a parameter (Example [code](https://github.com/AegisCustody/bill_smart_contract/blob/840d53027100f3e4db54c9e7bb19c6c454ba4493/test/GSN.js#L221)).

#### Withdraw ETH from paymaster(Whitelist)
- If you want to withdraw the funds in paymaster, call `withdrawRelayHubDepositTo` function in paymaster(Whitelist)
- Example [code](https://github.com/AegisCustody/bill_smart_contract/blob/840d53027100f3e4db54c9e7bb19c6c454ba4493/test/GSN.js#L216)

#### Run GSN server on localhost
1. Run a local chain on port 8545
2. `npx gsn start`, will start a GSN server and show addresses of `RelayHub`, `Forwader`, `Paymaster`

### Security analysis report

The report of `TokenFactory.sol`, `InvoiceFactory.sl` an `Whitelist.sol` can be found in the `report` folder.

The analysis process including static analysis, dynamic analysis and symbolic execution.
