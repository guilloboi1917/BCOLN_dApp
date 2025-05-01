// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MatchContractFactory.sol";
import "./ReputationRegistry.sol";
import "./MatchContract.sol";
import "hardhat/console.sol";

contract TournamentContract {
    // Tournament states
    enum TournamentStatus {
        Registration,    // Players can register
        InProgress,      // Matches are being played
        Completed,       // Tournament finished
        Cancelled        // Tournament was cancelled
    }

    // Tournament structure
    struct Tournament {
        string name;
        string description;
        uint256 entryFee;
        uint256 maxParticipants;
        uint256 registeredParticipants;
        uint256 startTime;
        address[] participants;
        mapping(uint256 => address) matchContracts; // roundNumber => matchContract
        mapping(uint256 => bool) roundCompleted;    // roundNumber => isCompleted
        mapping(uint256 => address[]) roundWinners; // roundNumber => winners
        mapping(uint256 => uint256) matchCount;     // roundNumber => matchCount
        mapping(uint256 => uint256) completedMatches; // roundNumber => completedMatchCount
        uint256 currentRound;
        uint256 totalRounds;
        address winner;
        TournamentStatus status;
        uint256 totalPrize;
    }

    // Storage
    mapping(uint256 => Tournament) public tournaments;
    uint256 public tournamentCount;
    
    // Factory reference for creating matches
    MatchContractFactory public factory;
    ReputationRegistry public reputationRegistry;
    
    // Events
    event TournamentCreated(uint256 indexed tournamentId, string name, uint256 entryFee, uint256 maxParticipants);
    event PlayerRegistered(uint256 indexed tournamentId, address player);
    event RegistrationClosed(uint256 indexed tournamentId);
    event RoundStarted(uint256 indexed tournamentId, uint256 roundNumber);
    event RoundCompleted(uint256 indexed tournamentId, uint256 roundNumber);
    event TournamentCompleted(uint256 indexed tournamentId, address winner, uint256 prize);
    event TournamentCancelled(uint256 indexed tournamentId);
    event MatchCreated(uint256 indexed tournamentId, uint256 indexed roundNumber, address matchAddress);
    event MatchFundsCollected(uint256 indexed tournamentId, uint256 roundNumber, uint256 matchIndex, uint256 amount);
    
    constructor(address _factoryAddress) {
        factory = MatchContractFactory(_factoryAddress);
        // Get reference to the reputation registry from the factory
        reputationRegistry = factory.reputationRegistry();
    }
    
    /**
     * @dev Create a new tournament
     * @param _name Name of the tournament
     * @param _description Description of the tournament
     * @param _entryFee Fee to enter the tournament
     * @param _maxParticipants Maximum number of participants (must be a power of 2)
     * @param _startTime When the tournament will start
     */
    function createTournament(
        string memory _name,
        string memory _description,
        uint256 _entryFee,
        uint256 _maxParticipants,
        uint256 _startTime
    ) external {
         // Verify maxParticipants is either 4, 8, or 16
        require(
            _maxParticipants == 4 || _maxParticipants == 8 || _maxParticipants == 16,
            "Participant count must be 4, 8, or 16"
        );
        require(_startTime > block.timestamp, "Start time must be in the future");
        
        uint256 tournamentId = tournamentCount;
        Tournament storage newTournament = tournaments[tournamentId];
        
        newTournament.name = _name;
        newTournament.description = _description;
        newTournament.entryFee = _entryFee;
        newTournament.maxParticipants = _maxParticipants;
        newTournament.startTime = _startTime;
        newTournament.status = TournamentStatus.Registration;
        
         // Calculate total rounds needed based on participant count
        if (_maxParticipants == 4) {
            newTournament.totalRounds = 2;
        } else if (_maxParticipants == 8) {
            newTournament.totalRounds = 3;
        } else { // 16 participants
            newTournament.totalRounds = 4;
        }
        
        tournamentCount++;
        
        emit TournamentCreated(tournamentId, _name, _entryFee, _maxParticipants);
    }
    
    /**
     * @dev Register as a participant in a tournament
     * @param _tournamentId ID of the tournament
     */
    function registerForTournament(uint256 _tournamentId) external payable {
        Tournament storage tournament = tournaments[_tournamentId];
        
        require(tournament.status == TournamentStatus.Registration, "Registration is not open");
        require(block.timestamp < tournament.startTime, "Registration period ended");
        require(tournament.registeredParticipants < tournament.maxParticipants, "Tournament is full");
        require(msg.value == tournament.entryFee, "Incorrect entry fee");
        
        // Check if player is banned
        require(!reputationRegistry.isBanned(msg.sender), "Banned players cannot participate");
        
        // Check if player is already registered
        for (uint256 i = 0; i < tournament.participants.length; i++) {
            require(tournament.participants[i] != msg.sender, "Already registered");
        }
        
        // Register player
        tournament.participants.push(msg.sender);
        tournament.registeredParticipants++;
        tournament.totalPrize += msg.value;
        
        emit PlayerRegistered(_tournamentId, msg.sender);
        
        // If tournament is full, close registration
        if (tournament.registeredParticipants == tournament.maxParticipants) {
            emit RegistrationClosed(_tournamentId);
        }
    }
    
    /**
     * @dev Start the tournament if registration period is over
     * @param _tournamentId ID of the tournament
     */
    function startTournament(uint256 _tournamentId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        
        require(tournament.status == TournamentStatus.Registration, "Cannot start tournament");
        require(block.timestamp >= tournament.startTime, "Tournament start time not reached");
        // Ensure we have exactly the required number of participants
        require(
            tournament.registeredParticipants == tournament.maxParticipants,
            "Must have exactly the required number of participants"
        );
        
        
        tournament.status = TournamentStatus.InProgress;
        tournament.currentRound = 1;
        
        // Start first round
        _startRound(_tournamentId, 1);
    }
    
    /**
     * @dev Internal function to start a tournament round
     * @param _tournamentId ID of the tournament
     * @param _roundNumber Round number to start
     */
    function _startRound(uint256 _tournamentId, uint256 _roundNumber) internal {
        Tournament storage tournament = tournaments[_tournamentId];
        
        emit RoundStarted(_tournamentId, _roundNumber);
        
        // For first round, use registered participants
        if (_roundNumber == 1) {
            _createMatchesForRound(_tournamentId, tournament.participants);
        } else {
            // For subsequent rounds, use winners from previous round
            _createMatchesForRound(_tournamentId, tournament.roundWinners[_roundNumber - 1]);
        }
    }
    
    /**
     * @dev Create matches for a round
     * @param _tournamentId ID of the tournament
     * @param _players Array of players for the round
     */
    function _createMatchesForRound(uint256 _tournamentId, address[] memory _players) internal {
        Tournament storage tournament = tournaments[_tournamentId];
        
        // Calculate how many matches we need
        uint256 matchCount = _players.length / 2;

        // Store the match count for this round
        tournament.matchCount[tournament.currentRound] = matchCount;
        tournament.completedMatches[tournament.currentRound] = 0;
        
        for (uint256 i = 0; i < matchCount; i++) {
            address player1 = _players[i * 2];
            address player2 = _players[(i * 2) + 1];
            
             // Create a tournament match for these two players
            address matchAddress = factory.createTournamentMatch(
                player1, 
                player2, 
                tournament.entryFee,
                address(this),    // tournamentContract
                _tournamentId,    // tournamentId
                tournament.currentRound, // roundNumber
                i                 // matchIndex
            );
            
            // Store the match contract address
            // We calculate a unique match ID based on round and match index
            uint256 matchId = (tournament.currentRound * 1000) + i;
            tournament.matchContracts[matchId] = matchAddress;
            
            emit MatchCreated(_tournamentId, tournament.currentRound, matchAddress);
        }
    }
    
    /**
     * @dev Report a completed match from an external match contract
     * @param _tournamentId ID of the tournament
     * @param _roundNumber Round number of the match
     * @param _matchIndex Index of the match in the round
     * @param _winner Address of the match winner
     */
    function reportMatchResult(
        uint256 _tournamentId,
        uint256 _roundNumber,
        uint256 _matchIndex,
        address _winner
    ) external {
        console.log("Report match result called");
        console.log("Winner:", _winner);
        Tournament storage tournament = tournaments[_tournamentId];
        
        // Calculate match ID
        uint256 matchId = (_roundNumber * 1000) + _matchIndex;
        
        // Verify the caller is the match contract
        require(msg.sender == tournament.matchContracts[matchId], "Only match contract can report");
        
        // Add winner to the list for next round
        tournament.roundWinners[_roundNumber].push(_winner);
        
        console.log("Added winner to round winners:", tournament.roundWinners[_roundNumber].length);

        tournament.completedMatches[_roundNumber]++;

        // Collect funds from the match contract
        address matchAddress = tournament.matchContracts[matchId];
        console.log("Match Address:", matchAddress);
        
        // Try to collect funds but don't revert if it fails
        try MatchContract(matchAddress).collectTournamentFunds() returns (uint256 collectedFunds) {
            console.log("Collected funds:", collectedFunds);
            emit MatchFundsCollected(_tournamentId, _roundNumber, _matchIndex, collectedFunds);
        } catch (bytes memory reason) {
            // Convert reason to a string for debugging
            
            console.log("Failed to collect funds");
        }
        
        console.log("Completed matches:", tournament.completedMatches[_roundNumber]);
        console.log("Required matches:", tournament.matchCount[_roundNumber]);
        
        // Check if round is complete
        if (tournament.completedMatches[_roundNumber] == tournament.matchCount[_roundNumber]) {
            tournament.roundCompleted[_roundNumber] = true;
            emit RoundCompleted(_tournamentId, _roundNumber);
            
            // If this was the final round, complete the tournament
            if (_roundNumber == tournament.totalRounds) {
                _completeTournament(_tournamentId);
            } else {
                // Otherwise start the next round
                tournament.currentRound++;
                _startRound(_tournamentId, tournament.currentRound);
            }
        }
    }
    
    /**
     * @dev Complete a tournament and distribute prizes
     * @param _tournamentId ID of the tournament
     */
    function _completeTournament(uint256 _tournamentId) internal {
        Tournament storage tournament = tournaments[_tournamentId];
        
        // The winner is the single winner of the final round
        address winner = tournament.roundWinners[tournament.totalRounds][0];
        tournament.winner = winner;
        tournament.status = TournamentStatus.Completed;
        
       // Distribute prize - now includes all collected match funds
        uint256 totalPrize = address(this).balance;
        payable(winner).transfer(totalPrize);
        
        // Update winner's reputation
        // We award more reputation for winning larger tournaments
        int256 repGain = int256(10 + (tournament.registeredParticipants / 2));
        reputationRegistry.updateReputation(winner, repGain, false);
        
        emit TournamentCompleted(_tournamentId, winner, tournament.totalPrize);
    }
    
    /**
     * @dev Cancel a tournament (only possible in registration phase)
     * @param _tournamentId ID of the tournament
     */
    function cancelTournament(uint256 _tournamentId) external {
        Tournament storage tournament = tournaments[_tournamentId];
        
        // Only allow cancellation during registration
        require(tournament.status == TournamentStatus.Registration, "Cannot cancel active tournament");
        
        tournament.status = TournamentStatus.Cancelled;
        
        // Refund all registered participants
        for (uint256 i = 0; i < tournament.participants.length; i++) {
            payable(tournament.participants[i]).transfer(tournament.entryFee);
        }
        
        emit TournamentCancelled(_tournamentId);
    }
    
    /**
     * @dev Get tournament details
     * @param _tournamentId ID of the tournament
     * @return name Tournament name
     * @return description Tournament description
     * @return entryFee Entry fee
     * @return maxParticipants Maximum participants
     * @return registeredParticipants Number of registered participants
     * @return startTime Tournament start time
     * @return status Tournament status
     * @return currentRound Current tournament round
     * @return totalRounds Total tournament rounds
     * @return totalPrize Total prize pool
     */
    function getTournamentDetails(uint256 _tournamentId) external view returns (
        string memory name,
        string memory description,
        uint256 entryFee,
        uint256 maxParticipants,
        uint256 registeredParticipants,
        uint256 startTime,
        TournamentStatus status,
        uint256 currentRound,
        uint256 totalRounds,
        uint256 totalPrize
    ) {
        Tournament storage tournament = tournaments[_tournamentId];
        
        return (
            tournament.name,
            tournament.description,
            tournament.entryFee,
            tournament.maxParticipants,
            tournament.registeredParticipants,
            tournament.startTime,
            tournament.status,
            tournament.currentRound,
            tournament.totalRounds,
            tournament.totalPrize
        );
    }
    
    /**
     * @dev Get list of participants for a tournament
     * @param _tournamentId ID of the tournament
     * @return Array of participant addresses
     */
    function getTournamentParticipants(uint256 _tournamentId) external view returns (address[] memory) {
        return tournaments[_tournamentId].participants;
    }
    
    /**
     * @dev Get list of winners for a specific round
     * @param _tournamentId ID of the tournament
     * @param _roundNumber Round number
     * @return Array of winner addresses
     */
    function getRoundWinners(uint256 _tournamentId, uint256 _roundNumber) external view returns (address[] memory) {
        return tournaments[_tournamentId].roundWinners[_roundNumber];
    }
    receive() external payable {
    // Optional: you can emit an event here for debugging/logging
}
}