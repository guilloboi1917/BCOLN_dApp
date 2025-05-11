"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWeb3 } from "@/hooks/use-web3";
import { Wallet, Copy, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function WalletConnect({ className }) {
    const { connected, connecting, address, balance, connect, disconnect } = useWeb3();
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (connected && address) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className={cn("gap-2", className)}>
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline-block">
              {address.substring(0, 6)}...
              {address.substring(address.length - 4)}
            </span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Wallet Connected</DialogTitle>
            <DialogDescription>
              Your wallet is connected to Zeus
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium">Address</span>
              <div className="flex items-center gap-2">
                <code className="relative rounded bg-muted px-[0.5rem] py-[0.3rem] font-mono text-sm">
                  {address}
                </code>
                <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium">Balance</span>
              <code className="relative rounded bg-muted px-[0.5rem] py-[0.3rem] font-mono text-sm">
                {balance} ETH
              </code>
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Close
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  disconnect();
                  setIsOpen(false);
                }}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Button
      onClick={() => {
        if (!connecting) connect();
      }}
      disabled={connecting}
      className={cn("gap-2", className)}
    >
      <Wallet className="h-4 w-4" />
      <span>{connecting ? "Connecting..." : "Connect Wallet"}</span>
    </Button>

  );
}
