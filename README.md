# Development Guide

### Business Logic
1. Inherit `IWhitelist.sol`, 提供查詢白單節接口
2. 參考官方 AccessControl.sol 使用建議
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
https://hardhat.org/plugins/hardhat-contract-sizer.html
