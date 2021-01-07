// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

interface IWhitelist {
    
    function inSupplier(address _address) external view returns (bool);
    
    function inAnchor(address _address) external view returns (bool);
}
