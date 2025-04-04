"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { toast } from "sonner"

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

  // Mock connection to wallet
  const connect = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Mock successful connection
      const mockAddress = `0x${Math.random().toString(16).substring(2, 42)}`
      const mockBalance = (Math.random() * 10).toFixed(4)

      setAddress(mockAddress)
      setBalance(mockBalance)
      setConnected(true)

      toast.success("Wallet connected", {
        description: "Your wallet has been successfully connected"
      })
    } catch (error) {
      console.error("Error connecting wallet:", error)
      toast.error("Connection failed", {
        description: "Failed to connect wallet. Please try again."
      })
    }
  }

  const disconnect = () => {
    setAddress(null)
    setBalance("0")
    setConnected(false)

    toast.info("Wallet disconnected", {
      description: "Your wallet has been disconnected"
    })
  }

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

  // Mock signing a message
  const signMessage = async (message) => {
    if (!connected) throw new Error("Wallet not connected")

    // In the real app, this would use the wallet to sign the message
    console.log("Signing message:", message)

    // Mock signing
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Return a mock signature
    return `0x${Array(130)
      .fill(0)
      .map(() => Math.floor(Math.random() * 16).toString(16))
      .join("")}`
  }

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