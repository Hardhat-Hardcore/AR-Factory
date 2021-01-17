// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./interfaces/ITokenFactory.sol";
import "./libraries/GSN/Context.sol";
import "./libraries/AccessControl.sol";
import "./GSN/BaseRelayRecipient.sol";

contract InvoiceFactory is Context, BaseRelayRecipient, AccessControl {

    uint256 public InvoiceCount;
    address public TRUST_Address;
    //address public WhitelistAddress;
    address public TokenFactoryAddress;
    bytes32 public constant SUPPLIER_ROLE = keccak256("SUPPLIER_ROLE");
    bytes32 public constant ANCHOR_ROLE = keccak256("ANCHOR_ROLE");
    
    struct Invoice {
        uint256 invoiceId;
        uint256 tokenId;
        uint256 invoiceTime;
        uint256 startDate;
        uint256 dueDate;
        uint256 anchorConfirmTime;
        bytes32 annualRate;
        address Supplier;
        address Anchor;
        bool    toList;
    }
    
    mapping(uint256=>uint256) public tokenIDtoInvoiceID;
    mapping(address=>uint256) public verifiedAnchor;
    mapping(address=>uint256) public verifiedSupplier;
    
    Invoice[] public InvoiceList;
    ITokenFactory public TokenFactory;
    IWhitelist public Whitelist;

    //////////////////////////////////// MODIFIER ////////////////////////////////////////////////    

    modifier onlyAdmin() {
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
    
    modifier checkVerify(address _anchor, address _supplier) {
        require(verifiedAnchor[_anchor] != 0, "Anchor haven't been verified by trust.");
        require(verifiedSupplier[_supplier] != 0, "Supplier haven't been verified by trust.");
        _;
    }
    
    //////////////////////////////////// CONSTRUCTOR ////////////////////////////////////////////////    
    
    constructor(address _trustAddress) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        TRUST_Address = _trustAddress;
    }
    
    //////////////////////////////////// FUNCTIONS ////////////////////////////////////////////////
    
    function updateTrustAddress(address _newTrust)
        public
        onlyAdmin
    {
        TRUST_Address = _newTrust;
    }
    
    function updateTokenFactory(address _newTokenFactory)
        public
        onlyAdmin
    {
        TokenFactory = ITokenFactory(_newTokenFactory);
    }
    
    function updateWhitelist(address _newWhitelist)
        public
        onlyAdmin
    {
        Whitelist = IWhitelist(_newWhitelist);
    }
    
    function enrollAnchor(address _newAnchor)
        public
        onlyAdmin
    {
        require(hasRole(ANCHOR_ROLE, _newAnchor) == false, "This account has already been added to the anchor.");
        grantRole(ANCHOR_ROLE, _newAnchor);
        /*
            Have to put into Whitelist as well.
            and have to check if it's in Whitelist too.
        */
    }
    
    function enrollSupplier(address _newSupplier)
        public
        onlyAdmin
    {
        require(hasRole(SUPPLIER_ROLE, _newSupplier) == false, "This account has already been added to the supplier.");
        grantRole(SUPPLIER_ROLE, _newSupplier);
        /*
            Have to put into Whitelist as well.
            and have to check if it's in Whitelist too.
        */
    }
    
    function trustVerifyAnchor(address _anchor)
        public
    {
        require(_msgSender() == TRUST_Address, "Restricted to only trust to verify.");
        verifiedAnchor[_anchor] = block.timestamp;
    }
    
    function trustVerifySupplier(address _supplier)
        public
    {
        require(_msgSender() == TRUST_Address, "Restricted to only trust to verify.");
        verifiedSupplier[_supplier] = block.timestamp;
    }
    
    function anchorVerify(uint256 _invoiceId)
        public
        onlyAnchor
    {
        require(verifiedAnchor[_msgSender()] != 0, "You have't been verified yet.");
        require(InvoiceList[_invoiceId].Anchor == _msgSender(), "You don't own this invoice.");
        InvoiceList[_invoiceId].anchorConfirmTime = block.timestamp;
    }

    function uploadInvoice(
        uint256 _tokenId,
        uint256 _invoiceTime,
        bytes32 _annualRate,
        address _supplierAddr,
        address _anchorAddr,
        bool _tolist
    ) 
        public
        onlySupplier
    {
        require(verifiedSupplier[_msgSender()] != 0, "You have't been verified yet.");
        _uploadInvoice(
            _tokenId,
            _invoiceTime,
            _annualRate,
            _supplierAddr,
            _anchorAddr,
            _tolist
        );
    }
    
    function _uploadInvoice(
        uint256 _tokenId,
        uint256 _invoiceTime,
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
            0,
            0,
            0,
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
        // TokenFactory.call();
        /*
        Should call TokenFactory contract to use createToken function
        */
    }
    
    function _msgSender() internal override(Context, BaseRelayRecipient) view returns (address payable) {
        return BaseRelayRecipient._msgSender();
    }
    
    function _msgData() internal override(Context, BaseRelayRecipient) view returns (bytes memory) {
        return BaseRelayRecipient._msgData();
    }
    
    function versionRecipient() external override virtual view returns (string memory) {
        return "2.1.0";
    }
}
