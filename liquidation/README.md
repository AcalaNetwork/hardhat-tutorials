# Hardhat example: Liquidation Contract

__*NOTE: tests will always pass when mandala node is running without `--instant-sealing` flag*__

## Table of contents

- [Intro](#intro)
- [Setting up](#setting-up)
- [Smart contract](#smart-contract)
- [Deploy script](#deploy-script)
- [Test](#test)
- [Conclusion](#conclusion)

## Intro

This tutorial is an example of liquidation smart contract over Acala EVM+. We will start with the setup, build the smart contract and write deployment and test scripts. The smart contract will become an onchain liquidation participant and will be called by cdp engine module. Our Liquidation smart contract will be having three primary functions,

- `liquidate(collateral, repayDest, supply, target)` Perform liquidation of collateral.
- `onCollateralTransfer(collateral, amount)` Called after liquidation is performed successfully.
- `onRepaymentRefund(collateral, amount)` Called when not enough collateral is supplied.

We will be exploring capabilities of these function in this tutorial, let’s get started 👩‍💻!

## Setting up

The tutorial project will live in the `liquidation/` folder. We can create it using `mkdir liquidation`. As we will be using Hardhat development framework, we need to initiate the `yarn` project and add `hardhat` as a development dependency:

```shell
yarn init && yarn add --dev hardhat
```

**NOTE: This example can use the default yarn project settings, which means that all of the prompts can be responded to with pressing `enter`.**

Now that the `hardhat` dependency is added to the project, we can initiate a simple hardhat project with `yarn hardhat`:

```shell
➜  Liquidation yarn hardhat
yarn run v1.22.19

888    888                      888 888               888
888    888                      888 888               888
888    888                      888 888               888
8888888888  8888b.  888d888 .d88888 88888b.   8888b.  888888
888    888     "88b 888P"  d88" 888 888 "88b     "88b 888
888    888 .d888888 888    888  888 888  888 .d888888 888
888    888 888  888 888    Y88b 888 888  888 888  888 Y88b.
888    888 "Y888888 888     "Y88888 888  888 "Y888888  "Y888

Welcome to Hardhat v2.10.1

? What do you want to do? … 
▸ Create a JavaScript project
  Create a TypeScript project
  Create an empty hardhat.config.js
  Quit

```

When the Hardhat prompt appears, we will select `Create a JavaScript project` as this will help us write tests easily without errors.

__NOTE: Once again, the default settings from Hardhat are acceptable, so we only need to confirm them using the enter key.__

As we will be using the Mandala test network, we need to add it to `hardhat.config.js`. Networks are added in the `module.exports` section below the `solidity` compiler version configuration. We will be adding two networks to the configuration. The local development network, which we will call `mandala`, and the public test network, which we will call `mandalaPubDev`:

```javascript
 networks: {
   mandala: {
     url: 'http://127.0.0.1:8545',
     accounts: {
       mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
       path: "m/44'/60'/0'/0",
     },
     chainId: 595,
   },
   mandalaPubDev: {
     url: 'https://acala-mandala-adapter.api.onfinality.io/public',
     accounts: {
       mnemonic: YOUR_MNEMONIC,
       path: "m/44'/60'/0'/0",
     },
     chainId: 595,
     timeout: 60000,
   },
 }
```

Next we will change solidity key with following settings

```javascript
  solidity: {
    version: "0.8.14",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
```

We will also add `mocha` timeout below `network` configurations to 5 minutes since our tests take longer time when tested without `--instant-sealing` flag to complete

```javascript
mocha: {
    timeout: 300000
  },
```

This is how our `hardhat.config.js` will look like

```javascript
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.14",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    mandala: {
      url: 'http://127.0.0.1:8545',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0"
      },
      chainId: 595
    },
    mandalaPubDev: {
      url: 'https://acala-mandala-adapter.api.onfinality.io/public',
      accounts: {
        mnemonic: 'fox sight canyon orphan hotel grow hedgehog build bless august weather swarm',
        path: "m/44'/60'/0'/0"
      },
      chainId: 595
    }
  },
  mocha: {
    timeout: 100000000
  },
};
```

Let’s take a look at the our configurations:

- `optimizer`: optimizer tries to simplify complicated expressions, which reduces both code size and execution cost, i.e., it can reduce gas needed for contract deployment as well as for external calls made to the contract.
- `url`: Used to specify the RPC endpoint of the network
- `accounts`: Section to describe how Hardhat should acquire or derive the EVM accounts
- `mnemonic`: Mnemonic used to derive the accounts. __Add your mnemonic here__
- `path`: Derivation path to create the accounts from the mnemonic
- `chainId`: Specific chain ID of the Mandala chain. The value of `595` is used for both, local development network as well as the public test network
- `timeout`: An override value for the built in transaction response timeout. It is needed only on the public test network
- `mocha: timeout`: Some of tests will take longer time since we have to wait for next block for confirming liquidation. It is only increased to validate proper result from tests

With that, our project is ready for development.

## Smart contract

The `Liquidation` smart contract, which we will add in the following section, we will try to show possibile capabilities of contract but it still have room of improvement for more complex scenarios.

This `Liquidation` contract will be called by CDP module from list of registered liquidation contracts by random selection whenever any user loan position is below desired collateral ratio. The CDP module have following priority (if one fails, will try another),

- dex
- **contracts (`we are here`)**
- auction

Hardhat has already created a smart contract within the `contracts/` folder when we ran its setup. This smart contract is named `Lock`. We will remove it and add our own called `Liquidation`:

```shell
rm contracts/Lock.sol && touch contracts/Liquidation.sol
```

Now that we have our smart contract file ready, we can place an empty smart contract within it:

```solidity
//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.14;
 
contract Liquidation {
 
}
```

We will be adding following `@acala-network` dependencies,

```
yarn add --dev @acala-network/bodhi@2.4.13 \
               @acala-network/contracts@4.3.2 \
               @acala-network/eth-providers@2.4.12 \
               @polkadot/api@8.7.1 \
               @openzeppelin/contracts@4.7.0
```

Let have a look at what we have added and how will it help,

- `@acala-network/bodhi`: SDK implements a web3 provider to allow existing Ethereum dApp to be able to interact with Acala EVM. (will help to build TestProvider which contains polkadot-api WS provider with test accounts)
- `@acala-network/contracts`: Generated bytecode for predeployment of ERC20 smart contracts in Acala. (will be used to retrieve predeployed contract addresses and interface)
- `@acala-network/eth-providers`: Providers that contain some reusable functionalities for bodhi and eth-rpc-adapter.
- `@polkadot/api`: It handles all the encoding and decoding or parameters, provides access to RPC functions and allows for the query of chain state and the submission of transactions.
- `@openzeppelin/contracts`: A library for secure smart contract development. Build on a solid foundation of community-vetted code.

This is how our `package.json` will look like,

```json
{
  "name": "liquidation",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "devDependencies": {
    "@acala-network/bodhi": "2.4.13",
    "@acala-network/contracts": "4.2.1",
    "@acala-network/eth-providers": "2.4.12",
    "@ethersproject/abi": "^5.4.7",
    "@ethersproject/providers": "^5.4.7",
    "@nomicfoundation/hardhat-chai-matchers": "^1.0.0",
    "@nomicfoundation/hardhat-network-helpers": "^1.0.0",
    "@nomicfoundation/hardhat-toolbox": "^1.0.1",
    "@nomiclabs/hardhat-ethers": "^2.0.0",
    "@nomiclabs/hardhat-etherscan": "^3.0.0",
    "@openzeppelin/contracts": "4.7.0",
    "@polkadot/api": "8.7.1",
    "@typechain/ethers-v5": "^10.1.0",
    "@typechain/hardhat": "^6.1.2",
    "chai": "^4.2.0",
    "ethers": "^5.4.7",
    "hardhat": "^2.10.1",
    "hardhat-gas-reporter": "^1.0.8",
    "solidity-coverage": "^0.7.21",
    "typechain": "^8.1.0"
  }
}
```

To add all dependencies in project we will simply call `yarn`

```shell
yarn
```

As we will be using Acala's predeployed IDEX contract for swapping liquidated collateral to AUSD and IOracle contract to have another feature of verifying discount obtained by liquidation,
also we will make this contract ownable and pausable to have option of modifying liquidation parameters after deployment, we need to import them after the `pragma` statement:

```solidity
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@acala-network/contracts/dex/IDEX.sol";
import "@acala-network/contracts/oracle/IOracle.sol";
import "@acala-network/contracts/utils/MandalaAddress.sol";
```

Now that we have sorted out all of the imports, we need to make sure that our `Liquidation` smart contract inherits the `Ownable`, `Pausable` and `ADDRESS`. We have to add the inheritance statement to the contract definition line:

```solidity
contract Liquidation is Ownable, Pausable, ADDRESS {
```

We will now add `CollateralPreference` struct which will hold preference of liquidating specific collateral:

```solidity
   struct CollateralPreference {
        bool swapWithUSD;
        bool limitedSupply;
        uint256 supply;
        uint256 totalSupplied;
        uint256 minDiscount;
    }
```

This `CollateralPreference` will be a mapping to of collateral `collateralPreference`. The `CollateralPreference` structure holds the following information:

- `swapWithUSD`: Enables option to swap liquidated collateral with AUSD from DEX.
- `limitedSupply`: If enabled, contract will check totalSupplied < supply.
- `supply`: Add a cap to liquidation supply, will be enabled when `limitedSupply=true`
- `totalSupplied`: Will be updated for each collateral when successful liquidation is performed.
- `minDiscount`: If > 0, it will verify that current liquidation will book discount >= minDiscount

Now we can add the events that will notify listeners of the change in the smart contract called `Liquidate`:

```solidity
   event Liquidate(
        address collateral,
        address payable repayDest,
        uint256 supply,
        uint256 target
    );
```

This event contains information about successful liquidation:

- `collateral`: Collateral address.
- `repayDest`: Repayment destination address.
- `supply`: Collateral supply.
- `target`: Target USD amount to liquidate.

We will continue adding more events `(OnCollateralTransfer / OnRepaymentRefund / CollateralPreferenceUpdated)`

```solidity
    event OnCollateralTransfer(address collateral, uint256 amount);
```

Will be emmitted when liquidated collateral is transferred by CDP to liquidation contract:

- `collateral`: The collateral address that was liquidated.
- `amount`: collateral amount received by liquidation contract.

```solidity
    event OnRepaymentRefund(address collateral, uint256 amount);
```

Will be emitted when not enough target collateral is provided and CDP module returns supplied collateral.

- `collateral`: The collateral address that was liquidated.
- `amount`: collateral amount received by liquidation contract.

```solidity
    event CollateralPreferenceUpdated(
        address collateral,
        CollateralPreference preference
    );
```

Emitted when any of collateral parameter is updated

- `collateral`: The collateral address that was liquidated.
- `preference`: updated CollateralPreference of desired collateral.

We will now add internal storage variables

```solidity
    address private _evm; 
    address private _USD_;
    address private _DEX_;
    address private _ORACLE_;

    uint256 internal usdDecimals;
    mapping(address => CollateralPreference) public collateralPreference;
```

- `_evm` : EVM address of CDP module that will call liquidate functions.
- `_USD_` : Address of AUSD that will be used for swapping with liquidated collateral.
- `_DEX_` : Address of precompiled DEX contract to swap collateral from.
- `_ORACLE_` : Address of precompiled Oracle contract to fetch token price.

Will initialize storage in constructor:

```solidity
    /**
     * @dev Initializes the contract.
     */
    constructor(address EVM) {
        _evm = EVM;
        _USD_ = ADDRESS.AUSD;
        _DEX_ = ADDRESS.DEX;
        _ORACLE_ = ADDRESS.Oracle;
        usdDecimals = IERC20Metadata(_USD_).decimals();
    }
```

Let’s start adding modifier and setter functions that will help while writing main logic.

```solidity
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

```

Now we will begin with main logic functions which will be called by CDP module

```solidity
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
```

This is the very first function that will be called by CDP module which transfers target USD to repayment destination. The modifiers in this function are checking if liquidating parameters are matched. This function also calculates discount booked by liquidating that position and verifies with collateral parameters.

```solidity
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
```

This function is called by CDP module when liquidation is successful and enough AUSD is transferred from this contract. This acknowleges that collateral is transferred to contract and liquidation contract can perform next steps, like swapping collateral with AUSD.

```solidity
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
```

The last function, called by CDP module when not enough liquidity is provided by this contract and supplied amount is returned back to liquidation contract. This helps balance collateral parameters.

<details>
 <summary>Your `contracts/Liquidation.sol` should look like this:</summary>

```solidity
//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.14;
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@acala-network/contracts/dex/IDEX.sol";
import "@acala-network/contracts/oracle/IOracle.sol";
import "@acala-network/contracts/utils/Address.sol";

contract Liquidation is Ownable, Pausable, ADDRESS {
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
    event OnCollateralTransfer(address collateral, uint256 amount);
    event OnRepaymentRefund(address collateral, uint256 amount);
    event CollateralPreferenceUpdated(
        address collateral,
        CollateralPreference preference
    );

    address private _evm;
    address private _USD_;
    address private _DEX_;
    address private _ORACLE_;

    uint256 internal usdDecimals;
    mapping(address => CollateralPreference) public collateralPreference;

    /**
     * @dev Initializes the contract.
     */
    constructor(address EVM) {
        _evm = EVM;
        _USD_ = ADDRESS.AUSD;
        _DEX_ = ADDRESS.DEX;
        _ORACLE_ = ADDRESS.Oracle;
        usdDecimals = IERC20Metadata(_USD_).decimals();
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
}
```

</details>

In order to be able to compile our smart contract with the `yarn build` command, we will add script in our `package.json` by adding `scripts` above devDependencies:

```json
 "scripts": {
   "build": "hardhat compile"
 },
```

With that, the smart contract can be compiled using:

```shell
yarn build
```

## Deploy script

### Deploy utility

In order to be able to deploy your smart contract to the Acala EVM+ using Hardhat, you need to pass
custom transaction parameters to the deploy transactions. We could add them directly to the script,
but this becomes cumbersome and repetitive as our project grows. To avoid the repetitiveness, we
will create a custom deploy utility, which will use `calcEthereumTransactionParams` from
`@acala-network/eth-providers` dependency.

We can create the utility:

```shell
mkdir utils && touch utils/deployUtil.js
```

The `calcEthereumTransactionParams` is imported at the top of the file and let's define the
`txParams()` below it:

```javascript
const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
const { EVM } = require("@acala-network/contracts/utils/MandalaAddress")
const EVMContract = require("@acala-network/contracts/build/contracts/EVM.json")
const { Contract, BigNumber, ContractReceipt } = require("ethers")
const { ethers } = require("hardhat")
const { SignerWithAddress } = require("@nomiclabs/hardhat-ethers/signers")

const txParams = async () => {
}
```

Within the `txParams()` function, we set the parameters needed to be passed to the
`calcEthereumTransactionParams` and then assign its return values to the `ethParams`. At the end of
the function we return the gas price and gas limit needed to deploy a smart contract:

```javascript
    const txFeePerGas = '199999946752';
    const storageByteDeposit = '100000000000000';
    const blockNumber = await ethers.provider.getBlockNumber();

    const ethParams = calcEthereumTransactionParams({
      gasLimit: '31000000',
      validUntil: (blockNumber + 100).toString(),
      storageLimit: '64001',
      txFeePerGas,
      storageByteDeposit
    });

    return {
        txGasPrice: ethParams.txGasPrice,
        txGasLimit: ethParams.txGasLimit
    };
```

We will also add `publishContract` function, which will help publish deployed contract to be accessible.  

```javascript
const publishContract = async (options) => {
    const { signer, contractAddress } = options;
    process.stdout.write(`Publishing ${contractAddress} deployer: ${signer.address} ...`);
    const res = await (await new Contract(EVM, EVMContract.abi, signer).publishContract(contractAddress)).wait();
    if (res?.events[0]?.event === "ContractPublished") {
        process.stdout.write(` Done!\n`);
    } else {
        process.stdout.write(` Failed!\n`);
    }
    return res;
}
```

In order to be able to use the `txParams` and `publishContract` from our new utility, we have to export it at the bottom
of the utility:

```javascript
module.exports = {
    txParams,
    publishContract
}
```

This concludes the `deployUtil` and we can move on to writing the deploy script where we will
use it.

<details>
    <summary>Your utils/deployUtil.ts should look like this:</summary>

  ```javascript
    const { calcEthereumTransactionParams } = require("@acala-network/eth-providers");
    const { EVM } = require("@acala-network/contracts/utils/MandalaAddress")
    const EVMContract = require("@acala-network/contracts/build/contracts/EVM.json")
    const { Contract } = require("ethers")
    const { ethers } = require("hardhat")

    const txParams = async () => {
        const txFeePerGas = '199999946752';
        const storageByteDeposit = '100000000000000';
        const blockNumber = await ethers.provider.getBlockNumber();

        const ethParams = calcEthereumTransactionParams({
            gasLimit: '31000000',
            validUntil: (blockNumber + 100).toString(),
            storageLimit: '64001',
            txFeePerGas,
            storageByteDeposit
        });

        return {
            txGasPrice: ethParams.txGasPrice,
            txGasLimit: ethParams.txGasLimit
        };
    }

    const publishContract = async (options) => {
        const { signer, contractAddress } = options;
        process.stdout.write(`Publishing ${contractAddress} deployer: ${signer.address} ...`);
        const res = await (await new Contract(EVM, EVMContract.abi, signer).publishContract(contractAddress)).wait();
        if (res?.events[0]?.event === "ContractPublished") {
            process.stdout.write(` Done!\n`);
        } else {
            process.stdout.write(` Failed!\n`);
        }
        return res;
    }

    module.exports = {
        txParams,
        publishContract
    }
  ```

</details>

### Script

Now that we have our smart contract ready, we can deploy it, so we can use it.

Initiating Hardhat also created a `scripts` folder and within it a sample script `scripts/deploy.js`. We will modify it with our own deploy script instead:

We will import the `txParams` from the
`transactionHelper` we added in the subsection above at the top of the file:

```javascript
const { txParams } = require("../utils/deployUtil");
```

At the beginning of the `main` function definition, we will set the transaction parameters, by
invoking the `txParams`:

```javascript
  const ethParams = await txParams();
```

Now that we have the deploy transaction parameters set, we can deploy the smart contract. We need to
get the signer which will be used to deploy the smart contract, then we instantiate the smart
contract within the contract factory and deploy it, passing the transaction parameters to the deploy
transaction. Once the smart contract is successfully deployed, we will log its address to the
console:

```javascript
  const ethParams = await txParams();
  const CDP_EVM_ADDRESS = '0x31382d495FEd5A6820d9C07e8B6eFe8D2166e9dD';
  const Liquidation = await ethers.getContractFactory("Liquidation");
  const liquidation = await Liquidation.deploy(CDP_EVM_ADDRESS,
    {
      gasPrice: ethParams.txGasPrice,
      gasLimit: ethParams.txGasLimit,
    });

  await liquidation.deployed();
  console.log("Liquidation Address: ",liquidation.address);
```

With that, our deploy script is ready to be run.

<details>
 <summary>Your `scripts/deploy.js` should look like this:</summary>

  ```javascript
    // We require the Hardhat Runtime Environment explicitly here. This is optional
    // but useful for running the script in a standalone fashion through `node <script>`.
    //
    // You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
    // will compile your contracts, add the Hardhat Runtime Environment's members to the
    // global scope, and execute the script.
    const hre = require("hardhat");
    const { txParams } = require("../utils/deployUtil");

    async function main() {
    const ethParams = await txParams();
    const CDP_EVM_ADDRESS = '0x31382d495FEd5A6820d9C07e8B6eFe8D2166e9dD';
    const Liquidation = await ethers.getContractFactory("Liquidation");
    const liquidation = await Liquidation.deploy(CDP_EVM_ADDRESS,
        {
        gasPrice: ethParams.txGasPrice,
        gasLimit: ethParams.txGasLimit,
        });

    await liquidation.deployed();
    console.log("Liquidation Address: ",liquidation.address);
    }

    // We recommend this pattern to be able to use async/await everywhere
    // and properly handle errors.
    main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
    });
  ```

</details>

In order to be able to run the `deploy.js` script, we need to add a script to the `package.json`. To add our custom script to the `package.json`, we need to place our custom script into the `"scripts”` section. Let’s add two scripts, one for the local development network and one for the public test network:

```json
   "deploy-mandala": "hardhat run scripts/deploy.js --network mandala",
   "deploy-mandala:pubDev": "hardhat run scripts/deploy.js --network mandalaPubDev"
```

With that, we are able to run the deploy script using `yarn deploy-mandala` or `yarn deploy-mandala:pubDev`. Using the latter command should result in the following output:

```shell
yarn run v1.22.19
$ hardhat run scripts/deploy.ts --network mandala
No need to generate any newer typings.
Liquidation Address: 0x3d3593927228553b349767ABa68d4fb1514678CB
Done in 12.71s.
```

## Test

Initiating Hardhat also created a `test` folder and within it a sample test. We will remove it
and add our own test instead:

```shell
rm test/Lock.js && touch test/index.js
```

Before adding tests, we need `testUtil` which will help write tests easily and reduce redundant code.

```shell
touch utils/testUtil.js
```

We will be adding following code there

```javascript
const { TestProvider, AccountSigningKey } = require('@acala-network/bodhi');
const { WsProvider } = require('@polkadot/api');
const { createTestPairs } = require('@polkadot/keyring/testingPairs');
const { Keyring } = require('@polkadot/api');
const crypto = require("crypto");

const LOCAL_WS_URL = 'ws://127.0.0.1:9944';
const testPairs = createTestPairs();
const DEFAULT_ORACLE_PRICE = [
    [{ Token: 'AUSD' }, '1000000000000000000'],
    [{ Token: 'DOT' }, '17387000000000000000'],
    [{ Token: 'ACA' }, '10267010356479'],
    [{ Token: 'LDOT' }, '7015000000000000000'],
    [{ Token: 'RENBTC' }, '25559881000000002000000'],
    [{ Token: 'CASH' }, '766705100327601'],
    [{ Token: 'KAR' }, '414399529583857728'],
    [{ Token: 'KUSD' }, '1000000000000000000'],
    [{ Token: 'KSM' }, '46910000000000000000'],
    [{ Token: 'LKSM' }, '46910000000000000000'],
    [{ Token: 'TAI' }, '15000000000000000'],
    [{ Token: 'BNC' }, '247651000000000000'],
    [{ Token: 'VSKSM' }, '46910000000000000000'],
    [{ Token: 'KBTC' }, '25559881000000002000000'],
];

const getTestProvider = async (urlOverwrite) => {
    const url = urlOverwrite || process.env.ENDPOINT_URL || LOCAL_WS_URL;

    const provider = new TestProvider({
        provider: new WsProvider(url),
    });

    console.log(`test provider connected to ${url}`);
    await provider.isReady();
    const pair = testPairs.alice;
    const keyring = new Keyring({ type: 'sr25519' });
    const uri = '0x' + crypto.randomBytes(32).toString('hex')
    testPairs['random'] = keyring.addFromUri(uri);
    const signingKey = new AccountSigningKey(provider.api.registry);
    signingKey.addKeyringPair(pair);
    provider.api.setSigner(signingKey);
    return provider;
};

const feedOraclePrice = async (provider, token, price) => {
    console.log(`feeding oracle price ${token} ${price}`);
    return new Promise((resolve) => {
        provider.api.tx.acalaOracle
            .feedValues([[{ Token: token }, price]])
            .signAndSend(testPairs.alice.address, (result) => {
                if (result.status.isFinalized || result.status.isInBlock) {
                    resolve(result);
                }
            });
    });
};

const feedTestOraclePrices = async (provider) => {
    console.log(`feeding test oracle default prices ${DEFAULT_ORACLE_PRICE.map(([{ Token }, price]) => `${Token} ${price}`).join(', ')}`);
    return new Promise((resolve) => {
        provider.api.tx.acalaOracle
            .feedValues(DEFAULT_ORACLE_PRICE)
            .signAndSend(testPairs.alice.address, (result) => {
                if (result.status.isFinalized || result.status.isInBlock) {
                    resolve(result);
                }
            });
    });
}

module.exports = {
    LOCAL_WS_URL,
    testPairs,
    DEFAULT_ORACLE_PRICE,
    getTestProvider,
    feedOraclePrice,
    feedTestOraclePrices
}
```

Our tests uses `ApiPromise` and `WsProvider` from `@polkadot/api`, and initating the `ApiPromise` generates a lot of output, our test output wolud get very messy if we didn't silence it. To do this we use the `console.mute` dependency, that we have to add to the project by using:

```shell
yarn add --dev console.mute
```

Our test cases will be split into one subgroup. Main will be called `Liquidation` and it will verify that the deployed smart contract logic. The sub one will be called `e2e` and it will validate the expected behaviour of our smart contract with CDP module. The empty sections should look like this:

```javascript
  describe("Liquidation", () => {
    describe("e2e", function () {

    });
  })

```

The `Liquidation` section will hold following test examples:

1. liquidate - Should fail if collateral is not allowed
2. liquidate - Should fail if collateralSupply is exhausted
3. liquidate - Should fail if collateralSupply is reduced after more supply
4. liquidate - should fail if paused
5. liquidate - should fail if not called by EVM
6. liquidate - Should transfer target amount to target
7. onCollateralTransfer - Should fail if collateral is not allowed
8. onCollateralTransfer - should fail if paused
9. onCollateralTransfer - should fail if not called by EVM
10. onCollateralTransfer - Should emit OnCollateralTransfer event
11. onCollateralTransfer - Should swap collateral with AUSD
12. onRepaymentRefund - should fail if paused
13. onRepaymentRefund - should fail if not called by EVM
14. onRepaymentRefund - Should emit OnRepaymentRefund event and reduce totalSupply

And subgroup `e2e` will have following examples:

1. e2e - feed default test prices
2. e2e - set collateral params for DOT asset
3. e2e - transfer some tokens to test account(ferdie)
4. e2e - redeploy fresh liquidation contract
5. e2e - set liquidation contract evm address
6. e2e - publish liquidation contract
7. e2e - transfer few aUSD and ACA to liquidation contract
8. e2e - deregister old liquidation contracts
9. e2e - register liquidation contract
10. e2e - (ferdie) mint aUSD loan by depositing DOT as collateral
11. e2e - (ferdie) get below collateral and liquidated
12. e2e - (ferdie) again mint aUSD loan by depositing DOT as collateral
13. e2e - (ferdie) again get below collateral and liquidated with swap enabled
14. e2e - (ferdie-liquidated-by-auction) again mint aUSD loan by depositing DOT as collateral
15. e2e - (ferdie-liquidated-by-auction) again get below collateral but will not be liquidated by contract because discounted < minDiscount

Our test script will look like this:

```typescript
require('console.mute');
console.mute();
const { expect, use } = require("chai");
const BN = require('bignumber.js');
const { ethers } = require("hardhat");
const { publishContract, txParams } = require("../utils/deployUtil");
const { feedOraclePrice, feedTestOraclePrices, getTestProvider, testPairs } = require("../utils/testUtil");
const { DOT, AUSD, ACA } = require("@acala-network/contracts/utils/MandalaAddress");
const IERC20ABI = require("@openzeppelin/contracts/build/contracts/IERC20Metadata.json").abi;

const { evmChai } = require("@acala-network/bodhi");
const { firstValueFrom } = require("rxjs");
use(evmChai);
console.resume();

const EVM_PALLET_ADDRESS = '0x31382d495FEd5A6820d9C07e8B6eFe8D2166e9dD';
describe("Liquidation", () => {
    let signers;
    let provider;
    let Liquidation;
    let liquidation;

    const resetLiquidationPerf = async (collateral) =>
        liquidation.setCollateralPreference(collateral, {
            swapWithUSD: false,
            limitedSupply: false,
            supply: '0',
            totalSupplied: '0',
            minDiscount: '0'
        }).then((r) => r.wait());

    const transferToken = async (token, amount, to) => {
        console.log(`Transferring ${amount} ${token} to ${to}`);
        const tokenContract = await ethers.getContractAt(IERC20ABI, token);
        const res = await tokenContract.connect(signers[1]).transfer(to, amount);
        const receipt = await res.wait();
        console.log(`Transferred ${amount} ${token} to ${to}`);
        return receipt;
    }

    const createBlocks = async (blocks = 1) => {
        if (provider.api.rpc.engine.createBlock) {
            // with instant-sealing flag
            for (let i = 0; i < blocks; i++) {
                await provider.api.rpc.engine.createBlock(true /* create empty */, true /* finalize it*/);
            }
        } else {
            const currentblockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
            // without instant-sealing flag
            // wait for blocks to pass
            await new Promise((resolve) => {
                const checkBlock = async () => {
                    const blockNumber = +(await firstValueFrom(provider.api.rx.query.system.number()));
                    if (blockNumber - currentblockNumber >= blocks) {
                        resolve(undefined);
                    } else {
                        setTimeout(checkBlock, 1000);
                    }
                }
                checkBlock();
            })
        }
    }


    before(async () => {

        const param = await txParams();
        signers = await ethers.getSigners();
        provider = await getTestProvider();
        Liquidation = await ethers.getContractFactory("Liquidation");
        liquidation = await Liquidation.deploy(
            signers[0].address,
            {
                gasPrice: param.txGasPrice,
                gasLimit: param.txGasLimit,
            });
        await liquidation.deployed();
    })

    beforeEach(async () => {
        const receipt = await resetLiquidationPerf(liquidation.address);
        expect((receipt.events || []).find((e) => e.event === 'CollateralPreferenceUpdated')).to.not.be.undefined;
    })

    it('liquidate - Should fail if collateral is not allowed', async () => {
        await liquidation.setCollateralLimitedSupply(liquidation.address, true).then(r => r.wait())
        await expect(liquidation.liquidate(liquidation.address, liquidation.address, '0', '0'))
            .to.be.rejectedWith("Liquidation: Collateral is not allowed");
    })

    it('liquidate - Should fail if collateralSupply is exhausted', async () => {
        await liquidation.setCollateralLimitedSupply(liquidation.address, true).then(r => r.wait());
        await (await liquidation.setCollateralSupply(liquidation.address, '1')).wait();
        await (await liquidation.liquidate(liquidation.address, liquidation.address, '1', '1')).wait();
        await expect(liquidation.liquidate(liquidation.address, liquidation.address, '1', '1'))
            .to.be.rejectedWith("Liquidation: Not enough collateral supply");
    });

    it('liquidate - Should fail if collateralSupply is reduced after more supply', async () => {
        await liquidation.setCollateralLimitedSupply(liquidation.address, true).then(r => r.wait())
        await liquidation.setCollateralSupply(liquidation.address, '3').then(r => r.wait())
        await liquidation.liquidate(liquidation.address, liquidation.address, '2', '2').then(r => r.wait())
        await liquidation.setCollateralSupply(liquidation.address, '1').then(r => r.wait())
        await expect(liquidation.liquidate(liquidation.address, liquidation.address, '1', '1'))
            .to.be.rejectedWith("Liquidation: Collateral supply not satisfied");
    });

    it('liquidate - should fail if paused', async () => {
        await liquidation.pause().then(r => r.wait())
        await expect(liquidation.liquidate(liquidation.address, liquidation.address, '0', '0'))
            .to.be.rejectedWith("Pausable: paused");
        await liquidation.unpause().then(r => r.wait())

    })

    it('liquidate - should fail if not called by EVM', async () => {
        await expect(liquidation.connect(signers[1]).liquidate(liquidation.address, liquidation.address, '0', '0'))
            .to.be.rejectedWith("Liqudation: Only evm can call this function");
    })

    it('liquidate - Should transfer target amount to target', async () => {
        const deposit = new BN(5000).shiftedBy(12).toFixed(0);
        const target = new BN(100).shiftedBy(12).toFixed(0);
        const ausd = await ethers.getContractAt(IERC20ABI, AUSD);
        await transferToken(AUSD, deposit, liquidation.address);
        const receipt = await liquidation.liquidate(liquidation.address, signers[1].address, '10', target).then(r => r.wait())
        expect((receipt.events || []).find((e) => e.event === 'Liquidate')).to.not.be.undefined;
        const liquidationBalance = await ausd.balanceOf(liquidation.address);
        expect(liquidationBalance.toString()).to.equal(new BN(deposit).minus(target).toString());
    })

    it('onCollateralTransfer - Should fail if collateral is not allowed', async () => {
        await liquidation.setCollateralLimitedSupply(liquidation.address, true).then(r => r.wait())
        await expect(liquidation.onCollateralTransfer(liquidation.address, '10'))
            .to.be.rejectedWith("Liquidation: Collateral is not allowed");
    })

    it('onCollateralTransfer - should fail if paused', async () => {
        await liquidation.pause().then(r => r.wait())
        await expect(liquidation.onCollateralTransfer(liquidation.address, '10'))
            .to.be.rejectedWith("Pausable: paused");
        await liquidation.unpause().then(r => r.wait())

    })

    it('onCollateralTransfer - should fail if not called by EVM', async () => {
        await expect(liquidation.connect(signers[1]).onCollateralTransfer(liquidation.address, '10'))
            .to.be.rejectedWith("Liqudation: Only evm can call this function");
    })

    it('onCollateralTransfer - Should emit OnCollateralTransfer event', async () => {
        const receipt = await liquidation.onCollateralTransfer(liquidation.address, '10').then(r => r.wait())
        expect((receipt.events || []).find((e) => e.event === 'OnCollateralTransfer')).to.not.be.undefined;
    })

    it('onCollateralTransfer - Should swap collateral with AUSD', async () => {
        const deposit = new BN(1).shiftedBy(10).toFixed(0);
        const dot = await ethers.getContractAt(IERC20ABI, DOT);
        await liquidation.setCollateralSwapWithUSD(DOT, true).then(r => r.wait())
        await transferToken(DOT, deposit, liquidation.address);
        let liquidationDotBalance = await dot.balanceOf(liquidation.address);
        expect(liquidationDotBalance.toString()).to.equal(deposit);
        const receipt = await liquidation.onCollateralTransfer(DOT, deposit).then(r => r.wait())
        expect((receipt.events || []).find((e) => e.event === 'OnCollateralTransfer')).to.not.be.undefined;
        liquidationDotBalance = await dot.balanceOf(liquidation.address);
        expect(liquidationDotBalance.toString()).to.equal('0');
    })

    it('onRepaymentRefund - should fail if paused', async () => {
        await liquidation.pause().then(r => r.wait())
        await expect(liquidation.onRepaymentRefund(liquidation.address, '10'))
            .to.be.rejectedWith("Pausable: paused");
        await liquidation.unpause().then(r => r.wait())

    })

    it('onRepaymentRefund - should fail if not called by EVM', async () => {
        await expect(liquidation.connect(signers[1]).onRepaymentRefund(liquidation.address, '10'))
            .to.be.rejectedWith("Liqudation: Only evm can call this function");
    })


    it('onRepaymentRefund - Should emit OnRepaymentRefund event and reduce totalSupply', async () => {
        await liquidation.setCollateralPreference(liquidation.address, {
            swapWithUSD: false,
            limitedSupply: false,
            supply: '0',
            totalSupplied: '10',
            minDiscount: '0'
        }).then((r) => r.wait());
        let pref = await liquidation.collateralPreference(liquidation.address);
        expect(pref.totalSupplied.toString()).to.equal('10');
        const receipt = await liquidation.onRepaymentRefund(liquidation.address, '2').then(r => r.wait())
        expect((receipt.events || []).find((e) => e.event === 'OnRepaymentRefund')).to.not.be.undefined;
        pref = await liquidation.collateralPreference(liquidation.address);
        expect(pref.totalSupplied.toString()).to.equal('8');
    })


    describe('e2e', () => {
        it('e2e - feed default test prices', async () => {
            await feedTestOraclePrices(provider);
        })

        it('e2e - set collateral params for DOT asset', async () => {
            const ext = provider.api.tx.cdpEngine.setCollateralParams(
                { Token: "DOT" },
                { NewValue: new BN(1).div(100000).shiftedBy(18).toFixed(0) },
                { NewValue: new BN(3).div(2).shiftedBy(18).toFixed(0) },
                { NewValue: new BN(2).div(10).shiftedBy(18).toFixed(0) },
                { NewValue: new BN(9).div(5).shiftedBy(18).toFixed(0) },
                { NewValue: new BN(10000).shiftedBy(18).toFixed(0) },
            );
            // set params for DOT
            await new Promise((resolve) => {
                provider.api.tx.sudo.sudo(ext).signAndSend(testPairs.alice.address, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                });
            })
        })

        it('e2e - transfer some tokens to test account(ferdie-random)', async () => {
            // transfer few DOT to Ferdie-Random
            await new Promise((resolve) => {
                provider.api.tx.currencies.transfer(
                    { "Id": testPairs.random.address },
                    { "Token": "DOT" },
                    new BN(15).shiftedBy(10).toFixed(0)
                ).signAndSend(testPairs.alice.address, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })

            // transfer some ACA to Ferdie-Random
            await new Promise((resolve) => {
                provider.api.tx.currencies.transfer(
                    { "Id": testPairs.random.address },
                    { "Token": "ACA" },
                    new BN(150).shiftedBy(12).toFixed(0)
                ).signAndSend(testPairs.alice.address, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })
        })

        it('e2e - redeploy fresh liquidation contract', async () => {
            const param = await txParams();
            liquidation = await Liquidation.deploy(
                signers[0].address,
                {
                    gasPrice: param.txGasPrice,
                    gasLimit: param.txGasLimit,
                });
            await liquidation.deployed();
        })

        it('e2e - set liquidation contract evm address', async () => {
            await liquidation.setEvm(EVM_PALLET_ADDRESS).then(r => r.wait())
        })

        it('e2e - publish liquidation contract', async () => {
            const receipt = await publishContract({
                signer: signers[0],
                contractAddress: liquidation.address,
            });
            expect((receipt.events || []).find((e) => e.event === 'ContractPublished')).to.not.be.undefined;
        })

        it('e2e - transfer few aUSD and ACA to liquidation contract', async () => {
            console.log('Transferring 5000 aUSD to liquidation contract');
            const ausd = await ethers.getContractAt(IERC20ABI, AUSD);
            const res = await ausd.connect(signers[1]).transfer(liquidation.address, new BN(5000).shiftedBy(12).toFixed(0));
            await res.wait();
            console.log('Transferred 5000 aUSD to liquidation contract');

            console.log('Transferring 5000 aca to liquidation contract');
            const aca = await ethers.getContractAt(IERC20ABI, ACA);
            const res1 = await aca.connect(signers[1]).transfer(liquidation.address, new BN(5000).shiftedBy(12).toFixed(0));
            await res1.wait();
            console.log('Transferred 5000 aca to liquidation contract');
        })

        it('e2e - deregister old liquidation contracts', async () => {
            let contracts = await firstValueFrom(provider.api.rx.query.cdpEngine.liquidationContracts());
            for (let i = 0; i < contracts.length; i++) {
                await new Promise((resolve) => {
                    provider.api.tx.sudo.sudo(provider.api.tx.cdpEngine.deregisterLiquidationContract(contracts[i].toString()))
                        .signAndSend(testPairs.alice.address, (result) => {
                            if (result.status.isFinalized || result.status.isInBlock) {
                                resolve(undefined);
                            }
                        });
                })
            }
        })

        it('e2e - register liquidation contract', async () => {
            // register that liquidation contract
            await new Promise((resolve) => {
                provider.api.tx.sudo.sudo(provider.api.tx.cdpEngine.registerLiquidationContract(liquidation.address))
                    .signAndSend(testPairs.alice.address, (result) => {
                        if (result.status.isFinalized || result.status.isInBlock) {
                            resolve(undefined);
                        }
                    });
            })
        })

        it('e2e - (ferdie-random) mint aUSD loan by depositing DOT as collateral', async () => {
            const waitforBlocks = 5;
            // (ferdie-random) mint aUSD by depositing DOT as collateral 
            await new Promise((resolve) => {
                provider.api.tx.honzon.adjustLoan(
                    { Token: 'DOT' },
                    "50000000000",
                    "414334815622508"
                ).signAndSend(testPairs.random, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })

            const loanPosition = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.random.address));
            // wait for blocks to pass
            await createBlocks(waitforBlocks);
            expect((+loanPosition.collateral).toString()).to.be.eq('50000000000');
            expect((+loanPosition.debit).toString()).to.be.eq('414334815622508');
        })

        it('e2e - (ferdie-random) get below collateral and liquidated', async () => {
            const dot = await ethers.getContractAt(IERC20ABI, DOT);
            const liquidationDotBalanceBefore = await dot.balanceOf(liquidation.address);
            expect(+liquidationDotBalanceBefore).to.be.eq(0);
            const waitforBlocks = 15;
            // Set DOT price to liquidation price
            await feedOraclePrice(provider, 'DOT', new BN(12.2).shiftedBy(18).toFixed(0));

            // wait for blocks to pass
            await createBlocks(waitforBlocks);

            const loanPositionAfter = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.random.address));
            expect(+loanPositionAfter.debit).to.be.eq(0);
            expect(+loanPositionAfter.collateral).to.be.eq(0);

            const liquidationDotBalanceAfter = await dot.balanceOf(liquidation.address);
            // considering fee deduction
            expect(+liquidationDotBalanceAfter).to.be.gt(40000000000);
        })

        it('e2e - (ferdie-random) again mint aUSD loan by depositing DOT as collateral', async () => {
            await feedOraclePrice(provider, 'DOT', new BN(17.387).shiftedBy(18).toFixed(0));
            const waitforBlocks = 5;
            // (ferdie-random) mint aUSD by depositing DOT as collateral 
            await new Promise((resolve) => {
                provider.api.tx.honzon.adjustLoan(
                    { Token: 'DOT' },
                    "50000000000",
                    "414334815622508"
                ).signAndSend(testPairs.random, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })

            const loanPosition = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.random.address));
            // wait for blocks to pass
            await createBlocks(waitforBlocks);
            expect((+loanPosition.collateral).toString()).to.be.eq('50000000000');
            expect((+loanPosition.debit).toString()).to.be.eq('414334815622508');
        })

        it('e2e - (ferdie-random) again get below collateral and liquidated with swap enabled', async () => {
            await liquidation.setCollateralSwapWithUSD(DOT, true).then(res => res.wait());
            const dot = await ethers.getContractAt(IERC20ABI, DOT);
            const liquidationDotBalanceBefore = await dot.balanceOf(liquidation.address);
            expect(+liquidationDotBalanceBefore).to.be.gt(40000000000);
            const waitforBlocks = 15;
            // Set DOT price to liquidation price
            await feedOraclePrice(provider, 'DOT', new BN(12.2).shiftedBy(18).toFixed(0));

            // wait for blocks to pass
            await createBlocks(waitforBlocks);

            const loanPositionAfter = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.random.address));
            expect(+loanPositionAfter.debit).to.be.eq(0);
            expect(+loanPositionAfter.collateral).to.be.eq(0);

            const liquidationDotBalanceAfter = await dot.balanceOf(liquidation.address);
            expect(+liquidationDotBalanceAfter).to.be.eq(0);
        })

        it('e2e - (ferdie-random-liquidated-by-auction) again mint aUSD loan by depositing DOT as collateral', async () => {
            await feedOraclePrice(provider, 'DOT', new BN(17.387).shiftedBy(18).toFixed(0));
            const waitforBlocks = 5;
            // (ferdie-random) mint aUSD by depositing DOT as collateral 
            await new Promise((resolve) => {
                provider.api.tx.honzon.adjustLoan(
                    { Token: 'DOT' },
                    "50000000000",
                    "414334815622508"
                ).signAndSend(testPairs.random, (result) => {
                    if (result.status.isFinalized || result.status.isInBlock) {
                        resolve(undefined);
                    }
                })
            })

            const loanPosition = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.random.address));
            // wait for blocks to pass
            await createBlocks(waitforBlocks);
            expect((+loanPosition.collateral).toString()).to.be.eq('50000000000');
            expect((+loanPosition.debit).toString()).to.be.eq('414334815622508');
        })

        it('e2e - (ferdie-random-liquidated-by-auction) again get below collateral but will not be liquidated by contract because discounted < minDiscount', async () => {
            await liquidation.setCollateralSwapWithUSD(DOT, false).then(res => res.wait());
            await liquidation.setCollateralMinDiscount(DOT, '200000000000000000').then(res => res.wait());

            const dot = await ethers.getContractAt(IERC20ABI, DOT);
            const waitforBlocks = 15;
            // Set DOT price to liquidation price
            await feedOraclePrice(provider, 'DOT', new BN(12.2).shiftedBy(18).toFixed(0));

            // wait for blocks to pass
            await createBlocks(waitforBlocks);

            const loanPositionAfter = await firstValueFrom(provider.api.rx.query.loans.positions({
                Token: 'DOT',
            }, testPairs.random.address));
            expect(+loanPositionAfter.debit).to.be.eq(0);
            expect(+loanPositionAfter.collateral).to.be.eq(0);

            const liquidationDotBalanceAfter = await dot.balanceOf(liquidation.address);
            expect(+liquidationDotBalanceAfter).to.be.eq(0);
        })
    })
});
```

This concludes our test.

As our test is ready to be run, we have already added the script in `package.json` to be able to run the test:

```json
    "test-mandala": "hardhat test test/index.js --network mandala",
```

Running the tests with `test-mandala` should give you the following output:

```shell
yarn test-mandala

yarn run v1.22.18
$ hardhat test test/index.ts --network mandala
  Liquidation
test provider connected to ws://127.0.0.1:9944
2022-07-29 19:05:13        API/INIT: RPC methods not decorated: evm_blockLimits
    ✔ liquidate - Should fail if collateral is not allowed (170ms)
    ✔ liquidate - Should fail if collateralSupply is exhausted (4462ms)
    ✔ liquidate - Should fail if collateralSupply is reduced after more supply (8575ms)
    ✔ liquidate - should fail if paused (4269ms)
    ✔ liquidate - should fail if not called by EVM (73ms)
Transferring 5000000000000000 0x0000000000000000000100000000000000000001 to 0x412131331282B0F3F6eC32Be6b3053daE83C7DaF
Transferred 5000000000000000 0x0000000000000000000100000000000000000001 to 0x412131331282B0F3F6eC32Be6b3053daE83C7DaF
    ✔ liquidate - Should transfer target amount to target (4356ms)
    ✔ onCollateralTransfer - Should fail if collateral is not allowed (147ms)
    ✔ onCollateralTransfer - should fail if paused (4294ms)
    ✔ onCollateralTransfer - should fail if not called by EVM (67ms)
    ✔ onCollateralTransfer - Should emit OnCollateralTransfer event (122ms)
Transferring 10000000000 0x0000000000000000000100000000000000000002 to 0x412131331282B0F3F6eC32Be6b3053daE83C7DaF
Transferred 10000000000 0x0000000000000000000100000000000000000002 to 0x412131331282B0F3F6eC32Be6b3053daE83C7DaF
    ✔ onCollateralTransfer - Should swap collateral with AUSD (4451ms)
    ✔ onRepaymentRefund - should fail if paused (4296ms)
    ✔ onRepaymentRefund - should fail if not called by EVM (94ms)
    ✔ onRepaymentRefund - Should emit OnRepaymentRefund event and reduce totalSupply (4331ms)
    e2e
feeding test oracle default prices AUSD 1000000000000000000, DOT 17387000000000000000, ACA 10267010356479, LDOT 7015000000000000000, RENBTC 25559881000000002000000, CASH 766705100327601, KAR 414399529583857728, KUSD 1000000000000000000, KSM 46910000000000000000, LKSM 46910000000000000000, TAI 15000000000000000, BNC 247651000000000000, VSKSM 46910000000000000000, KBTC 25559881000000002000000
      ✔ e2e - feed default test prices (143ms)
      ✔ e2e - set collateral params for DOT asset (90ms)
      ✔ e2e - transfer some tokens to test account(ferdie-random) (129ms)
      ✔ e2e - redeploy fresh liquidation contract (181ms)
      ✔ e2e - set liquidation contract evm address (154ms)
Publishing 0xEE575b7856efdc04fF8Ea200E27Feda6C9C87CbD deployer: 0x75E480dB528101a381Ce68544611C169Ad7EB342 ... Done!
      ✔ e2e - publish liquidation contract (128ms)
Transferring 5000 aUSD to liquidation contract
Transferred 5000 aUSD to liquidation contract
Transferring 5000 aca to liquidation contract
Transferred 5000 aca to liquidation contract
      ✔ e2e - transfer few aUSD and ACA to liquidation contract (4368ms)
      ✔ e2e - deregister old liquidation contracts (91ms)
      ✔ e2e - register liquidation contract (70ms)
      ✔ e2e - (ferdie-random) mint aUSD loan by depositing DOT as collateral (100ms)
feeding oracle price DOT 12200000000000000000
      ✔ e2e - (ferdie-random) get below collateral and liquidated (208ms)
feeding oracle price DOT 17387000000000000000
      ✔ e2e - (ferdie-random) again mint aUSD loan by depositing DOT as collateral (198ms)
feeding oracle price DOT 12200000000000000000
      ✔ e2e - (ferdie-random) again get below collateral and liquidated with swap enabled (314ms)
feeding oracle price DOT 17387000000000000000
      ✔ e2e - (ferdie-random-liquidated-by-auction) again mint aUSD loan by depositing DOT as collateral (426ms)
feeding oracle price DOT 12200000000000000000
      ✔ e2e - (ferdie-random-liquidated-by-auction) again get below collateral but will not be liquidated by contract because discounted < minDiscount (4571ms)


  29 passing (2m)
```

## Conclusion

We have successfully built an `Liquidation` smart contract that is called by CDP module to liquidate user position that is below collateral ration. It also supports some advanced features like swapping liquidated collateral with AUSD and having other checks to limit liquidation supply. We added scripts and commands to run those scripts. To compile the smart contract, use `yarn build`. In order to deploy the smart contract to a local development network use `yarn deploy-mandala` and to deploy it to a public test network use `yarn deploy-mandala:pubDev`.

This concludes our `Liquidation` tutorial.
All of the Acalanauts wish you a pleasant journey into the future of web3!
