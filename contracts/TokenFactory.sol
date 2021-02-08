// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/ITokenFactory.sol";
import "./ERC1155ERC721Metadata.sol";
import "./ERC1155ERC721WithAdapter.sol";
import "./GSN/BaseRelayRecipient.sol";

contract TokenFactory is
    ITokenFactory,
    ERC1155ERC721Metadata,
    ERC1155ERC721WithAdapter,
    BaseRelayRecipient
{
    
    constructor (address _trustedForwarder) {
        trustedForwarder = _trustedForwarder;
    }

    function supportsInterface(bytes4 _interfaceId)
        public
        pure
        override(ERC1155ERC721Metadata, ERC1155ERC721)
        returns (bool)
    {
        return super.supportsInterface(_interfaceId);
    }

    function holdingTimeOf(
        address _owner,
        uint256 _tokenId
    )
        external
        view
        override
        returns (uint256)
    {
        require(_tokenId & NEED_TIME > 0, "Doesn't support this token");
        
        return _holdingTime[_owner][_tokenId] + _calcHoldingTime(_owner, _tokenId);
    }

    function recordingHoldingTimeOf(
        address _owner,
        uint256 _tokenId
    )
        external
        view
        override
        returns (uint256)
    {
        return _recordingHoldingTime[_owner][_tokenId] + _calcRecordingHoldingTime(_owner, _tokenId);
    }

    function createToken(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        bool _erc20
    )
        public 
        override
        returns (uint256)
    {
        uint256 tokenId = _mint(_supply, _receiver, _settingOperator, _needTime, "");
        if (_erc20)
            _createAdapter(tokenId);
        return tokenId;
    }
    
    function createToken(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        string calldata _uri,
        bool _erc20
    )
        external
        override
        returns (uint256)
    {
        uint256 tokenId = createToken(_supply, _receiver, _settingOperator, _needTime, _erc20);
        if (_erc20)
            _createAdapter(tokenId);
        _setTokenURI(tokenId, _uri);
        return tokenId;
    }

    function createTokenWithRecording(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        address _recordingOperator,
        bool _erc20
    )
        public
        override
        returns (uint256)
    {
        uint256 tokenId = createToken(_supply, _receiver, _settingOperator, _needTime, _erc20);
        if (_erc20)
            _createAdapter(tokenId);
        _mintCopy(tokenId, _supply, _recordingOperator);
        return tokenId;
    }

    function createTokenWithRecording(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        address _recordingOperator,
        string calldata _uri,
        bool _erc20
    )
        external
        override
        returns (uint256)
    {
        uint256 tokenId = createToken(_supply, _receiver, _settingOperator, _needTime, _erc20);
        if (_erc20)
            _createAdapter(tokenId);
        _mintCopy(tokenId, _supply, _recordingOperator);
        _setTokenURI(tokenId, _uri);
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
        require(_msgSender() == _settingOperators[_tokenId], "Not authorized");
        require(_startTime >= block.timestamp, "Time smaller than now");
        require(_endTime > _startTime, "End greater than start");

        _setTime(_tokenId, _startTime, _endTime);
        return;
    }
    
    function setERC20Attribute(
        uint256 _tokenId,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    )
        external
        override
    {
        require(_msgSender() == _settingOperators[_tokenId], "Not authorized");

        _setERC20Attribute(_tokenId, _name, _symbol, _decimals);
    }

    function versionRecipient()
        external
        override
        virtual
        view
        returns (string memory)
    {
        return "2.1.0";
    }

    function _msgSender()
        internal
        override(Context, BaseRelayRecipient)
        view
        returns (address payable)
    {
        return BaseRelayRecipient._msgSender();
    }
    
    function _msgData()
        internal
        override(Context, BaseRelayRecipient)
        view
        returns (bytes memory)
    {
        return BaseRelayRecipient._msgData();
    }
}
