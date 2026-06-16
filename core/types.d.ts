import { MatchFunction } from "chokidar";
import { Cert } from "./interfaces.js";
import { Http1Context, Http2Context } from "./classes.js";
export type Site = [string, Cert | null];
export type WatcherIgnoreFn = MatchFunction;
export type Context = Http1Context | Http2Context;
export type SupportedEncoding = "br" | "gzip" | "*" | "identity";
export type SupportedExtname = ".json" | ".pdf" | ".xml" | ".apng" | ".gif" | ".jpeg" | ".jpg" | ".png" | ".svg" | ".svgz" | ".webp" | ".css" | ".html" | ".js" | ".mjs";
