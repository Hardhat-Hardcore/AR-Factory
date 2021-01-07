// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./ITokenFactory.sol";
import "./IERC1155.sol";
import "./IERC1155TokenReceiver.sol";
import "./IERC165.sol";
import "./IERC721.sol";
import "./Context.sol";
import "./Address.sol";

contract TokenFactory is IERC165, IERC1155, Context {
    using Address for address;
    
    mapping(uint256 => mapping(address => uint256)) internal _ftBalances;
    mapping(address => mapping(address => bool)) internal _operatorApproval;
    mapping(uint256 => uint256) internal _nftBalances;
    mapping(uint256 => address) internal _nftOwners;
    mapping(uint256 => address) internal _nftOperators;
    mapping(address => mapping(address => bool)) _nftOperatorForAll;
    
    bytes4 constant private ERC1155_ACCEPTED = 0xf23a6e61; // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 constant private ERC1155_BATCH_ACCEPTED = 0xbc197c81; // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 constant private INTERFACE_SIGNATURE_ERC165 = type(IERC165).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC1155 = type(IERC1155).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC721 = type(IERC721).interfaceId;
    
    uint256 public constant IS_NFT = 1 << 95;
    
    function supportsInterface(bytes4 _interfaceId) external pure override returns (bool) {
        if (_interfaceId == INTERFACE_SIGNATURE_ERC165 ||
            _interfaceId == INTERFACE_SIGNATURE_ERC1155 || 
            _interfaceId == INTERFACE_SIGNATURE_ERC721) {
                return true;
            }
        return false;
    }
    
    /////////////////////////////////////////// ERC1155 //////////////////////////////////////////////

    /**
        @notice Transfers `_value` amount of an `_id` from the `_from` address to the `_to` address specified (with safety call).
        @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        MUST revert if `_to` is the zero address.
        MUST revert if balance of holder for token `_id` is lower than the `_value` sent.
        MUST revert on any other error.
        MUST emit the `TransferSingle` event to reflect the balance change (see "Safe Transfer Rules" section of the standard).
        After the above conditions are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call `onERC1155Received` on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).
        @param _from    Source address
        @param _to      Target address
        @param _id      ID of the token type
        @param _value   Transfer amount
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to `onERC1155Received` on `_to`
    */
    function safeTransferFrom(address _from, address _to, uint256 _id, uint256 _value, bytes calldata _data) external override {

        require(_to != address(0x0), "ERC1155: _to must be non-zero.");
        require(_from == _msgSender() || _operatorApproval[_from][_msgSender()] == true, "Need operator approval for 3rd party transfers.");

        _transferFrom(_from, _to, _id, _value);

        if (_to.isContract()) {
            _doSafeTransferAcceptanceCheck(_msgSender(), _from, _to, _id, _value, _data);
        }
    }
    
    /**
        @notice Transfers `_values` amount(s) of `_ids` from the `_from` address to the `_to` address specified (with safety call).
        @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        MUST revert if `_to` is the zero address.
        MUST revert if length of `_ids` is not the same as length of `_values`.
        MUST revert if any of the balance(s) of the holder(s) for token(s) in `_ids` is lower than the respective amount(s) in `_values` sent to the recipient.
        MUST revert on any other error.
        MUST emit `TransferSingle` or `TransferBatch` event(s) such that all the balance changes are reflected (see "Safe Transfer Rules" section of the standard).
        Balance changes and events MUST follow the ordering of the arrays (_ids[0]/_values[0] before _ids[1]/_values[1], etc).
        After the above conditions for the transfer(s) in the batch are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call the relevant `ERC1155TokenReceiver` hook(s) on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).
        @param _from    Source address
        @param _to      Target address
        @param _ids     IDs of each token type (order and length must match _values array)
        @param _values  Transfer amounts per token type (order and length must match _ids array)
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to the `ERC1155TokenReceiver` hook(s) on `_to`
    */
    function safeBatchTransferFrom(address _from, address _to, uint256[] calldata _ids, uint256[] calldata _values, bytes calldata _data) external override {
        require(_to != address(0x0), "destination address must be non-zero.");
        require(_ids.length == _values.length, "_ids and _values array length must match.");
        require(_from == _msgSender() || _operatorApproval[_from][_msgSender()] == true, "Need operator approval for 3rd party transfers.");

        for (uint256 i = 0; i < _ids.length; ++i) {
            uint256 id = _ids[i];
            uint256 value = _values[i];

            _ftBalances[id][_from] -= value;
            _ftBalances[id][_to] += value;
        }

        emit TransferBatch(_msgSender(), _from, _to, _ids, _values);

        if (_to.isContract()) {
            _doSafeBatchTransferAcceptanceCheck(_msgSender(), _from, _to, _ids, _values, _data);
        }
    }
    
    /**
        @notice Get the balance of an account's Tokens.
        @param _owner  The address of the token holder
        @param _id     ID of the Token
        @return        The _owner's balance of the Token type requested
     */
    function balanceOf(address _owner, uint256 _id) external view override returns (uint256) {
        return _balances[_id][_owner];
    }
    
    /**
        @notice Get the balance of multiple account/token pairs
        @param _owners The addresses of the token holders
        @param _ids    ID of the Tokens
        @return        The _owner's balance of the Token types requested (i.e. balance for each (owner, id) pair)
     */
    function balanceOfBatch(address[] calldata _owners, uint256[] calldata _ids) external view override returns (uint256[] memory) {
        require(_owners.length == _ids.length);

        uint256[] memory balances_ = new uint256[](_owners.length);
        for (uint256 i = 0; i < _owners.length; ++i) {
            balances_[i] = _ftBalances[_ids[i]][_owners[i]];
        }

        return balances_;
    }

    /**
        @notice Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.
        @dev MUST emit the ApprovalForAll event on success.
        @param _operator  Address to add to the set of authorized operators
        @param _approved  True if the operator is approved, false to revoke approval
    */
    function setApprovalForAll(address _operator, bool _approved) override external {
        _operatorApproval[_msgSender()][_operator] = _approved;
        emit ApprovalForAll(_msgSender(), _operator, _approved);
    }
    
    /**
        @notice Queries the approval status of an operator for a given owner.
        @param _owner     The owner of the Tokens
        @param _operator  Address of authorized operator
        @return           True if the operator is approved, false if not
    */
    function isApprovedForAll(address _owner, address _operator) external view override returns (bool) {
        return _operatorApproval[_owner][_operator];
    }

/////////////////////////////////////////// ERC721 //////////////////////////////////////////////

    function balanceOf(address _owner) external view override returns (uint256) {
        require(_owner != address(0), "ERC721: Owner is zero address");
        return _nftBalances[_owner];
    }
    
    function ownerOf(uint256 _tokenId) external view override returns (uint256) {
        address owner = _ownerOf(_tokenId);
        require(owner != address(0), "ERC721: NFT does not exist");
        return owner;
    }
    
    function safeTransferFrom(address _from, address _to, uint256 _tokenId) external {
        require(_nftOwner[_tokenId] == _from, "ERC721: _from is not the token owner");
        require(_from == _msgSender() || _nftOperators[_id] == _msgSender() || _nftOperatorForAll[_from][_msgSender()],
                "ERC721: _from is not the token owner nor approved operator");
        
        _transferFrom(_from, _to, _tokenId, 1);
        
        if (_to.isContract()) {
            require(_checkReceivable(_msgSender(), _from, _to, _tokenId, 1, "", true), "ERC1155/ERC721 transfer rejected or _to not support");
        }
    }
    
/////////////////////////////////////////// Internal //////////////////////////////////////////////
    
    function _checkReceivable(address _operator, address _from, address _to, uint256 _id, uint256 _value, bytes memory data, bool erc721) internal returns (bool) {
        // TODO
    }
    
    function _ownerOf(uint256 _tokenId) internal view returns (address) {
        return _nftOwners[_tokenId]; 
    }
    
    function _transferFrom(address _from, address _to, uint256 _id, uint256 _value) internal {
        if (_id & IS_NFT > 0) {
            if (value > 0) {
                require(value == 1, "ERC721: Cannot transfer nft with amount greater than 1");
                _nftOwner[_id] = _to;
                _nftBalances[_from]--;
                _nftBalances[_to]++;
                _nftOperators[_id] = address(0);
                
                emit Transfer(_from, _to, _id);
            }
        } else {
            if (_value > 0) {
                _ftBalances[_id][_from] -= _value;
                _ftBalances[_id][_to] += _value;
            }
        }
        
        emit TransferSingle(_msgSender(), _from, _to, _id, _value);
    }
    
    function _doSafeTransferAcceptanceCheck(address _operator, address _from, address _to, uint256 _id, uint256 _value, bytes memory _data) internal {
        require(ERC1155TokenReceiver(_to).onERC1155Received(_operator, _from, _id, _value, _data) == ERC1155_ACCEPTED, "contract returned an unknown value from onERC1155Received");
    }

    function _doSafeBatchTransferAcceptanceCheck(address _operator, address _from, address _to, uint256[] memory _ids, uint256[] memory _values, bytes memory _data) internal {
        require(ERC1155TokenReceiver(_to).onERC1155BatchReceived(_operator, _from, _ids, _values, _data) == ERC1155_BATCH_ACCEPTED, "contract returned an unknown value from onERC1155BatchReceived");
    }
    
}

