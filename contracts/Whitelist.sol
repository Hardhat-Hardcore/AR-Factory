// SPDX-License-Identifier: MIT

pragma solidity 0.8.1;

import "./interfaces/IWhitelist.sol";
import "./libraries/AccessControl.sol";
import "./GSN/BasePaymaster.sol";

/// @title GNS whitelist contract
contract Whitelist is IWhitelist, AccessControl, BasePaymaster {

    bytes32 public constant WHITELIST_ROLE = keccak256("WHITELIST_ROLE");
        
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
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
        require(
            inWhitelist(relayRequest.request.from) ||
            isAdmin(relayRequest.request.from),
            "Address is not in whitelist"
        );

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

    /// @notice Quries whether an address has role admin
    /// @param _account The address to be queried
    /// @return `True` if `_account` has role admin
    function isAdmin(address _account) 
        public
        view
        override
        returns (bool)
    {
        return hasRole(DEFAULT_ADMIN_ROLE, _account);
    }

    /// @notice Queries whether an address has role whitelist
    /// @param _account The address to be queried
    /// @return `True` if `_account` has role whitelist
    function inWhitelist(address _account)
        public
        view
        override
        returns (bool)
    {
        return hasRole(WHITELIST_ROLE, _account);
    }
    
    /// @notice Remove an address from role admin
    /// @dev It throws if `msg.sender` does no have role admin.
    ///  It does not throw if address is not in role admin.
    /// @param _account The address to be removed
    function removeAdmin(address _account)
        external
        override
    {
        revokeRole(DEFAULT_ADMIN_ROLE, _account);
    }

    /// @notice Insert an address into role whitelist
    /// @dev It does not throw if address already has role whitelist
    /// @param _account The address to be inserted
    function addWhitelist(address _account)
        external
        override
    {
        grantRole(WHITELIST_ROLE, _account);
    }

    /// @notice Remove an address from role whitelist
    /// @dev It throws if `msg.sender` does no have role admin.
    ///  It does not throw if address is not in role whitelist.
    /// @param _account The address to be removed
    function removeWhitelist(address _account)
        external
        override
    {
        revokeRole(WHITELIST_ROLE, _account);
    }
    
    /// @notice Insert an address into role admin
    /// @dev It does not throw if address already has role admin
    /// @param _account The address to be inserted
    function addAdmin(address _account)
        external
        override
    {
        grantRole(DEFAULT_ADMIN_ROLE, _account);
    }
}
