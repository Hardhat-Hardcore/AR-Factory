// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./interfaces/ITokenFactory.sol";
import "./libraries/GSN/Context.sol";
import "./libraries/AccessControl.sol";
import "./GSN/BaseRelayRecipient.sol";
// import "hardhat/console.sol";

contract InvoiceFactory is Context, BaseRelayRecipient, AccessControl {

    uint256 public InvoiceCount;
    uint256 public FIXED_DECIMAL = 3;
    address public TRUST_ADDRESS;
    //address public WhitelistAddress;
    address public TokenFactoryAddress;
    address public EMPTY;
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");
    
    struct Invoice {
        uint256 invoiceId;
        uint256 tokenId;
        uint256 invoiceTime;
        uint256 txAmount;
        uint256 startDate;
        uint256 dueDate;
        uint256 anchorConfirmTime;
        uint256 totalSupply;
        bytes32 annualRate;
        address Supplier;
        address Anchor;
        bool    toList;
    }
    
    mapping(uint256 => uint256) public tokenIdtoInvoiceId;
    mapping(uint256 => uint256) public invoiceIdtoTokenId;
    mapping(address => uint256) public verifiedAnchor;
    mapping(address => uint256) public verifiedSupplier;
    
    Invoice[] public InvoiceList;
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
        require(address(tempWhitelist) != 0x0000000000000000000000000000000000000000, "Whitelist hasn't initialized yet.");
        _;
    }
    
    modifier checkVerify(address _anchor, address _supplier) {
        require(verifiedAnchor[_anchor] != 0, "Anchor haven't been verified by trust.");
        require(verifiedSupplier[_supplier] != 0, "Supplier haven't been verified by trust.");
        _;
    }
    
    ///////////////////////////////////  CONSTRUCTOR //////////////////////////////////////////    
    
    constructor(address _trustAddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        TRUST_ADDRESS = _trustAddress;
    }

    ///////////////////////////////////    EVENTS    //////////////////////////////////////////
    
    event EnrollAnchor(address _account);
    event EnrollSupplier(address _account);
    event TrustVerifyAnchor(address _account);
    event TrustVerifySupplier(address _account);
    event AnchorVerify(address _account);

    ///////////////////////////////////   FUNCTIONS ///////////////////////////////////////////
    
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
    
    function enrollAnchor(address _newAnchor)
        public
        onlyAdmin
        checkWhitelist
    {
        require(hasRole(ANCHOR_ROLE, _newAnchor) == false, "This account has already been added to the anchor.");
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
        require(hasRole(SUPPLIER_ROLE, _newSupplier) == false, "This account has already been added to the supplier.");
        if (tempWhitelist.inWhitelist(_newSupplier) == false) {
            tempWhitelist.addWhitelist(_newSupplier);
        }
        grantRole(SUPPLIER_ROLE, _newSupplier);
    }
    
    function trustVerifyAnchor(address _anchor)
        public
    {
        require(_msgSender() == TRUST_ADDRESS, "Restricted to only trust to verify.");
        verifiedAnchor[_anchor] = block.timestamp;
    }
    
    function trustVerifySupplier(address _supplier)
        public
    {
        require(_msgSender() == TRUST_ADDRESS, "Restricted to only trust to verify.");
        verifiedSupplier[_supplier] = block.timestamp;
    }
    
    function anchorVerify(uint256 _invoiceId)
        public
        onlyAnchor
        checkVerify(InvoiceList[_invoiceId].Supplier, _msgSender())
    {
        require(verifiedAnchor[_msgSender()] != 0, "You have't been verified yet.");
        require(InvoiceList[_invoiceId].Anchor == _msgSender(), "You don't own this invoice.");
        InvoiceList[_invoiceId].anchorConfirmTime = block.timestamp;
    }

    function uploadInvoice(
        uint256 _tokenId,
        uint256 _invoiceTime,
        uint256 _txAmount,
        uint256 _totalSupply,
        bytes32 _annualRate,
        address _anchorAddr,
        bool _tolist
    ) 
        public
        onlySupplier
        checkVerify(_msgSender(), _anchorAddr)
    {
        require(verifiedSupplier[_msgSender()] != 0, "You have't been verified yet.");
        _uploadInvoice(
            _tokenId,
            _invoiceTime,
            _txAmount,
            _totalSupply,
            _annualRate,
            _msgSender(),
            _anchorAddr,
            _tolist
        );
    }
    
    function _uploadInvoice(
        uint256 _tokenId,
        uint256 _invoiceTime,
        uint256 _txAmount,
        uint256 _totalSupply,
        bytes32 _annualRate,
        address _supplierAddr,
        address _anchorAddr,
        bool _tolist
    )
        internal
    {
        Invoice memory newInvoice = Invoice(
            InvoiceCount,
            _tokenId,
            _invoiceTime,
            _txAmount,
            0,
            0,
            0,
            _totalSupply,
            _annualRate,
            _supplierAddr,
            _anchorAddr,
            _tolist
        );
        InvoiceCount = InvoiceCount + 1;
        InvoiceList.push(newInvoice);
    }
    
    function invoiceToToken(uint _invoiceId)
        public
        onlyAdmin
    {
        require(InvoiceList[_invoiceId].anchorConfirmTime != 0, "Anchor hasn't confirm this invoice yet");
        /*
        Should call TokenFactory contract to use createToken function
        */
        require(invoiceIdtoTokenId[_invoiceId] == 0, "This invoice's token had been created before.");
        tempTokenFactory.createTokenWithRecording(
            InvoiceList[_invoiceId].totalSupply * 1000,
            TRUST_ADDRESS,
            _contractAddress(),
            false,
            TRUST_ADDRESS,
            ""
        );
    }
    
    function restoreAccount(address _originAddress, address _newAddress)
        public
        onlyAdmin
    {
        require((verifiedSupplier[_originAddress] > 0) || (verifiedAnchor[_originAddress] > 0), "You hadn't enroll to anything yet.");
        if (verifiedSupplier[_originAddress] > 0) {
            verifiedSupplier[_newAddress] = block.timestamp;
        }
        
        if (verifiedAnchor[_originAddress] > 0) {
            verifiedAnchor[_newAddress] = block.timestamp;
        }
    }

    function _contractAddress() internal view returns(address) {
        return address(this);
    } 

    function _msgSender() internal override(Context, BaseRelayRecipient) view returns (address payable ret) {
        return BaseRelayRecipient._msgSender();
    }
    
    function _msgData() internal override(Context, BaseRelayRecipient) view returns (bytes memory) {
        return BaseRelayRecipient._msgData();
    }
    
    function versionRecipient() external override virtual view returns (string memory) {
        return "2.1.0";
    }
}
