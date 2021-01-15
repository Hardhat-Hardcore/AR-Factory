// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/ITokenFactory.sol";
import "./ERC1155ERC721.sol";
import "./GSN/BaseRelayRecipient.sol";

contract TokenFactory is ERC1155ERC721, ITokenFactory, BaseRelayRecipient {
    function createToken(
        uint256 _supply,
        address _receiver,
        address _operator,
        bool _needTime,
        bool _needCopy
    )
        external
        override
        returns(uint256)
    {
        uint256 tokenId = _mint(_supply, _receiver, _operator, _needTime, "");
        if (_needCopy)
            _mintCopy(tokenId, _supply, _receiver);
            
        return tokenId;
    }
    
    function createToken(
        uint256 _supply,
        address _receiver,
        address _operator,
        bool _needTime,
        bool _needCopy,
        string calldata _uri
    )
        external
        override
        returns(uint256)
    {
        return 0;
    }
    
    function setTimeInterval(
        uint256 _startTime,
        uint256 _endTime
    )
        external
        override
    {
        return;
    }

    function versionRecipient() external override virtual view returns (string memory) {
        return "2.1.0";
    }
    
    function _msgSender() internal override(Context, BaseRelayRecipient) view returns (address payable ret) {
        return BaseRelayRecipient._msgSender();
    }
    
    function _msgData() internal override(Context, BaseRelayRecipient) view returns (bytes memory ret) {
        return BaseRelayRecipient._msgData();
    }
}
