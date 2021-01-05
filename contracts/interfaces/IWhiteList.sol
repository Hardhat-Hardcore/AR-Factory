pragma solidity ^0.8.0;

interface Whitelist {
    
    // Enroll, BatchEnroll, Remove, BatchRemove are emit when actions are called.
    // Two Types of _type are suppliers and anchors.
    
    event Enroll(address indexed _address, string _type);
    
    event BatchEnroll(address[] indexed _addresses, string _type);
    
    event Remove(address indexed _address, string _type);
    
    event BatchRemove(address[] indexed _addresses, string _type);
    
    function enrollWhitelist(address _address, string calldata _type) external returns(bool);
    
    function enrollWhitelist(address[] calldata _addresses, string calldata _type) external returns(bool);
    
    function removeWhitelist(address _address, string calldata _type) external returns(bool);
    
    function removeWhitelist(address[] calldata _addresses, string calldata _type) external returns(bool);
    
    function inWhitelist(address _address, string calldata _type) external view returns (bool);

	function batchInWhitelist(address[] calldata _addresses, string calldata _type) external view returns (bool);
}

