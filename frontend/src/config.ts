// MedGuard frontend config.

export const DEPLOYED_ADDRESS: `0x${string}` | "" = "0x684a1F0Aa2b546E74fAaFF6e4Bab72792F253Aac";

export function getContractAddress(): `0x${string}` | null {
  const envAddr = (import.meta.env.VITE_CONTRACT_ADDRESS ?? "").trim();
  const candidate = envAddr !== "" ? envAddr : DEPLOYED_ADDRESS;
  if (!candidate) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(candidate)) {
    console.warn(`Invalid contract address embedded: ${candidate}`);
    return null;
  }
  return candidate as `0x${string}`;
}

export const CHAIN_NAME = "GenLayer StudioNet";
export const CHAIN_ID = 61999;
export const EXPLORER = "https://explorer-studio.genlayer.com";
export const RPC_URL = "https://studio.genlayer.com/api";
export const NATIVE_SYMBOL = "GEN";

export function explorerTx(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `${EXPLORER}/address/${address}`;
}
