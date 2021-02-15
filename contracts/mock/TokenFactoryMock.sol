// SPDX-License-Identifier: MIT

pragma solidity 0.8.1;

import "../TokenFactory.sol";

contract TokenFactoryMock is TokenFactory {
    
    event MsgSender(address indexed _msgSender, address indexed _realSender);
    event MsgData(bytes _msgData, bytes _realData);
    event RelayCall(address indexed _sender);


    constructor (address _trustedForwarder) TokenFactory (_trustedForwarder) {
    }

    function msgSender() external returns (address payable) {
        emit MsgSender(msg.sender, _msgSender());
    }

    function msgData() external returns (bytes memory, bytes memory) {
        emit MsgData(msg.data, _msgData());
    }

    function relayCall() external {
        emit RelayCall(_msgSender());
    } 
}
