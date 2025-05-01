import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TournamentCard } from "@/components/tournament-card";
import { WalletConnect } from "@/components/wallet-connect";
import { Trophy, Users, Calendar, TrendingUp } from "lucide-react";

export default function Home() {
  // Mock data for featured tournaments
  const featuredTournaments = [
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
  ];

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
