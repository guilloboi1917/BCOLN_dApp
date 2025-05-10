import { ethers } from "ethers";
import TournamentContract from "@/contracts/TournamentContract.json";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const TOURNAMENT_CONTRACT_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"; 

export async function connectTournamentContract() {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return null;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  const contract = new ethers.Contract(
    TOURNAMENT_CONTRACT_ADDRESS,
    TournamentContract.abi,
    signer
  );

  return contract;
}
