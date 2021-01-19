// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/ITokenFactory.sol";
import "./ERC1155ERC721.sol";
import "./GSN/BaseRelayRecipient.sol";

contract TokenFactory is ERC1155ERC721, ITokenFactory, BaseRelayRecipient {

    function createToken(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime
    )
        public 
        override
        returns(uint256)
    {
        uint256 tokenId = _mint(_supply, _receiver, _settingOperator, _needTime, "");
        return tokenId;
    }
    
    function createToken(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        string calldata _uri
    )
        external
        override
        returns(uint256)
    {
        uint256 tokenId = createToken(_supply, _receiver, _settingOperator, _needTime);
        // TODO: set uri
        _uri;
        return tokenId;
    }

    function createTokenWithRecording(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        address _recordingOperator
    )
        public
        override
        returns(uint256)
    {
        uint256 tokenId = createToken(_supply, _receiver, _settingOperator, _needTime);
        _mintCopy(tokenId, _supply, _recordingOperator);
        return tokenId;
    }

    function createTokenWithRecording(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        address _recordingOperator,
        string calldata _uri
    )
        external
        override
        returns(uint256)
    {
        uint256 tokenId = createToken(_supply, _receiver, _settingOperator, _needTime);
        _mintCopy(tokenId, _supply, _recordingOperator);
        // TODO: set uri
        _uri;
        return 0;
    }
    
    function setTimeInterval(
        uint256 _tokenId,
        uint128 _startTime,
        uint128 _endTime
    )
        external
        override
    {
        _setTime(_tokenId, _startTime, _endTime);
        return;
    }

    function _msgSender() internal override(Context, BaseRelayRecipient) view returns (address payable) {
        return BaseRelayRecipient._msgSender();
    }
    
    function _msgData() internal override(Context, BaseRelayRecipient) view returns (bytes memory) {
        return BaseRelayRecipient._msgData();
    }
    
    function versionRecipient() external override virtual view returns (string memory) {
        return "2.1.0";
    }
}
