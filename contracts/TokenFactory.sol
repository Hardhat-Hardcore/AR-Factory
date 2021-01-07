// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/ITokenFactory.sol";
import "./interfaces/IERC1155.sol";
import "./interfaces/IERC1155TokenReceiver.sol";
import "./interfaces/IERC165.sol";
import "./interfaces/IERC721.sol";
import "./interfaces/IERC721Receiver.sol";
import "./libraries/GSN/Context.sol";
import "./libraries/utils/Address.sol";

contract TokenFactory is IERC165, IERC1155, IERC721, Context {
    using Address for address;
    
    mapping(uint256 => mapping(address => uint256)) internal _ftBalances;
    mapping(address => mapping(address => bool)) internal _operatorApproval;
    mapping(address => uint256) internal _nftBalances;
    mapping(uint256 => address) internal _nftOwners;
    mapping(uint256 => address) internal _nftOperators;
    
    // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 constant private ERC1155_ACCEPTED = 0xf23a6e61;
    // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 constant private ERC1155_BATCH_ACCEPTED = 0xbc197c81;
    bytes4 constant private ERC721_ACCEPTED = 0x150b7a02;
    bytes4 constant private INTERFACE_SIGNATURE_ERC165 = type(IERC165).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC1155 = type(IERC1155).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC1155Receiver = type(IERC1155TokenReceiver).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC721 = type(IERC721).interfaceId;
    
    uint256 public constant IS_NFT = 1 << 95;
    
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    
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
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes calldata _data
    ) external override {
        if (_id & IS_NFT > 0) {
            safeTransferFrom(_from, _to, _id, _data);
            return;
        }
        require(_to != address(0x0), "TokenFactory: _to must be non-zero.");
        require(_from == _msgSender() || _operatorApproval[_from][_msgSender()] == true, "Need operator approval for 3rd party transfers.");

        _transferFrom(_from, _to, _id, _value);

        if (_to.isContract()) {
            require(_checkReceivable(_msgSender(), _from, _to, _id, _value, _data, false, false),
                    "TokenFactory: transfer rejected or _to not support");
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
    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _ids,
        uint256[] calldata _values,
        bytes calldata _data
    ) external override {
        require(_to != address(0x0), "TokenFactory: destination address must be non-zero.");
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
    function balanceOf(address _owner, uint256 _id) public view override returns (uint256) {
        if (_id & IS_NFT > 0) {
            if (_ownerOf(_id) == _owner) {
                return 1;
            } else {
                return 0;
            }
        }
        return _ftBalances[_id][_owner];
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
            balances_[i] = balanceOf(_owners[i], _ids[i]);
        }

        return balances_;
    }

    /**
        @notice Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.
        @dev MUST emit the ApprovalForAll event on success.
        @param _operator  Address to add to the set of authorized operators
        @param _approved  True if the operator is approved, false to revoke approval
    */
    function setApprovalForAll(address _operator, bool _approved) external override(IERC1155, IERC721) {
        _operatorApproval[_msgSender()][_operator] = _approved;
        emit ApprovalForAll(_msgSender(), _operator, _approved);
    }
    
    /**
        @notice Queries the approval status of an operator for a given owner.
        @param _owner     The owner of the Tokens
        @param _operator  Address of authorized operator
        @return           True if the operator is approved, false if not
    */
    function isApprovedForAll(address _owner, address _operator) external view override(IERC1155, IERC721) returns (bool) {
        return _operatorApproval[_owner][_operator];
    }

/////////////////////////////////////////// ERC721 //////////////////////////////////////////////

    function balanceOf(address _owner) external view override returns (uint256) {
        require(_owner != address(0), "TokenFactory: Owner is zero address");
        return _nftBalances[_owner];
    }
    
    function ownerOf(uint256 _tokenId) external view override returns (address) {
        address owner = _ownerOf(_tokenId);
        require(owner != address(0), "TokenFactory: NFT does not exist");
        return owner;
    }
    
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external override {
        safeTransferFrom(_from, _to, _tokenId, "");
    }
    
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes memory _data
    ) public override {
        require(_to != address(0), "TokenFactory: _to must be non-zero");
        require(_nftOwners[_tokenId] == _from, "TokenFactory: _from is not the token owner or it is not a nft");
        require(_from == _msgSender() || _nftOperators[_tokenId] == _msgSender() || _operatorApproval[_from][_msgSender()], 
                "TokenFactory: _from is not the token owner nor approved operator");
        
        _transferFrom(_from, _to, _tokenId, 1);
        
        if (_to.isContract()) {
            require(_checkReceivable(_msgSender(), _from, _to, _tokenId, 1, _data, true, true),
                    "TokenFactory: transfer rejected or _to not support");
        }
    }
    
    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) external override {
        require(_to != address(0), "TokenFactory: _to must be non-zero");
        require(_nftOwners[_tokenId] == _from, "TokenFactory: _from is not the token owner or it is not a nft");
        require(_from == _msgSender() || _nftOperators[_tokenId] == _msgSender() || _operatorApproval[_from][_msgSender()], 
                "TokenFactory: _from is not the token owner nor approved operator");
                
        _transferFrom(_from, _to, _tokenId, 1);
        require(_checkReceivable(_msgSender(), _from, _to, _tokenId, 1, "", true, false),
                "TokenFactory: transfer rejected or _to not support");
    }
    
    function approve(address _to, uint256 _tokenId) external override {
        address owner = _nftOwners[_tokenId];
        require(owner == _msgSender() || _operatorApproval[owner][_msgSender()],
                "TokenFactory: not authorized or it is not a nft");
        _nftOperators[_tokenId] = _to;
        emit Approval(owner, _to, _tokenId);
    }
    
    function getApproved(uint256 _tokenId) external view override returns (address) {
        require(_tokenId & IS_NFT > 0, "TokenFactory: Not a nft");
        return _nftOperators[_tokenId];
    }
    
