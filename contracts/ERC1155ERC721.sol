// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/IERC1155.sol";
import "./interfaces/IERC1155TokenReceiver.sol";
import "./interfaces/IERC165.sol";
import "./interfaces/IERC721.sol";
import "./interfaces/IERC721Receiver.sol";
import "./libraries/GSN/Context.sol";
import "./libraries/utils/Address.sol";
import "hardhat/console.sol";

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

    mapping(uint256 => uint256) internal _timeInterval;
    mapping(uint256 => mapping(address => uint256)) internal _lastUpdateAt;
    mapping(uint256 => mapping(address => uint256)) internal _holdingTime;
    mapping(uint256 => mapping(address => uint256)) internal _recordingLastUpdateAt;
    mapping(uint256 => mapping(address => uint256)) internal _recordingHoldingTime;
    
    // bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))
    bytes4 constant private ERC1155_ACCEPTED = 0xf23a6e61;
    // bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))
    bytes4 constant private ERC1155_BATCH_ACCEPTED = 0xbc197c81;
    bytes4 constant private ERC721_ACCEPTED = 0x150b7a02;
    bytes4 constant private INTERFACE_SIGNATURE_ERC165 = type(IERC165).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC1155 = type(IERC1155).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC1155Receiver = type(IERC1155TokenReceiver).interfaceId;
    bytes4 constant private INTERFACE_SIGNATURE_ERC721 = 0x80ac58cd;
    
    uint256 private constant IS_NFT = 1 << 255;
    uint256 internal constant HAS_NEED_TIME = 1 << 254;
    uint256 private idNonce;
    
    /**
     * @dev Emitted when `tokenId` token is transferred from `from` to `to`.
     */
    event Transfer(address indexed _from, address indexed _to, uint256 indexed _tokenId);

    /**
     * @dev Emitted when `owner` enables `approved` to manage the `tokenId` token.
     */
    event Approval(address indexed _owner, address indexed _approved, uint256 indexed _tokenId);
    
    /**
     * @dev Emitted when `_tokenId` recording token is transferred from `_from` to `to` by `_operator`.
     */
    event RecordingTransferSingle(address indexed _operator, address indexed _from, address indexed _to, uint256 _tokenIds, uint256 _value);
    
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
        AuthorizedTransfer(_msgSender(), _from, _tokenId)
    {
        require(_to != address(0x0), "_to must be non-zero.");
        if (_tokenId & IS_NFT > 0) {
            if (_value > 0) {
                require(_value == 1, "NFT amount more than 1");
                safeTransferFrom(_from, _to, _tokenId, _data);
            }
            return;
        }

        if (_tokenId & HAS_NEED_TIME > 0) {
            updateHoldingTime(_from, _tokenId);
            updateHoldingTime(_to, _tokenId);
        }
        _transferFrom(_from, _to, _tokenId, _value);

        if (_to.isContract()) {
            require(_checkReceivable(_msgSender(), _from, _to, _tokenId, _value, _data, false, false),
                    "Transfer rejected");
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
            
        batchUpdateHoldingTime(_from, _tokenIds);
        batchUpdateHoldingTime(_to, _tokenIds);
        _batchTransferFrom(_from, _to, _tokenIds, _values, authorized);
        
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
        returns (uint256) 
    {
        require(_owner != address(0), "Owner is zero address");
        if (_tokenId & IS_NFT > 0) {
            if (_ownerOf(_tokenId) == _owner)
                return 1;
            else
                return 0;
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
        AuthorizedTransfer(_msgSender(), _from, _tokenId)
    {
        require(_to != address(0), "_to must be non-zero");
        require(_nftOwners[_tokenId] == _from, "Not owner or it's not nft");
        
        if (_tokenId & HAS_NEED_TIME > 0) {
            updateHoldingTime(_from, _tokenId);
            updateHoldingTime(_to, _tokenId);
        }
        _transferFrom(_from, _to, _tokenId, 1);
        
        if (_to.isContract()) {
            require(_checkReceivable(_msgSender(), _from, _to, _tokenId, 1, _data, true, true),
                    "Transfer rejected");
        }
    }
    
    function transferFrom(
        address _from,
        address _to,
        uint256 _tokenId
    ) 
        external
        override
        AuthorizedTransfer(_msgSender(), _from, _tokenId)
    {
        require(_to != address(0), "_to must be non-zero");
        require(_nftOwners[_tokenId] == _from, "Not owner or it's not nft");
                
        if (_tokenId & HAS_NEED_TIME > 0) {
            updateHoldingTime(_from, _tokenId);
            updateHoldingTime(_to, _tokenId);
        }
        _transferFrom(_from, _to, _tokenId, 1);
        require(_checkReceivable(_msgSender(), _from, _to, _tokenId, 1, "", true, false),
                "Transfer rejected");
    }
    
    function approve(
        address _to,
        uint256 _tokenId
    )
        external
        override 
    {
        address owner = _nftOwners[_tokenId];
        require(owner == _msgSender() || _operatorApproval[owner][_msgSender()],
                "Not authorized or not a nft");
        _nftOperators[_tokenId] = _to;
        emit Approval(owner, _to, _tokenId);
    }
    
    function getApproved(uint256 _tokenId) 
        external
        view
        override
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
    {
        require(_msgSender() == _recordingOperators[_tokenId], "Not authorized");
        require(_to != address(0), "_to must be non-zero");

        updateRecordingHoldingTime(_from, _tokenId);
        updateRecordingHoldingTime(_to, _tokenId);
        _recordingTransferFrom(_from, _to, _tokenId, _value);
    }
    
    function recordingBalanceOf(
        address _owner,
        uint256 _tokenId
    ) 
        public 
        view
        returns(uint256)
    {
        return _recordingBalances[_tokenId][_owner];
    }
    
    /////////////////////////////////////////// Holding Time //////////////////////////////////////////////

    function updateHoldingTime(
        address _owner,
        uint256 _tokenId
    )
       public 
    {
        require(_tokenId & HAS_NEED_TIME > 0, "Doesn't support this token");

        _holdingTime[_tokenId][_owner] += _calcHoldingTime(_owner, _tokenId);
        _lastUpdateAt[_tokenId][_owner] = block.timestamp;
    }

    function batchUpdateHoldingTime(
        address _owner,
        uint256[] memory _tokenIds
    )
        public 
    {
        for (uint256 i = 0; i < _tokenIds.length; i++) {
            if (_tokenIds[i] & HAS_NEED_TIME > 0)
                updateHoldingTime(_owner, _tokenIds[i]);
        }
    }
    
    function updateRecordingHoldingTime(
        address _owner,
        uint256 _tokenId
    )
       public 
    {
        _recordingHoldingTime[_tokenId][_owner] += _calcRecordingHoldingTime(_owner, _tokenId);
        _recordingLastUpdateAt[_tokenId][_owner] = block.timestamp;
    }

    /////////////////////////////////////////// Internal //////////////////////////////////////////////

    function _calcHoldingTime(
        address _owner,
        uint256 _tokenId
    )
        internal
        view
        returns(uint256)
    {
        uint256 lastTime = _lastUpdateAt[_tokenId][_owner];
        uint256 startTime = uint256(uint128(_timeInterval[_tokenId]));
        uint256 endTime = uint256(_timeInterval[_tokenId] >> 128);
        uint256 balance = balanceOf(_owner, _tokenId);

        if (balance == 0)
            return 0;
        if (startTime == 0 || startTime >= block.timestamp)
            return 0;
        if (lastTime >= endTime)
            return 0;
        if (lastTime < startTime)
            lastTime = startTime;

        if (block.timestamp > endTime)
            return balance * (endTime - lastTime);
        else
            return balance * (block.timestamp - lastTime);
    }

    function _calcRecordingHoldingTime(
        address _owner,
        uint256 _tokenId
    )
        internal
        view
        returns(uint256)
    {
        uint256 lastTime = _recordingLastUpdateAt[_tokenId][_owner];
        uint256 startTime = uint256(uint128(_timeInterval[_tokenId]));
        uint256 endTime = uint256(_timeInterval[_tokenId] >> 128);
        uint256 balance = recordingBalanceOf(_owner, _tokenId);

        if (balance == 0)
            return 0;
        if (startTime == 0 || startTime >= block.timestamp)
            return 0;
        if (lastTime >= endTime)
            return 0;
        if (lastTime < startTime)
            lastTime = startTime;

        if (block.timestamp > endTime)
            return balance * (endTime - lastTime);
        else
            return balance * (block.timestamp - lastTime);
    }

    function _setTime(
        uint256 _tokenId,
        uint128 _startTime,
        uint128 _endTime
    )
        internal
    {
        require(_tokenId & HAS_NEED_TIME > 0, "Not a need time token");
        require(_startTime > 0, "Time can't be zero");
        require(_endTime > _startTime, "End greater than start");
        uint256 timeInterval = _startTime + uint256(_endTime) << 128;
        _timeInterval[_tokenId] = timeInterval;
    }

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

        emit TransferBatch(_msgSender(), _from, _to, _tokenIds, _values);
    }
    
    function _mint(
        uint256 _supply,
        address _receiver,
        address _settingOperator,
        bool _needTime,
        bytes memory data
    )
        internal
        returns (uint256)
    {
        uint256 tokenId = idNonce++;
        if (_needTime)
            tokenId |= HAS_NEED_TIME;

        if (_supply == 1) {
            tokenId |= IS_NFT;
            _nftBalances[_receiver]++;
            _nftOwners[tokenId] = _receiver;
            emit Transfer(address(0), _receiver, tokenId);
        } else {
            _ftBalances[tokenId][_receiver] = _supply;
        }

        _settingOperators[tokenId] = _settingOperator;
        
        emit TransferSingle(_msgSender(), address(0), _receiver, tokenId, _supply);
        
        if (_receiver.isContract()) {
            require(_checkReceivable(_msgSender(), address(0), _receiver, tokenId, _supply, data, false, false),
                    "Transfer rejected");
        }
        return tokenId;
    }
    
    function _mintCopy(
        uint256 _tokenId,
        uint256 _supply,
        address _recordingOperator
    )
        internal
    {
        _recordingBalances[_tokenId][_recordingOperator] += _supply;
        _recordingOperators[_tokenId] = _recordingOperator;
        emit RecordingTransferSingle(_msgSender(), address(0), _recordingOperator, _tokenId, _supply);
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
        if (_erc721 && !_checkIsERC1155Receiver(_to)) {
            if (_erc721safe)
                return _checkERC721Receivable(_operator, _from, _to, _tokenId, _data);
            else
                return true;
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

