# Hardhat example: NFT

## Table of contents

- [About](#about)
- [Smart contract](#smart-contract)
- [Test](#test)
- [Deploy script](#deploy-script)
- [Summary](#summary)

## About

This is an example that builds upon the [token example](../token/README.md). `Token` was a simple
example on building an ERC20 comparible token smart contract. `NFT` is an example of
[ERC721](https://eips.ethereum.org/EIPS/eip-721) token implementation in Acala EVM+. We won't be
building an administrated or upgradeable token and we will use OpenZeppelin
[ERC721 implementation](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol).
For the setup and naming, replace the `token` with `NFT`. Let's jump into it!

## Smart contract

In this tutorial we will be adding a simple smart contract that imports the ERC721 smart contract
from `openzeppelin/contracts`, `Counters` utility from `@openzeppelin/conracts` and
`ERC721URIStorage` and has a constructor that sets the name of the token and its abbriveration:

Your empty smart contract should look like this:

```solidity
pragma solidity =0.8.9;

contract NFT is ERC721URIStorage {
        
}
```

Import of the `ERC721`, `Counters` utility and `ERC721URIStorage` from `@openzeppelin/contracts` is
done between the `pragma` definition and the  start od the `contract` block. The `ERC721` contract
is OpenZeppelin implementation of the ERC721 standard. `Counters` utility is used to increment
`_tokenIds` every time a new token is minted. `ERC721URIStorage` is used to store the NFTs URI that
point to the data associatted to the tokens. The import statements look like this:

```solidity
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
```

As we now have access to `ERC721URIStorage.sol` from `@openzeppelin/contracts`, we can set the
inheritance of our `NFT` contract:

```solidity
contract NFT is ERC721URIStorage {
```

Before we build the constructor, we have to specify the use of the `Counters` utility and define a
`_tokenIds` counter:

```solidity
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
```

The `constructor()` in itself doesn't set any parameters, but we will also include a call to the
`ERC721` constructor, where we set the token name and symbol:

```solidity
    constructor() ERC721("Example non-fungible token", "eNFT") {}
```

We will be adding our own minting function. `recipient` will be the address that receives the token
and `tokenURI` is the `URI` of the token's resource. We use the `_tokenIds` variable to separate one
token from another and then call the inherited `_mint()` and `setTokenURI()`. Lastly we return the
token ID:

```solidity
    function mintNFT(address recipient, string memory tokenURI) public returns (uint256) {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
```

Additionally we can override the `_baseURI` of our tokens. It's really simple as we only have the
function definition and a return statement with `acala-evm+-tutorial-nft/`, which would represent a
common base URI for our tokens:

```solidity
    function _baseURI() internal view virtual override returns (string memory) {
        return "acala-evm+-tutorial-nft/";
    }
```

This concludes our `NFT` smart contract.

<details>
    <summary>Your contracts/NFT.sol should look like this:</summary>

        pragma solidity =0.8.9;

        import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
        import "@openzeppelin/contracts/utils/Counters.sol";
        import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

        contract NFT is ERC721URIStorage {
                using Counters for Counters.Counter;
                Counters.Counter private _tokenIds;

                constructor() ERC721("Example non-fungible token", "eNFT") {}

                function mintNFT(address recipient, string memory tokenURI) public returns (uint256) {
                        _tokenIds.increment();

                        uint256 newItemId = _tokenIds.current();
                        _mint(recipient, newItemId);
                        _setTokenURI(newItemId, tokenURI);

                        return newItemId;
                }

                function _baseURI() internal view virtual override returns (string memory) {
                        return "acala-evm+-tutorial-nft/";
                }
        }

</details>

As the NFT smart contract is ready to be compiled, we can use the `yarn build` command (like we did
in the [hello-world](../hello-world/package.json)) to compile the smart contract, which will create
the `artifacts` directory and contain the compiled smart contract.

## Test

Your test file should be called `NFT.js` and the empty test along with the import statements
should look like this:

```js
const { expect, use } = require("chai");
const { ContractFactory } = require("ethers");

const NFTContract = require("../artifacts/contracts/NFT.sol/NFT.json");
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("NFT contract", async function () {
        
});
```

To prepare for the testing, we have to define four global variables, `NFT`, `instance`, `deployer`,
`user`, `deployerAddress` and `userAddress`. The `NFT` will be used to store the NFT contract
factory and the `instance` will store the deployed NFT smart contract. Both `deployer` and `user`
will store `Signers`. The `deployer` is the account used to deploy the smart contract (and the one
that will receive the `initialBalance`). The `user` is the account we will be using to transfer the
tokens to and check the allowance operation. `deployerAddress` and `userAddress` hold the addresses
of the `deployer` and `user` respecitively. They will be used to avoid repetitiveness in our tests.
Let's assign them values in the `beforeEach` action:

```js
        let NFT;
        let instance;
        let deployer;
        let user;
        let deployerAddress;
        let userAddress;

        beforeEach(async function () {
                [deployer, user] = await ethers.getSigners();
                deployerAddress = await deployer.getAddress();
                userAddress = await user.getAddress();
                NFT = new ContractFactory(NFTContract.abi, NFTContract.bytecode, deployer);
                instance = await NFT.deploy();
        });
```

Our test will be split into two sections, `Deployment` and `Operation`:

```js
        describe("Deployment", function () {

        });

        describe("Operation", function () {
          
        });
```

`Deployment` block contains the examples that validate the expected initial state of the smart
contract:

1. The `name` should equal `Example non-fungible token`.
2. The `symbol` should equal `eNFT`.
3. The initial balance of the `deployer` account should equal `0`.
4. The contract should revert when trying to get the balance of the `0x0` address.

```js
                it("should set the correct NFT name", async function () {
                        expect(await instance.name()).to.equal("Example non-fungible token");
                });

                it("should set the correct NFT symbol", async function () {
                        expect(await instance.symbol()).to.equal("eNFT");
                });

                it("should assign the initial balance of the deployer", async function () {
                        expect(await instance.balanceOf(deployerAddress)).to.equal(0);
                });

                it("should revert when trying to get the balance of the 0x0 address", async function () {
                        await expect(instance.balanceOf(NULL_ADDRESS)).to
                                .be.revertedWith("ERC721: balance query for the zero address");
                });
```

In the `Operation` describe block we first need to increase the timeout to 50000ms, so that the RPC
adapter has enough time to return the required information:

```js
                this.timeout(50000);
```

The `Operation` block in itself is separated into two `describe` blocks, wihch are separated in
itself:

1. `minting`: Validates the correct operation of the smart contract related to minting.

2. `balances and ownerships`: Validates the correct operation of the smart contract related to
balances and ownerships.

3. `approvals`: Validates the correct operation of the smart contract related to approvals.

4. `transfers`: Validates the correct operation of the smart contract related to transfers.

The contents of the `Operation` block should look like this:

```js
                describe("minting", function () {
                        
                });

                describe("balances and ownerships", function () {
                        
                });

                describe("approvals", function () {
                        
                });

                describe("transfers", function () {
                        
                });
```

The `minting` block validates the following:

1. When token is minted, the account balance reflects that.

2. `Transfer` event should be emitted.

3. Base URI should equal `acala-evm+-tutorial-nft/`.

4. Token URI should be built as expected.

5. User should be able to own multiple tokens.

6. Retrieving URI of a nonexistent token results in call being reverted.

These examples should look like this:

```js
                        it("should mint token to an address", async function () {
                                const initialBalance = await instance.balanceOf(userAddress);

                                await instance.connect(deployer).mintNFT(userAddress, "testURI");

                                const finalBalance = await instance.balanceOf(userAddress);

                                expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
                        });

                        it("should emit Transfer event", async function () {
                                await expect(instance.connect(deployer).mintNFT(userAddress, "")).to
                                        .emit(instance, "Transfer")
                                        .withArgs(NULL_ADDRESS, userAddress, 1);
                        });

                        it("should set the expected base URI", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                const token = await instance.tokenURI(1);

                                expect(token).to.equal("acala-evm+-tutorial-nft/1");
                        });

                        it("should set the expected URI", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "expected");

                                const token = await instance.tokenURI(1);

                                expect(token).to.equal("acala-evm+-tutorial-nft/expected");
                        });

                        it("should allow user to own multiple tokens", async function () {
                                const initialBalance = await instance.balanceOf(userAddress);

                                await instance.connect(deployer).mintNFT(userAddress, "");
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                const finalBalance = await instance.balanceOf(userAddress);

                                expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(2);
                        });

                        it("should revert when trying to get an URI of an nonexistent token", async function () {
                                await expect(instance.tokenURI(42)).to
                                        .be.revertedWith("ERC721URIStorage: URI query for nonexistent token");
                        });
```

The `balances and ownerships` block validates the following:

1. Call getting the balance of a 0x0 address should be reverted.

2. Call getting the owner of a nonexistent token should be reverted.

3. Token owner should be returned successfully.

These examples should look like this:

```js
                        it("should revert when trying to get balance of 0x0 address", async function () {
                                await expect(instance.balanceOf(NULL_ADDRESS)).to
                                        .be.revertedWith("ERC721: balance query for the zero address");
                        });

                        it("should revert when trying to get the owner of a nonexistent token", async function () {
                                await expect(instance.ownerOf(42)).to
                                        .be.revertedWith("ERC721: owner query for nonexistent token");
                        });

                        it("should return the token owner", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                const owner = await instance.ownerOf(1);

                                expect(owner).to.equal(userAddress);
                        });
```

The `approvals` block validates the following:

1. Approval should be granted successfuly.

2. `Approval` event should be emitted when granting an approval.

3. Transaction granting approval to self should be reverted.

4. Transaction granting approval for someone else's token whoudl be reverted.

5. Trying to get approval of a nonexistent token should revert.

6. Before the approval is given, the query of who has the approval of the token should result in
0x0 address.

7. Approval can be set for all tokens.

8. Approval can be revoked for all tokens.

9. If the approval is set for all tokens, individual tokens don't reflect this.

10. Operator should be allowed to grant approval for a specific token.

11. `Approval` event shoudl be emitted when operator grants approval for a specific token.

12. `ApprovalForAll` event should be emitted when granting approval for all.

13. `ApprovalForAll` event should be emitted when revoking approval for all.

These examples should look like this:

```js
                        it("should grant an approval", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await instance.connect(user).approve(deployerAddress, 1);

                                const authorized = await instance.getApproved(1);

                                expect(authorized).to.equal(deployerAddress);
                        });

                        it("should emit Approval event when granting approval", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await expect(instance.connect(user).approve(deployerAddress, 1)).to
                                        .emit(instance, "Approval")
                                        .withArgs(userAddress, deployerAddress, 1);
                        });

                        it("should revert when trying to set token approval to self", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await expect(instance.connect(user).approve(userAddress, 1)).to
                                        .be.revertedWith("ERC721: approval to current owner");
                        });

                        it("should revert when trying to grant approval for a token that is someone else's", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await expect(instance.connect(deployer).approve(deployerAddress, 1)).to
                                        .be.revertedWith("ERC721: approve caller is not owner nor approved for all");
                        });

                        it("should revert when trying to get an approval of a nonexistent token", async function() {
                                await expect(instance.getApproved(42)).to
                                        .be.revertedWith("ERC721: approved query for nonexistent token");
                        });

                        it("should return 0x0 address as approved for a token for which no approval is given", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                const authorized = await instance.getApproved(1);

                                expect(authorized).to.equal(NULL_ADDRESS);
                        });

                        it("sets approval for all", async function () {
                                await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                const approved = await instance.isApprovedForAll(userAddress, deployerAddress);

                                expect(approved).to.equal(true);
                        });

                        it("revokes approval for all", async function () {
                                await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                const initiallyApproved = await instance.isApprovedForAll(userAddress, deployerAddress);

                                expect(initiallyApproved).to.equal(true);

                                await instance.connect(user).setApprovalForAll(deployerAddress, false);

                                const finallyApproved = await instance.isApprovedForAll(userAddress, deployerAddress);

                                expect(finallyApproved).to.equal(false);
                        });

                        it("doesn't reflect operator approval in single token approval", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                const approved = await instance.getApproved(1);

                                expect(approved).to.equal(NULL_ADDRESS);
                        });

                        it("should allow operator to grant allowance for a apecific token", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                await instance.connect(deployer).approve(deployerAddress, 1);

                                const approved = await instance.getApproved(1);

                                expect(approved).to.equal(deployerAddress);
                        });

                        it("should emit Approval event when operator grants approval", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                await expect(instance.connect(deployer).approve(deployerAddress, 1)).to
                                        .emit(instance, "Approval").
                                        withArgs(userAddress, deployerAddress, 1);
                        });

                        it("should emit ApprovalForAll event when approving for all", async function () {
                                await expect(instance.connect(user).setApprovalForAll(deployerAddress, true)).to
                                        .emit(instance, "ApprovalForAll")
                                        .withArgs(userAddress, deployerAddress, true);
                        });

                        it("should emit ApprovalForAll event when revoking approval for all", async function () {
                                await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                await expect(instance.connect(user).setApprovalForAll(deployerAddress, false)).to
                                        .emit(instance, "ApprovalForAll")
                                        .withArgs(userAddress, deployerAddress, false);
                        });
```

The `transfers` block validates the following:

1. Transfer of a token should reflect on the addresses balances.

2. `Transfer` event should be emitted when transferring a token.

3. Tokens hould be able to be transferred by an account that was granted an allowance.

4. Allowance should be reset when token is transferred.

These examples should look like this:

We can now add the following test cases to our describe block:

```js
                        it("should transfer the token", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                const initialBalance = await instance.balanceOf(deployerAddress);
                                
                                await instance.connect(user).transferFrom(userAddress, deployerAddress, 1);

                                const finalBalance = await instance.balanceOf(deployerAddress);

                                expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
                        });

                        it("should emit Transfer event", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await expect(instance.connect(user).transferFrom(userAddress, deployerAddress, 1)).to
                                        .emit(instance, "Transfer")
                                        .withArgs(userAddress, deployerAddress, 1);
                        });

                        it("should allow transfer of the tokens if the allowance is given", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");

                                await instance.connect(user).approve(deployerAddress, 1);

                                const initialBalance = await instance.balanceOf(deployerAddress);

                                await instance.connect(deployer).transferFrom(userAddress, deployerAddress, 1);

                                const finalBalance = await instance.balanceOf(deployerAddress);

                                expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
                        });

                        it("should reset the allowance after the token is transferred", async function () {
                                await instance.connect(deployer).mintNFT(userAddress, "");
                                await instance.connect(user).approve(deployerAddress, 1);

                                const initialAllowance = await instance.getApproved(1);

                                expect(initialAllowance).to.equal(deployerAddress);

                                await instance.connect(deployer).transferFrom(userAddress, deployerAddress, 1);

                                const finalAllowance = await instance.getApproved(1);

                                expect(finalAllowance).to.equal(NULL_ADDRESS);
                        });
```

With that, our test is ready to be run.

<details>
    <summary>Your test/NFT.js should look like this:</summary>

        const { expect, use } = require("chai");
        const { ContractFactory } = require("ethers");

        const NFTContract = require("../artifacts/contracts/NFT.sol/NFT.json");
        const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

        describe("NFT contract", async function () {
                let NFT;
                let instance;
                let deployer;
                let user;
                let deployerAddress;
                let userAddress;

                beforeEach(async function () {
                        [deployer, user] = await ethers.getSigners();
                        deployerAddress = await deployer.getAddress();
                        userAddress = await user.getAddress();
                        NFT = new ContractFactory(NFTContract.abi, NFTContract.bytecode, deployer);
                        instance = await NFT.deploy();
                });

                describe("Deployment", function () {
                        it("should set the correct NFT name", async function () {
                                expect(await instance.name()).to.equal("Example non-fungible token");
                        });

                        it("should set the correct NFT symbol", async function () {
                                expect(await instance.symbol()).to.equal("eNFT");
                        });

                        it("should assign the initial balance of the deployer", async function () {
                                expect(await instance.balanceOf(deployerAddress)).to.equal(0);
                        });

                        it("should revert when trying to get the balance of the 0x0 address", async function () {
                                await expect(instance.balanceOf(NULL_ADDRESS)).to
                                        .be.revertedWith("ERC721: balance query for the zero address");
                        });
                });

                describe("Operation", function () {
                        this.timeout(50000);

                        describe("minting", function () {
                                it("should mint token to an address", async function () {
                                        const initialBalance = await instance.balanceOf(userAddress);

                                        await instance.connect(deployer).mintNFT(userAddress, "testURI");

                                        const finalBalance = await instance.balanceOf(userAddress);

                                        expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
                                });

                                it("should emit Transfer event", async function () {
                                        await expect(instance.connect(deployer).mintNFT(userAddress, "")).to
                                                .emit(instance, "Transfer")
                                                .withArgs(NULL_ADDRESS, userAddress, 1);
                                });

                                it("should set the expected base URI", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        const token = await instance.tokenURI(1);

                                        expect(token).to.equal("acala-evm+-tutorial-nft/1");
                                });

                                it("should set the expected URI", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "expected");

                                        const token = await instance.tokenURI(1);

                                        expect(token).to.equal("acala-evm+-tutorial-nft/expected");
                                });

                                it("should allow user to own multiple tokens", async function () {
                                        const initialBalance = await instance.balanceOf(userAddress);

                                        await instance.connect(deployer).mintNFT(userAddress, "");
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        const finalBalance = await instance.balanceOf(userAddress);

                                        expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(2);
                                });

                                it("should revert when trying to get an URI of an nonexistent token", async function () {
                                        await expect(instance.tokenURI(42)).to
                                                .be.revertedWith("ERC721URIStorage: URI query for nonexistent token");
                                });
                        });

                        describe("balances and ownerships", function () {
                                it("should revert when trying to get balance of 0x0 address", async function () {
                                        await expect(instance.balanceOf(NULL_ADDRESS)).to
                                                .be.revertedWith("ERC721: balance query for the zero address");
                                });

                                it("should revert when trying to get the owner of a nonexistent token", async function () {
                                        await expect(instance.ownerOf(42)).to
                                                .be.revertedWith("ERC721: owner query for nonexistent token");
                                });

                                it("should return the token owner", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        const owner = await instance.ownerOf(1);

                                        expect(owner).to.equal(userAddress);
                                });
                        });

                        describe("approvals", function () {
                                it("should grant an approval", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await instance.connect(user).approve(deployerAddress, 1);

                                        const authorized = await instance.getApproved(1);

                                        expect(authorized).to.equal(deployerAddress);
                                });

                                it("should emit Approval event when granting approval", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await expect(instance.connect(user).approve(deployerAddress, 1)).to
                                                .emit(instance, "Approval")
                                                .withArgs(userAddress, deployerAddress, 1);
                                });

                                it("should revert when trying to set token approval to self", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await expect(instance.connect(user).approve(userAddress, 1)).to
                                                .be.revertedWith("ERC721: approval to current owner");
                                });

                                it("should revert when trying to grant approval for a token that is someone else's", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await expect(instance.connect(deployer).approve(deployerAddress, 1)).to
                                                .be.revertedWith("ERC721: approve caller is not owner nor approved for all");
                                });

                                it("should revert when trying to get an approval of a nonexistent token", async function() {
                                        await expect(instance.getApproved(42)).to
                                                .be.revertedWith("ERC721: approved query for nonexistent token");
                                });

                                it("should return 0x0 address as approved for a token for which no approval is given", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        const authorized = await instance.getApproved(1);

                                        expect(authorized).to.equal(NULL_ADDRESS);
                                });

                                it("sets approval for all", async function () {
                                        await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                        const approved = await instance.isApprovedForAll(userAddress, deployerAddress);

                                        expect(approved).to.equal(true);
                                });

                                it("revokes approval for all", async function () {
                                        await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                        const initiallyApproved = await instance.isApprovedForAll(userAddress, deployerAddress);

                                        expect(initiallyApproved).to.equal(true);

                                        await instance.connect(user).setApprovalForAll(deployerAddress, false);

                                        const finallyApproved = await instance.isApprovedForAll(userAddress, deployerAddress);

                                        expect(finallyApproved).to.equal(false);
                                });

                                it("doesn't reflect operator approval in single token approval", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                        const approved = await instance.getApproved(1);

                                        expect(approved).to.equal(NULL_ADDRESS);
                                });

                                it("should allow operator to grant allowance for a apecific token", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                        await instance.connect(deployer).approve(deployerAddress, 1);

                                        const approved = await instance.getApproved(1);

                                        expect(approved).to.equal(deployerAddress);
                                });

                                it("should emit Approval event when operator grants approval", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                        await expect(instance.connect(deployer).approve(deployerAddress, 1)).to
                                                .emit(instance, "Approval").
                                                withArgs(userAddress, deployerAddress, 1);
                                });

                                it("should emit ApprovalForAll event when approving for all", async function () {
                                        await expect(instance.connect(user).setApprovalForAll(deployerAddress, true)).to
                                                .emit(instance, "ApprovalForAll")
                                                .withArgs(userAddress, deployerAddress, true);
                                });

                                it("should emit ApprovalForAll event when revoking approval for all", async function () {
                                        await instance.connect(user).setApprovalForAll(deployerAddress, true);

                                        await expect(instance.connect(user).setApprovalForAll(deployerAddress, false)).to
                                                .emit(instance, "ApprovalForAll")
                                                .withArgs(userAddress, deployerAddress, false);
                                });
                        });

                        describe("transfers", function () {
                                it("should transfer the token", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        const initialBalance = await instance.balanceOf(deployerAddress);
                                        
                                        await instance.connect(user).transferFrom(userAddress, deployerAddress, 1);

                                        const finalBalance = await instance.balanceOf(deployerAddress);

                                        expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
                                });

                                it("should emit Transfer event", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await expect(instance.connect(user).transferFrom(userAddress, deployerAddress, 1)).to
                                                .emit(instance, "Transfer")
                                                .withArgs(userAddress, deployerAddress, 1);
                                });

                                it("should allow transfer of the tokens if the allowance is given", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");

                                        await instance.connect(user).approve(deployerAddress, 1);

                                        const initialBalance = await instance.balanceOf(deployerAddress);

                                        await instance.connect(deployer).transferFrom(userAddress, deployerAddress, 1);

                                        const finalBalance = await instance.balanceOf(deployerAddress);

                                        expect(finalBalance.toNumber() - initialBalance.toNumber()).to.equal(1);
                                });

                                it("should reset the allowance after the token is transferred", async function () {
                                        await instance.connect(deployer).mintNFT(userAddress, "");
                                        await instance.connect(user).approve(deployerAddress, 1);

                                        const initialAllowance = await instance.getApproved(1);

                                        expect(initialAllowance).to.equal(deployerAddress);

                                        await instance.connect(deployer).transferFrom(userAddress, deployerAddress, 1);

                                        const finalAllowance = await instance.getApproved(1);

                                        expect(finalAllowance).to.equal(NULL_ADDRESS);
                                });
                        });
                });
        });

