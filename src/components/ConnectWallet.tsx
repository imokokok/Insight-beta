"use client";

import { useState } from "react";
import { Wallet } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ConnectWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const { toast } = useToast();

  const connect = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        type: "error",
        title: "Wallet not found",
        message: "Please install a wallet like MetaMask or Rabby!"
      });
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      if (accounts && Array.isArray(accounts) && accounts.length > 0) {
        setAddress(accounts[0]);
        toast({
          type: "success",
          title: "Wallet Connected",
          message: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`
        });
      }
    } catch (error: unknown) {
      console.error("Failed to connect wallet:", error);
      toast({
        type: "error",
        title: "Connection Failed",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  const disconnect = () => {
    setAddress(null);
  };

  if (address) {
    return (
      <button
        onClick={disconnect}
        className="flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-200"
      >
        <div className="h-2 w-2 rounded-full bg-green-500" />
        {address}
      </button>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
    >
      <Wallet size={16} />
      Connect Wallet
    </button>
  );
}
