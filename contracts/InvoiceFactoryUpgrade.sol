// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./interfaces/ITokenFactory.sol";
import "./upgradeable/GSN/ContextUpgradeable.sol";
import "./upgradeable/access/AccessControlUpgradeable.sol";
import "./GSN/BaseRelayRecipient.sol";

// import "hardhat/console.sol";

contract InvoiceFactoryUpgrade is ContextUpgradeable, BaseRelayRecipient, AccessControlUpgradeable {

    struct Invoice {
        uint256 invoiceId;              //發票編號
        uint256 tokenId;                //生成的token id
        uint256 txAmount;               //發票金額
        uint256 anchorConfirmTime;      //anchor verify time
        uint128 invoiceTime;            //發票時間
        uint128 dueDate;                //發票回款時間
        bytes32 annualRate;             //利率
        bytes32 invoicePdfhash;         //發票pdf   hash
        bytes32 invoiceNumberHash;      //發票編號  hash
        bytes32 anchorHash;             //anchor address hash
        address Supplier;               //supplier address
        address Anchor;                 //anchor address
        bool    toList;                 //to list or not
    }

    uint256 public InvoiceCount;
    uint8 public FIXED_DECIMAL;
    address public TRUST_ADDRESS;
    address public TokenFactoryAddress;
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");    
    
    mapping(uint256 => uint256) internal tokenIdtoInvoiceId;
    mapping(uint256 => uint256) internal invoiceIdtoTokenId;
    mapping(address => uint256) internal verifiedAnchor;
    mapping(address => uint256) internal verifiedSupplier;
    
    Invoice[] internal InvoiceList;
    ITokenFactory public tempTokenFactory;
    IWhitelist public tempWhitelist;

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
        require(hasRole(ANCHOR_ROLE, _msgSender()) == true, "Restricted to suppliers.");
        _;
    }
    
    modifier checkWhitelist() {
        require(address(tempWhitelist) != address(0), "Whitelist not initialized yet.");
        _;
    }
    
    modifier checkVerify(address _anchor, address _supplier) {
        require(verifiedAnchor[_anchor] != 0, "Anchor not verified by trust.");
        require(verifiedSupplier[_supplier] != 0, "Supplier not verified by trust.");
        _;
    }
    
    ///////////////////////////////////  CONSTRUCTOR //////////////////////////////////////////    
    
    function __initialize(
        uint8   decimal,
        address _trustAddress,
        address _trustedForwarder
    ) 
        public
        initializer
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        TRUST_ADDRESS = _trustAddress;
        trustedForwarder = _trustedForwarder;
        FIXED_DECIMAL = decimal;
    }

    ///////////////////////////////////    EVENTS    //////////////////////////////////////////
    
    event EnrollAnchor(address _account);
    event EnrollSupplier(address _account);
    event TrustVerifyAnchor(address _account);
    event TrustVerifySupplier(address _account);
    event AnchorVerify(address _account);

    ///////////////////////////////////  GETTER FUNCTIONS ///////////////////////////////////////////
   
    function queryInvoiceId(uint256 _tokenId) external view returns (uint256) {
        return tokenIdtoInvoiceId[_tokenId];
    }

    function queryTokenId(uint256 _invoiceId) external view returns (uint256) {
        return invoiceIdtoTokenId[_invoiceId];
    }

    function queryAnchorVerified(address _anchor) external view returns (bool) {
        return verifiedAnchor[_anchor] > 0;
    }

    function querySupplierVerified(address _anchor) external view returns (bool) {
        return verifiedSupplier[_anchor] > 0;
    }

    function queryInvoiceInform(uint256 _invoiceId)
        external
        view
        returns ( uint256, uint256, uint256,
                  uint256, bytes32, bytes32,
                  bytes32)
    {
        return (
            InvoiceList[_invoiceId].invoiceId,
            InvoiceList[_invoiceId].invoiceTime,
            InvoiceList[_invoiceId].txAmount,
            InvoiceList[_invoiceId].dueDate,
            InvoiceList[_invoiceId].invoicePdfhash,
            InvoiceList[_invoiceId].invoiceNumberHash,
            InvoiceList[_invoiceId].anchorHash
        );
    }

    function queryInvoiceData(uint256 _invoiceId)
        external
        view
        returns ( uint256, uint256, bytes32,
                  address, address, bool)
    {
        return (
            InvoiceList[_invoiceId].tokenId,
            InvoiceList[_invoiceId].anchorConfirmTime,
            InvoiceList[_invoiceId].annualRate,
            InvoiceList[_invoiceId].Supplier,
            InvoiceList[_invoiceId].Anchor,
            InvoiceList[_invoiceId].toList
        );
    }

    function isAnchor(address _anchor)
        public
        view
        returns (bool)
    {
        return hasRole(ANCHOR_ROLE, _anchor);
    }
    
    function isSupplier(address _supplier)
        public
        view
        returns (bool)
    {
        return hasRole(SUPPLIER_ROLE, _supplier);
    }

    ///////////////////////////////////  UPDATE INTERFACE FUNCTIONS ///////////////////////////////////////////

    function updateTrustAddress(address _newTrust)
        public
        onlyAdmin
    {
        TRUST_ADDRESS = _newTrust;
    }
    
    function updateTokenFactory(address _newTokenFactory)
        public
        onlyAdmin
    {
        tempTokenFactory = ITokenFactory(_newTokenFactory);
    }
    
    function updateWhitelist(address _newWhitelist)
        public
        onlyAdmin
    {
        tempWhitelist = IWhitelist(_newWhitelist);
    }

    ///////////////////////////////////  ANCHOR , SUPPLIER ///////////////////////////////////////////
    
    function enrollAnchor(address _newAnchor)
        public
        onlyAdmin
        checkWhitelist
    {
        require(hasRole(ANCHOR_ROLE, _newAnchor) == false, "Duplicated enroll on anchor");
        if (tempWhitelist.inWhitelist(_newAnchor) == false) {
            tempWhitelist.addWhitelist(_newAnchor);
        }
        grantRole(ANCHOR_ROLE, _newAnchor);
    }
    
    function enrollSupplier(address _newSupplier)
        public
        onlyAdmin
        checkWhitelist
    {
        require(hasRole(SUPPLIER_ROLE, _newSupplier) == false, "Duplicated enroll on supplier");
        if (tempWhitelist.inWhitelist(_newSupplier) == false) {
            tempWhitelist.addWhitelist(_newSupplier);
        }
        grantRole(SUPPLIER_ROLE, _newSupplier);
    }
   
    function anchorVerify(uint256 _invoiceId, bytes32 _adminSigature)
        public
        onlyAnchor
        checkVerify(_msgSender(), InvoiceList[_invoiceId].Supplier)
    {
        require(verifiedAnchor[_msgSender()] != 0, "You have't been verified yet");
        require(InvoiceList[_invoiceId].Anchor == _msgSender(), "You don't own this invoice");
        InvoiceList[_invoiceId].anchorConfirmTime = block.timestamp;
    }
    
    ///////////////////////////////////  TRUST ONLY FUNCTIONS ///////////////////////////////////////////
    function trustVerifyAnchor(address _anchor)
        public
    {
        require(_msgSender() == TRUST_ADDRESS, "Restricted to only trust by verify");
        verifiedAnchor[_anchor] = block.timestamp;
    }
    
    function trustVerifySupplier(address _supplier)
        public
    {
        require(_msgSender() == TRUST_ADDRESS, "Restricted to only trust by verify");
        verifiedSupplier[_supplier] = block.timestamp;
    }

    ///////////////////////////////////  INVOICE UPDATE FUNCTIONS ///////////////////////////////////////////

    function uploadInvoice(
        uint256 _txAmount,
        uint128 _invoiceTime,
        uint128 _dueDate,
        bytes32 _annualRate,
        bytes32 _invoicePdfhash,
        bytes32 _invoiceNumberHash,
        address _anchorAddr,
        bool _tolist
    ) 
        public
        onlySupplier
        checkVerify(_anchorAddr, _msgSender())
    {
        require(verifiedSupplier[_msgSender()] != 0, "Restricted to verified supplier");
        require(address(tempTokenFactory) != address(0), "TokenFactory not inited");
        _uploadInvoice(
            _txAmount,
            _invoiceTime,
            _dueDate,
            _annualRate,
            _invoicePdfhash,
            _invoiceNumberHash,
            _msgSender(),
            _anchorAddr,
            _tolist
        );
    }
    
    function _uploadInvoice(
        uint256 _txAmount,
        uint128 _invoiceTime,
        uint128 _dueDate,
        bytes32 _annualRate,
        bytes32 _invoicePdfhash,
        bytes32 _invoiceNumberHash,
        address _supplierAddr,
        address _anchorAddr,
        bool _tolist
    )
        internal
    {
        Invoice memory newInvoice = Invoice(
            InvoiceCount,
            0,
            _txAmount,
            0,
            _invoiceTime,
            _dueDate,
            _annualRate,
            _invoicePdfhash,
            _invoiceNumberHash,
            "",
            _supplierAddr,
            _anchorAddr,
            _tolist
        );
        InvoiceCount = InvoiceCount + 1;
        InvoiceList.push(newInvoice);
    }
    
    function invoiceToToken(
        uint _invoiceId,
        string memory _name,
        string memory _symbol)
        public
        onlyAdmin
    {
        require(address(tempTokenFactory) != address(0), "TokenFactory empty");
        require(InvoiceList[_invoiceId].anchorConfirmTime != 0, "Anchor hasn't confirm");
        /*
        Should call TokenFactory contract to use createToken function
        */
        require(InvoiceList[_invoiceId].tokenId == 0, "Token already created");
        uint256 tokenId = tempTokenFactory.createTokenWithRecording(
            InvoiceList[_invoiceId].txAmount,
            TRUST_ADDRESS,
            _contractAddress(),
            false,
            TRUST_ADDRESS,
            ""
        );
        InvoiceList[_invoiceId].tokenId = tokenId;
        tempTokenFactory.setTimeInterval(
            tokenId, 
            (InvoiceList[_invoiceId].invoiceTime),
            InvoiceList[_invoiceId].dueDate);
        tempTokenFactory.createERC20Adapter(
            tokenId,
            _name,
            _symbol,
            FIXED_DECIMAL);
    }
    
    ///////////////////////////////////  RESTORE FUNCTIONS ///////////////////////////////////////////
    function restoreAccount(address _originAddress, address _newAddress)
        public
        onlyAdmin
    {
        require((verifiedSupplier[_originAddress] > 0) || (verifiedAnchor[_originAddress] > 0), "You hadn't enroll yet");
        if (verifiedSupplier[_originAddress] > 0) {
            verifiedSupplier[_newAddress] = block.timestamp;
        }
        
        if (verifiedAnchor[_originAddress] > 0) {
            verifiedAnchor[_newAddress] = block.timestamp;
        }
        tempWhitelist.addWhitelist(_newAddress);
    }

    function _contractAddress() internal view returns(address) {
        return address(this);
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
