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
        // Single reputationRegistry per MatchContractFactory
        reputationRegistry = new ReputationRegistry(address(this));

        // Then deploy template contract for matches
        matchContractTemplate = address(
            new MatchContract(address(this), address(reputationRegistry))
        );
    }

    function createTournamentMatch(
        address player1,
        address player2,
        uint256 entryFee,
        address tournamentContract,
        uint256 tournamentId,
        uint256 roundNumber,
        uint256 matchIndex
    ) external returns (address) {
        // Clone new match contract
        address matchAddress = clone(matchContractTemplate);
        matches.push(matchAddress);

        console.log("Tournament match created at: ", matchAddress);

        // Initialize the match with tournament data
        MatchContract(matchAddress).initialize(
            msg.sender, // creator
            player1, // player1
            player2, // player2
            entryFee, // entry fee
            tournamentContract, // tournament contract
            tournamentId, // tournament ID
            roundNumber, // round number
            matchIndex // match index
        );

        emit MatchCreated(matchAddress, msg.sender);
        return matchAddress;
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
            entryFee, // entry fee
            address(0),
            0,
            0,
            0
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

    function getMatchCount() external view returns (uint256) {
        return matches.length;
    }

    // EIP-1167 Minimal Proxy Clone
    function clone(address implementation) internal returns (address instance) {
        // See https://eips.ethereum.org/EIPS/eip-1167
        // We want 363d3d373d3d3d363d73<implementation>5af43d82803e903d91602b57fd5bf3
        assembly {
            // Load the free memory pointer (0x40 is the slot for free memory pointer)
            let ptr := mload(0x40)

            // Store the first part of the proxy contract bytecode in memory
            mstore(
                ptr,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            // Store the implementation address (shifted left to fit in the placeholder)
            // Remember, SHL move data to the more significant bits, it uses big-endian
            // This replaces the 20-byte zero placeholder with the actual 20-byte implementation address
            mstore(add(ptr, 0x14), shl(0x60, implementation))
            // Store the remaining part of the proxy contract bytecode
            mstore(
                add(ptr, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )
            instance := create(0, ptr, 0x37)
        }
        require(instance != address(0), "Clone failed");
    }

    // clone detection
    function isClone(address query) internal view returns (bool) {
        // Checks if it is a proxy
        bytes20 targetBytes = bytes20(matchContractTemplate);
        bytes20 queryBytes = bytes20(query);

        // EIP-1167 clone detection
        bytes memory code = query.code;
        return
            code.length == 45 && code[0] == 0x3d && queryBytes == targetBytes;
    }
}
