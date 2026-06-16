import { Http2ServerRequest, Http2ServerResponse, IncomingHttpHeaders, OutgoingHttpHeaders, ServerHttp2Stream } from "http2";
import Stream from "stream";
import { SupportedEncoding } from "./types.js";
interface Context {
    readonly url: URL | undefined;
    readonly protocol: "http1" | "http2";
    readonly hostname: string | undefined;
    readonly method: string | undefined;
    readonly path: string | undefined;
    readonly headers: IncomingHttpHeaders;
    respond(status: number, options?: {
        headers?: OutgoingHttpHeaders;
        end?: boolean;
    }): this;
    toPipe<S extends Stream>(stream: S): S;
    end(data?: string | Uint8Array): this;
    respondWithFile(path: string, method: string, { mimeType, compressionEncoding, onError, }: {
        mimeType?: string | undefined;
        compressionEncoding?: SupportedEncoding | undefined;
        onError?: ((code: number) => void) | undefined;
    }): void;
    respondWithDynamicFile(path: string, method: string, { onError, }: {
        pageParams?: any[];
        onError?: ((code: number) => void) | undefined;
    }): void;
    getData(maxByteLength?: number): Promise<Buffer>;
}
declare abstract class BaseContext implements Context {
    abstract readonly protocol: "http1" | "http2";
    abstract get url(): URL | undefined;
    abstract get hostname(): string | undefined;
    abstract get method(): string | undefined;
    abstract get path(): string | undefined;
    abstract readonly headers: IncomingHttpHeaders;
    abstract getData(maxByteLength?: number): Promise<Buffer>;
    abstract respond(status: number, options?: {
        headers?: OutgoingHttpHeaders;
        end?: boolean;
    }): this;
    abstract toPipe<S extends Stream>(stream: S): S;
    abstract end(data?: string | Uint8Array): this;
    abstract respondWithFile(path: string, method: string, options: {
        mimeType?: string;
        compressionEncoding?: SupportedEncoding;
        onError?: (code: number) => void;
    }): void;
    protected abstract fail(code: number, headers: OutgoingHttpHeaders, onError?: (code: number) => void): false;
    protected failWithCallback(code: number, onError: ((code: number) => void) | undefined, cb?: () => false | void): false;
    respondWithDynamicFile(path: string, method: string, { pageParams, onError, }: {
        pageParams?: any[];
        onError?: (code: number) => void;
    }): Promise<void>;
}
export declare class Http1Context extends BaseContext {
    readonly req: Http2ServerRequest;
    readonly res: Http2ServerResponse;
    readonly protocol = "http1";
    constructor(req: Http2ServerRequest, res: Http2ServerResponse);
    get url(): URL | undefined;
    get hostname(): string | undefined;
    get method(): string;
    get path(): string | undefined;
    get headers(): IncomingHttpHeaders;
    respond(status: number, options?: {
        headers?: OutgoingHttpHeaders;
        end?: boolean;
    }): this;
    toPipe<S extends Stream>(stream: S): S;
    end(data?: string | Uint8Array): this;
    protected fail(code: number, headers: OutgoingHttpHeaders, onError?: (code: number) => void): false;
    respondWithFile(path: string, method: string, { mimeType, compressionEncoding, onError, }: {
        mimeType?: string | undefined;
        compressionEncoding?: SupportedEncoding | undefined;
        onError?: ((code: number) => void) | undefined;
    }): Promise<unknown>;
    getData(maxByteLength?: number): Promise<Buffer>;
}
export declare class Http2Context extends BaseContext {
    readonly stream: ServerHttp2Stream;
    readonly headers: IncomingHttpHeaders;
    readonly protocol = "http2";
    constructor(stream: ServerHttp2Stream, headers: IncomingHttpHeaders);
    get url(): URL | undefined;
    get hostname(): string | undefined;
    get method(): string | undefined;
    get path(): string | undefined;
    respond(status: number, options?: {
        headers?: OutgoingHttpHeaders;
        end?: boolean;
    }): this;
    toPipe<S extends Stream>(stream: S): S;
    end(data?: string | Uint8Array): this;
    protected fail(code: number, headers: OutgoingHttpHeaders, onError?: (code: number) => void): false;
    respondWithFile(path: string, method: string, { mimeType, compressionEncoding, onError, }: {
        mimeType?: string | undefined;
        compressionEncoding?: SupportedEncoding | undefined;
        onError?: ((code: number) => void) | undefined;
    }): void;
    getData(maxByteLength?: number): Promise<Buffer>;
}
export {};
