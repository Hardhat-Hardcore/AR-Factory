// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IERC721Metadata.sol";
import "./interfaces/IERC1155Metadata.sol";
import "./ERC1155ERC721.sol";

contract ERC1155ERC721Metadata is ERC1155ERC721, IERC721Metadata, IERC1155Metadata {
    // Metadata
    mapping(uint256 => string) internal _tokenURI;

    bytes4 constant private INTERFACE_SIGNATURE_ERC1155Metadata = 0x0e89341c;
    bytes4 constant private INTERFACE_SIGNATURE_ERC721Metadata = 0x5b5e139f;
    
    // ERC165
    function supportsInterface(
        bytes4 _interfaceId
    )
        public
        pure
        override
        returns (bool)
    {
        if (_interfaceId == INTERFACE_SIGNATURE_ERC1155Metadata ||
            _interfaceId == INTERFACE_SIGNATURE_ERC721Metadata) {
            return true;
        } else {
            return super.supportsInterface(_interfaceId);
        }
    }

    // ERC1155
    function uri(uint256 _tokenId)
        external
        view
        override
        returns (string memory)
    {
       return _tokenURI[_tokenId]; 
    }

    // ERC721
    function name()
        external
        pure
        override
        returns (string memory)
    {
        return "TOKEN";
    }

    function symbol()
        external
        pure
        override
        returns (string memory)
    {
        return "TOKEN";
    }

    function tokenURI(uint256 _tokenId)
        external
        view
        override
        returns (string memory)
    {
        require(_nftOwners[_tokenId] != address(0), "Nft not exist");
        return _tokenURI[_tokenId];
    }

    // Internal
    function _setTokenURI(
        uint256 _tokenId,
        string memory _uri
    )
        internal
    {
        _tokenURI[_tokenId] = _uri;
    }
}
