import { ethers } from "ethers";

export async function getContract(abi, address) {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  return new ethers.Contract(address, abi, signer);
}

export async function getReadOnlyContract(abi, address) {
  if (!window.ethereum) {
    throw new Error("MetaMask not detected");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  return new ethers.Contract(address, abi, provider);
}
