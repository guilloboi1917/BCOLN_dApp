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

  const EXPECTED_CHAIN_ID = 1234n;

  const connect = async () => {
    try {
      if (!window.ethereum) {
        toast.error("MetaMask not detected", {
          description: "Please install MetaMask to connect your wallet.",
        });
        return;
      }

      // Force MetaMask to re-prompt permissions/account selection
      // await window.ethereum.request({
      //   method: "wallet_requestPermissions",
      //   params: [{ eth_accounts: {} }],
      // });
        
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await ethProvider.getNetwork();
      console.log("Connected to network:", network);

      // Wrong chain
      if (network.chainId !== EXPECTED_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x4D2" }], // 0x4D2 = 1234 in hex
          });

          return connect();
        } catch (switchErr) {
          toast.error("Wrong network", {
            description: "Please switch to the Hardhat network in MetaMask.",
          });
          return;
        }
      }

      const accounts = await ethProvider.send("eth_requestAccounts", []);
      const userAddress = accounts[0];
      const balanceInWei = await ethProvider.getBalance(userAddress);
      const ethBalance = ethers.formatEther(balanceInWei);
      console.log("ETH Balance:", ethBalance);
      console.log("Wei Balance:", balanceInWei.toString());
  
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
    localStorage.removeItem("walletConnected");

    toast.info("Wallet disconnected", {
      description: "Your wallet has been disconnected",
    });
  };

  // Mock joining a tournament
  const joinTournament = async (tournamentId, entryFee) => {
    if (!connected || !signer) throw new Error("Wallet not connected");

    const contract = new ethers.Contract(
      TOURNAMENT_CONTRACT_ADDRESS,
      TOURNAMENT_ABI,
      signer
    );

    const tx = await contract.joinTournament(tournamentId, {
      value: ethers.parseEther(entryFeeEth.toString()),
    });

    await tx.wait();

    const newBalance = await signer.getBalance();
    setBalance(ethers.formatEther(newBalance));
  }

  // Mock creating a tournament
  const createTournament = async (tournamentData) => {
    if (!connected) throw new Error("Wallet not connected")

      const contractAddress = "YOUR_CONTRACT_ADDRESS"; // Replace with your contract address
      const contractABI = [
        // Replace with your actual contract ABI
        {
          "inputs": [
            { "internalType": "string", "name": "title", "type": "string" },
            { "internalType": "string", "name": "description", "type": "string" },
            { "internalType": "uint256", "name": "entryFee", "type": "uint256" },
            { "internalType": "uint256", "name": "prize", "type": "uint256" },
            { "internalType": "uint256", "name": "maxParticipants", "type": "uint256" },
            { "internalType": "uint256", "name": "startDate", "type": "uint256" },
          ],
          "name": "createTournament",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function",
        },
      ];
    
      // Create contract instance
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethProvider.getSigner();
      const contract = new ethers.Contract(contractAddress, contractABI, signer);
    
      try {
        // Call the smart contract to create a tournament
        const tx = await contract.createTournament(
          tournamentData.title,
          tournamentData.description,
          ethers.utils.parseEther(tournamentData.entryFee.toString()), // Convert to Wei
          ethers.utils.parseEther(tournamentData.prize.toString()), // Convert to Wei
          tournamentData.maxParticipants,
          Math.floor(tournamentData.startDate.getTime() / 1000) // Convert to Unix timestamp
        );
    
        // Wait for transaction to be mined
        await tx.wait();
    
        toast.success("Tournament created successfully!", {
          description: "Your tournament has been created on the blockchain.",
        });
      } catch (error) {
        console.error("Error creating tournament:", error);
        toast.error("Failed to create tournament", {
          description: "There was an error creating your tournament. Please try again.",
        });
      }
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

  useEffect(() => {
    const wasConnected = localStorage.getItem("walletConnected") === "true";
  
    if (wasConnected) {
      setConnected(true);
    }
  }, []);

  // // Check if wallet was previously connected
  // useEffect(() => {
  //   // In the real app, this would check localStorage or the wallet provider
  //   const checkConnection = async () => {
  //     const wasConnected = localStorage.getItem("walletConnected") === "true"

  //     if (wasConnected) {
  //       try {
  //         await connect()
  //       } catch (error) {
  //         console.error("Error reconnecting wallet:", error)
  //       }
  //     }
  //   }

  //   checkConnection()
  // }, [])

  // // Save connection state
  // useEffect(() => {
  //   if (connected) {
  //     localStorage.setItem("walletConnected", "true")
  //   } else {
  //     localStorage.removeItem("walletConnected")
  //   }
  // }, [connected])

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