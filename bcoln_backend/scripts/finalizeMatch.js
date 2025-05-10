import { ethers } from "hardhat";
import { uploadDataToIPFS } from "../utils/ipfs.js";
import matchArtifact from "../artifacts/contracts/MatchContract.sol/MatchContract.json";

async function main() {
  const [deployer] = await ethers.getSigners();

  const matchAddress = "0x..."; // ← replace with actual deployed match address
  const match = new ethers.Contract(matchAddress, matchArtifact.abi, deployer);

  const resultData = {
    matchIndex: 0,
    tournamentId: 1,
    roundNumber: 1,
    player1: "0x...", // replace
    player2: "0x...", // replace
    winner: "0x...",  // replace
    result: "player1_won",
    revealedAt: new Date().toISOString()
  };

  // Upload to IPFS
  const cid = await uploadDataToIPFS(resultData);
  console.log("Uploaded to IPFS. CID:", cid);

  // Finalize match with CID
  const tx = await match.finalizeMatchWithCID(resultData.winner, cid);
  await tx.wait();
  console.log("Match finalized with CID on-chain");
}

main().catch((err) => {
  console.error("Error finalizing match:", err);
  process.exit(1);
});
