"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TournamentCard } from "@/components/tournament-card";
import { Search, Filter } from "lucide-react";
import { ethers } from "ethers";

import TournamentContractData from "../../../lib/contracts/TournamentContract.json";

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        console.log(TournamentContractData)
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          TournamentContractData.address,
          TournamentContractData.abi,
          await provider.getSigner()
        );

        const data = await contract.getAllTournaments();
        const parsed = data.map((t) => ({
          id: t.id.toString(),
          title: t.name,
          description: t.description,
          entryFee: ethers.formatEther(t.entryFee),
          prize: ethers.formatEther(t.totalPrize),
          participants: t.maxParticipants,
          startDate: new Date(Number(t.startTime) * 1000).toLocaleDateString(),
          status: mapStatus(t.status),
        }));
        console.log("Tournaments", parsed);
        setTournaments(parsed);
      } catch (err) {
        console.error("Failed to fetch tournaments", err);
      }
    };

    fetchTournaments();
  }, []);

  const mapStatus = (statusId) => {
    return ["open", "active", "completed", "cancelled"][statusId] || "unknown";
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    const matchesSearch = tournament.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || tournament.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <p className="text-muted-foreground mt-2">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}
