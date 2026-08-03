/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>;
    on: (event: string, handler: (...args: any[]) => void) => void;
    removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  };
}
