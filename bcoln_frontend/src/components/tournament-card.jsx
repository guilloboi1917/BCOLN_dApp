import React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Users } from "lucide-react";

export function TournamentCard({ tournament }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="line-clamp-1">{tournament.title}</CardTitle>
          <Badge
            variant={
              tournament.status === "open"
                ? "default"
                : tournament.status === "active"
                ? "secondary"
                : "outline"
            }
          >
            {tournament.status === "open"
              ? "Open"
              : tournament.status === "upcoming"
              ? "Upcoming"
              : tournament.status === "active"
              ? "Active"
              : "Completed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm line-clamp-2 mb-4">
          {tournament.description}
        </p>

        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span>{tournament.prize}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{tournament.participants} players</span>
          </div>
          <div className="flex items-center gap-2 col-span-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{tournament.startDate}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-3">
        <div className="text-sm font-medium">Entry: {tournament.entryFee}</div>
        <Button asChild size="sm">
          <Link href={`/tournaments/${tournament.id}`}>View Details</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
