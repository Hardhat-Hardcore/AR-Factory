// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./libraries/AccessControl.sol";

contract Whitelist is IWhitelist, AccessControl {

    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");

    constructor(address _trustAddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(WHITELIST_ROLE, _trustAddress);
    }

    modifier onlyAdmin() {
        require(isAdmin(_msgSender()), "Restricted to admins.");
        _;
    }


    function isAdmin(address _account) 
        public
        view
        returns (bool)
    {
        return hasRole(DEFAULT_ADMIN_ROLE, _account);
    }

    function inWhitelist(address _account)
        public
        view
        override
        returns (bool)
    {
        return hasRole(WHITELIST_ROLE, _account);
    }
    
    function renounceAdmin(address _account)
        public
        onlyAdmin 
    {
        renounceRole(DEFAULT_ADMIN_ROLE, _account);
    }

    function addWhitelist(address _account)
        public
        onlyAdmin
    {
        _addWhitelist(_account);
    }

    function removeWhitelist(address _account)
        public
        onlyAdmin 
    {
        _removeWhitelist(_account);
    }
    
    function 

    function _addWhitelist(address _account) internal {
        grantRole(WHITELIST_ROLE, _account);
    }

    function _removeWhitelist(address _account) internal {
        revokeRole(WHITELIST_ROLE, _account);
    }
    
}
