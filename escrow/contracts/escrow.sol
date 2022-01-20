// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

contract Escrow {
    address payable public requestor;
    address payable public serviceProvider;
    bool public requestorConfirmed;
    bool public serviceProviderConfirmed;
    uint256 public amount; // TODO: allow any precompiled token

    event ContractFunded(uint256 amount);

    constructor(address payable _serviceProvider) {
        requestor = payable(msg.sender);
        serviceProvider = _serviceProvider;
        requestorConfirmed = false;
        serviceProviderConfirmed = false;
    }

    function fund(uint256 _amount) public payable {
        require(
            msg.sender == requestor,
            "Only the requestor can fund the contract"
        );

        amount = _amount;

        emit ContractFunded(_amount);
    }

    function requestorConfirmTaskCompletion(bool _taskConfirmation) public {
        require(
            msg.sender == requestor,
            "Only the requestor can confirm his part"
        );

        requestorConfirmed = _taskConfirmation;
    }

    function serviceProviderConfirmTaskCompletion(bool _taskConfirmation)
        public
    {
        require(
            msg.sender == serviceProvider,
            "Only the service provider can confirm his part"
        );

        serviceProviderConfirmed = _taskConfirmation;
    }

    function completeTask() public {
        require(
            msg.sender == requestor,
            "Only the requestor can complete the task"
        );

        if (serviceProviderConfirmed == true && requestorConfirmed == true) {
            payoutToServiceProvider();
        } else if (
            serviceProviderConfirmed == false && requestorConfirmed == false
        ) {
            refundRequestor();
        } else {
            // requires dispute settlement
        }
    }

    function payoutToServiceProvider() public {
        // requestor.transfer(address(this).balance);
        amount = 0;
    }

    function refundRequestor() public {
        requestor.transfer(address(this).balance);
    }
}
