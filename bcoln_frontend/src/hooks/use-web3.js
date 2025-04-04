"use client"

import { useContext } from "react"
import { Web3Context } from "@/components/web3-provider"

export const useWeb3 = () => useContext(Web3Context)

