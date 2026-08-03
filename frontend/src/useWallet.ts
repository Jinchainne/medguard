import { useCallback, useEffect, useState } from "react";

import { CHAIN_ID, CHAIN_NAME, EXPLORER, NATIVE_SYMBOL, RPC_URL } from "./config";

export type WalletState =
  | { status: "no-wallet" }
  | { status: "disconnected" }
  | { status: "wrong-chain"; address: `0x${string}`; chainId: number }
  | { status: "connected"; address: `0x${string}`; chainId: number };

function toHex(n: number): string {
  return "0x" + n.toString(16);
}

function normalizeChainId(raw: unknown): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") return parseInt(raw, 16);
  return 0;
}

export function useWallet(): {
  state: WalletState;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToStudioNet: () => Promise<void>;
} {
  const [state, setState] = useState<WalletState>({ status: "no-wallet" });

  const refresh = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      setState({ status: "no-wallet" });
      return;
    }
    try {
      const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
      if (!accounts || accounts.length === 0) {
        setState({ status: "disconnected" });
        return;
      }
      const address = accounts[0] as `0x${string}`;
      const chainId = normalizeChainId(await eth.request({ method: "eth_chainId" }));
      if (chainId !== CHAIN_ID) {
        setState({ status: "wrong-chain", address, chainId });
      } else {
        setState({ status: "connected", address, chainId });
      }
    } catch {
      setState({ status: "disconnected" });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const eth = window.ethereum;
    if (!eth?.on) return;
    const onAccountsChanged = () => void refresh();
    const onChainChanged = () => void refresh();
    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);
    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) throw new Error("No Ethereum-compatible wallet detected in the browser.");
    await eth.request({ method: "eth_requestAccounts" });
    await refresh();
  }, [refresh]);

  const disconnect = useCallback(() => {
    setState((s) => (s.status === "connected" || s.status === "wrong-chain"
      ? { status: "disconnected" }
      : s));
  }, []);

  const switchToStudioNet = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) throw new Error("No wallet detected.");
    const chainIdHex = toHex(CHAIN_ID);
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (err) {
      const code = (err as { code?: number })?.code;
      if (code === 4902 || code === -32603) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: chainIdHex,
              chainName: CHAIN_NAME,
              nativeCurrency: {
                name: "GEN",
                symbol: NATIVE_SYMBOL,
                decimals: 18,
              },
              rpcUrls: [RPC_URL],
              blockExplorerUrls: [EXPLORER],
            },
          ],
        });
      } else {
        throw err;
      }
    }
    await refresh();
  }, [refresh]);

  return { state, connect, disconnect, switchToStudioNet };
}
