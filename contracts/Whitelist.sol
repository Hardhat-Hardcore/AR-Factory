// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./libraries/AccessControl.sol";

contract Whitelist is IWhitelist, AccessControl {

    address public TRUST;
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");

    constructor(address _root, address _trust) {
        /* 
            need change setupRole here
        */
        _setupRole(DEFAULT_ADMIN_ROLE, _trust);
        // _setupRole(DEFAULT_ADMIN_ROLE, TRUST);
        // _setupRole(SUPPLIER_ROLE, _root);
        // _setupRole(ANCHOR_ROLE, _root);
        // _setRoleAdmin(SUPPLIER_ROLE, DEFAULT_ADMIN_ROLE);
        // _setRoleAdmin(ANCHOR_ROLE, DEFAULT_ADMIN_ROLE);
    }

    modifier onlyAdmin() {
        require(isAdmin(_msgSender()), "Restricted to admins.");
        _;
    }

    modifier onlySupplier() {
        require(inSupplier(_msgSender()), "Restricted to suppliers.");
        _;
    }

    modifier onlyAnchor() {
        require(inAnchor(_msgSender()), "Restricted to anchors.");
        _;
    }

    function isAdmin(address _account) 
        public
        view
        returns (bool)
    {
        return hasRole(DEFAULT_ADMIN_ROLE, _account);
    }

    function inSupplier(address _account)
        public
        view
        override
        returns (bool)
    {
        return hasRole(SUPPLIER_ROLE, _account);
    }

    function inAnchor(address _account)
        public
        view
        override
        returns (bool) 
    {
        return hasRole(ANCHOR_ROLE, _account);
    }

    function renounceAdmin(address _account)
        public
        onlyAdmin 
    {
        renounceRole(DEFAULT_ADMIN_ROLE, _account);
    }

    function addSupplier(address _account)
        public
        override
        onlyAdmin 
    {
        _addSupplier(_account);
    }

    function addAnchor(address _account)
        public
        override
        onlyAdmin
    {
        _addAnchor(_account);
    }

    function removeSupplier(address _account) 
        public
        override
        onlyAdmin
    {
        _removeSupplier(_account);
    }

    function removeAnchor(address _account)
        public
        override
        onlyAdmin 
    {
        _removeAnchor(_account);
    }

    function _addSupplier(address _account) internal {
        grantRole(SUPPLIER_ROLE, _account);
    }

    function _addAnchor(address _account) internal {
        grantRole(ANCHOR_ROLE, _account);
    }

    function _removeSupplier(address _account) internal {
        revokeRole(SUPPLIER_ROLE, _account);
    }

    function _removeAnchor(address _account) internal {
        revokeRole(ANCHOR_ROLE, _account);
    }
}
