"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "sonner"
import { ethers } from "ethers";

// Create a context for Web3 functionality
const Web3Context = createContext({
  connected: false,
  address: null,
  balance: "0",
  connect: async () => {},
  disconnect: () => {},
  joinTournament: async () => {},
  createTournament: async () => {},
  signMessage: async () => "",
})

export const useWeb3 = () => useContext(Web3Context)

export function Web3Provider({ children }) {
  const [connected, setConnected] = useState(false)
  const [address, setAddress] = useState(null)
  const [balance, setBalance] = useState("0")

  const connect = async () => {
    try {
      if (!window.ethereum) {
        toast.error("MetaMask not detected", {
          description: "Please install MetaMask to connect your wallet.",
        });
        return;
      }
  
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await ethProvider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      const balanceInWei = await ethProvider.getBalance(userAddress);
      const ethBalance = ethers.formatEther(balanceInWei);
  
      setAddress(userAddress);
      setBalance(parseFloat(ethBalance).toFixed(4));
      setConnected(true);
  
      toast.success("Wallet connected", {
        description: "Your wallet has been successfully connected",
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Connection failed", {
        description: "Failed to connect wallet. Please try again.",
      });
    }
  };

  const disconnect = () => {
    setAddress(null);
    setBalance("0");
    setConnected(false);
    toast.info("Wallet disconnected", {
      description: "Your wallet has been disconnected",
    });
  };

  // Mock joining a tournament
  const joinTournament = async (tournamentId, entryFee) => {
    if (!connected) throw new Error("Wallet not connected")

    // In the real app, this would call the smart contract to join the tournament
    console.log(`Joining tournament ${tournamentId} with entry fee ${entryFee}`)

    // Mock transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Update balance after paying entry fee
    const fee = Number.parseFloat(entryFee.replace(" ETH", ""))
    const newBalance = (Number.parseFloat(balance) - fee).toFixed(4)
    setBalance(newBalance)

    return
  }

  // Mock creating a tournament
  const createTournament = async (tournamentData) => {
    if (!connected) throw new Error("Wallet not connected")

    // In the real app, this would call the smart contract to create the tournament
    console.log("Creating tournament with data:", tournamentData)

    // Mock transaction
    await new Promise((resolve) => setTimeout(resolve, 2000))

    return
  }

  const signMessage = async (message) => {
    if (!connected) throw new Error("Wallet not connected");
  
    try {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethProvider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (err) {
      console.error("Sign error:", err);
      throw err;
    }
  };

  // Check if wallet was previously connected
  useEffect(() => {
    // In the real app, this would check localStorage or the wallet provider
    const checkConnection = async () => {
      const wasConnected = localStorage.getItem("walletConnected") === "true"

      if (wasConnected) {
        try {
          await connect()
        } catch (error) {
          console.error("Error reconnecting wallet:", error)
        }
      }
    }

    checkConnection()
  }, [])

  // Save connection state
  useEffect(() => {
    if (connected) {
      localStorage.setItem("walletConnected", "true")
    } else {
      localStorage.removeItem("walletConnected")
    }
  }, [connected])

  return (
    <Web3Context.Provider
      value={{
        connected,
        address,
        balance,
        connect,
        disconnect,
        joinTournament,
        createTournament,
        signMessage,
      }}
    >
      {children}
    </Web3Context.Provider>
  )
}

export { Web3Context }