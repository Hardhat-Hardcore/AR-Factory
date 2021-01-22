// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./libraries/AccessControl.sol";
import "./GSN/BasePaymaster.sol";

contract Whitelist is IWhitelist, AccessControl, BasePaymaster {
    
    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");
        
    constructor(address _trustAddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(WHITELIST_ROLE, _msgSender());
        _setupRole(WHITELIST_ROLE, _trustAddress);
    }

    modifier onlyAdmin() {
        require(isAdmin(_msgSender()), "Restricted to admins.");
        _;
    }
    
    function preRelayedCall(
        GsnTypes.RelayRequest calldata relayRequest,
        bytes calldata signature,
        bytes calldata approvalData,
        uint256 maxPossibleGas
    )
        external
        view
        override
        relayHubOnly
        returns (
            bytes memory context,
            bool rejectOnRecipientRevert
        )
    {
        require(inWhitelist(relayRequest.request.from), "Address is not in whitelist");
        _verifyForwarder(relayRequest);
        _verifySignature(relayRequest, signature);
        // _verifySigner or not ?
        // _verifyGaslimit or not ?
        return ("PreRelayedCall success", false);
    }
    
    function postRelayedCall(
        bytes calldata context,
        bool success,
        uint256 gasUseWithoutPost,
        GsnTypes.RelayData calldata relayData
    )
        external
        override
        relayHubOnly
    {
        
    }
    
    function versionPaymaster() external override pure returns (string memory) {
        return "2.1.0";
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
        override
        onlyAdmin
        returns (bool)
    {
        _addWhitelist(_account);
        return true;
    }

    function removeWhitelist(address _account)
        public
        override
        onlyAdmin
        returns (bool)
    {
        _removeWhitelist(_account);
        return true;
    }
    
    function addAdmin(address _account)
        public
        override
        onlyAdmin
        returns (bool)
    {
        grantRole(DEFAULT_ADMIN_ROLE, _account);
        return true;
    }

    function _addWhitelist(address _account) internal {
        grantRole(WHITELIST_ROLE, _account);
    }

    function _removeWhitelist(address _account) internal {
        revokeRole(WHITELIST_ROLE, _account);
    }
    
}