</details>

When you run the test with (for example) `yarn test`, your tests should pass with the
following output:

```shell
yarn test


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ hardhat test


  NFT contract
    Deployment
      ✓ should set the correct NFT name
      ✓ should set the correct NFT symbol
      ✓ should assign the initial balance of the deployer
      ✓ should revert when trying to get the balance of the 0x0 address (41ms)
    Operation
      minting
        ✓ should mint token to an address (83ms)
        ✓ should emit Transfer event (183ms)
        ✓ should set the expected base URI (173ms)
        ✓ should set the expected URI (86ms)
        ✓ should allow user to own multiple tokens (313ms)
        ✓ should revert when trying to get an URI of an nonexistent token
      balances and ownerships
        ✓ should revert when trying to get balance of 0x0 address
        ✓ should revert when trying to get the owner of a nonexistent token
        ✓ should return the token owner (147ms)
      approvals
        ✓ should grant an approval (177ms)
        ✓ should emit Approval event when granting approval (158ms)
        ✓ should revert when trying to set token approval to self (138ms)
        ✓ should revert when trying to grant approval for a token that is someone else's (138ms)
        ✓ should revert when trying to get an approval of a nonexistent token
        ✓ should return 0x0 address as approved for a token for which no approval is given (127ms)
        ✓ sets approval for all
        ✓ revokes approval for all (139ms)
        ✓ doesn't reflect operator approval in single token approval (174ms)
        ✓ should allow operator to grant allowance for a apecific token (194ms)
        ✓ should emit Approval event when operator grants approval (187ms)
        ✓ should emit ApprovalForAll event when approving for all
        ✓ should emit ApprovalForAll event when revoking approval for all (113ms)
      transfers
        ✓ should transfer the token (267ms)
        ✓ should emit Transfer event (246ms)
        ✓ should allow transfer of the tokens if the allowance is given (271ms)
        ✓ should reset the allowance after the token is transferred (266ms)


  30 passing (7s)

✨  Done in 8.28s.
```

