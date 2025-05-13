"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useWeb3 } from "@/hooks/use-web3";
import {
  getPaginatedMatchHistory,
  addMatchToHistory,
} from "@/lib/match-history";
import { getReadOnlyContract } from "@/lib/contracts";
import TournamentContractData from "@/../lib/contracts/TournamentContract.json";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TournamentCard } from "@/components/tournament-card";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { ethers } from "ethers";
import { getMatchDisplayStatus } from "@/lib/status";

export default function DashboardPage() {
  const { connected, address, balance } = useWeb3();

  const [activeTournaments, setActiveTournaments] = useState([]);
  const [completedTournaments, setCompletedTournaments] = useState([]);
  const [upcomingMatches, setUpcomingMatches] = useState([]);
  const [matchPage, setMatchPage] = useState(1);
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const matchPageSize = 3;
  const upcomingPageSize = 3;
  const tournamentPageSize = 3;

  const { total: totalPlayedMatches, data: paginatedPlayedMatches } =
    getPaginatedMatchHistory(matchPage, matchPageSize);

  const paginatedUpcomingMatches = useMemo(() => {
    const start = (upcomingPage - 1) * upcomingPageSize;
    const end = start + upcomingPageSize;
    return upcomingMatches.slice(start, end);
  }, [upcomingMatches, upcomingPage]);

  const paginatedActiveTournaments = useMemo(() => {
    const start = (activePage - 1) * tournamentPageSize;
    const end = start + tournamentPageSize;
    return activeTournaments.slice(start, end);
  }, [activeTournaments, activePage]);

  const paginatedCompletedTournaments = useMemo(() => {
    const start = (completedPage - 1) * tournamentPageSize;
    const end = start + tournamentPageSize;
    return completedTournaments.slice(start, end);
  }, [completedTournaments, completedPage]);

  useEffect(() => {
    if (!connected || !address) return;

    const loadDashboard = async () => {
      setLoading(true);
      try {
        const contract = await getReadOnlyContract(
          TournamentContractData.abi,
          TournamentContractData.address
        );

        const rawTournaments = await contract.getAllTournaments();

        const tournamentList = rawTournaments.map((t, i) => ({
          id: i.toString(),
          title: t.name,
          name: t.name,
          description: t.description,
          entryFee: ethers.formatEther(t.entryFee),
          prize: ethers.formatEther(t.totalPrize),
          participants: Number(t.maxParticipants),
          maxParticipants: Number(t.maxParticipants),
          registered: Number(t.registeredParticipants),
          startDate: new Date(Number(t.startTime) * 1000).toLocaleDateString(),
          status: ["open", "active", "completed", "cancelled"][Number(t.status)],
        }));

        const myActive = [];
        const myCompleted = [];
        const myMatches = [];

        for (const t of tournamentList) {
          const details = await contract.getTournamentDetails(t.id);
          const participants = details[10];

          const isMine = participants.some(
            (p) => p.toLowerCase() === address.toLowerCase()
          );

          if (!isMine) continue;

          if (t.status === "active" || t.status === "open") {
            myActive.push(t);
          } else if (t.status === "completed") {
            myCompleted.push(t);
          }

          const tournamentMatches = await contract.getAllTournamentMatches(t.id);
          for (const match of tournamentMatches) {
            const matchAddress = match[0];
            const player1 = match[2];
            const player2 = match[3];
            const winner = match[4];
            const matchStatus = Number(match[9]);

            const isMyMatch =
              player1?.toLowerCase() === address.toLowerCase() ||
              player2?.toLowerCase() === address.toLowerCase();

            if (!isMyMatch) continue;

            const statusLabels = ["pending", "commit", "reveal", "dispute", "completed"];
            const matchObj = {
              id: matchAddress,
              tournamentId: t.id,
              tournamentName: t.name,
              player1,
              player2,
              winner,
              status: statusLabels[matchStatus] ?? "unknown",
              scheduledTime: "N/A",
            };

            if (matchStatus < 3) {
              myMatches.push({ ...matchObj, type: "upcoming" });
            } else {
              myMatches.push({ ...matchObj, type: "played" });
              addMatchToHistory(matchObj);
            }
          }
        }

        setActiveTournaments(myActive);
        setCompletedTournaments(myCompleted);
        setUpcomingMatches(myMatches.filter((m) => m.type === "upcoming"));
      } catch (err) {
        console.error("Dashboard load error:", err);
        toast.error("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [connected, address]);

  if (!connected) {
    return (
      <div className="container mx-auto text-center py-16">
        <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold mt-4">Wallet Not Connected</h2>
        <p className="text-muted-foreground mt-2">Connect your wallet to view the dashboard.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-20 text-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-primary mx-auto mb-4 rounded-full"></div>
        <p className="text-muted-foreground">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle>Wallet</CardTitle></CardHeader>
          <CardContent className="font-mono text-sm truncate">{address}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Balance</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{balance} ETH</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Active Tournaments</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{activeTournaments.length}</CardContent>
        </Card>
      </div>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4">My Matches</h2>
        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="played">Played</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {paginatedUpcomingMatches.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedUpcomingMatches.map((match) => (
                    <Card key={match.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="line-clamp-1">
                          {match.tournamentName}
                        </CardTitle>
                        <Badge className="text-xs" variant="outline">
                          {getMatchDisplayStatus(match.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                  
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground">
                        Opponent: {match.player2 || "TBD"}
                      </p>
                    </CardContent>
                  
                    <CardFooter className="pt-2 flex justify-end">
                      <Button asChild size="sm">
                        <Link href={`/tournaments/${match.tournamentId}`}>View Details</Link>
                      </Button>
                    </CardFooter>
                  </Card>                                
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground mt-2">No upcoming matches.</p>
            )}

            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                disabled={upcomingPage === 1}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{upcomingPage}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setUpcomingPage((p) =>
                    p * upcomingPageSize < upcomingMatches.length ? p + 1 : p
                  )
                }
                disabled={upcomingPage * upcomingPageSize >= upcomingMatches.length}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="played" className="mt-4">
            {paginatedPlayedMatches.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedPlayedMatches.map((match) => (
                    <Card key={match.id}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="line-clamp-1">
                          {match.tournamentName}
                        </CardTitle>
                        <Badge className="text-xs">
                          {getMatchDisplayStatus(match.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                  
                    <CardContent className="pb-2">
                      <p className="text-sm text-muted-foreground">
                        Opponent: {match.player2 || "TBD"}
                      </p>
                    </CardContent>
                  
                    <CardFooter className="pt-2 flex justify-end">
                      <Button asChild size="sm">
                        <Link href={`/tournaments/${match.tournamentId}`}>View Details</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground mt-2">No played matches yet.</p>
            )}

            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMatchPage((p) => Math.max(1, p - 1))}
                disabled={matchPage === 1}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{matchPage}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setMatchPage((p) =>
                    p * matchPageSize < totalPlayedMatches ? p + 1 : p
                  )
                }
                disabled={matchPage * matchPageSize >= totalPlayedMatches}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

        </Tabs>
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Tournaments</h2>
        <Tabs defaultValue="active">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {paginatedActiveTournaments.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedActiveTournaments.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No active tournaments.</p>
            )}

            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                disabled={activePage === 1}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{activePage}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setActivePage((p) =>
                    p * tournamentPageSize < activeTournaments.length ? p + 1 : p
                  )
                }
                disabled={activePage * tournamentPageSize >= activeTournaments.length}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {paginatedCompletedTournaments.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCompletedTournaments.map((t) => (
                  <TournamentCard key={t.id} tournament={t} />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No completed tournaments.</p>
            )}

            <div className="flex justify-center items-center gap-2 mt-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                disabled={completedPage === 1}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{completedPage}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setCompletedPage((p) =>
                    p * tournamentPageSize < completedTournaments.length ? p + 1 : p
                  )
                }
                disabled={completedPage * tournamentPageSize >= completedTournaments.length}
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
