// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IWhitelist {
    function addWhitelist(address _account) external;
    function removeWhitelist(address _account) external;
    function addAdmin(address _account) external;
    function removeAdmin(address _account) external;
    function inWhitelist(address _account) external view returns (bool);
    function isAdmin(address _account) external view returns (bool);
}
