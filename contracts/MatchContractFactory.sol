// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ReputationRegistry.sol";
import "./MatchContract.sol";

contract MatchContractFactory {
    // We follow EIB-1167 to reduce gas costs
    // https://www.rareskills.io/post/eip-1167-minimal-proxy-standard-with-initialization-clone-pattern

    address[] public matches;
    address public immutable matchContractTemplate; // Address of initialized MatchContract
    ReputationRegistry public immutable reputationRegistry;

    event MatchCreated(address indexed matchAddress, address indexed creator);

    constructor() {
        // Deploy dependencies for this
        reputationRegistry = new ReputationRegistry(address(this));

        // Then deploy template contract for matches
        matchContractTemplate = address(
            new MatchContract(address(this), address(reputationRegistry))
        );
    }

    function createMatch(
        address player1,
        address player2,
        uint256 entryFee
    ) external returns (address) {
        // 2. Clone new match contract
        address matchAddress = clone(matchContractTemplate);
        matches.push(matchAddress);

        console.log("Match created at: ", matchAddress);

        // 3. Initialize the match
        MatchContract(matchAddress).initialize(
            msg.sender, // creator
            player1, // player1
            player2, // player2
            entryFee // entry fee
        );

        emit MatchCreated(matchAddress, msg.sender);
        return matchAddress;
    }

    // We simply delegate the call
    function updateReputation(
        address player,
        int256 change,
        bool banStatus
    ) external {
        require(isClone(msg.sender), "Unauthorized to change reputation");

        reputationRegistry.updateReputation(player, change, banStatus);
    }

    // EIP-1167 Minimal Proxy Clone
    function clone(address implementation) internal returns (address instance) {
        assembly {
            let ptr := mload(0x40)
            mstore(
                ptr,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            mstore(
                add(ptr, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            instance := create(0, ptr, 0x37)
        }
        require(instance != address(0), "Clone failed");
    }

    // Add clone detection
    function isClone(address query) internal view returns (bool) {
        bytes20 targetBytes = bytes20(matchContractTemplate);
        bytes20 queryBytes = bytes20(query);

        // EIP-1167 clone detection
        bytes memory code = query.code;
        return
            code.length == 45 && code[0] == 0x3d && queryBytes == targetBytes;
    }

    function getMatchCount() external view returns (uint256) {
        return matches.length;
    }
}
