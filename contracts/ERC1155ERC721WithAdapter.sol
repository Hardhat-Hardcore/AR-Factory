// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IERC20.sol";
import "./libraries/utils/Address.sol";
import "./ERC1155ERC721.sol";

contract ERC1155ERC721WithAdapter is
    ERC1155ERC721
{
    using Address for address;

    mapping(uint256 => address) internal _adapters;
    address public template;

    event NewAdapter(uint256 indexed _tokenId, address indexed _adapter);

    constructor() {
        template = address(new ERC20Adapter());
    }

    function totalSupply(uint256 _tokenId)
        external
        view
        returns (uint256)
    {
        return _totalSupply[_tokenId];
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
        external
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

    function _setERC20Attribute(
        uint256 _tokenId,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    )
        internal
    {
        address adapter = _adapters[_tokenId];
        ERC20Adapter(adapter).setAttribute(_name, _symbol, _decimals);
    }

    function _createAdapter(uint256 _tokenId)
        internal
    {
        address adapter = _createClone(template);
        ERC20Adapter(adapter).initialize(_tokenId);
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

contract ERC20Adapter is IERC20 {
    mapping(address => mapping(address => uint256)) private _allowances;

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public tokenId;
    ERC1155ERC721WithAdapter public entity;

    function initialize(uint256 _tokenId)
       external
    {
        require(address(entity) == address(0), "Already initialized");
        entity = ERC1155ERC721WithAdapter(msg.sender);
        tokenId = _tokenId;
    }

    function setAttribute(
        string calldata _name,
        string calldata _symbol,
        uint8 _decimals
    )
        external
    {
        require(msg.sender == address(entity), "Not entity");
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
    function totalSupply()
       external
       view
       override
       returns (uint256)
    {
        return entity.totalSupply(tokenId);
    }

    function balanceOf(address owner)
        external
        view
        override
        returns (uint256)
    {
        return entity.balanceOf(owner, tokenId);
    }

    function allowance(
        address _owner,
        address _spender
    )
        external
        view
        override
        returns (uint256)
    {
        return _allowances[_owner][_spender];
    }

    function approve(
        address _spender,
        uint256 _value
    )
        external
        override
        returns (bool)
    {
       _approve(msg.sender, _spender, _value); 
       return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    )
        external
        override
        returns (bool)
    {
        _approve(_from, msg.sender, _allowances[_from][msg.sender] - _value); _transfer(_from, _to, _value);
        return true;
    }

    function transfer(
        address _to,
        uint256 _value
    )
        external
        override
        returns (bool)
    {
        _transfer(msg.sender, _to, _value);
        return true;
    }

    function _approve(
        address _owner,
        address _spender,
        uint256 _value
    )
        internal
    {
        _allowances[_owner][_spender] = _value;
        emit Approval(_owner, _spender, _value);
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _value
    )
        internal
    {
        entity.transferByAdapter(_from, _to, tokenId, _value);
        emit Transfer(_from, _to, _value);
    }
}

