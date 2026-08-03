import { useMemo } from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { RPC_URL } from "./config";

export function useReadClient() {
  return useMemo(() => createClient({ chain: studionet, endpoint: RPC_URL }), []);
}

export function useWriteClient(address: `0x${string}` | null) {
  return useMemo(() => {
    if (!address) return null;
    if (typeof window === "undefined" || !window.ethereum) return null;
    return createClient({
      chain: studionet,
      endpoint: RPC_URL,
      account: address,
      provider: window.ethereum as any,
    });
  }, [address]);
}
