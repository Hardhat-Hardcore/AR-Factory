// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./interfaces/ITokenFactory.sol";
import "./libraries/utils/ECDSA.sol";
import "./upgradeable/GSN/ContextUpgradeable.sol";
import "./upgradeable/access/AccessControlUpgradeable.sol";
import "./GSN/BaseRelayRecipient.sol";

import "hardhat/console.sol";

contract InvoiceFactoryUpgrade is ContextUpgradeable, BaseRelayRecipient, AccessControlUpgradeable {

    struct Invoice {
        uint256 invoiceId;              //發票編號
        uint256 tokenId;                //生成的token id
        uint256 txAmount;               //發票金額
        uint256 anchorConfirmTime;      //anchor verify time
        uint128 invoiceTime;            //發票時間
        uint128 dueDate;                //發票回款時間
        bytes32 interestRate;             //利率
        bytes32 invoicePdfHash;         //發票pdf   hash
        bytes32 invoiceNumberHash;      //發票編號  hash
        bytes32 anchorHash;             //anchor name hash
        address supplier;               //supplier address
        address anchor;                 //anchor address
        bool    toList;                 //to list or not
    }
    
    using ECDSA for bytes32;

    uint256 public invoiceCount;
    uint8   public decimals;
    address public trustAddress;
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");    
    
    mapping(uint256 => uint256) internal _tokenIdToInvoiceId;
    mapping(uint256 => uint256) internal _invoiceIdToTokenId;
    mapping(address => uint256) internal _anchorVerified;
    mapping(address => uint256) internal _supplierVerified;
    
    Invoice[] internal _invoiceList;
    ITokenFactory public tokenFactory;
    IWhitelist public whitelist;

    //////////////////////////////////// MODIFIER ////////////////////////////////////////////////    

    modifier onlyAdmin() {
        // console.log(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()));
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()) == true, "Restricted to admins.");
        _;
    }

    modifier onlySupplier() {
        require(hasRole(SUPPLIER_ROLE, _msgSender()) == true, "Restricted to suppliers.");
        _;
    }
    
    modifier onlyAnchor() {
        require(hasRole(ANCHOR_ROLE, _msgSender()) == true, "Restricted to anchors.");
        _;
    }
    
    modifier checkWhitelist() {
        require(address(whitelist) > address(0), "Whitelist not initialized yet.");
        _;
    }

    modifier onlyTrust() {
        require(_msgSender() == trustAddress, "Restricted to only trust by verify");
        _;
    }
    
    modifier checkTrustVerified(address _anchor, address _supplier) {
        require(_anchorVerified[_anchor] > 0, "Anchor not verified by trust.");
        require(_supplierVerified[_supplier] > 0, "Supplier not verified by trust.");
        _;
    }
    
    ///////////////////////////////////  CONSTRUCTOR //////////////////////////////////////////    
    
    function __initialize(
        uint8   _decimals,
        address _trustAddress,
        address _trustedForwarder,
        address _tokenFactory,
        address _whitelist
    ) 
        public
        initializer
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        trustAddress = _trustAddress;
        trustedForwarder = _trustedForwarder;
        decimals = _decimals;
        tokenFactory = ITokenFactory(_tokenFactory);
        whitelist = IWhitelist(_whitelist);
    }

    ///////////////////////////////////    EVENTS    //////////////////////////////////////////
    
    event EnrollAnchor(address indexed _account);
    event EnrollSupplier(address indexed _account);
    event TrustVerifyAnchor(address indexed _account);
    event TrustVerifySupplier(address indexed _account);
    event AnchorVerify(address indexed _anchor, uint256 indexed _invoiceId);
    event UploadInvoice(uint256 indexed _invoiceId, address indexed _supplier, address indexed _anchor, bytes32 _anchorName, bool _tolist);
    event RestoreAccount(address indexed _originAddress, address indexed _newAddress);
    event CreateTokenFromInvoice(uint256 indexed _invoiceId, uint256 indexed _tokenId);

    ///////////////////////////////////  GETTER FUNCTIONS ///////////////////////////////////////////
   
    function queryInvoiceId(uint256 _tokenId) external view returns (uint256) {
        return _tokenIdToInvoiceId[_tokenId];
    }

    function queryTokenId(uint256 _invoiceId) external view returns (uint256) {
        require(invoiceIdToTokenId[_invoiceId] > 0, "No token found");
        return _invoiceIdToTokenId[_invoiceId];
    }

    function queryAnchorVerified(address _anchor) external view returns (bool) {
        return _anchorVerified[_anchor] > 0;
    }

    function querySupplierVerified(address _anchor) external view returns (bool) {
        return _supplierVerified[_anchor] > 0;
    }

    function queryInvoice(uint256 _invoiceId)
        external
        view
        returns (
            uint256, uint256, uint256,
            uint256, bytes32, bytes32,
            bytes32
        )
    {
        return (
            _invoiceList[_invoiceId].invoiceId,
            _invoiceList[_invoiceId].invoiceTime,
            _invoiceList[_invoiceId].txAmount,
            _invoiceList[_invoiceId].dueDate,
            _invoiceList[_invoiceId].invoicePdfHash,
            _invoiceList[_invoiceId].invoiceNumberHash,
            _invoiceList[_invoiceId].anchorHash
        );
    }

    function queryInvoiceData(uint256 _invoiceId)
        external
        view
        returns (
            uint256, uint256, bytes32,
            address, address, bool
        )
    {
        return (
            _invoiceList[_invoiceId].tokenId,
            _invoiceList[_invoiceId].anchorConfirmTime,
            _invoiceList[_invoiceId].interestRate,
            _invoiceList[_invoiceId].supplier,
            _invoiceList[_invoiceId].anchor,
            _invoiceList[_invoiceId].toList
        );
    }

    function isAnchor(address _anchor)
        external
        view
        returns (bool)
    {
        return hasRole(ANCHOR_ROLE, _anchor);
    }
    
    function isSupplier(address _supplier)
        external
        view
        returns (bool)
    {
        return hasRole(SUPPLIER_ROLE, _supplier);
    }

    ///////////////////////////////////  UPDATE INTERFACE FUNCTIONS ///////////////////////////////////////////

    function updateTrustAddress(address _newTrust)
        external
        onlyAdmin
    {
        trustAddress = _newTrust;
    }
    
    function updateTokenFactory(address _newTokenFactory)
        external
        onlyAdmin
    {
        tokenFactory = ITokenFactory(_newTokenFactory);
    }
    
    function updateWhitelist(address _newWhitelist)
        external
        onlyAdmin
    {
        whitelist = IWhitelist(_newWhitelist);
    }

    ///////////////////////////////////  ANCHOR , SUPPLIER ///////////////////////////////////////////
    
    function enrollAnchor(address _newAnchor)
        external
        onlyAdmin
    {
        require(hasRole(ANCHOR_ROLE, _newAnchor) == false, "Duplicated enrollment");

        if (whitelist.inWhitelist(_newAnchor) == false)
            whitelist.addWhitelist(_newAnchor);
        grantRole(ANCHOR_ROLE, _newAnchor);
        emit EnrollAnchor(_newAnchor);
    }
    
    function enrollSupplier(address _newSupplier)
        external
        onlyAdmin
    {
        require(hasRole(SUPPLIER_ROLE, _newSupplier) == false, "Duplicated enrollment");

        if (whitelist.inWhitelist(_newSupplier) == false)
            whitelist.addWhitelist(_newSupplier);
        grantRole(SUPPLIER_ROLE, _newSupplier);
        emit EnrollSupplier(_newSupplier);
    }
   
    function anchorVerify(uint256 _invoiceId)
        external
        onlyAnchor
        checkTrustVerified(_msgSender(), _invoiceList[_invoiceId].supplier)
    {
        require(_anchorVerified[_msgSender()] > 0, "Not verified yet");
        require(_invoiceList[_invoiceId].anchor == _msgSender(), "Not authorized");

        _invoiceList[_invoiceId].anchorConfirmTime = block.timestamp;
        emit AnchorVerify(_msgSender(), _invoiceId);
    }
    
    ///////////////////////////////////  TRUST ONLY FUNCTIONS ///////////////////////////////////////////

    function trustVerifyAnchor(address _anchor)
        external
        onlyTrust
    {
        _anchorVerified[_anchor] = block.timestamp;
        emit TrustVerifyAnchor(_anchor);
    }
    
    function trustVerifySupplier(address _supplier)
        external
        onlyTrust
    {
        _supplierVerified[_supplier] = block.timestamp;
        emit TrustVerifySupplier(_supplier);
    }

    ///////////////////////////////////  INVOICE UPDATE FUNCTIONS ///////////////////////////////////////////

    function uploadInvoice(
        uint256 _txAmount,
        uint256 _time,
        bytes32 _interestRate,
        bytes32 _invoicePdfHash,
        bytes32 _invoiceNumberHash,
        bytes32 _anchorName,
        address _anchorAddr,
        bool    _tolist,
        bytes   calldata _signature
    ) 
        external
        onlySupplier
        checkTrustVerified(_anchorAddr, _msgSender())
    {
        bytes32 hashedParams = uploadPreSignedHash(
            _txAmount,
            _time,
            _interestRate,
            _invoicePdfHash,
            _invoiceNumberHash,
            _anchorName,
            _msgSender(),
            _anchorAddr,
            _tolist
        );
        address from = hashedParams.toEthSignedMessageHash().recover(_signature);
        require(hasRole(DEFAULT_ADMIN_ROLE, from), "Not authorized by admin");

        _uploadInvoice(
            _txAmount,
            _time,
            _interestRate,
            _invoicePdfHash,
            _invoiceNumberHash,
            _anchorName,
            _msgSender(),
            _anchorAddr,
            _tolist
        );
    }
    
    function _uploadInvoice(
        uint256 _txAmount,
        uint256 _time,
        bytes32 _interestRate,
        bytes32 _invoicePdfHash,
        bytes32 _invoiceNumberHash,
        bytes32 _anchorName,
        address _supplierAddr,
        address _anchorAddr,
        bool    _tolist
    )
        internal
    {
        Invoice memory newInvoice = Invoice(
            invoiceCount,
            0,
            _txAmount,
            0,
            uint128(_time >> 128),
            uint128(_time),
            _interestRate,
            _invoicePdfHash,
            _invoiceNumberHash,
            _anchorName,
            _supplierAddr,
            _anchorAddr,
            _tolist
        );
        invoiceCount = invoiceCount + 1;
        _invoiceList.push(newInvoice);
        emit UploadInvoice(invoiceCount - 1, _supplierAddr, _anchorAddr, _anchorName, _tolist);
    }

    function uploadPreSignedHash(
        uint256 _txAmount,
        uint256 _time,
        bytes32 _interestRate,
        bytes32 _invoicePdfHash,
        bytes32 _invoiceNumberHash,
        bytes32 _anchorName,
        address _supplierAddr,
        address _anchorAddr,
        bool    _tolist
    )
        public
        pure
        returns (bytes32)
    {
        // "a18b7c27": bytes4(keccak256("uploadPreSignedHash(uint256,uint256,bytes32,bytes32,bytes32,bytes32,address,address,bool)"))
        return keccak256(
            abi.encodePacked(
                bytes4(0xa18b7c27),
                _txAmount,
                _time,
                _interestRate, 
                _invoicePdfHash,
                _invoiceNumberHash,
                _anchorName,
                _supplierAddr,
                _anchorAddr,
                _tolist
            )
        );
    }
    
    function invoiceToToken(uint _invoiceId)
        external
        onlyAdmin
    {
        require(_invoiceList[_invoiceId].anchorConfirmTime > 0, "Anchor hasn't confirm");
        require(_invoiceList[_invoiceId].tokenId == 0, "Token already created");

        uint256 tokenId = tokenFactory.createTokenWithRecording(
            _invoiceList[_invoiceId].txAmount,
            trustAddress,
            address(this),
            false,
            trustAddress,
            false
        );

        _invoiceList[_invoiceId].tokenId = tokenId;

        emit CreateTokenFromInvoice(_invoiceId, tokenId);
    }

    function setTimeInterval(
        uint256 _invoiceId,
        uint128 _startTime,
        uint128 _endTime
    )
        external
        onlyTrust
    {
        require(_invoiceList[_invoiceId].tokenId > 0, "No token found");
        tokenFactory.setTimeInterval(
            __invoiceList[_invoiceId].tokenId,
            _startTime,
            _endTime
        )
    }
    
    ///////////////////////////////////  RESTORE FUNCTIONS ///////////////////////////////////////////

    function restoreAccount(address _originAddress, address _newAddress)
        external
        onlyAdmin
    {
        require(
            _supplierVerified[_originAddress] > 0 || 
            _anchorVerified[_originAddress] > 0,
            "Not enrolled yet"
        );

        if (_supplierVerified[_originAddress] > 0) 
            _supplierVerified[_newAddress] = block.timestamp;
        
        if (_anchorVerified[_originAddress] > 0)
            _anchorVerified[_newAddress] = block.timestamp;

        whitelist.addWhitelist(_newAddress);
        emit RestoreAccount(_originAddress, _newAddress);
    }

    function _msgSender()
        internal 
        override(ContextUpgradeable, BaseRelayRecipient) 
        view 
        returns (address payable ret)
    {
        return BaseRelayRecipient._msgSender();
    }
    
    function _msgData()
        internal
        override(ContextUpgradeable, BaseRelayRecipient)
        view
        returns (bytes memory)
    {
        return BaseRelayRecipient._msgData();
    }
    
    function versionRecipient()
        external
        override
        virtual
        view returns (string memory)
    {
        return "2.1.0";
    }
}
