// SPDX-License-Identifier: MIT

pragma solidity 0.8.0;

import "../InvoiceFactory.sol";

contract InvoiceFactoryMock is InvoiceFactory {
    
    event MsgSender(address indexed _msgSender, address indexed _realSender);
    event MsgData(bytes indexed _data);
    event RelayCall(address indexed _sender);


    constructor (address _trustAddress, address _trustedForwarder) InvoiceFactory (_trustAddress, _trustedForwarder) {
    }

    function msgSender() external returns (address payable) {
        emit MsgSender(msg.sender, _msgSender());
    }

    function msgData() external returns (bytes memory) {
        emit MsgData(_msgData());
    }

    function relayCall() external {
        emit RelayCall(_msgSender());
    } 
}