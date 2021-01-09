// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITokenFactory {
    // set _needTime to true if want to know holding time, set _needCopy to true if need a recording token
    // return token id
    function createToken(uint256 _supply, address _receiver, , address _operator, bool _needTime, bool _needCopy) external returns(uint256);
    function setTimeInterval(uint256 _startTime, uint256 _endTime) external;
}
