//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@acala-network/contracts/dex/IDEX.sol";
import "@acala-network/contracts/token/Token.sol";
import "@acala-network/contracts/schedule/ISchedule.sol";
 
import "@acala-network/contracts/utils/Predeploy.sol";
import "@acala-network/contracts/utils/MandalaTokens.sol";

contract AdvancedEscrow {
    IDEX dex = IDEX(DEX);
    ISchedule schedule = ISchedule(SCHEDULE);

    uint256 public numberOfEscrows;

    mapping(uint256 => Escrow) public escrows;

    struct Escrow {
        address initiator;
        address beneficiary;
        address ingressToken;
        address egressToken;
        uint256 AusdValue;
        uint256 deadline;
        bool completed;
    }

    constructor() {
        numberOfEscrows = 0;
    }

    event EscrowUpdate(
        address indexed initiator,
        address indexed beneficiary,
        uint256 AusdValue,
        bool fulfilled
    );

    function initiateEscrow(
        address beneficiary_,
        address ingressToken_,
        uint256 ingressValue,
        uint256 period
    )
        public returns (bool)
    {
        // Check to make sure the latest escrow is completed
        // Additional check is needed to ensure that the first escrow can be initiated and that the
        // guard statement doesn't underflow
        require(
            numberOfEscrows == 0 || escrows[numberOfEscrows - 1].completed,
            "Escrow: current escrow not yet completed"
        );
        require(beneficiary_ != address(0), "Escrow: beneficiary_ is 0x0");
        require(ingressToken_ != address(0), "Escrow: ingressToken_ is 0x0");
        require(period != 0, "Escrow: period is 0");

        uint256 contractBalance = Token(ingressToken_).balanceOf(address(this));
        require(
            contractBalance >= ingressValue,
            "Escrow: contract balance is less than ingress value"
        );

        Token AUSDtoken = Token(AUSD);
        uint256 initalAusdBalance = AUSDtoken.balanceOf(address(this));
        
        address[] memory path = new address[](2);
        path[0] = ingressToken_;
        path[1] = AUSD;
        require(dex.swapWithExactSupply(path, ingressValue, 1), "Escrow: Swap failed");
        
        uint256 finalAusdBalance = AUSDtoken.balanceOf(address(this));
        
        schedule.scheduleCall(
            address(this),
            0,
            1000000,
            5000,
            period,
            abi.encodeWithSignature("completeEscrow()")
        );

        Escrow storage currentEscrow = escrows[numberOfEscrows];
        currentEscrow.initiator = msg.sender;
        currentEscrow.beneficiary = beneficiary_;
        currentEscrow.ingressToken = ingressToken_;
        currentEscrow.AusdValue = finalAusdBalance - initalAusdBalance;
        currentEscrow.deadline = block.number + period;
        numberOfEscrows += 1;
        
        emit EscrowUpdate(msg.sender, beneficiary_, currentEscrow.AusdValue, false);
        
        return true;
    }

    function setEgressToken(address egressToken_) public returns (bool) {
        require(!escrows[numberOfEscrows - 1].completed, "Escrow: already completed");
        require(
            escrows[numberOfEscrows - 1].beneficiary == msg.sender,
            "Escrow: sender is not beneficiary"
        );

        escrows[numberOfEscrows - 1].egressToken = egressToken_;

        return true;
    }

    function completeEscrow() public returns (bool) {
        Escrow storage currentEscrow = escrows[numberOfEscrows - 1];
        require(!currentEscrow.completed, "Escrow: escrow already completed");
        require(
            msg.sender == currentEscrow.initiator || msg.sender == address(this),
            "Escrow: caller is not initiator or this contract"
        );

        if(currentEscrow.egressToken != address(0)){
            Token token = Token(currentEscrow.egressToken);
            uint256 initialBalance = token.balanceOf(address(this));
            
            address[] memory path = new address[](2);
            path[0] = AUSD;
            path[1] = currentEscrow.egressToken;
            require(
                dex.swapWithExactSupply(path, currentEscrow.AusdValue, 1),
                "Escrow: Swap failed"
            );
            
            uint256 finalBalance = token.balanceOf(address(this));

            token.transfer(currentEscrow.beneficiary, finalBalance - initialBalance);
        } else {
            Token AusdToken = Token(AUSD);
            AusdToken.transfer(currentEscrow.beneficiary, currentEscrow.AusdValue);
        }

        currentEscrow.completed = true;

        emit EscrowUpdate(
            currentEscrow.initiator,
            currentEscrow.beneficiary,
            currentEscrow.AusdValue,
            true
        );

        return true;
    }
}