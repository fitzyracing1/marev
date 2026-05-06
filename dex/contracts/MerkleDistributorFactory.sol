// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MerkleDistributor.sol";

/// @notice Deploys MerkleDistributor instances on demand. Indexers + the marev
/// frontend listen for DistributorCreated to find a project's claim contract.
contract MerkleDistributorFactory {
    event DistributorCreated(
        address indexed distributor,
        address indexed token,
        address indexed creator,
        bytes32 merkleRoot,
        uint256 expiry,
        string name
    );

    address[] public allDistributors;
    mapping(address => address[]) public creatorDistributors;
    mapping(address => address[]) public tokenDistributors;

    function create(
        address token,
        bytes32 merkleRoot,
        uint256 expiry,
        string calldata name
    ) external returns (address distributor) {
        MerkleDistributor d = new MerkleDistributor(token, merkleRoot, msg.sender, expiry, name);
        distributor = address(d);
        allDistributors.push(distributor);
        creatorDistributors[msg.sender].push(distributor);
        tokenDistributors[token].push(distributor);
        emit DistributorCreated(distributor, token, msg.sender, merkleRoot, expiry, name);
    }

    function totalDistributors() external view returns (uint256) {
        return allDistributors.length;
    }

    function getCreatorDistributors(address creator) external view returns (address[] memory) {
        return creatorDistributors[creator];
    }

    function getTokenDistributors(address token) external view returns (address[] memory) {
        return tokenDistributors[token];
    }
}
