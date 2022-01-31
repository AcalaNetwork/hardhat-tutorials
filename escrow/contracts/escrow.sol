// SPDX-License-Identifier: Unlicensed
pragma solidity ^0.8.9;

// TODO: wait for contracts repo update
// we will use openzeppelin's ERC20 for now
// import "@acala-network/contracts/token/Token.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Escrow {
    address payable public requestor;
    address payable public serviceProvider;
    bool public requestorConfirmed;
    bool public serviceProviderConfirmed;
    uint256 public amount;
    address public token;

    event ContractFunded(address token, uint256 amount);

    constructor(address payable _requestor, address payable _serviceProvider) {
        requestor = _requestor;
        serviceProvider = _serviceProvider;
        requestorConfirmed = false;
        serviceProviderConfirmed = false;
    }

    function fund(address _token, uint256 _amount) public payable {
        require(
            msg.sender == requestor,
            "Only the requestor can fund the contract"
        );

        require(amount == 0, "Contract has already been funded");

        token = _token;
        amount = _amount;
        emit ContractFunded(token, amount);
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

        IERC20(token).transfer(serviceProvider, 100);
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
        IERC20(token).transfer(serviceProvider, amount);
        amount = 0;
    }

    function refundRequestor() public {
        IERC20(token).transfer(requestor, amount);
        amount = 0;
    }
}
