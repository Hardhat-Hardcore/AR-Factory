// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IERC20.sol";
import "./ERC1155ERC721WithAdapter.sol";

contract ERC20Adapter is IERC20 {
    mapping(address => mapping(address => uint256)) private _allowances;

    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public tokenId;
    ERC1155ERC721WithAdapter public entity;

    function initialize(
        uint256 _tokenId,
        string memory _name,
        string memory _symbol,
        uint8 _decimals
    )
       external
    {
        require(address(entity) == address(0), "Already initialized");
        entity = ERC1155ERC721WithAdapter(msg.sender);
        tokenId = _tokenId;
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
        _approve(_from, msg.sender, _allowances[_from][msg.sender] - _value);
        _transfer(_from, _to, _value);
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
