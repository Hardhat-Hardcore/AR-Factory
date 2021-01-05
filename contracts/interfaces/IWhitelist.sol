pragma solidity ^0.8.0;

/**
 * Enroll, BatchEnroll, Remove, BatchRemove are emit when actions are called.
 * Roles are referred to by their `bytes32` identifier. These should be exposed
 * in the external API and be unique. The best way to achieve this is by
 * using `public constant` hash digests:
 *
 * ```
 * bytes32 public constant MY_ROLE = keccak256("MY_ROLE");
 * ```
 */

interface Whitelist {
    
    event Enroll(address indexed _address, bytes32 _role);
    
    event BatchEnroll(address[] indexed _addresses, bytes32 _role);
    
    event Remove(address indexed _address, bytes32 _role);
    
    event BatchRemove(address[] indexed _addresses, bytes32 _role);
    
    function enrollWhitelist(address _address, bytes32 _role) external returns(bool);
    
    function batchEnrollWhitelist(address[] calldata _addresses, bytes32 _role) external returns(bool);
    
    function removeWhitelist(address _address, bytes32 _role) external returns(bool);
    
    function batchRemoveWhitelist(address[] calldata _addresses, bytes32 _role) external returns(bool);
    
    function inWhitelist(address _address, bytes32 _role) external view returns (bool);
}

