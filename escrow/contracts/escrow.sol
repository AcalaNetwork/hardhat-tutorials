// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "@acala-network/contracts/token/Token.sol";

contract Escrow {
    address payable public requestor;
    address payable public serviceProvider;
    ServiceStatus public requestorStatus;
    ServiceStatus public serviceProviderStatus;
    address public tokenAddress;
    uint256 public amount;

    enum ServiceStatus {
        Pending,
        Confirmed,
        Denied
    }

    constructor(
        address _tokenAddress,
        uint256 _amount,
        address payable _requestor,
        address payable _serviceProvider
    ) {
        requestor = _requestor;
        serviceProvider = _serviceProvider;
        tokenAddress = _tokenAddress;
        amount = _amount;
        requestorStatus = ServiceStatus.Pending;
        serviceProviderStatus = ServiceStatus.Pending;
    }

    function requestorConfirmTaskCompletion(bool _taskConfirmation) public {
        require(
            msg.sender == requestor,
            "Only the requestor can confirm his part"
        );

        if (_taskConfirmation == true) {
            requestorStatus = ServiceStatus.Confirmed;
        } else {
            requestorStatus = ServiceStatus.Denied;
        }

        completeTask();
    }

    function serviceProviderConfirmTaskCompletion(bool _taskConfirmation)
        public
    {
        require(
            msg.sender == serviceProvider,
            "Only the service provider can confirm his part"
        );

        if (_taskConfirmation == true) {
            serviceProviderStatus = ServiceStatus.Confirmed;
        } else {
            serviceProviderStatus = ServiceStatus.Denied;
        }

        completeTask();
    }

    function completeTask() private {
        if (
            serviceProviderStatus == ServiceStatus.Confirmed &&
            requestorStatus == ServiceStatus.Confirmed
        ) {
            payoutToServiceProvider();
            return;
        }

        if (
            serviceProviderStatus == ServiceStatus.Denied &&
            requestorStatus == ServiceStatus.Denied
        ) {
            refundRequestor();
            return;
        }
    }

    function payoutToServiceProvider() public {
        Token(tokenAddress).transfer(serviceProvider, amount);
    }

    function refundRequestor() public {
        Token(tokenAddress).transfer(requestor, amount);
    }
}
