// SPDX-License-Identifier: MIT

pragma solidity 0.8.1;

import "./interfaces/IWhitelist.sol";
import "./interfaces/ITokenFactory.sol";
import "./libraries/utils/ECDSA.sol";
import "./upgradeable/GSN/ContextUpgradeable.sol";
import "./upgradeable/access/AccessControlUpgradeable.sol";
import "./GSN/BaseRelayRecipient.sol";

/// @title Invoice factory with an upgradeable feature
contract InvoiceFactoryUpgrade is ContextUpgradeable, BaseRelayRecipient, AccessControlUpgradeable {

    struct Invoice {
        uint256 invoiceId;              // Unique invoice ID
        uint256 tokenId;                // Corresponding token ID
        uint256 invoiceAmount;          // Invoice Amount
        uint256 anchorConfirmTime;      // anchor verification time
        uint128 invoiceTime;            // Invoice issuance time
        uint128 dueDate;                // Due date of the invoice
        bytes32 interestRate;           // Interest rate
        bytes32 invoicePdfHash;         // Hash of the invoice pdf
        bytes32 invoiceNumberHash;      // Hash of the invoice number
        bytes32 anchorHash;             // Hash of the anchor name
        address supplier;               // Supplier address
        address anchor;                 // Anchor address
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
        require(_msgSender() == trustAddress, "Restricted to trust.");
        _;
    }
    
    modifier checkTrustVerified(address _anchor, address _supplier) {
        require(_anchorVerified[_anchor] > 0, "Anchor not verified by trust.");
        require(_supplierVerified[_supplier] > 0, "Supplier not verified by trust.");
        _;
    }

    ///////////////////////////////////    EVENTS    //////////////////////////////////////////
    
    event EnrollAnchor(address indexed _anchor);
    event EnrollSupplier(address indexed _supplier);
    event EnrollAdmin(address indexed _admin);
    event RemoveAdmin(address indexed _admin);
    event TrustVerifyAnchor(address indexed _anchor);
    event TrustVerifySupplier(address indexed _supplier);
    event AnchorVerifyInvoice(address indexed _anchor, uint256 indexed _invoiceId);
    event UploadInvoice(uint256 indexed _invoiceId, address indexed _supplier, address indexed _anchor);
    event RestoreAccount(address indexed _originAddress, address indexed _newAddress);
    event CreateTokenFromInvoice(uint256 indexed _invoiceId, uint256 indexed _tokenId);
    
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
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        trustAddress = _trustAddress;
        trustedForwarder = _trustedForwarder;
        decimals = _decimals;
        tokenFactory = ITokenFactory(_tokenFactory);
        whitelist = IWhitelist(_whitelist);
    }

    ///////////////////////////////////  GETTER FUNCTIONS ///////////////////////////////////////////
   
    /// @notice Queries invoice ID by its correcponding token ID
    /// @dev It throws if `_tokenId` is zero or does not have a
    ///  correcsponding invoice
    /// @param _tokenId Token ID
    /// @return Invoice ID
    function queryInvoiceId(uint256 _tokenId) external view returns (uint256) {
        require(_tokenId != 0, "Invalid token");

        uint256 invoiceId = _tokenIdToInvoiceId[_tokenId];
        require(_invoiceList[invoiceId].tokenId == _tokenId, "No invoice found");

        return _tokenIdToInvoiceId[_tokenId];
    }

    /// @notice Queries token ID by its correcponding invoice ID
    /// @dev It throws if invoice does not have token creation history
    /// @param _invoiceId Invoice ID
    /// @return Token ID
    function queryTokenId(uint256 _invoiceId) external view returns (uint256) {
        require(_invoiceIdToTokenId[_invoiceId] > 0, "No token found");
        return _invoiceIdToTokenId[_invoiceId];
    }

    /// @notice Queries the timestamp when the anchor is verified by trust
    /// @dev It returns zero if anchor is not verified
    /// @param _anchor Address of the anchor
    /// @return Timestamp of verification
    function queryAnchorVerified(address _anchor) external view returns (uint256) {
        return _anchorVerified[_anchor];
    }

    /// @notice Queries the timestamp when the supplier is verified by trust
    /// @dev It returns zero if supplier is not verified
    /// @param _supplier Address of the supplier 
    /// @return Timestamp of verification
    function querySupplierVerified(address _supplier) external view returns (uint256) {
        return _supplierVerified[_supplier];
    }

    /// @notice Queries the invoice information uploaded by supplier
    /// @param _invoiceId Invoice ID to be queried
    /// @return Invoice ID
    /// @return Invoice issuance time
    /// @return Invoice amount
    /// @return Invoice due date
    /// @return Hash of the invoice pdf
    /// @return Hash of the invoice number
    /// @return Hash of the anchor name
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
            _invoiceList[_invoiceId].invoiceAmount,
            _invoiceList[_invoiceId].dueDate,
            _invoiceList[_invoiceId].invoicePdfHash,
            _invoiceList[_invoiceId].invoiceNumberHash,
            _invoiceList[_invoiceId].anchorHash
        );
    }

    /// @notice Queries the invoice derivative information
    /// @param _invoiceId Invoice ID to be queried
    /// @return Corresponding Token ID, zero if does not have token
    /// @return Interest rate
    /// @return Address of the supplier
    /// @return Address of the anchor 
    function queryInvoiceData(uint256 _invoiceId)
        external
        view
        returns (
            uint256, uint256, bytes32,
            address, address
        )
    {
        return (
            _invoiceList[_invoiceId].tokenId,
            _invoiceList[_invoiceId].anchorConfirmTime,
            _invoiceList[_invoiceId].interestRate,
            _invoiceList[_invoiceId].supplier,
            _invoiceList[_invoiceId].anchor
        );
    }

    /// @notice Check anchor role
    /// @param _anchor Address
    /// @return `true` if it has anchor role
    function isAnchor(address _anchor)
        external
        view
        returns (bool)
    {
        return hasRole(ANCHOR_ROLE, _anchor);
    }
    
    /// @notice Check supplier role
    /// @param _supplier Address
    /// @return `true` if it has supplier role
    function isSupplier(address _supplier)
        external
        view
        returns (bool)
    {
        return hasRole(SUPPLIER_ROLE, _supplier);
    }

    ///////////////////////////////////  UPDATE INTERFACE FUNCTIONS ///////////////////////////////////////////

    /// @notice Update trust address
    /// @param _newTrust New trust address
    function updateTrustAddress(address _newTrust)
        external
        onlyAdmin
    {
        trustAddress = _newTrust;
    }
    
    /// @notice Update token factory address
    /// @param _newTokenFactory New token factory address
    function updateTokenFactory(address _newTokenFactory)
        external
        onlyAdmin
    {
        tokenFactory = ITokenFactory(_newTokenFactory);
    }
    
    /// @notice Update whitelist address
    /// @param _newWhitelist New whitelist address
    function updateWhitelist(address _newWhitelist)
        external
        onlyAdmin
    {
        whitelist = IWhitelist(_newWhitelist);
    }

    ///////////////////////////////////  ANCHOR , SUPPLIER ///////////////////////////////////////////
    
    /// @notice Enroll anchor
    /// @dev It throws if `_newAnchor` has already enrolled, otherwise
    ///  it emits `EnrollAnchor` if successful
    /// @param _newAnchor Address of anchor
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
    
    /// @notice Enroll supplier
    /// @dev It throws if `_newSupplier` has already enrolled, otherwise
    ///  it emitn `EnrollSupplier` if successful
    /// @param _newSupplier Address of supplier 
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

    /// @notice Enroll admin
    /// @dev It throws if `_newAdmin` has already enrolled, otherwise
    ///  it emits `EnrollAdmin` if successful
    /// @param _newAdmin Address of admin
    function enrollAdmin(address _newAdmin)
        external
        onlyAdmin
    {
        require(hasRole(DEFAULT_ADMIN_ROLE, _newAdmin) == false, "Duplicated enrollment");

        if (whitelist.isAdmin(_newAdmin) == false)
            whitelist.addAdmin(_newAdmin);
        grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        emit EnrollAdmin(_newAdmin);
    }

    /// @notice Remove an address from admin role
    /// @dev It throws if `_account` not in admin role, otherwise
    ///  it emits `RemoveAdmin` if successful
    /// @param _account Address to admin
    function removeAdmin(address _account)
        external
        onlyAdmin
    {
        require(hasRole(DEFAULT_ADMIN_ROLE, _account), "Not in admin group");
        
        whitelist.removeAdmin(_account);
        revokeRole(DEFAULT_ADMIN_ROLE, _account);
        emit RemoveAdmin(_account);
    }
   
    /// @notice For anchor to verify an invoice
    /// @dev It emits `AnchorVerifyInvoice` if successful
    /// @param _invoiceId Invoice to be verified
    function anchorVerifyInvoice(uint256 _invoiceId)
        external
        onlyAnchor
        checkTrustVerified(_msgSender(), _invoiceList[_invoiceId].supplier)
    {
        require(_invoiceList[_invoiceId].anchor == _msgSender(), "Not authorized");

        _invoiceList[_invoiceId].anchorConfirmTime = block.timestamp;
        emit AnchorVerifyInvoice(_msgSender(), _invoiceId);
    }
    
    ///////////////////////////////////  TRUST ONLY FUNCTIONS ///////////////////////////////////////////

    /// @notice Trust verify anchor
    /// @dev It emits `TrustVerifyAnchor` if successful
    /// @param _anchor Address of anchor
    function trustVerifyAnchor(address _anchor)
        external
        onlyTrust
    {
        _anchorVerified[_anchor] = block.timestamp;
        emit TrustVerifyAnchor(_anchor);
    }
    
    /// @notice Trust verify supplier 
    /// @dev It emits `TrustVerifySupplier` if successful
    /// @param _supplier Address of supplier 
    function trustVerifySupplier(address _supplier)
        external
        onlyTrust
    {
        _supplierVerified[_supplier] = block.timestamp;
        emit TrustVerifySupplier(_supplier);
    }

    ///////////////////////////////////  INVOICE UPDATE FUNCTIONS ///////////////////////////////////////////

    /// @notice Upload an invoice by supplier
    /// @dev It emits `UploadInvoice` if successful
    /// @param _invoiceAmount Invoice Amount
    /// @param _time The first(high) 128-bit is issuance time of invoice,
    ///  the last(low) 128-bit is due date
    /// @param _interestRate Interest rate
    /// @param _invoicePdfHash Hash of the invoice pdf
    /// @param _invoiceNumberHash Hash of the invoice number
    /// @param _anchorHash Hash of the anchor name
    /// @param _anchorAddr Address of anchor
    /// @param _signature Admin signature
    function uploadInvoice(
        uint256 _invoiceAmount,
        uint256 _time,
        bytes32 _interestRate,
        bytes32 _invoicePdfHash,
        bytes32 _invoiceNumberHash,
        bytes32 _anchorHash,
        address _anchorAddr,
        bytes   calldata _signature
    ) 
        external
        onlySupplier
        checkTrustVerified(_anchorAddr, _msgSender())
    {
        bytes32 hashedParams = uploadPreSignedHash(
            _invoiceAmount,
            _time,
            _interestRate,
            _invoicePdfHash,
            _invoiceNumberHash,
            _anchorHash,
            _msgSender(),
            _anchorAddr
        );
        address from = hashedParams.toEthSignedMessageHash().recover(_signature);
        require(hasRole(DEFAULT_ADMIN_ROLE, from), "Not authorized by admin");

        _uploadInvoice(
            _invoiceAmount,
            _time,
            _interestRate,
            _invoicePdfHash,
            _invoiceNumberHash,
            _anchorHash,
            _msgSender(),
            _anchorAddr
        );
    }
    
    function _uploadInvoice(
        uint256 _invoiceAmount,
        uint256 _time,
        bytes32 _interestRate,
        bytes32 _invoicePdfHash,
        bytes32 _invoiceNumberHash,
        bytes32 _anchorHash,
        address _supplierAddr,
        address _anchorAddr
    )
        internal
    {
        Invoice memory newInvoice = Invoice(
            invoiceCount,
            0,
            _invoiceAmount,
            0,
            uint128(_time >> 128),
            uint128(_time),
            _interestRate,
            _invoicePdfHash,
            _invoiceNumberHash,
            _anchorHash,
            _supplierAddr,
            _anchorAddr
        );
        invoiceCount = invoiceCount + 1;
        _invoiceList.push(newInvoice);
        emit UploadInvoice(invoiceCount - 1, _supplierAddr, _anchorAddr);
    }

    /// @notice Hash invoice
    /// @param _invoiceAmount Invoice Amount
    /// @param _time The first(high) 128-bit is issuance time of invoice,
    ///  the last(low) 128-bit is due date
    /// @param _interestRate Interest rate
    /// @param _invoicePdfHash Hash of the invoice pdf
    /// @param _invoiceNumberHash Hash of the invoice number
    /// @param _anchorHash Hash of the anchor name
    /// @param _supplierAddr Address of supplier 
    /// @param _anchorAddr Address of anchor
    function uploadPreSignedHash(
        uint256 _invoiceAmount,
        uint256 _time,
        bytes32 _interestRate,
        bytes32 _invoicePdfHash,
        bytes32 _invoiceNumberHash,
        bytes32 _anchorHash,
        address _supplierAddr,
        address _anchorAddr
    )
        public
        pure
        returns (bytes32)
    {
        // "a18b7c27": bytes4(keccak256("uploadPreSignedHash(uint256,uint256,bytes32,bytes32,bytes32,bytes32,address,address,bool)"))
        return keccak256(
            abi.encodePacked(
                bytes4(0xa18b7c27),
                _invoiceAmount,
                _time,
                _interestRate, 
                _invoicePdfHash,
                _invoiceNumberHash,
                _anchorHash,
                _supplierAddr,
                _anchorAddr
            )
        );
    }
    
    /// @notice Create a token for invoice
    /// @dev It throws if `msg.sender` is not admin, invoice hasn't
    ///  been confirmed by anchor or token has created before.
    ///  It emits `CreateTokenFromInvioce` if successful
    /// @param _invoiceId Invoice ID
    function invoiceToToken(uint256 _invoiceId)
        external
        onlyAdmin
    {
        require(_invoiceList[_invoiceId].anchorConfirmTime > 0, "Anchor hasn't confirmed");
        require(_invoiceList[_invoiceId].tokenId == 0, "Token already created");

        uint256 tokenId = tokenFactory.createTokenWithRecording(
            _invoiceList[_invoiceId].invoiceAmount,
            trustAddress,
            address(this),
            false,
            trustAddress,
            false
        );

        _invoiceIdToTokenId[_invoiceId] = tokenId;
        _tokenIdToInvoiceId[tokenId] = _invoiceId;
        _invoiceList[_invoiceId].tokenId = tokenId;

        emit CreateTokenFromInvoice(_invoiceId, tokenId);
    }

    /// @notice Set time interval for token holding time calculation 
    /// @dev This function can only be accessed by trust
    /// @param _invoiceId Invoice ID
    /// @param _startTime Starting time in unix time format
    /// @param _endTime Ending time in unix time format
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
            _invoiceList[_invoiceId].tokenId,
            _startTime,
            _endTime
        );
    }
    
    ///////////////////////////////////  RESTORE FUNCTIONS ///////////////////////////////////////////

    /// @notice Set a new address for anchor or supplier
    /// @dev This function can only be accessed by admin. It emits
    ///  `RestoreAccount` if successful
    /// @param _originAddress Original address
    /// @param _newAddress New address
    function restoreAccount(
        address _originAddress,
        address _newAddress
    )
        external
        onlyAdmin
    {
        require(
            _supplierVerified[_originAddress] > 0 || 
            _anchorVerified[_originAddress] > 0,
            "Not enrolled yet"
        );

        if (_supplierVerified[_originAddress] > 0) 
            _supplierVerified[_newAddress] = _supplierVerified[_originAddress];
        
        if (_anchorVerified[_originAddress] > 0)
            _anchorVerified[_newAddress] = _anchorVerified[_originAddress];

        if (whitelist.inWhitelist(_newAddress) == false)
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
