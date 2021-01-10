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

contract ERC1155ERC721 is IERC165, IERC1155, IERC721, Context {
    using Address for address;
    
    // Fungible token
    mapping(uint256 => mapping(address => uint256)) internal _ftBalances;
    // Non fungible tokens
    mapping(address => uint256) internal _nftBalances;
    mapping(uint256 => address) internal _nftOwners;
    mapping(uint256 => address) internal _nftOperators;
    // Recording token
    mapping(uint256 => mapping(address => uint256)) internal _recordingBalances;
    mapping(uint256 => address) internal _recordingOperators;
    // Approve all
    mapping(address => mapping(address => bool)) internal _operatorApproval;
    // Setting operator
    mapping(uint256 => address) internal _settingOperators;
    
    // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 constant private ERC1155_ACCEPTED = 0xf23a6e61;
    // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 constant private ERC1155_BATCH_ACCEPTED = 0xbc197c81;
    bytes4 constant private ERC721_ACCEPTED = 0x150b7a02;
    bytes4 constant private INTERFACE_SIGNATURE_ERC165 = type(IERC165).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC1155 = type(IERC1155).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC1155Receiver = type(IERC1155TokenReceiver).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC721 = type(IERC721).interfaceId;
    
    uint256 private constant IS_NFT = 1 << 95;
    uint256 private constant IS_NEED_TIME = 1 << 94;
    uint256 private constant IS_RECORDING_TOKEN = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF000000000000000000000000;
    uint256 private idNonce;
    
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    
    /**
     * @dev Emitted when `_tokenId` recording token is transferred from `_from` to `to` by `_operator`.
     */
    event RecordingTransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _tokenIds, uint256 _value);
    
    event RecordingTransferBatch(address indexed _operator, address[] _froms, address[] _tos, uint256[] _tokenIds, uint256[] _values);
    
    
    modifier NotRecording(uint256 _tokenId) {
        require(_tokenId & IS_RECORDING_TOKEN == 0, "Can't be recording token");
        _;
    }
    
    modifier Recording(uint256 _tokenId) {
        require(_tokenId & IS_RECORDING_TOKEN > 0, "Need to be recording token");
        _;
    }
    
    modifier AuthorizedTransfer(
        address _operator,
        address _from,
        uint _tokenId
    ) {
        require(
            _from == _operator ||
            _nftOperators[_tokenId] == _operator ||
            _operatorApproval[_from][_operator],
            "Not authorized"
        );
        _;
    }
    /////////////////////////////////////////// ERC165 //////////////////////////////////////////////
    
    function supportsInterface(
        bytes4 _interfaceId
    )
        external
        pure
        override
        returns (bool)
    {
        if (_interfaceId == INTERFACE_SIGNATURE_ERC165 ||
            _interfaceId == INTERFACE_SIGNATURE_ERC1155 || 
            _interfaceId == INTERFACE_SIGNATURE_ERC721) {
            return true;
        }
        return false;
    }
    
    
    /////////////////////////////////////////// ERC1155 //////////////////////////////////////////////

    /**
        @notice Transfers `_value` amount of an `_tokenId` from the `_from` address to the `_to` address specified (with safety call).
        @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        MUST revert if `_to` is the zero address.
        MUST revert if balance of holder for token `_tokenId` is lower than the `_value` sent.
        MUST revert on any other error.
        MUST emit the `TransferSingle` event to reflect the balance change (see "Safe Transfer Rules" section of the standard).
        After the above conditions are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call `onERC1155Received` on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).
        @param _from    Source address
        @param _to      Target address
        @param _tokenId     ID of the token type
        @param _value   Transfer amount
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to `onERC1155Received` on `_to`
    */
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _value,
        bytes calldata _data
    ) 
        external
        override
        NotRecording(_tokenId)
        AuthorizedTransfer(_msgSender(), _from, _tokenId)
    {
        if (_tokenId & IS_NFT > 0) {
            safeTransferFrom(_from, _to, _tokenId, _data);
            return;
        }
        require(_to != address(0x0), "_to must be non-zero.");

        _transferFrom(_from, _to, _tokenId, _value);

        if (_to.isContract()) {
            require(_checkReceivable(_msgSender(), _from, _to, _tokenId, _value, _data, false, false),
                    "transfer rejected or _to not support");
        }
    }
    
    /**
        @notice Transfers `_values` amount(s) of `_tokenIds` from the `_from` address to the `_to` address specified (with safety call).
        @dev Caller must be approved to manage the tokens being transferred out of the `_from` account (see "Approval" section of the standard).
        MUST revert if `_to` is the zero address.
        MUST revert if length of `_tokenIds` is not the same as length of `_values`.
        MUST revert if any of the balance(s) of the holder(s) for token(s) in `_tokenIds` is lower than the respective amount(s) in `_values` sent to the recipient.
        MUST revert on any other error.
        MUST emit `TransferSingle` or `TransferBatch` event(s) such that all the balance changes are reflected (see "Safe Transfer Rules" section of the standard).
        Balance changes and events MUST follow the ordering of the arrays (_tokenIds[0]/_values[0] before _tokenIds[1]/_values[1], etc).
        After the above conditions for the transfer(s) in the batch are met, this function MUST check if `_to` is a smart contract (e.g. code size > 0). If so, it MUST call the relevant `ERC1155TokenReceiver` hook(s) on `_to` and act appropriately (see "Safe Transfer Rules" section of the standard).
        @param _from    Source address
        @param _to      Target address
        @param _tokenIds     IDs of each token type (order and length must match _values array)
        @param _values  Transfer amounts per token type (order and length must match _tokenIds array)
        @param _data    Additional data with no specified format, MUST be sent unaltered in call to the `ERC1155TokenReceiver` hook(s) on `_to`
    */
    function safeBatchTransferFrom(
        address _from,
        address _to,
        uint256[] calldata _tokenIds,
        uint256[] calldata _values,
        bytes calldata _data
    )
        external
        override
    {
        require(_to != address(0x0), "_to must be non-zero.");
        require(_tokenIds.length == _values.length, "Array length must match.");
        bool authorized = _from == _msgSender() || _operatorApproval[_from][_msgSender()];
            
        _batchTransferFrom(_from, _to, _tokenIds, _values, authorized);
        
        emit TransferBatch(_msgSender(), _from, _to, _tokenIds, _values);
        if (_to.isContract()) {
            require(_checkBatchReceivable(_msgSender(), _from, _to, _tokenIds, _values, _data),
                    "BatchTransfer rejected");
        }
    }
    
    /**
        @notice Get the balance of an account's Tokens.
        @param _owner  The address of the token holder
        @param _tokenId     ID of the Token
        @return        The _owner's balance of the Token type requested
     */
    function balanceOf(
        address _owner,
        uint256 _tokenId
    )
        public
        view
        override
        NotRecording(_tokenId)
        returns (uint256) 
    {
        if (_tokenId & IS_NFT > 0) {
            if (_ownerOf(_tokenId) == _owner) {
                return 1;
            } else {
                return 0;
            }
        }
        return _ftBalances[_tokenId][_owner];
    }
    
    /**
        @notice Get the balance of multiple account/token pairs
        @param _owners The addresses of the token holders
        @param _tokenIds    ID of the Tokens
        @return        The _owner's balance of the Token types requested (i.e. balance for each (owner, id) pair)
     */
    function balanceOfBatch(
        address[] calldata _owners,
        uint256[] calldata _tokenIds
    )
        external
        view
        override
        returns (uint256[] memory)
    {
        require(_owners.length == _tokenIds.length, "Array lengths should match");

        uint256[] memory balances_ = new uint256[](_owners.length);
        for (uint256 i = 0; i < _owners.length; ++i) {
            balances_[i] = balanceOf(_owners[i], _tokenIds[i]);
        }

        return balances_;
    }

    /**
        @notice Enable or disable approval for a third party ("operator") to manage all of the caller's tokens.
        @dev MUST emit the ApprovalForAll event on success.
        @param _operator  Address to add to the set of authorized operators
        @param _approved  True if the operator is approved, false to revoke approval
    */
    function setApprovalForAll(
        address _operator,
        bool _approved
    )
        external
        override(IERC1155, IERC721)
    {
        _operatorApproval[_msgSender()][_operator] = _approved;
        emit ApprovalForAll(_msgSender(), _operator, _approved);
    }
    
    /**
        @notice Queries the approval status of an operator for a given owner.
        @param _owner     The owner of the Tokens
        @param _operator  Address of authorized operator
        @return           True if the operator is approved, false if not
    */
    function isApprovedForAll(
        address _owner,
        address _operator
    ) 
        external
        view
        override(IERC1155, IERC721)
        returns (bool) 
    {
        return _operatorApproval[_owner][_operator];
    }

    
    /////////////////////////////////////////// ERC721 //////////////////////////////////////////////

    function balanceOf(address _owner) 
        external
        view
        override
        returns (uint256) 
    {
        require(_owner != address(0), "Owner is zero address");
        return _nftBalances[_owner];
    }
    
    function ownerOf(uint256 _tokenId)
        external
        view
        override
        NotRecording(_tokenId)
        returns (address) 
    {
        address owner = _ownerOf(_tokenId);
        require(owner != address(0), "Not nft or not exist");
        return owner;
    }
    
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) 
        external
        override
        NotRecording(_tokenId)
    {
        safeTransferFrom(_from, _to, _tokenId, "");
    }
    
    function safeTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        bytes memory _data
    )
        public
        override
        NotRecording(_tokenId)
        AuthorizedTransfer(_msgSender(), _from, _tokenId)
    {
        require(_to != address(0), "_to must be non-zero");
        require(_nftOwners[_tokenId] == _from, "Not owner or it's not nft");
        
        _transferFrom(_from, _to, _tokenId, 1);
        
        if (_to.isContract()) {
            require(_checkReceivable(_msgSender(), _from, _to, _tokenId, 1, _data, true, true),
                    "Transfer rejected or not support");
        }
    }
    
    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) 
        external
        override
        NotRecording(_tokenId)
        AuthorizedTransfer(_msgSender(), _from, _tokenId)
    {
        require(_to != address(0), "_to must be non-zero");
        require(_nftOwners[_tokenId] == _from, "Not token owner or not nft");
                
        _transferFrom(_from, _to, _tokenId, 1);
        require(_checkReceivable(_msgSender(), _from, _to, _tokenId, 1, "", true, false),
                "transfer rejected or not support");
    }
    
    function approve(
        address _to,
        uint256 _tokenId
    )
        external
        override 
        NotRecording(_tokenId)
    {
        address owner = _nftOwners[_tokenId];
        require(owner == _msgSender() || _operatorApproval[owner][_msgSender()],
                "Not authorized or Not a nft");
        _nftOperators[_tokenId] = _to;
        emit Approval(owner, _to, _tokenId);
    }
    
    function getApproved(uint256 _tokenId) 
        external
        view
        override
        NotRecording(_tokenId)
        returns (address) 
    {
        require(_tokenId & IS_NFT > 0, "Not a nft");
        return _nftOperators[_tokenId];
    }
    
    /////////////////////////////////////////// Recording //////////////////////////////////////////////
    
    function recordingTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _value
    ) 
        external
        Recording(_tokenId)
    {
        require(_msgSender() == _recordingOperators[_tokenId], "Not authorized");
        
        _recordingTransferFrom(_from, _to, _tokenId, _value);
    }
    
    function recordingBalanceOf(
        address _owner,
        uint256 _tokenId
    ) 
        external
        view
        Recording(_tokenId)
        returns(uint256)
    {
        return _recordingBalances[_tokenId][_owner];
    }
    
    /////////////////////////////////////////// Internal //////////////////////////////////////////////
    
    function _recordingTransferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _value
    )
        internal
    {
        _recordingBalances[_tokenId][_from] -= _value;
        _recordingBalances[_tokenId][_to] += _value;
        emit RecordingTransferSingle(_msgSender(), _from, _to, _tokenId, _value);
    }
    
    function _batchTransferFrom(
        address _from,
        address _to,
        uint256[] memory _tokenIds,
        uint256[] memory _values,
        bool authorized
    ) 
        internal
    {
        uint256 numNFT;
        
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            require(_tokenIds[i] & IS_RECORDING_TOKEN == 0, "Can't transfer recording token");
            if (_values[i] > 0) {
                if (_tokenIds[i] & IS_NFT > 0) {
                    require(_values[i] == 1, "NFT amount is not 1");
                    require(_nftOwners[_tokenIds[i]] == _from, "_from is not owner");
                    require(_nftOperators[_tokenIds[i]] == _msgSender() || authorized, "Not authorized");
                    numNFT++;
                    _nftOwners[_tokenIds[i]] = _to;
                    _nftOperators[_tokenIds[i]] = address(0);
                    emit Transfer(_from, _to, _tokenIds[i]);
                } else {
                    require(authorized, "Not authorized");
                    _ftBalances[_tokenIds[i]][_from] -= _values[i];
                    _ftBalances[_tokenIds[i]][_to] += _values[i];
                }
            }
        }
        _nftBalances[_from] -= numNFT;
        _nftBalances[_to] += numNFT;
    }
    
    function _mint(
        uint256 _supply,
        address _receiver,
        address _operator,
        bool _needTime,
        bytes memory data
    )
        internal
        returns (uint256)
    {
        uint256 tokenId = idNonce++;
        if (_needTime) {
            tokenId |= IS_NEED_TIME;
        }
        if (_supply == 1) {
            tokenId |= IS_NFT;
            _nftBalances[_receiver]++;
            _nftOwners[tokenId] = _receiver;
            emit Transfer(address(0), _receiver, tokenId);
        } else {
            _ftBalances[tokenId][_receiver]++;
        }
        _settingOperators[tokenId] = _operator;
        
        emit TransferSingle(_msgSender(), address(0), _receiver, tokenId, _supply);
        
        if (_receiver.isContract()) {
            require(_checkReceivable(_msgSender(), address(0), _receiver, tokenId, _supply, data, false, false),
                    "Transfer rejected or not support");
        }
        return tokenId;
    }
    
    function _mintCopy(
        uint256 _tokenId,
        uint256 _supply,
        address _receiver,
        bool _needTime
    )
        internal
    {
        uint256 tokenId = _tokenId | uint256(uint160(_receiver) << 96);
        if (_needTime) {
            tokenId |= IS_NEED_TIME;
        }
        _recordingBalances[tokenId][_receiver]++;
        _recordingOperators[tokenId] = _receiver;
        emit RecordingTransferSingle(_msgSender(), address(0), _receiver, tokenId, _supply);
    }
    
    function _checkReceivable(
        address _operator,
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _value,
        bytes memory _data,
        bool _erc721,
        bool _erc721safe
    )
        internal
        returns (bool)
    {
        if (_erc721) {
            if (!_checkIsERC1155Receiver(_to)) {
                if (_erc721safe) {
                    return _checkERC721Receivable(_operator, _from, _to, _tokenId, _data);
                } else {
                    return true;
                }
            }
        }
        return _checkERC1155Receivable(_operator, _from, _to, _tokenId, _value, _data);
    }
    
    function _checkERC1155Receivable(
        address _operator,
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _value,
        bytes memory _data
    )
        internal
        returns (bool)
    {
        return (IERC1155TokenReceiver(_to).onERC1155Received(_operator, _from, _tokenId, _value, _data) == ERC1155_ACCEPTED);
    }
    
    function _checkERC721Receivable(
        address _operator,
        address _from,
        address _to,
        uint256 _tokenId,
        bytes memory _data
    )
        internal
        returns (bool)
    {
        return (IERC721Receiver(_to).onERC721Received(_operator, _from, _tokenId, _data) == ERC721_ACCEPTED);
    }
    
    function _checkIsERC1155Receiver(address _to) 
        internal
        returns (bool)
    {
        (bool success, bytes memory data) = _to.call(
            abi.encodeWithSelector(IERC165.supportsInterface.selector, INTERFACE_SIGNATURE_ERC1155Receiver));
        bool result = abi.decode(data, (bool));
        return success && result;
    }
    
    function _checkBatchReceivable(
        address _operator,
        address _from,
        address _to,
        uint256[] memory _tokenIds,
        uint256[] memory _values,
        bytes memory _data
    )
        internal
        returns (bool)
    {
        return (IERC1155TokenReceiver(_to).onERC1155BatchReceived(_operator, _from, _tokenIds, _values, _data)
                == ERC1155_BATCH_ACCEPTED);
    }
    
    function _ownerOf(uint256 _tokenId)
        internal
        view
        returns (address)
    {
        return _nftOwners[_tokenId]; 
    }
    
    function _transferFrom(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _value
    )
        internal
    {
        if (_tokenId & IS_NFT > 0) {
            if (_value > 0) {
                require(_value == 1, "NFT amount more than 1");
                _nftOwners[_tokenId] = _to;
                _nftBalances[_from]--;
                _nftBalances[_to]++;
                _nftOperators[_tokenId] = address(0);
                
                emit Transfer(_from, _to, _tokenId);
            }
        } else {
            if (_value > 0) {
                _ftBalances[_tokenId][_from] -= _value;
                _ftBalances[_tokenId][_to] += _value;
            }
        }
        
        emit TransferSingle(_msgSender(), _from, _to, _tokenId, _value);
    }
}
