import { Types } from "./interfaces.js";
import { Context, SupportedEncoding, SupportedExtname } from "./types.js";
export declare function log(message?: any, ...optionalParams: any[]): void;
export declare function error(message?: any, ...optionalParams: any[]): void;
export declare function warn(message?: any, ...optionalParams: any[]): void;
export declare function hasProps<O extends Record<string, keyof Types | `${keyof Types}[]`>>(obj: unknown, props: O): obj is {
    [K in keyof O]: O[K] extends `${infer T extends keyof Types}[]` ? Types[T][] : O[K] extends keyof Types ? Types[O[K]] : never;
};
export declare function isCertExpiringSoon(path: string, { thresholdMs }: {
    thresholdMs?: number;
}): boolean;
export declare function compressFiles(dirPath: string, fileExtentions: string[]): Promise<void>;
export declare function compressFile(filePath: string): Promise<void>;
export declare function updateCompressedFiles(dirPath: string): Promise<void>;
export declare function deleteCompressedFiles(dirPath: string): Promise<void>;
export declare function isSupportedExtname(extname: string): extname is SupportedExtname;
export declare function isSupportedEncoding(encoding: string): encoding is SupportedEncoding;
export declare function isSupportedEncodingPair(pair: [string, number]): pair is [SupportedEncoding, number];
export declare function chooseEncoding(acceptEncodingHeader: string): SupportedEncoding | "*" | undefined;
export declare function createHTTPServer(port: number): void;
export declare function resolveAPIRequest(resourceDir: string, context: Context, path: string, method: string, params: any[]): Promise<void>;
export declare function resolveResourceRequest(resourceDir: string | {
    dynamicPages: string;
    staticPages: string;
    errorPages: string;
}, context: Context, path: string, method: string, pageParams: any[], shouldSkipCompression?: (path: string) => boolean | Promise<boolean>): void;
