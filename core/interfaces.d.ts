import { Site } from "./types.js";
export interface Types {
    array: unknown[];
    buffer: Buffer;
    cert: Cert;
    null: null;
    object: Record<string | number | symbol, unknown>;
    site: Site;
    unknown: unknown;
    bigint: bigint;
    boolean: boolean;
    function: (...args: unknown[]) => unknown;
    number: number;
    string: string;
    symbol: symbol;
    undefined: undefined;
}
export interface Cert {
    key: Buffer;
    cert: Buffer;
}
