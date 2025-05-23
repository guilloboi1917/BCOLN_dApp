// scripts/test-tournament-system.js
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function printPlayerBalances(label, players) {
  console.log(`\n[${label}] Player Wallet Balances:`);
  for (const player of players) {
    const balance = await ethers.provider.getBalance(player.address);
    console.log(`${player.address}: ${ethers.formatEther(balance)} ETH`);
  }
}


async function main() {
  console.log("Starting tournament system test...");

  // Get all signers for testing
  const [deployer, creator, player1, player2, player3, player4, player5, player6, player7, player8] = await ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Creator address: ${creator.address}`);
  console.log(`Player addresses: 
    Player1: ${player1.address}
    Player2: ${player2.address}
    Player3: ${player3.address}
    Player4: ${player4.address}
  `);

  // 1. Deploy the Factory Contract
  console.log("\n1. Deploying MatchContractFactory...");
  const Factory = await ethers.getContractFactory("MatchContractFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`Factory deployed to: ${factoryAddress}`);

  // 2. Deploy the Tournament Contract
  console.log("\n2. Deploying TournamentContract...");
  const TournamentContract = await ethers.getContractFactory("TournamentContract");
  const tournamentContract = await TournamentContract.deploy(factoryAddress);
  await tournamentContract.waitForDeployment();
  const tournamentContractAddress = await tournamentContract.getAddress();
  console.log(`TournamentContract deployed to: ${tournamentContractAddress}`);

  // 3. Create a tournament
  console.log("\n3. Creating a test tournament with 4 players...");
  const entryFee = ethers.parseEther("5"); // 0.01 ETH
  const maxParticipants = 4; // 4 players tournament
  const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 60 seconds

  const createTx = await tournamentContract.connect(creator).createTournament(
    "Ethereum Championship",
    "A blockchain tournament for the best players",
    entryFee,
    maxParticipants,
    startTime
  );
  await createTx.wait();
  console.log("Tournament created with ID: 0");

  // 4. Register all 4 players
  console.log("\n4. Registering players for tournament...");
  
  console.log("Registering player1...");
  const reg1Tx = await tournamentContract.connect(player1).registerForTournament(0, {
    value: entryFee
  });
  await reg1Tx.wait();
  
  console.log("Registering player2...");
  const reg2Tx = await tournamentContract.connect(player2).registerForTournament(0, {
    value: entryFee
  });
  await reg2Tx.wait();
  
  console.log("Registering player3...");
  const reg3Tx = await tournamentContract.connect(player3).registerForTournament(0, {
    value: entryFee
  });
  await reg3Tx.wait();
  
  console.log("Registering player4...");
  const reg4Tx = await tournamentContract.connect(player4).registerForTournament(0, {
    value: entryFee
  });
  await reg4Tx.wait();
  
  console.log("All players registered!");

  // Get tournament details
  const tournamentDetails = await tournamentContract.getTournamentDetails(0);
  console.log("\n5. Tournament Details:");
  console.log("- Name:", tournamentDetails[0]);
  console.log("- Description:", tournamentDetails[1]);
  console.log("- Entry Fee:", ethers.formatEther(tournamentDetails[2]), "ETH");
  console.log("- Max Participants:", tournamentDetails[3].toString());
  console.log("- Registered Participants:", tournamentDetails[4].toString());
  console.log("- Start Time:", new Date(Number(tournamentDetails[5]) * 1000).toLocaleString());
  console.log("- Status:", ["Registration", "InProgress", "Completed", "Cancelled"][tournamentDetails[6]]);
  console.log("- Current Round:", tournamentDetails[7].toString());
  console.log("- Total Rounds:", tournamentDetails[8].toString());
  
  // Get participants
  const participants = await tournamentContract.getTournamentParticipants(0);
  console.log("\n6. Participants:", participants);

  await printPlayerBalances("Before Tournament", [player1, player2, player3, player4]);
  
  // 7. Advance time to start the tournament
  console.log("\n7. Advancing time to start the tournament...");
  await time.increaseTo(startTime + 1);
  
  // 8. Start the tournament
  console.log("\n8. Starting the tournament...");
  const startTx = await tournamentContract.connect(creator).startTournament(0);
  await startTx.wait();
  
  // Get updated tournament details
  const updatedDetails = await tournamentContract.getTournamentDetails(0);
  console.log("\n9. Updated Tournament Status:", ["Registration", "InProgress", "Completed", "Cancelled"][updatedDetails[6]]);
  console.log("Current Round:", updatedDetails[7].toString());
  
  // 10. Simulate the first round matches
  console.log("\n10. Simulating first round matches...");
  
  // Helper function for match commitment
  async function createCommitment(winnerString, salt) {
    // "I_report_truth" + salt -> hash
    return ethers.solidityPackedKeccak256(['string', 'bytes32'], ["I_report_truth", salt]);
  }
  
  // First round - Match 1 (player1 vs player2)
  console.log("\n10.1. Processing Match 1: player1 vs player2");
  
  // Get match address for round 1, match 0 (first match)
  const matchId1 = (1 * 1000) + 0; // Round 1, Match 0
  const roundWinners1 = await tournamentContract.getRoundWinners(0, 1);
  console.log("Round 1 winners so far:", roundWinners1);
  
  // Get the match contract addresses from events
  const filter = tournamentContract.filters.MatchCreated(0, 1);
  const events = await tournamentContract.queryFilter(filter);
  
  if (events.length > 0) {
    const matchAddress1 = events[0].args[2];
    console.log("Match 1 address:", matchAddress1);
    
    // Connect to the match contract
    const MatchContract = await ethers.getContractFactory("MatchContract");
    const match1 = MatchContract.attach(matchAddress1);
    
    // Players join the match
    console.log("Player1 joining match...");
    await match1.connect(player1).joinMatch({ value: entryFee });
    
    console.log("Player2 joining match...");
    await match1.connect(player2).joinMatch({ value: entryFee });
    
    // Generate unique salts
    const player1Salt = ethers.encodeBytes32String("player1salt"); 
    const player2Salt = ethers.encodeBytes32String("player2salt");
    
    // Player1 will win - create commitments
    const player1Commitment = await createCommitment("I_report_truth", player1Salt);
    const player2Commitment = await createCommitment("I_report_truth", player2Salt);
    
    // Stake amount based on reputation
    const reputationRegistry = await ethers.getContractAt("ReputationRegistry", await factory.reputationRegistry());
      
    const p1StakeMultiplier = await reputationRegistry.getStakeAmount(player1.address);
    const p2StakeMultiplier = await reputationRegistry.getStakeAmount(player2.address);

    console.log("Player1 stake multiplier:", ethers.formatEther(p1StakeMultiplier), "ether");
    console.log("Player2 stake multiplier:", ethers.formatEther(p2StakeMultiplier), "ether");
    
    // Players commit their results with proper stake
    console.log("Player1 committing result with stake:", ethers.formatEther(p1StakeMultiplier), "ether");
    await match1.connect(player1).commitResult(player1Commitment, { 
      value: p1StakeMultiplier
    });
         
    console.log("Player2 committing result with stake:", ethers.formatEther(p2StakeMultiplier), "ether");
    await match1.connect(player2).commitResult(player2Commitment, { 
      value: p2StakeMultiplier
    });

    console.log("Player1 address", player1.address);
    console.log("Player2 address", player2.address);
    
    // Players reveal their results (player1 wins)
    console.log("Player1 revealing result (claiming win)...");
    await match1.connect(player1).revealResult(player1Salt, true); // true = I won
    
    console.log("Player2 revealing result (acknowledging loss)...");
    await match1.connect(player2).revealResult(player2Salt, false); // false = I lost (player1 won)
    
    console.log("Match 1 completed!");
  } else {
    console.log("Error: Match 1 not found");
  }
  
  // Second match - player3 vs player4
  console.log("\n10.2. Processing Match 2: player3 vs player4");
  
  // Get the match contract addresses from events
  const filter2 = tournamentContract.filters.MatchCreated(0, 1);
  const events2 = await tournamentContract.queryFilter(filter2);
  
  if (events2.length > 1) {
    const matchAddress2 = events2[1].args[2];
    console.log("Match 2 address:", matchAddress2);
    
    // Connect to the match contract
    const MatchContract = await ethers.getContractFactory("MatchContract");
    const match2 = MatchContract.attach(matchAddress2);
    
    // Players join the match
    console.log("Player3 joining match...");
    await match2.connect(player3).joinMatch({ value: entryFee });
    
    console.log("Player4 joining match...");
    await match2.connect(player4).joinMatch({ value: entryFee });
    
    // Generate unique salts
    const player3Salt = ethers.encodeBytes32String("player3salt"); 
    const player4Salt = ethers.encodeBytes32String("player4salt");
    
    // Player3 will win - create commitments
    const player3Commitment = await createCommitment("I_report_truth", player3Salt);
    const player4Commitment = await createCommitment("I_report_truth", player4Salt);
    
    // Stake amount based on reputation
    const reputationRegistry = await ethers.getContractAt("ReputationRegistry", await factory.reputationRegistry());
    const p3StakeMultiplier = await reputationRegistry.getStakeAmount(player3.address);
    const p4StakeMultiplier = await reputationRegistry.getStakeAmount(player4.address);
    
    // Players commit their results
    console.log("Player3 committing result...");
    await match2.connect(player3).commitResult(player3Commitment, { value: p3StakeMultiplier });
    
    console.log("Player4 committing result...");
    await match2.connect(player4).commitResult(player4Commitment, { value: p4StakeMultiplier });
    
    // Players reveal their results (player3 wins)
    console.log("Player3 revealing result (claiming win)...");
    await match2.connect(player3).revealResult(player3Salt, true); // true = I won
    
    console.log("Player4 revealing result (acknowledging loss)...");
    await match2.connect(player4).revealResult(player4Salt, false); // false = I lost (player3 won)
    
    console.log("Match 2 completed!");
  } else {
    console.log("Error: Match 2 not found");
  }
  
  // Check the winners of round 1
  console.log("\n11. Round 1 completed. Checking winners...");
  await new Promise(resolve => setTimeout(resolve, 2000)); // Give time for transactions to be mined
  
  const roundWinners = await tournamentContract.getRoundWinners(0, 1);
  console.log("Round 1 winners:", roundWinners);
  
  // Check tournament status after round 1
  const afterRound1Details = await tournamentContract.getTournamentDetails(0);
  console.log("\n12. Tournament Status after Round 1:");
  console.log("- Status:", ["Registration", "InProgress", "Completed", "Cancelled"][afterRound1Details[6]]);
  console.log("- Current Round:", afterRound1Details[7].toString());
  
  // 13. Simulate the final round match (player1 vs player3)
  if (afterRound1Details[7].toString() === "2") {
    console.log("\n13. Processing Final Round: player1 vs player3");
    
    // Get the match address for the final round
    const finalFilter = tournamentContract.filters.MatchCreated(0, 2);
    const finalEvents = await tournamentContract.queryFilter(finalFilter);
    
    if (finalEvents.length > 0) {
      const finalMatchAddress = finalEvents[0].args[2];
      console.log("Final match address:", finalMatchAddress);
      
      // Connect to the match contract
      const MatchContract = await ethers.getContractFactory("MatchContract");
      const finalMatch = MatchContract.attach(finalMatchAddress);
      
      // Get the players from round 1 winners
      const finalist1 = roundWinners[0];
      const finalist2 = roundWinners[1];
      console.log(`Finalists: ${finalist1} vs ${finalist2}`);
      
      // Players join the final match
      console.log("Finalist 1 joining match...");
      await finalMatch.connect(await ethers.getSigner(finalist1)).joinMatch({ value: entryFee });
      
      console.log("Finalist 2 joining match...");
      await finalMatch.connect(await ethers.getSigner(finalist2)).joinMatch({ value: entryFee });
      
      // Generate unique salts
      const finalist1Salt = ethers.encodeBytes32String("finalist1salt"); 
      const finalist2Salt = ethers.encodeBytes32String("finalist2salt");
      
      // Finalist 1 will win - create commitments
      const finalist1Commitment = await createCommitment("I_report_truth", finalist1Salt);
      const finalist2Commitment = await createCommitment("I_report_truth", finalist2Salt);
      
      // Stake amount based on reputation
      const reputationRegistry = await ethers.getContractAt("ReputationRegistry", await factory.reputationRegistry());
      const f1StakeMultiplier = await reputationRegistry.getStakeAmount(finalist1);
      const f2StakeMultiplier = await reputationRegistry.getStakeAmount(finalist2);
      
      // Finalists commit their results
      console.log("Finalist 1 committing result...");
      await finalMatch.connect(await ethers.getSigner(finalist1)).commitResult(finalist1Commitment, { value: f1StakeMultiplier });
      
      console.log("Finalist 2 committing result...");
      await finalMatch.connect(await ethers.getSigner(finalist2)).commitResult(finalist2Commitment, { value: f2StakeMultiplier });
      
      // Finalists reveal their results (finalist1 wins)
      console.log("Finalist 1 revealing result (claiming win)...");
      await finalMatch.connect(await ethers.getSigner(finalist1)).revealResult(finalist1Salt, true); // true = I won
      
      console.log("Finalist 2 revealing result (acknowledging loss)...");
      await finalMatch.connect(await ethers.getSigner(finalist2)).revealResult(finalist2Salt, false); // false = I lost
      
      console.log("Final match completed!");
    } else {
      console.log("Error: Final match not found");
    }
  }
  
  // Check tournament completion status
  console.log("\n14. Checking final tournament status...");
  await new Promise(resolve => setTimeout(resolve, 2000)); // Give time for transactions to be mined
  
  const finalTournamentDetails = await tournamentContract.getTournamentDetails(0);
  console.log("Tournament Status:", ["Registration", "InProgress", "Completed", "Cancelled"][finalTournamentDetails[6]]);
  
  if (finalTournamentDetails[6] == 2) { // Completed
    console.log("\nTournament completed successfully!");
    const finalWinners = await tournamentContract.getRoundWinners(0, 2);
    console.log("Tournament winner:", finalWinners[0]);
    console.log("Total prize:", ethers.formatEther(finalTournamentDetails[9]), "ETH");
    await printPlayerBalances("After Tournament", [player1, player2, player3, player4]);
  } else {
    console.log("\nTournament not yet completed. Current round:", finalTournamentDetails[7].toString());
    // Let's check what happened to our round winners
    console.log("Round 1 winners:", await tournamentContract.getRoundWinners(0, 1));
    console.log("Round 2 winners:", await tournamentContract.getRoundWinners(0, 2));
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });