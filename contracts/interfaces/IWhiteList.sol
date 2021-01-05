pragma solidity ^0.8.0;

interface WhiteList {
    
    // Enroll, BatchEnroll, Remove, BatchRemove are emit when actions are called.
    // ViewList is emit when viewWhiteList are called.
    // Two Types of _type are suppliers and anchors.
    
    event Enroll(address indexed _address, string _type);
    
    event BatchEnroll(address[] indexed _addresses, string _type);
    
    event Remove(address indexed _address, string _type);
    
    event BatchRemove(address[] indexed _addresses, string _type);
    
    event ViewList(string _type);
    
    function enrollWhiteList(address _address, string calldata _type) external returns(bool);
    
    function enrollWhiteList(address[] calldata _addresses, string calldata _type) external returns(bool);
    
    function removeWhiteList(address _address, string calldata _type) external returns(bool);
    
    function removeWhiteList(address[] calldata _addresses, string calldata _type) external returns(bool);
    
    function viewWhiteList() external view returns (address[] memory);
}

