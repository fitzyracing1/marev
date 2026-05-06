// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Single-token Merkle airdrop distributor.
/// Leaves are keccak256(abi.encodePacked(index, account, amount)) so each recipient
/// occupies one slot in the tree and can claim exactly once.
contract MerkleDistributor {
    address public immutable token;
    bytes32 public immutable merkleRoot;
    address public immutable creator;
    uint256 public immutable expiry;
    string public name;

    mapping(uint256 => uint256) private claimedWords;

    event Claimed(uint256 indexed index, address indexed account, uint256 amount);
    event Swept(address indexed creator, uint256 amount);

    constructor(
        address _token,
        bytes32 _merkleRoot,
        address _creator,
        uint256 _expiry,
        string memory _name
    ) {
        require(_token != address(0), "token=0");
        require(_creator != address(0), "creator=0");
        token = _token;
        merkleRoot = _merkleRoot;
        creator = _creator;
        expiry = _expiry;
        name = _name;
    }

    function isClaimed(uint256 index) public view returns (bool) {
        uint256 word = claimedWords[index / 256];
        return (word >> (index % 256)) & 1 == 1;
    }

    function _setClaimed(uint256 index) private {
        claimedWords[index / 256] |= 1 << (index % 256);
    }

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata proof) external {
        require(!isClaimed(index), "already claimed");
        if (expiry > 0) require(block.timestamp < expiry, "expired");

        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        bytes32 computed = node;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 sibling = proof[i];
            computed = computed < sibling
                ? keccak256(abi.encodePacked(computed, sibling))
                : keccak256(abi.encodePacked(sibling, computed));
        }
        require(computed == merkleRoot, "invalid proof");

        _setClaimed(index);
        require(IERC20(token).transfer(account, amount), "transfer failed");
        emit Claimed(index, account, amount);
    }

    /// @notice After expiry the creator can recover unclaimed tokens.
    function sweep() external {
        require(msg.sender == creator, "not creator");
        require(expiry > 0 && block.timestamp >= expiry, "not expired");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "nothing to sweep");
        require(IERC20(token).transfer(creator, balance), "transfer failed");
        emit Swept(creator, balance);
    }
}
