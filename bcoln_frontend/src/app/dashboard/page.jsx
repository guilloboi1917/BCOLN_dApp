"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWeb3 } from "@/hooks/use-web3";
import {
  getPaginatedMatchHistory,
  addMatchToHistory,
} from "@/lib/match-history";
import { getReadOnlyContract } from "@/lib/contracts";
import TournamentContractData from "@/../lib/contracts/TournamentContract.json";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TournamentCard } from "@/components/tournament-card";
import { MatchReportDialog } from "@/components/match-report-dialog";
import { toast } from "sonner";
import {
  Clock,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";


export default function DashboardPage() {
  const { connected, address, balance } = useWeb3();

  const [tournaments, setTournaments] = useState({
    participating: [],
    completed: [],
  });

  const [matches, setMatches] = useState({
    upcoming: [],
    played: [],
  });

  const [matchPage, setMatchPage] = useState(1);
  const matchPageSize = 3;

  const {
    total: totalPlayedMatches,
    data: paginatedPlayedMatches,
  } = getPaginatedMatchHistory(matchPage, matchPageSize);

  const [upcomingPage, setUpcomingPage] = useState(1);
  const upcomingPageSize = 5;
  
  const paginatedUpcomingMatches = matches.upcoming.slice(
    (upcomingPage - 1) * upcomingPageSize,
    upcomingPage * upcomingPageSize
  );

  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [participatingPage, setParticipatingPage] = useState(1);
  
  const participatingPageSize = 6;

  const paginatedParticipating = tournaments.participating.slice(
    (participatingPage - 1) * participatingPageSize,
    participatingPage * participatingPageSize
  );

  const [completedPage, setCompletedPage] = useState(1);
  const completedPageSize = 6;

  const paginatedCompleted = tournaments.completed.slice(
    (completedPage - 1) * completedPageSize,
    completedPage * completedPageSize
  );

  useEffect(() => {
    if (!connected || !address) return;
  
    const loadData = async () => {
      setLoading(true);
      try {
        const contract = await getReadOnlyContract(
          TournamentContractData.abi,
          TournamentContractData.address
        );
  
        const rawTournaments = await contract.getAllTournaments();
        const all = rawTournaments.map((t, i) => ({
          id: i.toString(),
          name: t.name,
          description: t.description,
          entryFee: t.entryFee,
          prize: t.totalPrize,
          maxParticipants: Number(t.maxParticipants),
          startDate: new Date(Number(t.startTime) * 1000).toLocaleDateString(),
          status: ["open", "active", "completed", "cancelled"][Number(t.status)],
          registered: Number(t.registeredParticipants),
        }));
  
        const participating = [];
        const completed = [];
        const matchList = [];
  
        for (const tournament of all) {
          const tournamentDetails = await contract.getTournamentDetails(tournament.id);
          const participants = tournamentDetails[10];
  
          const isParticipant = participants.some(
            (p) => p.toLowerCase() === address.toLowerCase()
          );
  
          if (isParticipant) {
            participating.push(tournament);
          }
  
          if (tournament.status === "completed") {
            completed.push(tournament);
          }
  
          if (isParticipant) {
            const tournamentMatches = await contract.getAllTournamentMatches(tournament.id);
  
            for (const match of tournamentMatches) {
              const matchAddress = match[0];
              const matchRound = Number(match[5]);
              const matchStatus = Number(match[9]);
              const player1 = match[2];
              const player2 = match[3];
              const winner = match[4];
  
              const isMyMatch =
                player1?.toLowerCase() === address.toLowerCase() ||
                player2?.toLowerCase() === address.toLowerCase();
  
              if (isMyMatch) {
                const matchData = {
                  id: matchAddress,
                  round: matchRound,
                  tournamentId: tournament.id,
                  tournamentName: tournament.name,
                  player1,
                  player2,
                  scheduledTime: "N/A",
                  status: ["pending", "commit", "reveal", "dispute", "completed"][matchStatus],
                  winner,
                  needsReport:
                    matchStatus === 1 &&
                    winner === "0x0000000000000000000000000000000000000000",
                };
  
                if (matchStatus < 3) {
                  matchList.push({ ...matchData, type: "upcoming" });
                } else {
                  matchList.push({ ...matchData, type: "played" });
                  addMatchToHistory(matchData);
                }
              }
            }
          }
        }
  
        setTournaments({ participating, completed });
        setMatches({
          upcoming: matchList.filter((m) => m.type === "upcoming"),
          played: matchList.filter((m) => m.type === "played"),
        });
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        toast.error("Error loading dashboard");
      } finally {
        setLoading(false);
      }
    };
  
    // Initial load
    loadData();
  
    // Reload data on browser focus
    const handleFocus = () => {
      loadData();
    };
  
    window.addEventListener("focus", handleFocus);
  
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
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
          <CardContent className="text-2xl font-bold">
            {tournaments.participating.filter((t) => t.status === "active").length}
          </CardContent>
        </Card>
      </div>

      {/* Matches Section */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-4">My Matches</h2>
        <Tabs defaultValue="upcoming">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="played">Played</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {matches.upcoming.length > 0 ? (
              <div className="space-y-4">
                {paginatedUpcomingMatches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="p-4">
                      <div className="font-medium">{match.tournamentName}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" /> {match.scheduledTime}
                      </div>
                      <div className="text-sm">Opponent: {match.player2 || "TBD"}</div>
                      <Button asChild size="sm" className="mt-2">
                        <Link href={`/tournaments/${match.tournamentId}`}>View Tournament</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => setUpcomingPage((p) => Math.max(1, p - 1))}
                    disabled={upcomingPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">Page {upcomingPage}</span>
                  <Button
                    onClick={() =>
                      setUpcomingPage((p) =>
                        p * upcomingPageSize < matches.upcoming.length ? p + 1 : p
                      )
                    }
                    disabled={upcomingPage * upcomingPageSize >= matches.upcoming.length}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No upcoming matches.</p>
            )}
          </TabsContent>

          <TabsContent value="played" className="mt-4">
            {matches.played.length > 0 ? (
              <div className="space-y-4">
                {paginatedPlayedMatches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="p-4 space-y-2">
                      <div className="font-medium">{match.tournamentName}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" /> {match.scheduledTime}
                      </div>
                      <div className="text-sm">Opponent: {match.player2}</div>
                      {match.needsReport && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMatch(match);
                            setReportOpen(true);
                          }}
                        >
                          Report Result
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => setMatchPage((p) => Math.max(1, p - 1))}
                    disabled={matchPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">Page {matchPage}</span>
                  <Button
                    onClick={() =>
                      setMatchPage((p) =>
                        p * matchPageSize < totalPlayedMatches ? p + 1 : p
                      )
                    }
                    disabled={matchPage * matchPageSize >= totalPlayedMatches}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No played matches yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Participating + Completed Tournaments */}
      <section className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Tournaments</h2>
        <Tabs defaultValue="participating">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="participating">Participating</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value="completed" className="mt-6">
            {tournaments.completed.length > 0 ? (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedCompleted.map((t) => (
                    <TournamentCard key={t.id} tournament={t} />
                  ))}
                </div>

                <div className="flex justify-between items-center mt-4">
                  <Button
                    onClick={() => setCompletedPage((p) => Math.max(1, p - 1))}
                    disabled={completedPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm">Page {completedPage}</span>
                  <Button
                    onClick={() =>
                      setCompletedPage((p) =>
                        p * completedPageSize < tournaments.completed.length ? p + 1 : p
                      )
                    }
                    disabled={
                      completedPage * completedPageSize >= tournaments.completed.length
                    }
                  >
                    Next
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No completed tournaments.</p>
            )}
          </TabsContent>


        </Tabs>
      </section>

      <MatchReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        match={selectedMatch}
        onSubmit={() => {
          toast.success("Match result submitted.");
          setReportOpen(false);
        }}
      />
    </div>
  );
}
