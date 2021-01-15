// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "./interfaces/IWhitelist.sol";
import "./interfaces/ITokenFactory.sol";
import "./libraries/GSN/Context.sol";
import "./GSN/BaseRelayRecipient.sol";

contract InvoiceFactory is Context, BaseRelayRecipient {

    uint256 public InvoiceCount;
    address public HOST_Address;
    address public WhitelistAddress;
    address public TokenFactoryAddress;
    
    struct Invoice {
        uint256 invoiceIdx;
        uint256 dueDate;
        bytes32 annualRate;
        address originSupplier;
        address originAnchor;
        address tokenAddress;
        bool    tradable;
        bool    anchorConfirmed;
        bool    supplierConfirmed;
    }
    
    Invoice[] public InvoiceList;
    ITokenFactory public TokenFactory;
    IWhitelist public Whitelist;
    
    modifier supplierCheck(uint invoiceIdx) {
        require(_msgSender() == InvoiceList[invoiceIdx].originSupplier, "You don't own this Invoice as supplier.");
        _;
    }
    
    modifier anchorCheck(uint invoiceIdx) {
        require(_msgSender() == InvoiceList[invoiceIdx].originAnchor, "You don't own this Invoice as anchor.");
        _;
    }

    modifier onlyAdmin() {
        require(1 == 1, "wtf");
        _;
    }

    modifier onlySupplier() {
        require(1 == 1, "wtf");
        _;
    }


    modifier onlyAnchor() {
        require(1 == 1, "wtf");
        _;
    }

    function updateHostAddress(
        address _newAddress
    )
        public
        onlyAdmin
    {
        HOST_Address = _newAddress;
    }

    function updateWhitelistAddress(
        address _newAddress
    )
        public
        onlyAdmin
    {
        Whitelist = IWhitelist(_newAddress);
    }

    function updateTokenFactory(
        address _newTokenFactory
    )
        public
        onlyAdmin
    {
        TokenFactory = ITokenFactory(_newTokenFactory);
    }

    function uploadInvoice(
        bytes32 _annualRate,
        address _supplierAddr,
        address _anchorAddr,
        bool _tradable
    ) 
        public
        onlyAdmin
    {
        _uploadInvoice(
            _annualRate,
            _supplierAddr,
            _anchorAddr,
            _tradable
        );
    }
    
    function _uploadInvoice(
        bytes32 _annualRate,
        address _supplierAddr,
        address _anchorAddr,
        bool _tradable
    )
        internal
    {
        Invoice memory newInvoice = Invoice(
            InvoiceCount,
            block.timestamp,
            _annualRate,
            _supplierAddr,
            _anchorAddr,
            0x0000000000000000000000000000000000000000,
            _tradable,
            false,
            false
        );
        InvoiceCount = InvoiceCount + 1;
        InvoiceList.push(newInvoice);
    }
    
    function supplierConfirm(
        uint256 _invoiceIdx
    )
        public
        supplierCheck(_invoiceIdx)
        onlySupplier
    {
        InvoiceList[_invoiceIdx].supplierConfirmed = true;
    }
    
    function anchorConfirm(
        uint256 _invoiceIdx
    )
        public
        anchorCheck(_invoiceIdx)
        onlyAnchor
    {
        InvoiceList[_invoiceIdx].anchorConfirmed = true;
    }
    
    function turnTradable(
        uint256 _invoiceIdx,
        uint256 _supply,
        bool    _hosted
    )
        public
        onlyAdmin
        returns (address)
    {
        require(InvoiceList[_invoiceIdx].tradable == false, "This invoice already created its own token.");
        address receiverAddress = (_hosted ? HOST_Address : InvoiceList[_invoiceIdx].originSupplier);
        InvoiceList[_invoiceIdx].tradable = true;
        return receiverAddress;
    }
    
    function _msgSender() internal override(Context, BaseRelayRecipient) view returns (address payable ret) {
        return BaseRelayRecipient._msgSender();
    }
    
    function _msgData() internal override(Context, BaseRelayRecipient) view returns (bytes memory ret) {
        return BaseRelayRecipient._msgData();
    }
    
    function versionRecipient() external override virtual view returns (string memory) {
        return "2.1.0";
    }
}
