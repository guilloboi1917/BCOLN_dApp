// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// A simple globally accessible Reputatation Repository to monitor and modify player's reputation

contract ReputationRegistry {
    int256 public constant BAN_THRESHOLD = -100;

    struct PlayerReputation {
        int256 score;
        bool isBanned;
        uint256 lastUpdated;
    }

    mapping(address => PlayerReputation) public reputations;
    address public factory;

    event ReputationUpdated(address indexed player, int256 change);
    event PlayerBanStatusChanged(address indexed player, bool change);

    modifier onlyFactory() {
        require(msg.sender == factory, "Only factory");
        _;
    }

    constructor() {
        factory = msg.sender;
    }

    function updateReputation(
        address player,
        int256 change,
        bool banStatus
    ) external onlyFactory {
        PlayerReputation storage rep = reputations[player];
        bool prevBanStatus = rep.isBanned;

        rep.score += change;
        rep.isBanned = banStatus || rep.isBanned;

        // automatically ban/unban if below/above threshold
        rep.isBanned = rep.score < BAN_THRESHOLD ? true : false;

        if (prevBanStatus != rep.isBanned)
            emit PlayerBanStatusChanged(player, rep.isBanned);

        rep.lastUpdated = block.timestamp;

        emit ReputationUpdated(player, change);
    }

    function getReputation(address _player) external view returns (int256) {
        return reputations[_player].score;
    }

    function isBanned(address _player) external view returns (bool) {
        return reputations[_player].isBanned;
    }

    function getStakeAmount(address player) external view returns (uint256) {
        if (reputations[player].isBanned) revert("Banned player");
        if (reputations[player].score >= 50) return 0.5 ether;
        if (reputations[player].score < 0) return 2 ether;
        return 1 ether;
    }
}