## Deploy script

This deployment script will deploy the contract, mint an NFT and output the its' URI

Within the `deploy.js` we will have the definition of main function called `main()` and then run it.
We do this by placing the following code within the file:

```js
async function main() {
    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```



Our deploy script will reside in the definition (`async function main()`). First, we will get the
address of the account which will be used to deploy the smart contract as well as the address to
which we will be minting the NFT to. Then we get the `NFT.sol` to the contract factory and deploy it
and assign the deployed smart contract to the `instance` variable. Assigning the `instance` variable
is optional and is only done, so that we can mint the NFT to the alternative account and retrieve
its' URI. Finally we output the URI of the newly minted NFT:

```js
  const [deployer, user] = await ethers.getSigners();

  console.log("Deploying contract with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const NFT = await ethers.getContractFactory("NFT");
  const instance = await NFT.deploy();

  console.log("NFT address:", instance.address);

  await instance.connect(deployer).mintNFT(await user.getAddress(), "super-amazing-and-unique-nft");

  const tokenURI = await instance.tokenURI(1);

  console.log("Prime tokenURI:", tokenURI);
```

<details>
    <summary>Your script/deploy.js should look like this:</summary>

        async function main() {
                const [deployer, user] = await ethers.getSigners();

                console.log("Deploying contract with the account:", deployer.address);

                console.log("Account balance:", (await deployer.getBalance()).toString());

                const NFT = await ethers.getContractFactory("NFT");
                const instance = await NFT.deploy();

                console.log("NFT address:", instance.address);

                await instance.connect(deployer).mintNFT(await user.getAddress(), "super-amazing-and-unique-nft");

                const tokenURI = await instance.tokenURI(1);

                console.log("Prime tokenURI:", tokenURI);
        }

        main()
                .then(() => process.exit(0))
                .catch((error) => {
                console.error(error);
                process.exit(1);
        });

</details>

Running the `yarn deploy` script should return the following output:

```shell
yarn deploy


yarn run v1.22.15
warning ../../../../../package.json: No license field
$ hardhat run scripts/deploy.js
Deploying contract with the account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account balance: 10000000000000000000000
NFT address: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Prime tokenURI: acala-evm+-tutorial-nft/super-amazing-and-unique-nft
✨  Done in 4.67s.
```

## Summary

We have built upon the previous examples and added an ERC721 smart contract and tested all of its
functionalities. The tests were more detailed and covered more examples. We also ensured that we can
interact with the smart contract and that its storage is modified as expected. We can compile smart
contract with `yarn build`, test it with `yarn test`, `yarn test-mandala` or `yarn test-mandala:pubDev`
and deploy it with `yarn deploy`, `yarn deploy-mandala` or  `yarn deploy-mandala:pubDev`.