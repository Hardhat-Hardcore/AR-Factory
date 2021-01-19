// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITokenFactory {
    function createToken(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime
    ) external returns(uint256);
    
    function createToken(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        string calldata _uri
    ) external returns(uint256);

    function createTokenWithRecording(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        address _recordingOperator
    ) external returns(uint256);

    function createTokenWithRecording(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        address _recordingOperator,
        string calldata _uri
    ) external returns(uint256);
    
    function setTimeInterval(
        uint256 _tokenId,
        uint128 _startTime,
        uint128 _endTime
    ) external;

    function holdingTimeOf(
        uint256 _tokenId,
        address _owner
    ) external view returns(uint256);

    function recordingHoldingTimeOf(
        uint256 _tokenId,
        address _owner
    ) external view returns(uint256);
}
