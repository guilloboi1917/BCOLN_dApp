// scripts/test-tournament-jury-system.js
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
  console.log("Starting tournament jury system test...");

  // Get all signers for testing - we'll use more addresses for jurors
  const accounts = await ethers.getSigners();
  const [deployer, creator, player1, player2, player3, player4, 
        juror1, juror2, juror3, juror4, juror5, juror6] = accounts;
  
  console.log(`Deployer address: ${deployer.address}`);
  console.log(`Creator address: ${creator.address}`);
  console.log(`Player addresses: 
    Player1: ${player1.address}
    Player2: ${player2.address}
    Player3: ${player3.address}
    Player4: ${player4.address}
  `);
  console.log(`Juror addresses: 
    Juror1: ${juror1.address}
    Juror2: ${juror2.address}
    Juror3: ${juror3.address}
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
  const entryFee = ethers.parseEther("5"); // 5 ETH
  const maxParticipants = 4; // 4 players tournament
  const startTime = Math.floor(Date.now() / 1000) + 60; // Start in 60 seconds

  const createTx = await tournamentContract.connect(creator).createTournament(
    "Jury Test Championship",
    "A tournament to test the jury dispute resolution system",
    entryFee,
    maxParticipants,
    startTime
  );
  await createTx.wait();
  console.log("Tournament created with ID: 0");

  // 4. Register all 4 players
  console.log("\n4. Registering players for tournament...");
  
  const players = [player1, player2, player3, player4];
  for (let i = 0; i < players.length; i++) {
    console.log(`Registering player${i+1}...`);
    const regTx = await tournamentContract.connect(players[i]).registerForTournament(0, {
      value: entryFee
    });
    await regTx.wait();
  }
  
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
  
  await printPlayerBalances("Before Tournament", players);
  
  // 6. Advance time to start the tournament
  console.log("\n6. Advancing time to start the tournament...");
  await time.increaseTo(startTime + 1);
  
  // 7. Start the tournament
  console.log("\n7. Starting the tournament...");
  const startTx = await tournamentContract.connect(creator).startTournament(0);
  await startTx.wait();
  
  // Helper function for match commitment
  async function createCommitment(winnerString, salt) {
    return ethers.solidityPackedKeccak256(['string', 'bytes32'], ["I_report_truth", salt]);
  }
  
  // 8. First round - Match 1 (player1 vs player2) with DISPUTE
  console.log("\n8. Processing Match 1: player1 vs player2 (DISPUTE CASE)");
  
  // Get match address for round 1, match 0 (first match)
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
    
    // Get the reputation registry for stake amounts
    const reputationRegistry = await ethers.getContractAt("ReputationRegistry", await factory.reputationRegistry());
    const p1StakeMultiplier = await reputationRegistry.getStakeAmount(player1.address);
    const p2StakeMultiplier = await reputationRegistry.getStakeAmount(player2.address);
    
    console.log("Player1 stake multiplier:", ethers.formatEther(p1StakeMultiplier), "ether");
    console.log("Player2 stake multiplier:", ethers.formatEther(p2StakeMultiplier), "ether");
    
    // Generate unique salts
    const player1Salt = ethers.encodeBytes32String("player1salt"); 
    const player2Salt = ethers.encodeBytes32String("player2salt");
    
    // Create a dispute by having players commit disagreeing results
    console.log("Player1 committing and revealing result (claiming win)...");
    await match1.connect(player1).commitAndRevealResult(player1Salt, true, { 
      value: p1StakeMultiplier 
    });
    
    console.log("Player2 committing and revealing result (also claiming win - disagreement)...");
    await match1.connect(player2).commitAndRevealResult(player2Salt, true, { 
      value: p2StakeMultiplier 
    });
    
    // Check match status - should be in dispute
    const matchStatus = await match1.getMatchStatus();
    console.log("Match 1 status:", matchStatus);
    console.log("Status should be 3 (Dispute)");
    
    // Have jurors vote on the dispute - careful with the order of execution
    const juryStake = ethers.parseEther("0.1"); // 0.1 ETH jury stake
    
    console.log("\nJurors joining and voting on Match 1 dispute...");
    
    // Add jurors one at a time and wait for transactions to complete
    console.log("Juror1 joining and voting for player1...");
    const tx1 = await match1.connect(juror1).joinJuryAndVote(1, { value: juryStake });
    await tx1.wait();
    
    // Get match status after first juror
    const statusAfterJuror1 = await match1.getMatchStatus();
    console.log("Match status after juror1:", statusAfterJuror1);
    
    // Only continue adding jurors if the match is still in dispute
    if (statusAfterJuror1 == 3) { // 3 = Dispute status
      console.log("Juror2 joining and voting for player2...");
      const tx2 = await match1.connect(juror2).joinJuryAndVote(2, { value: juryStake });
      await tx2.wait();
      
      // Check again before adding the third juror
      const statusAfterJuror2 = await match1.getMatchStatus();
      console.log("Match status after juror2:", statusAfterJuror2);
      
      if (statusAfterJuror2 == 3) {
        console.log("Juror3 joining and voting for player1...");
        const tx3 = await match1.connect(juror3).joinJuryAndVote(1, { value: juryStake });
        await tx3.wait();
      } else {
        console.log("Match already resolved after juror2, not adding juror3");
      }
    } else {
      console.log("Match already resolved after juror1, not adding more jurors");
    }
    
    // Get jurors information
    try {
      const jurors = await match1.getJurors();
      console.log("Jurors who voted:", jurors);
      
      // Check if each account is a juror
      for (const jur of [juror1, juror2, juror3]) {
        try {
          const isJuror = await match1.isJuror(jur.address);
          console.log(`Is ${jur.address} a juror? ${isJuror}`);
        } catch (error) {
          console.log(`Error checking if ${jur.address} is a juror:`, error.message);
        }
      }
    } catch (error) {
      console.log("Error getting jurors:", error.message);
    }
    
    // Check match status after jury votes
    const afterJuryStatus = await match1.getMatchStatus();
    console.log("Match 1 status after jury votes:", afterJuryStatus);
    console.log("Status should be 4 (Completed)");
    
    // Check the winner determined by jury
    const matchWinner = await match1.getWinner();
    console.log("Match 1 winner decided by jury:", matchWinner);
    console.log("Expected winner: player1 (had 2 votes vs 1)");
  }
  
  // 9. Second match - player3 vs player4 (agreement case)
  console.log("\n9. Processing Match 2: player3 vs player4 (AGREEMENT CASE)");
  
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
    
    // Get stake amounts
    const reputationRegistry = await ethers.getContractAt("ReputationRegistry", await factory.reputationRegistry());
    const p3StakeMultiplier = await reputationRegistry.getStakeAmount(player3.address);
    const p4StakeMultiplier = await reputationRegistry.getStakeAmount(player4.address);
    
    // Generate unique salts
    const player3Salt = ethers.encodeBytes32String("player3salt"); 
    const player4Salt = ethers.encodeBytes32String("player4salt");
    
    // Agreement case: player3 wins and both agree
    console.log("Player3 committing and revealing result (claiming win)...");
    await match2.connect(player3).commitAndRevealResult(player3Salt, true, { 
      value: p3StakeMultiplier 
    });
    
    console.log("Player4 committing and revealing result (acknowledging loss)...");
    await match2.connect(player4).commitAndRevealResult(player4Salt, false, { 
      value: p4StakeMultiplier 
    });
    
    // Check match status - should be completed with player3 as winner
    const matchStatus = await match2.getMatchStatus();
    console.log("Match 2 status:", matchStatus);
    console.log("Status should be 4 (Completed)");
    
    const matchWinner = await match2.getWinner();
    console.log("Match 2 winner (by agreement):", matchWinner);
    console.log("Expected winner: player3");
  }
  
  // Check round 1 winners
  console.log("\n10. Checking round 1 winners...");
  const roundWinners = await tournamentContract.getRoundWinners(0, 1);
  console.log("Round 1 winners:", roundWinners);
  
  // 11. Process final round with dispute
  console.log("\n11. Advancing to and processing final round match...");
  
  // Get the final match address
  const finalFilter = tournamentContract.filters.MatchCreated(0, 2);
  const finalEvents = await tournamentContract.queryFilter(finalFilter);
  
  if (finalEvents.length > 0) {
    const finalMatchAddress = finalEvents[0].args[2];
    console.log("Final match address:", finalMatchAddress);
    
    // Connect to the match contract
    const MatchContract = await ethers.getContractFactory("MatchContract");
    const finalMatch = MatchContract.attach(finalMatchAddress);
    
    // Get the finalists from round 1 winners
    const finalist1Address = roundWinners[0];
    const finalist2Address = roundWinners[1];
    const finalist1 = accounts.find(acc => acc.address === finalist1Address);
    const finalist2 = accounts.find(acc => acc.address === finalist2Address);
    
    console.log(`Finalists: ${finalist1.address} vs ${finalist2.address}`);
    
    // Players join the final match
    console.log("Finalist 1 joining match...");
    await finalMatch.connect(finalist1).joinMatch({ value: entryFee });
    
    console.log("Finalist 2 joining match...");
    await finalMatch.connect(finalist2).joinMatch({ value: entryFee });
    
    // Get stake amounts
    const reputationRegistry = await ethers.getContractAt("ReputationRegistry", await factory.reputationRegistry());
    const f1StakeMultiplier = await reputationRegistry.getStakeAmount(finalist1.address);
    const f2StakeMultiplier = await reputationRegistry.getStakeAmount(finalist2.address);
    
    // Generate unique salts
    const finalist1Salt = ethers.encodeBytes32String("finalist1salt"); 
    const finalist2Salt = ethers.encodeBytes32String("finalist2salt");
    
    // Create another dispute in the final (both claim victory)
    console.log("Finalist 1 committing and revealing result (claiming win)...");
    await finalMatch.connect(finalist1).commitAndRevealResult(finalist1Salt, true, { 
      value: f1StakeMultiplier 
    });
    
    console.log("Finalist 2 committing and revealing result (also claiming win)...");
    await finalMatch.connect(finalist2).commitAndRevealResult(finalist2Salt, true, { 
      value: f2StakeMultiplier 
    });
    
    // Check match status - should be in dispute
    const matchStatus = await finalMatch.getMatchStatus();
    console.log("Final match status:", matchStatus);
    console.log("Status should be 3 (Dispute)");
    
    // Have different jurors vote on the final dispute - with improved error handling
    const juryStake = ethers.parseEther("0.1"); // 0.1 ETH jury stake
    
    console.log("\nJurors joining and voting on Final match dispute...");
    
    // Add jurors one at a time with proper error handling
    try {
      console.log("Juror4 joining and voting for finalist1...");
      const tx4 = await finalMatch.connect(juror4).joinJuryAndVote(1, { value: juryStake });
      await tx4.wait();
      
      const statusAfterJuror4 = await finalMatch.getMatchStatus();
      console.log("Final match status after juror4:", statusAfterJuror4);
      
      if (statusAfterJuror4 == 3) {
        console.log("Juror5 joining and voting for finalist2...");
        const tx5 = await finalMatch.connect(juror5).joinJuryAndVote(2, { value: juryStake });
        await tx5.wait();
        
        const statusAfterJuror5 = await finalMatch.getMatchStatus();
        console.log("Final match status after juror5:", statusAfterJuror5);
        
        // if (statusAfterJuror5 == 3) {
        //   console.log("Juror6 joining and voting for finalist2...");
        //   const tx6 = await finalMatch.connect(juror6).joinJuryAndVote(2, { value: juryStake });
        //   await tx6.wait();
        // }
      }
    } catch (error) {
      console.log("Error during final match jury voting:", error.message);
    }
    
    // Get jurors information for the final match
    try {
      const jurors = await finalMatch.getJurors();
      console.log("Final match jurors who voted:", jurors);
    } catch (error) {
      console.log("Error getting final match jurors:", error.message);
    }
    
    // Check match status after jury votes
    const afterJuryStatus = await finalMatch.getMatchStatus();
    console.log("Final match status after jury votes:", afterJuryStatus);
    console.log("Expected status: 4 (Completed)");
    
    // Check the winner determined by jury
    try {
      const matchWinner = await finalMatch.getWinner();
      console.log("Final match winner decided by jury:", matchWinner);
      console.log("Expected winner: finalist2 (had 2 votes vs 1)");
    } catch (error) {
      console.log("Error getting final match winner:", error.message);
    }
  }
  
  // Check tournament completion status
  console.log("\n12. Checking final tournament status...");
  
  const finalTournamentDetails = await tournamentContract.getTournamentDetails(0);
  console.log("Tournament Status:", ["Registration", "InProgress", "Completed", "Cancelled"][finalTournamentDetails[6]]);
  
  if (finalTournamentDetails[6] == 2) { // Completed
    console.log("\nTournament completed successfully!");
    const finalWinners = await tournamentContract.getRoundWinners(0, 2);
    console.log("Tournament winner:", finalWinners[0]);
    console.log("Total prize:", ethers.formatEther(finalTournamentDetails[9]), "ETH");
    await printPlayerBalances("After Tournament", players);
    
    // Print reputation changes
    console.log("\n13. Checking player reputation changes...");
    const reputationRegistry = await ethers.getContractAt("ReputationRegistry", await factory.reputationRegistry());
    
    for (let i = 0; i < players.length; i++) {
      const rep = await reputationRegistry.getReputation(players[i].address);
      console.log(`Player${i+1} reputation: ${rep}`);
    }
    
    // Print juror reputation changes
    console.log("\nJuror reputation changes:");
    for (let i = 1; i <= 6; i++) {
      const juror = accounts[i + 6]; // index 7-12 are jurors 1-6
      const rep = await reputationRegistry.getReputation(juror.address);
      console.log(`Juror${i} reputation: ${rep}`);
    }
  } else {
    console.log("\nTournament not yet completed. Current round:", finalTournamentDetails[7].toString());
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