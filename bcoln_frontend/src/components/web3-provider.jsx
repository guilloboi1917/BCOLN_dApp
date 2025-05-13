"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { ethers, parseEther, formatEther } from "ethers";
import { getContract } from "@/lib/contracts";
import { clearAllSubmissionsForAddress } from "@/lib/submissions";

import TournamentContractData from "../../lib/contracts/TournamentContract.json";
import MatchContractData from "../../lib/contracts/MatchContract.json";
import { add } from "date-fns";

// Create a context for Web3 functionality
const Web3Context = createContext({
  connected: false,
  connecting: false,
  address: null,
  balance: "0",
  provider: null,
  network: null,
  connect: async () => { },
  disconnect: () => { },
  joinTournament: async () => { },
  createTournament: async () => { },
  signMessage: async () => "",
  getMatchDetails: async (address) => { },
  joinJuryAndVote: async (address, vote) => { },
});

export const useWeb3 = () => useContext(Web3Context);

export function Web3Provider({ children }) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState("0");
  const [provider, setProvider] = useState(null);
  const [network, setNetwork] = useState(null);

  const EXPECTED_CHAIN_ID = 31337n;

  const connect = async () => {
    if (connecting) return;
    setConnecting(true);

    try {
      if (!window.ethereum) {
        toast.error("MetaMask not detected", {
          description: "Please install MetaMask to connect your wallet.",
        });
        return;
      }

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
            params: [{ chainId: "0x7A69" }], // 0x7A69 = 31337 in hex
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
      const ethBalance = formatEther(balanceInWei);

      console.log("ETH Balance:", ethBalance);
      console.log("Wei Balance:", balanceInWei.toString());

      setAddress(userAddress);
      setBalance(parseFloat(ethBalance).toFixed(4));
      setProvider(ethProvider);
      setNetwork(network);
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
    if (address) {
      clearAllSubmissionsForAddress(address);
    }
    setAddress(null);
    setBalance("0");
    setConnected(false);
    setConnecting(false);
    setProvider(null);
    setNetwork(null);
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
      value: parseEther(entryFeeEth.toString()),
    });

    await tx.wait();

    const newBalance = await signer.getBalance();
    setBalance(formatEther(newBalance));
  };

  // Mock creating a tournament
  const createTournament = async (tournamentData) => {
    if (!connected) throw new Error("Wallet not connected");

    const contract = await getContract(
      TournamentContractData.abi,
      TournamentContractData.address
    );

    try {
      // Call the smart contract to create a tournament
      console.log("Submitting tournament:", tournamentData);
      const tx = await contract.createTournament(
        tournamentData.title,
        tournamentData.description,
        parseEther(tournamentData.entryFee.toString()), // Convert to Wei
        // ethers.utils.parseEther(tournamentData.prize.toString()), // Convert to Wei
        tournamentData.maxParticipants,
        Math.floor(tournamentData.startDate.getTime() / 1000) // Convert to Unix timestamp
      );
      console.log("Transaction submitted:", tx.hash);

      // Wait for transaction to be mined
      await tx.wait();
      console.log("Transaction confirmed");

      toast.success("Tournament created successfully!", {
        description: "Your tournament has been created on the blockchain.",
      });

      const count = await contract.getAllTournaments();
      console.log("TOURNAMEN COUNT", count);
    } catch (error) {
      console.error("Error creating tournament:", error);
      toast.error("Failed to create tournament", {
        description:
          "There was an error creating your tournament. Please try again.",
      });
    }
  };

  const getTournamentInformation = async (id) => {
    if (!connected) throw new Error("Wallet not connected");

    try {
    } catch (error) { }
  };

  const getMatchDetails = async (address) => {
    if (!connected) throw new Error("Wallet not connected");

    try {
      console.log("Fetching match details");
      const matchContract = await getContract(MatchContractData.abi, address);

      const matchDetails = await matchContract.getMatchDetails();
      const matchLogs = await matchContract.getMatchLog();

      return {
        ...matchDetails,
        p1IPFSCID: matchLogs[0],
        p2IPFSCID: matchLogs[1],
      };
    } catch (error) {
      console.error(
        "Couldn't fetch match details for: ",
        address,
        "Reason: ",
        error
      );

      return null;
    }
  };

  const joinJuryAndVote = async (address, vote) => {
    if (!connected) throw new Error("Wallet not connected");

    const JURY_STAKE = "0.1";
    const JURY_STAKE_amountInWei = ethers.parseEther(JURY_STAKE);

    console.log(JURY_STAKE_amountInWei);

    try {
      const matchContract = await getContract(MatchContractData.abi, address);
      const voteTx = await matchContract.joinJuryAndVote(vote, {
        value: JURY_STAKE_amountInWei,
      });
    } catch (err) {
      console.warn("Sign error:", err);
      throw err;
    }
  };

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
        connecting,
        address,
        balance,
        provider,
        network,
        connect,
        disconnect,
        joinTournament,
        createTournament,
        signMessage,
        getMatchDetails,
        joinJuryAndVote,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export { Web3Context };
