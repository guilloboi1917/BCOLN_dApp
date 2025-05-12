"use client"

import Link from "next/link";
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentCard } from "@/components/tournament-card";
import { WalletConnect } from "@/components/wallet-connect";
import { Trophy, Users, Calendar, TrendingUp } from "lucide-react";
import { ethers } from "ethers"
import { getContract } from "@/lib/contracts";
import { mapStatus } from "@/lib/status";


import TournamentContractData from '../../lib/contracts/TournamentContract.json'; 

export default function Home() {
  const [featuredTournaments, setFeaturedTournaments] = useState([])

  useEffect(() => {
    const fetchFeaturedTournaments = async () => {
      try {
        const contract = await getContract(
          TournamentContractData.abi,
          TournamentContractData.address
        );

        const data = await contract.getAllTournaments()

        const parsed = data.map((t) => ({
          id: t.id.toString(),
          title: t.name,
          description: t.description,
          entryFee: ethers.formatEther(t.entryFee),
          prize: ethers.formatEther(t.totalPrize),
          participants: Number(t.maxParticipants),
          startDate: new Date(Number(t.startTime) * 1000).toLocaleDateString(),
          status: mapStatus(t.status),
        }))

        // Sort by participants descending and take top 5
        const featured = parsed
          .sort((a, b) => b.participants - a.participants)
          .slice(0, 3)

        setFeaturedTournaments(featured)
      } catch (err) {
        console.error("Failed to fetch tournaments", err)
      }
    }

    fetchFeaturedTournaments()
  }, [])

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Decentralized Tournaments
          </h1>
          <p className="text-muted-foreground mt-2">
            Create, join, and compete in blockchain-powered tournaments
          </p>
        </div>
      </div>

      <section className="mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Transparency
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Immutable tournament history on the blockchain
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Accessibility
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Anyone with a wallet can participate
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fair Play</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Smart contracts ensure fair competition
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Instant Rewards
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Automatic prize distribution to winners
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button asChild size="lg">
              <Link href="/tournaments/create">Create Tournament</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/tournaments">Browse Tournaments</Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Featured Tournaments</h2>
          <Button variant="ghost" asChild>
            <Link href="/tournaments">View All</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      </section>
    </main>
  );
}
