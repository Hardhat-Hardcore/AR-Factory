// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./libraries/AccessControl.sol";
import "./GSN/BasePaymaster.sol";

contract Whitelist is IWhitelist, AccessControl, BasePaymaster {

    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");
        
    constructor(address _trustAddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(WHITELIST_ROLE, _trustAddress);
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
    
    function versionPaymaster()
        external
        pure
        override
        returns (string memory)
    {
        return "2.1.0";
    }

    function isAdmin(address _account) 
        external
        view
        override
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
        return hasRole(WHITELIST_ROLE, _account) || hasRole(DEFAULT_ADMIN_ROLE, _account);
    }
    
    function removeAdmin(address _account)
        external
        override
    {
        revokeRole(DEFAULT_ADMIN_ROLE, _account);
    }

    function addWhitelist(address _account)
        external
        override
    {
        grantRole(WHITELIST_ROLE, _account);
    }

    function removeWhitelist(address _account)
        external
        override
    {
        revokeRole(WHITELIST_ROLE, _account);
    }
    
    function addAdmin(address _account)
        external
        override
    {
        grantRole(DEFAULT_ADMIN_ROLE, _account);
    }
}
