import { ethers } from "hardhat";
import { uploadDataToIPFS, getDataFromCID } from "../utils/ipfs.js";
import matchArtifact from "../artifacts/contracts/MatchContract.sol/MatchContract.json";

async function main() {
  const [deployer] = await ethers.getSigners();
  const matchAddress = "0x..."; // replace with actual match contract address
  const match = new ethers.Contract(matchAddress, matchArtifact.abi, deployer);

  const resultData = {
    matchIndex: 0,
    roundNumber: 1,
    tournamentId: 1,
    player1: "0x123...",
    player2: "0xabc...",
    winner: "0x123...",
    result: "player1_won",
    revealedAt: new Date().toISOString()
  };

  const cid = await uploadDataToIPFS(resultData);
  const tx = await match.finalizeMatchWithCID(resultData.winner, cid);
  await tx.wait();

  const storedCID = (await match.currentMatch()).resultCID;
  if (storedCID !== cid) throw new Error("CID mismatch");

  const dataFromIPFS = await getDataFromCID(storedCID);
  if (JSON.stringify(dataFromIPFS) !== JSON.stringify(resultData)) {
    throw new Error("IPFS content mismatch");
  }

  console.log("Test passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
