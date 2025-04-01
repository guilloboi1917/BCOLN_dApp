// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MatchContractFactory {
    // We follow EIB-1167 to reduce gas costs
    // https://www.rareskills.io/post/eip-1167-minimal-proxy-standard-with-initialization-clone-pattern

    address[] public matches;
    address public immutable matchContractTemplate; // Address of initialized MatchContract

    event MatchCreated(address indexed matchAddress, address indexed creator);

    constructor(address _template) {
        matchContractTemplate = _template;
    }

    function createMatch(bytes memory initData) external returns (address) {
        // Clone the template (cheaper than deploying new)
        address newMatch = clone(matchContractTemplate);
        matches.push(newMatch);

        // Initialize the match (if needed)
        (bool success, ) = newMatch.call(initData);
        require(success, "Match initialization failed");

        emit MatchCreated(newMatch, msg.sender);
        return newMatch;
    }

    // Minimal clone (EIP-1167) to reduce gas costs
    function clone(address template) internal returns (address result) {
        bytes20 targetBytes = bytes20(template);
        assembly {
            // Load free memory pointer
            let clonePtr := mload(0x40)

            // Store EIP-1167 minimal proxy bytecode
            mstore(
                clonePtr,
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000
            )
            mstore(add(clonePtr, 0x14), targetBytes)
            mstore(
                add(clonePtr, 0x28),
                0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000
            )

            // Deploy the clone and assign to `result`
            result := create(0, clonePtr, 0x37)
        }
    }

    function getMatchCount() external view returns (uint256) {
        return matches.length;
    }
}