/////////////////////////////////////////// Internal //////////////////////////////////////////////
    
    function _checkReceivable(
        address _operator,
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data,
        bool _erc721,
        bool _erc721safe
    ) internal returns (bool) {
        if (_erc721) {
            if (!_checkIsERC1155Receiver(_to)) {
                if (_erc721safe) {
                    return _checkERC721Receivable(_operator, _from, _to, _id, _data);
                } else {
                    return true;
                }
            }
        }
        return _checkERC1155Receivable(_operator, _from, _to, _id, _value, _data);
    }
    
    function _checkERC1155Receivable(
        address _operator,
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    ) internal returns (bool) {
        return (IERC1155TokenReceiver(_to).onERC1155Received(_operator, _from, _id, _value, _data) == ERC1155_ACCEPTED);
    }
    
    function _checkERC721Receivable(
        address _operator,
        address _from,
        address _to,
        uint256 _id,
        bytes memory _data
    ) internal returns (bool) {
        return (IERC721Receiver(_to).onERC721Received(_operator, _from, _id, _data) == ERC721_ACCEPTED);
    }
    
    function _checkIsERC1155Receiver(address _to) internal returns (bool) {
        (bool success, bytes memory data) = address(_to).call(
            abi.encodeWithSelector(IERC165.supportsInterface.selector, INTERFACE_SIGNATURE_ERC1155Receiver));
        bool result = abi.decode(data, (bool));
        return success && result;
    }
    
    
    function _ownerOf(uint256 _tokenId) internal view returns (address) {
        return _nftOwners[_tokenId]; 
    }
    
    function _transferFrom(
        address _from,
        address _to,
        uint256 _id,
        uint256 _value
    ) internal {
        if (_id & IS_NFT > 0) {
            if (_value > 0) {
                require(_value == 1, "TokenFactory: Cannot transfer nft with amount greater than 1");
                _nftOwners[_id] = _to;
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
    
    function _doSafeTransferAcceptanceCheck(
        address _operator,
        address _from,
        address _to,
        uint256 _id,
        uint256 _value,
        bytes memory _data
    ) internal {
        require(IERC1155TokenReceiver(_to).onERC1155Received(_operator, _from, _id, _value, _data) == ERC1155_ACCEPTED,
                "TokenFactoru: contract returned an unknown value from onERC1155Received");
    }

    function _doSafeBatchTransferAcceptanceCheck(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _ids,
        uint256[] memory _values,
        bytes memory _data
    ) internal {
        require(IERC1155TokenReceiver(_to).onERC1155BatchReceived(_operator, _from, _ids, _values, _data) == ERC1155_BATCH_ACCEPTED, "contract returned an unknown value from onERC1155BatchReceived");
    }
    
}

