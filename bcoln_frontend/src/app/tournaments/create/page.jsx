"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePicker } from "@/components/ui/date-picker"
import { toast } from "sonner"
import { useWeb3 } from "@/hooks/use-web3"

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  entryFee: z.string().min(1, { message: "Entry fee is required" }),
  prize: z.string().min(1, { message: "Prize amount is required" }),
  maxParticipants: z.string().min(1, { message: "Maximum participants is required" }),
  tournamentType: z.string().min(1, { message: "Tournament type is required" }),
  startDate: z.date({ required_error: "Start date is required" }),
  registrationDeadline: z.date({ required_error: "Registration deadline is required" }),
})

export default function CreateTournamentPage() {
  const router = useRouter()
  const { connected, createTournament } = useWeb3()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      entryFee: "",
      prize: "",
      maxParticipants: "32",
      tournamentType: "single-elimination",
    },
  })

  async function onSubmit(values) {
    if (!connected) {
      toast.info("Wallet not connected", {
        description: "Please connect your wallet to create a tournament"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // This would call the actual contract method in a real implementation
      console.log("Creating tournament with values:", values)

      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 2000))

      toast.success("Tournament created!", {
        description: "Your tournament has been successfully created"
      })

      router.push("/tournaments")
    } catch (error) {
      console.error("Error creating tournament:", error)
      toast.error("Error creating tournament", {
        description: "There was an error creating your tournament. Please try again."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Create Tournament</h1>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Tournament Details</CardTitle>
          <CardDescription>
            Fill in the details to create a new tournament. Entry fees will be collected and held in the smart contract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tournament Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tournament title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your tournament" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="entryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entry Fee (ETH)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" min="0" placeholder="0.05" {...field} />
                      </FormControl>
                      <FormDescription>Amount each participant must pay to enter</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prize Pool (ETH)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" min="0" placeholder="1.0" {...field} />
                      </FormControl>
                      <FormDescription>Total prize amount for winners</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="maxParticipants"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Participants</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select number of participants" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="8">8 participants</SelectItem>
                          <SelectItem value="16">16 participants</SelectItem>
                          <SelectItem value="32">32 participants</SelectItem>
                          <SelectItem value="64">64 participants</SelectItem>
                          <SelectItem value="128">128 participants</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Must be a power of 2 for tournament brackets</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tournamentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tournament Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tournament type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="single-elimination">Single Elimination</SelectItem>
                          <SelectItem value="double-elimination">Double Elimination</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                      <FormDescription>When the tournament will begin</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="registrationDeadline"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Registration Deadline</FormLabel>
                      <DatePicker date={field.value} setDate={field.onChange} />
                      <FormDescription>Last day to register</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating Tournament..." : "Create Tournament"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          Tournament creation requires gas fees for smart contract deployment
        </CardFooter>
      </Card>
    </div>
  )
}

