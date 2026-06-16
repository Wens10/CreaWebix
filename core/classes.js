"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Http2Context = exports.Http1Context = void 0;
const fs_1 = require("fs");
const promises_1 = require("fs/promises");
const core_1 = require("@server/core");
const constants_js_1 = require("./constants.js");
class BaseContext {
    failWithCallback(code, onError, cb) {
        if (onError)
            try {
                onError(code);
                return false;
            }
            catch (err) {
                (0, core_1.error)("Erreur lors de l'envoi d'une réponse avec onError:", err);
            }
        return cb?.() ?? false;
    }
    async respondWithDynamicFile(path, method, { pageParams = [], onError, }) {
        try {
            const defaultExport = require(path)?.default;
            if (typeof defaultExport !== "function") {
                (0, core_1.error)(`L'export par défaut du fichier ${path} n'est pas une fonction.`);
                this.respond(500, { end: true });
            }
            else {
                const page = defaultExport(this, ...pageParams);
                if (page !== null &&
                    typeof page !== "string" &&
                    !(page instanceof Promise)) {
                    (0, core_1.error)(`La fonction du fichier ${path} doit renvoyer une string, null, ou une promise retournant une de ces valeurs.`);
                    this.respond(500, { end: true });
                }
                else {
                    const data = page instanceof Promise ? await page : page;
                    if (data === null)
                        return;
                    if (typeof data === "string") {
                        if (method !== "GET" && method !== "HEAD")
                            this.fail(405, { allow: "GET, HEAD" }, onError);
                        else {
                            this.respond(200, {
                                headers: {
                                    "content-type": constants_js_1.MIME_TYPES[".html"],
                                    "content-length": data.length,
                                },
                                end: method === "HEAD",
                            });
                            if (method === "GET")
                                this.end(data);
                        }
                    }
                    else {
                        (0, core_1.error)(`La fonction du fichier ${path} doit renvoyer une string, null, ou une promise retournant une de ces valeurs.`);
                        this.respond(500, { end: true });
                    }
                }
            }
        }
        catch (err) {
            if (!(0, core_1.hasProps)(err, { code: "string" }) || err.code !== "MODULE_NOT_FOUND")
                (0, core_1.error)("Erreur lors du chargement d'une page dynamique :", err);
            this.fail(500, {}, onError);
        }
    }
}
class Http1Context extends BaseContext {
    req;
    res;
    protocol = "http1";
    constructor(req, res) {
        super();
        this.req = req;
        this.res = res;
        this.req = req;
        this.res = res;
    }
    get url() {
        const host = this.req.headers.host;
        if (host)
            try {
                return new URL(this.req.url, `https://${host}`);
            }
            catch (error) {
                return undefined;
            }
        else
            return undefined;
    }
    get hostname() {
        return this.url?.hostname;
    }
    get method() {
        return this.req.method.toUpperCase();
    }
    get path() {
        return this.url?.pathname;
    }
    get headers() {
        return this.req.headers;
    }
    respond(status, options) {
        this.res.writeHead(status, options?.headers);
        if (options?.end)
            this.res.end();
        return this;
    }
    toPipe(stream) {
        stream.pipe(this.res);
        return stream;
    }
    end(data) {
        if (data)
            this.res.end(data);
        else
            this.res.end();
        return this;
    }
    fail(code, headers, onError) {
        return this.failWithCallback(code, onError, () => {
            this.respond(code, { end: true, headers });
        });
    }
    async respondWithFile(path, method, { mimeType, compressionEncoding = "identity", onError, }) {
        const finalPath = path +
            (compressionEncoding === "gzip"
                ? ".gz"
                : compressionEncoding === "br"
                    ? ".br"
                    : "");
        try {
            const stats = await (0, promises_1.stat)(finalPath);
            if (!stats.isFile())
                return this.fail(404, {}, onError);
            if (method !== "GET" && method !== "HEAD")
                return this.fail(405, { allow: "GET, HEAD" }, onError);
            if (!mimeType)
                return this.fail(415, {}, onError);
            this.respond(200, {
                headers: {
                    "content-type": mimeType,
                    "content-length": stats.size,
                    "content-encoding": compressionEncoding,
                    "last-modified": stats.mtime.toUTCString(),
                },
                end: method === "HEAD",
            });
            if (method === "GET")
                this.toPipe((0, fs_1.createReadStream)(finalPath)).on("error", (err) => {
                    (0, core_1.error)(`Erreur lors de la lecture du fichier ${finalPath}:`, err);
                    return this.res.destroy(err);
                });
            return;
        }
        catch (err) {
            (0, core_1.error)(`Erreur lors de la récupération des stats du fichier ${finalPath}`, err);
            if ((0, core_1.hasProps)(err, { code: "string" })) {
                if (err.code === "ENOENT" || err.code === "ENOTDIR")
                    return this.fail(404, {}, compressionEncoding && compressionEncoding !== "identity"
                        ? () => this.respondWithFile(path, method, { mimeType, onError })
                        : onError);
                if (err.code === "EACCES" || err.code === "EPERM")
                    return this.fail(403, {}, onError);
            }
            return this.fail(500, {}, onError);
        }
    }
    getData(maxByteLength = 1000) {
        return new Promise((resovle, reject) => {
            const contentLengthHeader = this.req.headers["content-length"];
            if (maxByteLength && contentLengthHeader) {
                const convertedContentLength = parseInt(contentLengthHeader);
                if (!isNaN(convertedContentLength) &&
                    convertedContentLength > maxByteLength)
                    return reject(new Error("Body trop grand"));
            }
            let data = Buffer.from([]), rejected = false;
            this.req
                .on("data", (chunk) => {
                if (!rejected) {
                    data = Buffer.concat([
                        data,
                        typeof chunk === "string" ? Buffer.from(chunk) : chunk,
                    ]);
                    if (maxByteLength && data.byteLength > maxByteLength) {
                        rejected = true;
                        return reject(new Error("Body trop grand"));
                    }
                }
            })
                .on("end", () => !rejected && resovle(data));
        });
    }
}
exports.Http1Context = Http1Context;
class Http2Context extends BaseContext {
    stream;
    headers;
    protocol = "http2";
    constructor(stream, headers) {
        super();
        this.stream = stream;
        this.headers = headers;
        this.stream = stream;
        this.headers = headers;
    }
    get url() {
        const host = this.headers[":authority"], path = this.headers[":path"];
        if (host && path)
            try {
                return new URL(path, `https://${host}`);
            }
            catch (error) {
                return undefined;
            }
        else
            return undefined;
    }
    get hostname() {
        return this.url?.hostname;
    }
    get method() {
        return this.headers[":method"]?.toUpperCase();
    }
    get path() {
        return this.url?.pathname;
    }
    respond(status, options) {
        this.stream.respond({ ...options?.headers, ":status": status }, { endStream: options?.end });
        return this;
    }
    toPipe(stream) {
        stream.pipe(this.stream);
        return stream;
    }
    end(data) {
        if (data)
            this.stream.end(data);
        else
            this.stream.end();
        return this;
    }
    fail(code, headers, onError) {
        return this.failWithCallback(code, onError, () => {
            if (!this.stream.headersSent) {
                try {
                    this.respond(code, { end: true, headers });
                }
                catch (err) {
                    (0, core_1.error)("Erreur lors de l'envoi d'une réponse avec respond:", err);
                    try {
                        this.stream.close();
                    }
                    catch (err) {
                        (0, core_1.error)("Erreur lors de la fermeture d'un stream :", err);
                    }
                }
                return false;
            }
            try {
                this.stream.close();
            }
            catch (err) {
                (0, core_1.error)("Erreur lors de la fermeture d'un stream :", err);
            }
            return false;
        });
    }
    respondWithFile(path, method, { mimeType, compressionEncoding, onError, }) {
        const finalPath = path +
            (compressionEncoding === "gzip"
                ? ".gz"
                : compressionEncoding === "br"
                    ? ".br"
                    : "");
        this.stream.respondWithFile(finalPath, {
            "content-type": mimeType,
            "content-encoding": compressionEncoding,
        }, {
            statCheck: (stats, headers) => {
                headers["last-modified"] = stats.mtime.toUTCString();
                headers["content-length"] = stats.size;
                if (!stats.isFile())
                    return this.fail(404, {}, onError);
                if (method !== "GET" && method !== "HEAD")
                    return this.fail(405, { allow: "GET, HEAD" }, onError);
                if (!mimeType)
                    return this.fail(415, {}, onError);
                if (method === "HEAD") {
                    this.respond(200, { headers, end: true });
                    return false;
                }
                return true;
            },
            onError: (err) => {
                (0, core_1.error)(`Erreur lors de l'envoi du fichier ${finalPath}`, err);
                if (err.code === "ENOENT" || err.code === "ENOTDIR")
                    return this.fail(404, {}, compressionEncoding && compressionEncoding !== "identity"
                        ? () => this.respondWithFile(path, method, {
                            mimeType,
                            onError,
                        })
                        : onError);
                else if (err.code === "EACCES" || err.code === "EPERM")
                    return this.fail(403, {}, onError);
                else
                    return this.fail(500, {}, onError);
            },
        });
    }
    getData(maxByteLength = 1000) {
        return new Promise((resovle, reject) => {
            const contentLengthHeader = this.headers["content-length"];
            if (maxByteLength && contentLengthHeader) {
                const convertedContentLength = parseInt(contentLengthHeader);
                if (!isNaN(convertedContentLength) &&
                    convertedContentLength > maxByteLength)
                    return reject(new Error("Body trop grand"));
            }
            let data = Buffer.from([]), rejected = false;
            this.stream
                .on("data", (chunk) => {
                if (!rejected) {
                    data = Buffer.concat([
                        data,
                        typeof chunk === "string" ? Buffer.from(chunk) : chunk,
                    ]);
                    if (maxByteLength && data.byteLength > maxByteLength) {
                        rejected = true;
                        return reject(new Error("Body trop grand"));
                    }
                }
            })
                .on("end", () => !rejected && resovle(data));
        });
    }
}
exports.Http2Context = Http2Context;
