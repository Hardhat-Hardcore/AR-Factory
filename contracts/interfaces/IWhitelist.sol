// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IWhitelist {
    function addSupplier(address _account) external;
    function addAnchor(address _account) external;
    function removeSupplier(address _account) external;
    function removeAnchor(address _account) external;
    function inSupplier(address _account) external view returns (bool);
    function inAnchor(address _account) external view returns (bool);
}
