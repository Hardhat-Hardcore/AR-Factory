// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./libraries/utils/Address.sol";
import "./ERC1155ERC721.sol";
import "./ERC20Adapter.sol";

contract ERC1155ERC721WithAdapter is ERC1155ERC721 {
    using Address for address;

    mapping(uint256 => address) internal _adapters;
    address public template;

    event NewAdapter(uint256 indexed _tokenId, address indexed adpater);

    constructor() {
        template = address(new ERC20Adapter());
    }

    function getAdapter(uint256 _tokenId)
        external
        view
        returns (address)
    {
        return _adapters[_tokenId];  
    }

    function transferByAdapter(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _value
    )
        public
    {
        require(_adapters[_tokenId] == msg.sender, "Not adapter");

        if (_tokenId & NEED_TIME > 0) {
            updateHoldingTime(_from, _tokenId);
            updateHoldingTime(_to, _tokenId);
        }
        _transferFrom(_from, _to, _tokenId, _value);

        if (_to.isContract()) {
            require(
                _checkReceivable(msg.sender, _from, _to, _tokenId, _value, "", true, false),
                "Transfer rejected"
            );
        }
    }

    function _createAdapter(
        uint256 _tokenId,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    )
        internal
    {
        address adapter = _createClone(template);
        ERC20Adapter(adapter).initialize(_tokenId, _name, _symbol, _decimals);
        _adapters[_tokenId] = adapter;
        emit NewAdapter(_tokenId, adapter);
    }

    function _createClone(address target)
        internal
        returns (address result)
    {
        bytes20 targetBytes = bytes20(target);
        assembly {
            let clone := mload(0x40)
                mstore(clone, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
                mstore(add(clone, 0x14), targetBytes)
                mstore(add(clone, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
                result := create(0, clone, 0x37)
        }
    }
}
