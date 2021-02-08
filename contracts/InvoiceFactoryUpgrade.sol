// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./interfaces/ITokenFactory.sol";
import "./libraries/utils/ECDSA.sol";
import "./upgradeable/GSN/ContextUpgradeable.sol"; import "./upgradeable/access/AccessControlUpgradeable.sol";
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
        bytes32 anchorHash;             //anchor address hash
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
    
    mapping(uint256 => uint256) internal tokenIdtoInvoiceId;
    mapping(uint256 => uint256) internal invoiceIdtoTokenId;
    mapping(address => uint256) internal verifiedAnchor;
    mapping(address => uint256) internal verifiedSupplier;
    
    Invoice[] internal invoiceList;
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
        require(address(tempWhitelist) > address(0), "Whitelist not initialized yet.");
        _;
    }

    modifier onlyModifier() {
        require(_msgSender() == trustAddress, "Restricted to only trust by verify");
        _;
    }
    
    modifier checkVerify(address _anchor, address _supplier) {
        require(verifiedAnchor[_anchor] > 0, "Anchor not verified by trust.");
        require(verifiedSupplier[_supplier] > 0, "Supplier not verified by trust.");
        _;
    }
    
    ///////////////////////////////////  CONSTRUCTOR //////////////////////////////////////////    
    
    function __initialize(
        uint8   _decimals,
        address _trustAddress,
        address _trustedForwarder
    ) 
        public
        initializer
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        trustAddress = _trustAddress;
        trustedForwarder = _trustedForwarder;
        decimals = _decimals;
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
            invoiceList[_invoiceId].invoiceId,
            invoiceList[_invoiceId].invoiceTime,
            invoiceList[_invoiceId].txAmount,
            invoiceList[_invoiceId].dueDate,
            invoiceList[_invoiceId].invoicePdfHash,
            invoiceList[_invoiceId].invoiceNumberHash,
            invoiceList[_invoiceId].anchorHash
        );
    }

    function queryInvoiceData(uint256 _invoiceId)
        external
        view
        returns ( uint256, uint256, bytes32,
                  address, address, bool)
    {
        return (
            invoiceList[_invoiceId].tokenId,
            invoiceList[_invoiceId].anchorConfirmTime,
            invoiceList[_invoiceId].interestRate,
            invoiceList[_invoiceId].supplier,
            invoiceList[_invoiceId].anchor,
            invoiceList[_invoiceId].toList
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
        trustAddress = _newTrust;
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
   
    function anchorVerify(uint256 _invoiceId)
        public
        onlyAnchor
        checkVerify(_msgSender(), invoiceList[_invoiceId].supplier)
    {
        require(verifiedAnchor[_msgSender()] > 0, "You have't been verified yet");
        require(invoiceList[_invoiceId].anchor == _msgSender(), "You don't own this invoice");
        invoiceList[_invoiceId].anchorConfirmTime = block.timestamp;
    }
    
    ///////////////////////////////////  TRUST ONLY FUNCTIONS ///////////////////////////////////////////
    function trustVerifyAnchor(address _anchor)
        public
        onlyModifier() 
    {
        verifiedAnchor[_anchor] = block.timestamp;
    }
    
    function trustVerifySupplier(address _supplier)
        public
        onlyModifier() 
    {
        verifiedSupplier[_supplier] = block.timestamp;
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
        public
        onlySupplier
        checkVerify(_anchorAddr, _msgSender())
    {
        require(address(tempTokenFactory) > address(0), "TokenFactory not inited");
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
        invoiceList.push(newInvoice);
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
        /*"a18b7c27": uploadPreSignedHash(uint256,uint256,bytes32,bytes32,bytes32,bytes32,address,address,bool)*/
        return keccak256(abi.encodePacked(bytes4(0xa18b7c27), _txAmount, _time, _interestRate, 
                         _invoicePdfHash, _invoiceNumberHash, _anchorName , _supplierAddr, _anchorAddr, _tolist));
    }
    
    function invoiceToToken(uint _invoiceId)
        external
        onlyAdmin
    {
        require(address(tempTokenFactory) > address(0), "TokenFactory empty");
        require(invoiceList[_invoiceId].anchorConfirmTime > 0, "Anchor hasn't confirm");
        // Should call TokenFactory contract to use createToken function
        require(invoiceList[_invoiceId].tokenId == 0, "Token already created");

        uint256 tokenId = tempTokenFactory.createTokenWithRecording(
            invoiceList[_invoiceId].txAmount,
            trustAddress,
            address(this),
            false,
            trustAddress,
            false
        );
        invoiceList[_invoiceId].tokenId = tokenId;
        tempTokenFactory.setTimeInterval(
            tokenId, 
            invoiceList[_invoiceId].invoiceTime,
            invoiceList[_invoiceId].dueDate
        );
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
