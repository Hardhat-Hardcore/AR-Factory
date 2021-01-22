// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IWhitelist {
    function addWhitelist(address _account) external returns (bool);
    function removeWhitelist(address _account) external returns (bool);
    function addAdmin(address _account) external returns (bool);
    function inWhitelist(address _account) external view returns (bool);
}
