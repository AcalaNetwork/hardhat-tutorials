//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.14;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@acala-network/contracts/dex/IDEX.sol";
import "@acala-network/contracts/oracle/IOracle.sol";

contract Liquidation is Ownable, Pausable {
    struct CollateralPreference {
        bool swapWithUSD;
        bool limitedSupply;
        uint256 supply;
        uint256 totalSupplied;
        uint256 minDiscount;
    }

    event Liquidate(
        address collateral,
        address payable repayDest,
        uint256 supply,
        uint256 target
    );
    event CollateralPreferenceUpdated(
        address collateral,
        CollateralPreference preference
    );
    event OnCollateralTransfer(address collateral, uint256 amount);
    event OnRepaymentRefund(address collateral, uint256 amount);

    address private _evm;
    address private _USD_;
    address private _DEX_;
    address private _ORACLE_;

    uint256 internal usdDecimals;
    mapping(address => CollateralPreference) public collateralPreference;

    /**
     * @dev Initializes the contract with evm address.
     */
    constructor(
        address EVM,
        address USD,
        address DEX,
        address ORACLE
    ) {
        _evm = EVM;
        _USD_ = USD;
        _DEX_ = DEX;
        _ORACLE_ = ORACLE;
        usdDecimals = IERC20Metadata(USD).decimals();
    }

    /**
     * @dev Modifier to check if the caller is the evm.
     */
    modifier onlyEvm() {
        require(
            _evm == msg.sender,
            "Liqudation: Only evm can call this function"
        );
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the collateral is allowed for liquidation.
     *
     * Requirements:
     *
     * - limitedSupply flag = false
     * OR
     * - supply > 0.
     */
    modifier collateralAllowed(address collateral) {
        CollateralPreference memory pref = collateralPreference[collateral];
        require(
            !pref.limitedSupply || pref.supply > 0,
            "Liquidation: Collateral is not allowed"
        );
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the collateral is allowed
     *       and have enough supply left for liquidation.
     *
     * Requirements:
     *
     * - limitedSupply flag = false
     * OR
     * - supply > 0 AND totalSupplied < supply.
     */
    modifier collateralSupplyAllowed(address collateral, uint256 target) {
        CollateralPreference memory pref = collateralPreference[collateral];
        if (pref.limitedSupply) {
            require(pref.supply > 0, "Liquidation: Collateral is not allowed");
            require(
                pref.totalSupplied <= pref.supply,
                "Liquidation: Collateral supply not satisfied"
            );
            require(
                pref.supply - pref.totalSupplied >= target,
                "Liquidation: Not enough collateral supply"
            );
        }
        _;
    }

    /**
     * @dev Set EVM address.
     */
    function setEvm(address evm) public onlyOwner {
        _evm = evm;
    }

    /**
     * @dev Set SwapWithUSD flag in collateral preference.
     */
    function setCollateralSwapWithUSD(address collateral, bool value)
        public
        onlyOwner
    {
        collateralPreference[collateral].swapWithUSD = value;
        _emitCollateralPreferenceUpdated(collateral);
    }

    /**
     * @dev Set CollateralLimitedSupply flag in collateral preference.
     */
    function setCollateralLimitedSupply(address collateral, bool value)
        public
        onlyOwner
    {
        collateralPreference[collateral].limitedSupply = value;
        _emitCollateralPreferenceUpdated(collateral);
    }

    /**
     * @dev Set allowed collateral supply in collateral preference.
     */
    function setCollateralSupply(address collateral, uint256 value)
        public
        onlyOwner
    {
        collateralPreference[collateral].supply = value;
        _emitCollateralPreferenceUpdated(collateral);
    }

    /**
     * @dev Set minimum discount in collateral preference.
     */
    function setCollateralMinDiscount(address collateral, uint256 value)
        public
        onlyOwner
    {
        collateralPreference[collateral].minDiscount = value;
        _emitCollateralPreferenceUpdated(collateral);
    }

    /**
     * @dev Set entire collateral preference.
     */
    function setCollateralPreference(
        address collateral,
        CollateralPreference memory preference
    ) public onlyOwner {
        collateralPreference[collateral] = preference;
        _emitCollateralPreferenceUpdated(collateral);
    }

    /**
     * @dev Set DEX address.
     */
    function setDexAddress(address dex) public onlyOwner {
        _DEX_ = dex;
    }

    /**
     * @dev Set USD address.
     */
    function setUsdAddress(address usd) public onlyOwner {
        _USD_ = usd;
        usdDecimals = IERC20Metadata(usd).decimals();
    }

    /**
     * @dev Set Oracle address.
     */
    function setOracleAddress(address oracle) public onlyOwner {
        _ORACLE_ = oracle;
    }

    /**
     * @dev Perform liquidation of collateral, callable only by EVM.
     * @param collateral Collateral address.
     * @param repayDest Repayment destination address.
     * @param supply Collateral supply.
     * @param target Target USD amount to liquidate.
     */
    function liquidate(
        address collateral,
        address payable repayDest,
        uint256 supply,
        uint256 target
    ) public whenNotPaused onlyEvm collateralSupplyAllowed(collateral, target) {
        uint256 minDiscount = collateralPreference[collateral].minDiscount;
        if (minDiscount > 0) {
            uint256 decimals = 18 - IERC20Metadata(collateral).decimals();
            uint256 discounted = 10**18 -
                (((target * (10**(54 - usdDecimals))) /
                    (supply * (10**decimals))) /
                    IOracle(_ORACLE_).getPrice(collateral));
            require(
                discounted >= minDiscount,
                "Liquidation: Not enough discount"
            );
        }

        collateralPreference[collateral].totalSupplied += target;
        IERC20(_USD_).transfer(repayDest, target);
        emit Liquidate(collateral, repayDest, supply, target);
    }

    /**
     * @dev Called after liquidation is performed successfully.
     * @param collateral Collateral address.
     * @param amount Liquidated USD worth amount.
     */
    function onCollateralTransfer(address collateral, uint256 amount)
        public
        whenNotPaused
        onlyEvm
        collateralAllowed(collateral)
    {
        if (collateralPreference[collateral].swapWithUSD) {
            uint256 balanceOf = IERC20(collateral).balanceOf(address(this));
            if (balanceOf > 0) {
                address[] memory path = new address[](2);
                path[0] = collateral;
                path[1] = _USD_;
                bool success = IDEX(_DEX_).swapWithExactSupply(
                    path,
                    balanceOf,
                    1
                );
                require(success, "DEX.swapWithExactSupply failed");
            }
        }
        emit OnCollateralTransfer(collateral, amount);
    }

    /**
     * @dev Called when not enough collateral is supplied.
     * @param collateral Collateral address.
     * @param amount refunded amount.
     */
    function onRepaymentRefund(address collateral, uint256 amount)
        public
        whenNotPaused
        onlyEvm
    {
        if (collateralPreference[collateral].totalSupplied < amount) {
            collateralPreference[collateral].totalSupplied = 0;
        } else {
            collateralPreference[collateral].totalSupplied -= amount;
        }
        emit OnRepaymentRefund(collateral, amount);
    }

    /**
     * @dev Emit CollateralPreferenceUpdated event.
     * @param collateral Collateral address.
     */
    function _emitCollateralPreferenceUpdated(address collateral) internal {
        emit CollateralPreferenceUpdated(
            collateral,
            collateralPreference[collateral]
        );
    }

    /**
     * @dev Triggers stopped state.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev Returns to normal state.
     *
     * Requirements:
     *
     * - The contract must be paused.
     */
    function unpause() public onlyOwner {
        _unpause();
    }
}
