"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TournamentCard } from "@/components/tournament-card"
import { Search, Filter } from "lucide-react"

export default function TournamentsPage() {
  // Mock data for tournaments
  const allTournaments = [
    {
      id: "1",
      title: "Crypto Masters 2025",
      description: "The biggest blockchain gaming tournament of the year",
      entryFee: "0.05 ETH",
      prize: "10 ETH",
      participants: 8,
      startDate: "May 15, 2025",
      status: "active",
    },
    {
      id: "2",
      title: "Web3 Poker Championship",
      description: "Test your poker skills against the best players",
      entryFee: "0.1 ETH",
      prize: "20 ETH",
      participants: 8,
      startDate: "June 1, 2025",
      status: "open",
    },
    {
      id: "3",
      title: "NFT Creators Showdown",
      description: "A creative competition for NFT artists",
      entryFee: "0.02 ETH",
      prize: "5 ETH",
      participants: 8,
      startDate: "April 20, 2025",
      status: "open",
    },
    {
      id: "4",
      title: "DeFi Trading Cup",
      description: "Compete for the highest trading returns",
      entryFee: "0.2 ETH",
      prize: "30 ETH",
      participants: 8,
      startDate: "July 10, 2025",
      status: "upcoming",
    },
    {
      id: "5",
      title: "Blockchain Hackathon",
      description: "Build innovative solutions in 48 hours",
      entryFee: "0.01 ETH",
      prize: "15 ETH",
      participants: 8,
      startDate: "August 5, 2025",
      status: "upcoming",
    },
    {
      id: "6",
      title: "Crypto Chess Tournament",
      description: "Strategic battles on the blockchain",
      entryFee: "0.03 ETH",
      prize: "8 ETH",
      participants: 8,
      startDate: "March 15, 2025",
      status: "completed",
    },
  ]

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const filteredTournaments = allTournaments.filter((tournament) => {
    const matchesSearch = tournament.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || tournament.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Browse Tournaments</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tournaments..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tournaments</SelectItem>
              <SelectItem value="open">Open for Entry</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium">No tournaments found</h3>
          <p className="text-muted-foreground mt-2">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}

