// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ReputationRegistry.sol";
import "hardhat/console.sol";
import "./TournamentContract.sol";

interface ITournament {
    function reportMatchResult(
        uint256 tournamentId,
        uint256 roundNumber,
        uint256 matchIndex,
        address winner
    ) external;
}

contract MatchContract {
    // To follow EIP-1167 pattern we require the following addresses
    address public immutable factory; // address of the factory taking care of contract creation
    address public creator; // address of the creator who initialized this contract
    bool public initialized;

    address public tournamentContract;
    uint256 public tournamentId;
    uint256 public roundNumber;
    uint256 public matchIndex;
    bool public isTournamentMatch;

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
        address winner;
        bytes32 player1Commit;
        bytes32 player2Commit;
        bool player1Joined;
        bool player2Joined;
        string player1Result; // Report result as "I won" in reveal and convert it later to string "player1_won", "player2_won"
        string player2Result;
        bytes32 player1Salt;
        bytes32 player2Salt;
        uint256 entryFee;
        address[] juryPool;
        mapping(address => uint256) juryVotes;
        uint256 revealDeadline;
    }

    // For some reason we need to take this out of the struct otherwise it won't compile due to stack depth
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
    event ResultCommitted(address player);
    event ResultRevealed(address player, string result);
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
    // initialize is used instead of the constructor when a contract that uses a proxy is published
    function initialize(
        address _creator,
        address _player1,
        address _player2,
        uint256 _entryFee,
        address _tournamentContract,
        uint256 _tournamentId,
        uint256 _roundNumber,
        uint256 _matchIndex
    ) external {
        require(!initialized, "Already initialized");

        creator = _creator;
        currentMatch.player1 = _player1;
        currentMatch.player2 = _player2;
        currentMatch.winner = address(0); // Initialize winner as zero address
        currentMatch.entryFee = _entryFee;
        currentMatch.revealDeadline = block.timestamp + REVEAL_PERIOD;
        status = MatchStatus.Pending;
        currentMatch.player1Joined = false;
        currentMatch.player2Joined = false;

        currentMatch.juryPool = new address[](0);

        if (_tournamentContract != address(0)) {
            tournamentContract = _tournamentContract;
            tournamentId = _tournamentId;
            roundNumber = _roundNumber;
            matchIndex = _matchIndex;
            isTournamentMatch = true;
        }

        initialized = true;

        emit MatchCreated(_player1, _player2);
    }

    function getMatchStatus() external view returns (MatchStatus) {
        return status;
    }

    function getEntryFee() external view returns (uint256) {
        return currentMatch.entryFee;
    }

    function getPlayers()
        external
        view
        returns (address player1, address player2)
    {
        return (currentMatch.player1, currentMatch.player2);
    }

    function getWinner() external view returns (address) {
        return currentMatch.winner;
    }

    function getJuryCount() external view returns (uint256) {
        return currentMatch.juryPool.length;
    }

    function getMatchDetails()
        external
        view
        returns (
            address player1,
            address player2,
            address winner,
            MatchStatus matchStatus,
            uint256 matchRound,
            uint256 matchIdx,
            bool player1Joined,
            bool player2Joined,
            uint256 juryCount
        )
    {
        return (
            currentMatch.player1,
            currentMatch.player2,
            currentMatch.winner,
            status,
            roundNumber,
            matchIndex,
            currentMatch.player1Joined,
            currentMatch.player2Joined,
            currentMatch.juryPool.length
        );
    }

    function havePlayersJoined()
        external
        view
        returns (bool player1Joined, bool player2Joined)
    {
        return (currentMatch.player1Joined, currentMatch.player2Joined);
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
    // Remember: For the initial commit, we use a salt and the string "I_report_truth" and hash it
    // This will be sent here
    function commitResult(
        bytes32 hashedCommitment
    ) external payable onlyPlayers {
        require(status == MatchStatus.Commit, "Not in commit phase");

        if (msg.sender == currentMatch.player1) {
            require(
                msg.value == reputationRegistry.getStakeAmount(msg.sender),
                "Incorrect stake amount for player 1"
            );
            currentMatch.player1Commit = hashedCommitment;
        } else {
            require(
                msg.value == reputationRegistry.getStakeAmount(msg.sender),
                "Incorrect stake amount for player 2"
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
    // Remember: When revealing, we provide our initial salt and the result
    function revealResult(bytes32 salt, bool result) external onlyPlayers {
        require(status == MatchStatus.Reveal, "Not in reveal phase");
        require(
            block.timestamp <= currentMatch.revealDeadline,
            "Reveal period expired"
        );

        bytes32 commitment = keccak256(
            abi.encodePacked("I_report_truth", salt)
        );

        // It feels a bit redunant, no?
        if (msg.sender == currentMatch.player1) {
            require(commitment == currentMatch.player1Commit, "Invalid reveal");
            currentMatch.player1Result = result ? "player1_won" : "player2_won"; // By doing it like this, players don't need to know if they are player1 or player2
            currentMatch.player1Salt = salt;
            console.log("Player 1 revealed");
        } else {
            require(commitment == currentMatch.player2Commit, "Invalid reveal");
            currentMatch.player2Result = result ? "player2_won" : "player1_won"; // vice versa
            currentMatch.player2Salt = salt;
            console.log("Player 2 revealed");
        }

        emit ResultRevealed(msg.sender, result ? "player1_won" : "player2_won");
        console.log("Both revealed");

        // Check if both revealed
        if (
            currentMatch.player1Salt != bytes32(0) &&
            currentMatch.player2Salt != bytes32(0)
        ) {
            if (
                keccak256(abi.encodePacked(currentMatch.player1Result)) ==
                keccak256(abi.encodePacked(currentMatch.player2Result))
            ) {
                if (
                    keccak256(abi.encodePacked(currentMatch.player2Result)) ==
                    keccak256(abi.encodePacked("player2_won"))
                )
                    _resolveMatch(currentMatch.player2); // Same result
                else _resolveMatch(currentMatch.player1);
            } else {
                status = MatchStatus.Dispute;
                emit DisputeInitiated();
            }
        }
    }

    // Combined commit and reveal function
    // Player commits their result directly with salt and result string
    function commitAndRevealResult(
        bytes32 salt,
        bool didIWin
    ) external payable onlyPlayers {
        require(status == MatchStatus.Commit, "Not in commit phase");

        // Ensure player has staked the required amount
        require(
            msg.value == reputationRegistry.getStakeAmount(msg.sender),
            "Incorrect stake amount"
        );

        // Set commitment hash (retaining this for verification)
        bytes32 commitment = keccak256(
            abi.encodePacked("I_report_truth", salt)
        );

        string memory resultString;

        if (msg.sender == currentMatch.player1) {
            currentMatch.player1Commit = commitment;
            currentMatch.player1Salt = salt;
            resultString = didIWin ? "player1_won" : "player2_won";
            currentMatch.player1Result = resultString;
        } else {
            currentMatch.player2Commit = commitment;
            currentMatch.player2Salt = salt;
            resultString = didIWin ? "player2_won" : "player1_won";
            currentMatch.player2Result = resultString;
        }

        emit ResultCommitted(msg.sender);
        emit ResultRevealed(msg.sender, resultString);

        // Check if both players have committed their results
        if (
            currentMatch.player1Salt != bytes32(0) &&
            currentMatch.player2Salt != bytes32(0)
        ) {
            // Both players have committed results, check if they agree
            if (
                keccak256(abi.encodePacked(currentMatch.player1Result)) ==
                keccak256(abi.encodePacked(currentMatch.player2Result))
            ) {
                // Players agree on the result
                if (
                    keccak256(abi.encodePacked(currentMatch.player2Result)) ==
                    keccak256(abi.encodePacked("player2_won"))
                ) _resolveMatch(currentMatch.player2);
                else _resolveMatch(currentMatch.player1);
            } else {
                // Players disagree, initiate dispute
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

    // Combined join jury and vote function
    // Jurors stake and vote in a single transaction
    function joinJuryAndVote(uint256 vote) external payable {
        require(status == MatchStatus.Dispute, "No active dispute");
        require(!reputationRegistry.isBanned(msg.sender), "You are banned");
        require(msg.value == JURY_STAKE, "Incorrect jury stake");
        require(
            vote == 1 || vote == 2,
            "Invalid vote: must be 1 (player1) or 2 (player2)"
        );

        // Check if juror has already joined
        for (uint i = 0; i < currentMatch.juryPool.length; i++) {
            require(currentMatch.juryPool[i] != msg.sender, "Already a juror");
        }

        // Add juror to pool and record vote
        currentMatch.juryPool.push(msg.sender);
        currentMatch.juryVotes[msg.sender] = vote;

        emit JuryVoted(msg.sender, vote);

        // Automatically tally votes if we have at least 3 jurors
        if (currentMatch.juryPool.length >= 3) {
            _tallyJuryVotes();
        }
    }

    // Internal function to tally jury votes and resolve dispute
    function _tallyJuryVotes() private {
        uint256 player1Votes;
        uint256 player2Votes;

        for (uint i = 0; i < currentMatch.juryPool.length; i++) {
            if (currentMatch.juryVotes[currentMatch.juryPool[i]] == 1)
                player1Votes++;
            else if (currentMatch.juryVotes[currentMatch.juryPool[i]] == 2)
                player2Votes++;
        }

        // Determine winner based on votes
        address winner;
        if (player1Votes > player2Votes) {
            winner = currentMatch.player1;
        } else if (player2Votes > player1Votes) {
            winner = currentMatch.player2;
        } else {
            // In case of a tie, default to player1 (or implement another tiebreaker)
            winner = currentMatch.player1;
        }

        _resolveDispute(winner);
    }

    // Internal resolution functions
    function _resolveMatch(address winner) private {
        status = MatchStatus.Completed;

        currentMatch.winner = winner;

        // Update reputations
        address loser = winner == currentMatch.player1
            ? currentMatch.player2
            : currentMatch.player1;

        reputationRegistry.updateReputation(winner, REP_WIN, false);
        reputationRegistry.updateReputation(loser, REP_TRUTHFUL, false);

        // Report result to tournament if this is a tournament match
        if (isTournamentMatch) {
            // Call the tournament contract to report the match result
            // We use low-level call to handle potential errors

            console.log("Tournament details: id=", tournamentId);
            console.log("Reporting to tournament. ID:", tournamentId);

            TournamentContract tournament = TournamentContract(
                payable(address(tournamentContract))
            );

            // try
            tournament.reportMatchResult(
                tournamentId,
                roundNumber,
                matchIndex,
                winner
            );
        }
        // ITournament(address(tournamentContract)).reportMatchResult(
        //     tournamentId,
        //     roundNumber,
        //     matchIndex,
        //     winner
        // )
        // {
        //     console.log("Successfully reported match result to tournament");
        //     // Success - no action needed
        // } catch (bytes memory reason) {
        //     // Log but continue execution
        //     console.log(
        //         "Tournament report failed:",
        //         reason.length > 0 ? string(reason) : "No reason provided"
        //     );

        // (bool success, bytes memory returnData) = address(
        //     tournamentContract
        // ).call(
        //         abi.encodeWithSignature(
        //             "reportMatchResult(uint256,uint256,uint256,address)",
        //             tournamentId,
        //             roundNumber,
        //             matchIndex,
        //             winner
        //         )
        //     );
        // if (!success) {
        //     // This will give you the revert reason in the console if available
        //     console.log("Failed to report match to tournament");
        //     if (returnData.length > 0) {
        //         // Extract the revert reason
        //         assembly {
        //             let returndata_size := mload(returnData)
        //             revert(add(32, returnData), returndata_size)
        //         }
        //     }
        // }
        // // If reporting to tournament fails, we still want to pay the winner
        // if (!success) {
        //     console.log("Failed to report match to tournament");
        // }
        // }
        // } else {
        //     // Only pay winner directly for non-tournament matches
        //     payable(winner).transfer(currentMatch.entryFee * 2);
        // }

        // Payout
        emit MatchResolved(winner);
    }

    function _resolveDispute(address winner) private {
        status = MatchStatus.Completed;

        currentMatch.winner = winner;

        // Penalize liar
        address liar = winner == currentMatch.player1
            ? currentMatch.player2
            : currentMatch.player1;

        reputationRegistry.updateReputation(liar, REP_LIED, false);

        // Report result to tournament if this is a tournament match
        if (isTournamentMatch) {
            // Call the tournament contract to report the match result
            (bool success, ) = tournamentContract.call(
                abi.encodeWithSignature(
                    "reportMatchResult(uint256,uint256,uint256,address)",
                    tournamentId,
                    roundNumber,
                    matchIndex,
                    winner
                )
            );
            // If reporting to tournament fails, we still want to pay the winner
            if (!success) {
                console.log("Failed to report match to tournament");
            }
        } else {
            // Payout for winners in a direct match
            payable(winner).transfer(
                currentMatch.entryFee *
                    2 -
                    (JURY_REWARD * currentMatch.juryPool.length)
            );
        }

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

        emit MatchResolved(winner);
    }

    // In MatchContract.sol - modify the collectTournamentFunds function
    function collectTournamentFunds() external returns (uint256) {
        require(
            msg.sender == tournamentContract,
            "Only tournament can collect funds"
        );
        require(status == MatchStatus.Completed, "Match not completed");
        require(isTournamentMatch, "Not a tournament match");

        uint256 remainingFunds = address(this).balance;
        console.log("Remaining Funds: ", remainingFunds);

        console.log("Tournament contract: ", tournamentContract);

        if (remainingFunds > 0) {
            // Replace transfer with call which forwards all available gas
            (bool success, ) = payable(tournamentContract).call{
                value: remainingFunds
            }("");
            require(success, "Transfer failed");
        }

        console.log("Transferred to tournament contract");
        return remainingFunds;
    }
}
