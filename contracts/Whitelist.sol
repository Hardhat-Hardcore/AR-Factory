// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./libraries/AccessControl.sol";

contract Whitelist is IWhitelist, AccessControl {
    
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");

    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");
    
    constructor(address _root) {
        _setupRole(DEFAULT_ADMIN_ROLE, _root);
        _setRoleAdmin(SUPPLIER_ROLE, DEFAULT_ADMIN_ROLE);
        _setRoleAdmin(ANCHOR_ROLE, DEFAULT_ADMIN_ROLE);
    }
    
    modifier onlyAdmin() {
        require(isAdmin(_msgSender()), "Restricted to admins.");
        _;
    }

    function isAdmin(address _account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE, _account);
    }

	function inWhitelist(address _account) external override view returns (bool) {
		return hasRole(SUPPLIER_ROLE, _account) || hasRole(ANCHOR_ROLE, _account);
	}
    
    function inSupplier(address _account) public view returns (bool) {
        return hasRole(SUPPLIER_ROLE, _account);
    }
    
    function inAnchor(address _account) public view returns (bool) {
        return hasRole(ANCHOR_ROLE, _account);
    }

    function addAdmin(address _account) public onlyAdmin {
        grantRole(DEFAULT_ADMIN_ROLE, _account);
    }
    
    function renounceAdmin() public {
        renounceRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }
    
    function addSupplier(address _account) public onlyAdmin {
        grantRole(SUPPLIER_ROLE, _account);
    }
    
    function addAnchor(address _account) public onlyAdmin {
        grantRole(ANCHOR_ROLE, _account);
    }
    
    function removeSupplier(address _account) public onlyAdmin {
        revokeRole(SUPPLIER_ROLE, _account);
    }
    
    function removeAnchor(address _account) public onlyAdmin {
        revokeRole(ANCHOR_ROLE, _account);
    }
}
