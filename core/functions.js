"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.error = error;
exports.warn = warn;
exports.hasProps = hasProps;
exports.isCertExpiringSoon = isCertExpiringSoon;
exports.compressFiles = compressFiles;
exports.compressFile = compressFile;
exports.updateCompressedFiles = updateCompressedFiles;
exports.deleteCompressedFiles = deleteCompressedFiles;
exports.isSupportedExtname = isSupportedExtname;
exports.isSupportedEncoding = isSupportedEncoding;
exports.isSupportedEncodingPair = isSupportedEncodingPair;
exports.chooseEncoding = chooseEncoding;
exports.createHTTPServer = createHTTPServer;
exports.resolveAPIRequest = resolveAPIRequest;
exports.resolveResourceRequest = resolveResourceRequest;
const tslib_1 = require("tslib");
const cluster_1 = tslib_1.__importDefault(require("cluster"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const zlib_1 = require("zlib");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const constants_js_1 = require("./constants.js");
const http_1 = require("http");
const fs_1 = require("fs");
const paths_js_1 = require("./paths.js");
const logId = `${cluster_1.default.isPrimary ? "Master" : "Worker"} | ${process.pid} \t|`, isValid = {
    array: (value) => Array.isArray(value),
    buffer: (value) => Buffer.isBuffer(value) ||
        (hasProps(value, { type: "string", data: "number[]" }) &&
            value.type === "Buffer"),
    cert: (value) => hasProps(value, { cert: "buffer", key: "buffer" }),
    null: (value) => value === null,
    object: (value) => typeof value === "object" && value !== null && !Array.isArray(value),
    site: (value) => isValid.array(value) &&
        isValid.string(value[0]) &&
        (isValid.cert(value[1]) || isValid.null(value[1])),
    unknown: (_value) => true,
    bigint: (value) => typeof value === "bigint",
    boolean: (value) => typeof value === "boolean",
    function: (value) => typeof value === "function",
    number: (value) => typeof value === "number",
    string: (value) => typeof value === "string",
    symbol: (value) => typeof value === "symbol",
    undefined: (value) => typeof value === "undefined",
};
function output(level, message, ...optionalParams) {
    const args = [
        new Date().toISOString(),
        "|",
        level.padEnd(5, " "),
        "|",
        logId,
        message,
        ...optionalParams,
    ];
    console[level.toLowerCase()](...args);
}
function log(message, ...optionalParams) {
    output("INFO", message, ...optionalParams);
}
function error(message, ...optionalParams) {
    output("ERROR", message, ...optionalParams);
}
function warn(message, ...optionalParams) {
    output("WARN", message, ...optionalParams);
}
function hasProps(obj, props) {
    if (!isValid.object(obj))
        return false;
    for (const [key, rawType] of Object.entries(props)) {
        if (!(key in obj))
            return false;
        const isArray = rawType.endsWith("[]"), type = rawType.replace(/\[\]$/, ""), value = obj[key];
        if (isArray) {
            if (!isValid.array(value))
                return false;
            else if (!value.every((subValue) => isValid[type](subValue)))
                return false;
            if (type === "buffer")
                obj[key] = value.map((buffer) => Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer.data));
            continue;
        }
        if (!isValid[type](value))
            return false;
        if (type === "buffer")
            obj[key] = Buffer.isBuffer(value)
                ? value
                : Buffer.from(value.data);
    }
    return true;
}
function isCertExpiringSoon(path, { thresholdMs = 864000000 }) {
    try {
        const notAfterStr = /notAfter=(.+)/.exec((0, child_process_1.execSync)(`openssl x509 -enddate -noout -in ${path}`, {
            stdio: ["ignore", "pipe", "pipe"],
            encoding: "utf8",
        }))?.[1];
        return (!notAfterStr || new Date(notAfterStr).getTime() - Date.now() < thresholdMs);
    }
    catch (err) {
        error(`Erreur lors de la vérification du certificat (${path}) :`, err);
        return true;
    }
}
const brotliCompressAsync = (0, util_1.promisify)(zlib_1.brotliCompress), gzipAsync = (0, util_1.promisify)(zlib_1.gzip);
async function compressFiles(dirPath, fileExtentions) {
    try {
        for (const file of await (0, promises_1.readdir)(dirPath)) {
            const filePath = `${dirPath}/${file}`, stats = await (0, promises_1.stat)(filePath);
            if (stats.isDirectory())
                await compressFiles(filePath, fileExtentions);
            else if (stats.isFile() && fileExtentions.includes((0, path_1.extname)(file)))
                await compressFile(filePath);
        }
    }
    catch (err) {
        error(`Erreur sur le dossier ${dirPath}:`, err);
    }
}
async function compressFile(filePath) {
    try {
        const data = await (0, promises_1.readFile)(filePath), [brotliResult, gzipResult] = await Promise.all([
            brotliCompressAsync(data),
            gzipAsync(data),
        ]);
        await Promise.all([
            (0, promises_1.writeFile)(`${filePath}.br`, brotliResult),
            (0, promises_1.writeFile)(`${filePath}.gz`, gzipResult),
        ]);
    }
    catch (err) {
        error(`Erreur sur le fichier ${filePath}:`, err);
    }
}
async function updateCompressedFiles(dirPath) {
    try {
        for (const file of await (0, promises_1.readdir)(dirPath)) {
            const filePath = `${dirPath}/${file}`, stats = await (0, promises_1.stat)(filePath), fileExtension = (0, path_1.extname)(file);
            if (stats.isDirectory())
                await updateCompressedFiles(filePath);
            else if (stats.isFile() &&
                constants_js_1.COMPRESSED_FILE_EXTENSIONS.includes(fileExtension)) {
                try {
                    if (Math.floor((await (0, promises_1.stat)(`${dirPath}/${(0, path_1.basename)(file, fileExtension)}`))
                        .mtimeMs) > Math.floor(stats.mtimeMs))
                        await compressFile(filePath);
                }
                catch (err) {
                    try {
                        await (0, promises_1.unlink)(filePath);
                    }
                    catch (err) {
                        error(`Impossible de supprimer ${filePath}:`, err);
                    }
                }
            }
        }
    }
    catch (err) {
        error(`Erreur lors de la mise à jour des fichiers compressé du dossier ${dirPath}:`, err);
    }
}
async function deleteCompressedFiles(dirPath) {
    try {
        for (const file of await (0, promises_1.readdir)(dirPath)) {
            const filePath = `${dirPath}/${file}`, stats = await (0, promises_1.stat)(filePath);
            if (stats.isDirectory())
                deleteCompressedFiles(filePath);
            else if (stats.isFile() &&
                constants_js_1.COMPRESSED_FILE_EXTENSIONS.includes((0, path_1.extname)(file)))
                (0, promises_1.unlink)(filePath).catch((reason) => {
                    error(`Le fichier ${dirPath}/${file} n'a pas pu être supprimé:`, reason);
                });
        }
    }
    catch (err) {
        error(`Erreur lors de la suppression des fichiers compressé du dossier ${dirPath}:`, err);
    }
}
function isSupportedExtname(extname) {
    return constants_js_1.SUPPORTED_EXTNAMES.includes(extname);
}
function isSupportedEncoding(encoding) {
    return constants_js_1.SUPPORTED_ENCODING.includes(encoding);
}
function isSupportedEncodingPair(pair) {
    return isSupportedEncoding(pair[0]);
}
function chooseEncoding(acceptEncodingHeader) {
    const encoding = acceptEncodingHeader
        .split(",")
        .map((v) => {
        const [enc, q] = v.trim().split(";q=");
        return [enc ?? "identity", parseFloat(q ?? "1")];
    })
        .filter(isSupportedEncodingPair)
        .sort(([encA, qA], [encB, qB]) => qB - qA ||
        constants_js_1.SUPPORTED_ENCODING.indexOf(encA) - constants_js_1.SUPPORTED_ENCODING.indexOf(encB))[0]?.[0];
    return encoding === "*" ? constants_js_1.SUPPORTED_ENCODING[0] : encoding;
}
function createHTTPServer(port) {
    (0, http_1.createServer)((req, res) => {
        const host = req.headers.host;
        if (!host)
            return res
                .writeHead(400, { "content-type": "text/plain" })
                .end("Bad Request");
        const { href, pathname } = new URL(`https://${host}${req.url ?? "/"}`);
        if (pathname.startsWith("/.well-known/acme-challenge/")) {
            const acmeFile = (0, path_1.join)(paths_js_1.certChallengesDirPath, pathname);
            if ((0, fs_1.existsSync)(acmeFile) && (0, fs_1.statSync)(acmeFile).isFile()) {
                res.writeHead(200, { "Content-Type": "text/plain" });
                (0, fs_1.createReadStream)(acmeFile)
                    .on("error", (err) => {
                    error(`Erreur lors de la lecture du fichier ${acmeFile}:`, err);
                    if (!res.headersSent)
                        res.writeHead(500).end("Erreur lors de la lecture du fichier");
                })
                    .pipe(res);
            }
            else
                res.writeHead(404).end("Not Found");
            return;
        }
        return res
            .writeHead(301, { "location": href, "content-type": "text/plain" })
            .end(`Redirecting to ${href}`);
    }).listen(port, () => log("Serveur HTTP lancé !"));
}
async function resolveAPIRequest(resourceDir, context, path, method, params) {
    const resourcePath = (0, path_1.join)(resourceDir, path), handlerPath = (0, path_1.join)(resourcePath, `${method.toLowerCase()}.js`);
    try {
        const defaultExport = require(handlerPath)?.default;
        if (typeof defaultExport !== "function") {
            error(`L'export par défaut du fichier ${handlerPath} n'est pas une fonction.`);
            context.respond(500, { end: true });
        }
        else
            defaultExport(context, context.headers, ...params);
    }
    catch (err) {
        error(`Erreur lors du chargement du fichier ${handlerPath}:`, err);
        if (await (0, promises_1.access)(resourcePath)
            .then(() => true)
            .catch(() => false))
            try {
                const allowedMethods = (await (0, promises_1.readdir)(resourcePath))
                    .map((file) => (0, path_1.parse)(file).name.toUpperCase())
                    .filter((method) => constants_js_1.SUPPORTED_METHODS.includes(method));
                context.respond(405, {
                    headers: { allow: allowedMethods.join(", ") },
                    end: true,
                });
            }
            catch (error) {
                context.respond(500, { end: true });
            }
        else
            context.respond(404, { end: true });
    }
}
function resolveResourceRequest(resourceDir, context, path, method, pageParams, shouldSkipCompression) {
    const dirIsString = typeof resourceDir === "string", pagePath = (0, path_1.join)(dirIsString ? (0, path_1.join)(resourceDir, "/pages") : resourceDir.dynamicPages, `${path === "/" ? "/index" : (0, path_1.extname)(path) == ".html" ? path.slice(0, -5) : path}.js`);
    context.respondWithDynamicFile(pagePath, method, {
        pageParams,
        onError: async () => {
            const filePath = (0, path_1.join)(dirIsString ? (0, path_1.join)(resourceDir, "/public") : resourceDir.staticPages, (0, path_1.extname)(path) === ""
                ? `${path === "/" ? "/index" : path}.html`
                : path), fileExtname = (0, path_1.extname)(filePath), encoding = context.headers["accept-encoding"]
                ? chooseEncoding(context.headers["accept-encoding"])
                : undefined;
            context.respondWithFile(filePath, method, {
                compressionEncoding: (await shouldSkipCompression?.(filePath)) ||
                    !constants_js_1.FILE_EXTENSIONS_TO_COMPRESS.includes(fileExtname)
                    ? undefined
                    : encoding,
                mimeType: isSupportedExtname(fileExtname)
                    ? constants_js_1.MIME_TYPES[fileExtname]
                    : undefined,
                onError: async (code) => {
                    const errorPath = (0, path_1.join)(dirIsString ? (0, path_1.join)(resourceDir, "/errors") : resourceDir.errorPages, `${code}.html`);
                    context.respondWithFile(errorPath, method, {
                        compressionEncoding: (await shouldSkipCompression?.(errorPath))
                            ? undefined
                            : encoding,
                        mimeType: constants_js_1.MIME_TYPES[".html"],
                    });
                },
            });
        },
    });
}
