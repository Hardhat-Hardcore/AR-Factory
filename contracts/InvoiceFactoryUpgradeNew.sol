// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import './InvoiceFactoryUpgrade.sol';

contract InvoiceFactoryUpgradeNew is InvoiceFactoryUpgrade {

    function newTokenFactoryWhitelist(address _newTokenFactory, address _newWhitelist)
        external
        onlyAdmin
    {
      tokenFactory = ITokenFactory(_newTokenFactory);
      whitelist = IWhitelist(_newWhitelist);
    }
}
