// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ReputationRegistry.sol";
import "hardhat/console.sol";

contract MatchContract {
    // To follow EIP-1167 pattern we require the following addresses
    address public immutable factory; // address of the factory taking care of contract creation
    address public creator; // address of the creator who initialized this contract
    bool public initialized;

    ReputationRegistry public immutable reputationRegistry;

    // Match states
    enum MatchStatus {
        Pending,
        Commit,
        Reveal,
        Dispute,
        Completed
    } // Commit at beginning, reveal after match, dispute after no/wrong reveal, completed after resolved

    // Player reputation
    struct Player {
        int256 reputation;
        uint256 totalMatches;
        bool isBanned;
    }

    // Match data
    struct Match {
        address player1;
        address player2;
        bytes32 player1Commit;
        bytes32 player2Commit;
        bool player1Joined;
        bool player2Joined;
        string player1Result;
        string player2Result;
        bytes32 player1Salt;
        bytes32 player2Salt;
        uint256 entryFee;
        address[] juryPool;
        mapping(address => uint256) juryVotes;
        uint256 revealDeadline;
    }

    // For some reason we need to take this out of the struct otherwise it won't compile
    MatchStatus public status;

    // Constants
    uint256 public constant JURY_STAKE = 0.1 ether;
    uint256 public constant JURY_REWARD = 0.05 ether;
    uint256 public constant REVEAL_PERIOD = 2 days;

    // Reputation points
    int256 public constant REP_WIN = 15;
    int256 public constant REP_TRUTHFUL = 10;
    int256 public constant REP_NO_REVEAL = -25;
    int256 public constant REP_LIED = -50;
    int256 public constant REP_JURY_VOTE = 5;

    // Storage
    Match public currentMatch;
    mapping(address => Player) public players;

    // Events
    event MatchCreated(address player1, address player2);
    event ResultRevealed(address player);
    event DisputeInitiated();
    event JuryVoted(address indexed juror, uint256 vote);
    event MatchResolved(address indexed winner);
    event PlayerJoined(address indexed player);

    // Modifiers
    modifier onlyPlayers() {
        require(
            msg.sender == currentMatch.player1 ||
                msg.sender == currentMatch.player2,
            "Not a player of this Match"
        );
        _;
    }

    // To check that only factory may initialize
    modifier onlyFactory() {
        require(msg.sender == factory, "Not Factory");
        _;
    }

    // Constructor for immutables only
    constructor(address _factory, address _registry) {
        factory = _factory;
        reputationRegistry = ReputationRegistry(_registry);
    }

    // Initializer (To follow EIP-1167) to create initial deployment of this contract
    function initialize(
        address _creator,
        address _player1,
        address _player2,
        uint256 _entryFee
    ) external {
        require(!initialized, "Already initialized");

        creator = _creator;
        currentMatch.player1 = _player1;
        currentMatch.player2 = _player2;
        currentMatch.entryFee = _entryFee;
        currentMatch.revealDeadline = block.timestamp + REVEAL_PERIOD;
        status = MatchStatus.Pending;
        currentMatch.player1Joined = false;
        currentMatch.player2Joined = false;

        initialized = true;

        emit MatchCreated(_player1, _player2);
    }

    function getMatchStatus() external view returns (MatchStatus) {
        return status;
    }

    function getEntryFee() external view returns (uint256) {
        return currentMatch.entryFee;
    }

    function joinMatch() external payable onlyPlayers {
        require(msg.value == currentMatch.entryFee, "Wrong Entry Fee");

        emit PlayerJoined(msg.sender);

        // Add so that player informed if already joined
        if (msg.sender == currentMatch.player1)
            currentMatch.player1Joined = true;
        else currentMatch.player2Joined = true;

        // Set match to commit state after both joined
        if (currentMatch.player1Joined && currentMatch.player2Joined) {
            status = MatchStatus.Commit;
        }
    }

    // Commit phase
    function commitResult(
        bytes32 hashedCommitment
    ) external payable onlyPlayers {
        require(status == MatchStatus.Commit, "Not in commit phase");

        if (msg.sender == currentMatch.player1) {
            require(
                msg.value ==
                    reputationRegistry.getStakeAmount(msg.sender) *
                        currentMatch.entryFee
            );
            currentMatch.player1Commit = hashedCommitment;
        } else {
            require(
                msg.value ==
                    reputationRegistry.getStakeAmount(msg.sender) *
                        currentMatch.entryFee
            );
            currentMatch.player2Commit = hashedCommitment;
        }

        // Advance to reveal if both committed
        if (
            currentMatch.player1Commit != bytes32(0) &&
            currentMatch.player2Commit != bytes32(0)
        ) {
            status = MatchStatus.Reveal;
        }
    }

    // Reveal phase
    function revealResult(
        bytes32 salt,
        string memory result
    ) external onlyPlayers {
        require(status == MatchStatus.Reveal, "Not in reveal phase");
        require(
            block.timestamp <= currentMatch.revealDeadline,
            "Reveal period expired"
        );

        bytes32 commitment = keccak256(
            abi.encodePacked("I_report_truth", salt)
        );

        if (msg.sender == currentMatch.player1) {
            require(commitment == currentMatch.player1Commit, "Invalid reveal");
            currentMatch.player1Result = result;
            currentMatch.player1Salt = salt;
        } else {
            require(commitment == currentMatch.player2Commit, "Invalid reveal");
            currentMatch.player2Result = result;
            currentMatch.player2Salt = salt;
        }

        emit ResultRevealed(msg.sender);

        // Check if both revealed
        if (
            currentMatch.player1Salt != bytes32(0) &&
            currentMatch.player2Salt != bytes32(0)
        ) {
            if (
                keccak256(abi.encodePacked(currentMatch.player1Result)) ==
                keccak256(abi.encodePacked(currentMatch.player2Result))
            ) {
                _resolveMatch(msg.sender); // Same result
            } else {
                status = MatchStatus.Dispute;
                emit DisputeInitiated();
            }
        }
    }

    // Jury system
    function joinJury() external payable {
        require(!reputationRegistry.isBanned(msg.sender), "You are banned");
        require(msg.value == JURY_STAKE, "Incorrect jury stake");

        require(status == MatchStatus.Dispute, "No active dispute");
        currentMatch.juryPool.push(msg.sender);
    }

    function voteAsJuror(uint256 vote) external {
        require(status == MatchStatus.Dispute, "No active dispute");

        bool isJuror = false;
        for (uint i = 0; i < currentMatch.juryPool.length; i++) {
            if (currentMatch.juryPool[i] == msg.sender) {
                isJuror = true;
                break;
            }
        }
        require(isJuror, "Not a juror");

        currentMatch.juryVotes[msg.sender] = vote;
        emit JuryVoted(msg.sender, vote);

        // Tally votes if all jurors voted
        if (currentMatch.juryPool.length >= 3) {
            // Minimum 3 jurors
            uint256 player1Votes;
            uint256 player2Votes;

            for (uint i = 0; i < currentMatch.juryPool.length; i++) {
                if (currentMatch.juryVotes[currentMatch.juryPool[i]] == 1)
                    player1Votes++;
                else player2Votes++;
            }

            address winner = player1Votes > player2Votes
                ? currentMatch.player1
                : currentMatch.player2;
            _resolveDispute(winner);
        }
    }

    // Internal resolution functions
    function _resolveMatch(address winner) private {
        status = MatchStatus.Completed;

        // Update reputations
        address loser = winner == currentMatch.player1
            ? currentMatch.player2
            : currentMatch.player1;

        reputationRegistry.updateReputation(winner, REP_WIN, false);
        reputationRegistry.updateReputation(loser, REP_TRUTHFUL, false);

        // Payout
        payable(winner).transfer(currentMatch.entryFee * 2);
        emit MatchResolved(winner);
    }

    function _resolveDispute(address winner) private {
        status = MatchStatus.Completed;

        // Penalize liar
        address liar = winner == currentMatch.player1
            ? currentMatch.player2
            : currentMatch.player1;

        reputationRegistry.updateReputation(liar, REP_LIED, false);

        // Reward jurors
        for (uint i = 0; i < currentMatch.juryPool.length; i++) {
            payable(currentMatch.juryPool[i]).transfer(JURY_REWARD); // pay out money for voting

            // update reputation
            reputationRegistry.updateReputation(
                currentMatch.juryPool[i],
                REP_JURY_VOTE,
                false
            );
        }

        // Payout
        payable(winner).transfer(
            currentMatch.entryFee *
                2 -
                (JURY_REWARD * currentMatch.juryPool.length)
        );
        emit MatchResolved(winner);
    }
}
