// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

import "@acala-network/contracts/token/Token.sol";

contract Escrow {
    address public initiator;
    address public beneficiary;
    address public tokenAddress;
    uint256 public amount;
    ServiceStatus public initiatorStatus;
    ServiceStatus public beneficiaryStatus;

    enum ServiceStatus {
        Pending,
        Confirmed,
        Denied
    }

    constructor(
        address _tokenAddress,
        uint256 _amount,
        address _initiator,
        address _beneficiary
    ) {
        initiator = _initiator;
        beneficiary = _beneficiary;
        tokenAddress = _tokenAddress;
        amount = _amount;
        initiatorStatus = ServiceStatus.Pending;
        beneficiaryStatus = ServiceStatus.Pending;
    }

    function initiatorConfirmTaskCompletion(bool _taskConfirmation) public {
        require(
            msg.sender == initiator,
            "Escrow: only the initiator can confirm his part"
        );

        if (_taskConfirmation == true) {
            initiatorStatus = ServiceStatus.Confirmed;
        } else {
            initiatorStatus = ServiceStatus.Denied;
        }

        require(completeTask());
    }

    function beneficiaryConfirmTaskCompletion(bool _taskConfirmation) public {
        require(
            msg.sender == beneficiary,
            "Escrow: only the beneficiary can confirm his part"
        );

        if (_taskConfirmation == true) {
            beneficiaryStatus = ServiceStatus.Confirmed;
        } else {
            beneficiaryStatus = ServiceStatus.Denied;
        }

        require(completeTask());
    }

    function completeTask() internal {
        if (
            beneficiaryStatus == ServiceStatus.Confirmed &&
            initiatorStatus == ServiceStatus.Confirmed
        ) {
            payoutToBeneficiary();
            return;
        }

        if (
            beneficiaryStatus == ServiceStatus.Denied &&
            initiatorStatus == ServiceStatus.Denied
        ) {
            refundInitiator();
            return;
        }
    }

    function payoutToBeneficiary() internal {
        Token(tokenAddress).transfer(beneficiary, amount);
    }

    function refundInitiator() internal {
        Token(tokenAddress).transfer(initiator, amount);
    }
}
