// src/lib/connectMatchContract.ts
import { ethers } from "ethers";
import MatchContract from "@/contracts/MatchContract.json";

declare global {
    interface Window {
      ethereum?: any;
    }
  }  

const MATCH_CONTRACT_ADDRESS = "0xeEBe00Ac0756308ac4AaBfD76c05c4F3088B8883";

export async function connectMatchContract() {
  if (!window.ethereum) {
    alert("Please install MetaMask!");
    return null;
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();

  const contract = new ethers.Contract(
    MATCH_CONTRACT_ADDRESS,
    MatchContract.abi,
    signer
  );

  return contract;
}
