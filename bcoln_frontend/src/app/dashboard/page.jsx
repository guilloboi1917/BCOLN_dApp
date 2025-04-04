"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { TournamentCard } from "@/components/tournament-card"
import { useWeb3 } from "@/hooks/use-web3"
import { toast } from "sonner"
import { Trophy, Calendar, AlertCircle, Clock, ArrowRight } from "lucide-react"

export default function DashboardPage() {
  const { connected, address, balance } = useWeb3()
  const [isLoading, setIsLoading] = useState(true)
  const [userTournaments, setUserTournaments] = useState({
    participating: [],
    created: [],
    completed: [],
  })
  const [upcomingMatches, setUpcomingMatches] = useState([])

  useEffect(() => {
    const fetchUserData = async () => {
      if (!connected) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        // In a real app, this would be API calls to your backend or directly to the blockchain
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Mock data
        setUserTournaments({
          participating: [
            {
              id: "1",
              title: "Crypto Masters 2025",
              description: "The biggest blockchain gaming tournament of the year",
              entryFee: "0.05 ETH",
              prize: "10 ETH",
              participants: 32,
              startDate: "May 15, 2025",
              status: "active",
            },
            {
              id: "4",
              title: "DeFi Trading Cup",
              description: "Compete for the highest trading returns",
              entryFee: "0.2 ETH",
              prize: "30 ETH",
              participants: 32,
              startDate: "July 10, 2025",
              status: "upcoming",
            },
          ],
          created: [
            {
              id: "3",
              title: "NFT Creators Showdown",
              description: "A creative competition for NFT artists",
              entryFee: "0.02 ETH",
              prize: "5 ETH",
              participants: 16,
              startDate: "April 20, 2025",
              status: "open",
            },
          ],
          completed: [
            {
              id: "6",
              title: "Crypto Chess Tournament",
              description: "Strategic battles on the blockchain",
              entryFee: "0.03 ETH",
              prize: "8 ETH",
              participants: 64,
              startDate: "March 15, 2025",
              status: "completed",
            },
          ],
        })

        setUpcomingMatches([
          {
            id: "m1",
            tournamentId: "1",
            tournamentName: "Crypto Masters 2025",
            round: 1,
            player1: address,
            player2: "0x5678...9012",
            scheduledTime: "May 15, 2025, 12:00 PM",
          },
          {
            id: "m3",
            tournamentId: "1",
            tournamentName: "Crypto Masters 2025",
            round: 2,
            player1: address,
            player2: null, // TBD based on previous match
            scheduledTime: "May 16, 2025, 2:00 PM",
          },
        ])
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast.error("Error loading dashboard", {
          description: "Could not load your tournament data. Please try again."
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [connected, address, toast])

  if (!connected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
          <h2 className="text-2xl font-bold mt-4">Wallet Not Connected</h2>
          <p className="text-muted-foreground mt-2">Please connect your wallet to view your dashboard.</p>
          <Button asChild className="mt-6">
            <Link href="/">Go to Home</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  const hasParticipatingTournaments = userTournaments.participating.length > 0
  const hasCreatedTournaments = userTournaments.created.length > 0
  const hasCompletedTournaments = userTournaments.completed.length > 0
  const hasUpcomingMatches = upcomingMatches.length > 0

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wallet Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono truncate">{address}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance} ETH</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tournaments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userTournaments.participating.filter((t) => t.status === "active").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasUpcomingMatches && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Upcoming Matches</h2>
          <div className="space-y-4">
            {upcomingMatches.map((match) => (
              <Card key={match.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="font-medium">{match.tournamentName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">Round {match.round}</Badge>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {match.scheduledTime}
                        </div>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Opponent:</span> {match.player2 ? match.player2 : "TBD"}
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/tournaments/${match.tournamentId}`}>View Tournament</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Tabs defaultValue="participating" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="participating">Participating</TabsTrigger>
          <TabsTrigger value="created">Created</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="participating" className="mt-6">
          {hasParticipatingTournaments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTournaments.participating.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No Active Tournaments</h3>
                <p className="text-muted-foreground mt-2 text-center max-w-md">
                  You're not participating in any tournaments yet. Browse available tournaments and join one!
                </p>
                <Button asChild className="mt-6">
                  <Link href="/tournaments">Browse Tournaments</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="created" className="mt-6">
          {hasCreatedTournaments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTournaments.created.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No Created Tournaments</h3>
                <p className="text-muted-foreground mt-2 text-center max-w-md">
                  You haven't created any tournaments yet. Create a new tournament and invite participants!
                </p>
                <Button asChild className="mt-6">
                  <Link href="/tournaments/create">Create Tournament</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          {hasCompletedTournaments ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTournaments.completed.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium">No Completed Tournaments</h3>
                <p className="text-muted-foreground mt-2 text-center max-w-md">
                  You haven't completed any tournaments yet. Join a tournament to start competing!
                </p>
                <Button asChild className="mt-6">
                  <Link href="/tournaments">Browse Tournaments</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Tournament History</CardTitle>
            <CardDescription>Your recent tournament activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Trophy className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Joined Crypto Masters 2025</p>
                  <p className="text-xs text-muted-foreground">3 days ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Created NFT Creators Showdown</p>
                  <p className="text-xs text-muted-foreground">1 week ago</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-green-500/10 p-2">
                  <Trophy className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Won match in Crypto Chess Tournament</p>
                  <p className="text-xs text-muted-foreground">2 weeks ago</p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="#" className="flex items-center justify-center gap-1">
                View All Activity
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

