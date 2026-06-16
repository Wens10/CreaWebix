"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SECURE_SERVER_OPTIONS = exports.MIME_TYPES = exports.SUPPORTED_EXTNAMES = exports.SUPPORTED_ENCODING = exports.SUPPORTED_METHODS = exports.DEFAULT_WATCHER_OPTIONS = exports.COMPRESSED_FILE_EXTENSIONS = exports.FILE_EXTENSIONS_TO_COMPRESS = void 0;
exports.FILE_EXTENSIONS_TO_COMPRESS = [
    ".json",
    ".xml",
    ".svg",
    ".css",
    ".html",
    ".js",
    ".mjs",
];
exports.COMPRESSED_FILE_EXTENSIONS = [".br", ".gz"];
exports.DEFAULT_WATCHER_OPTIONS = {
    atomic: true,
    awaitWriteFinish: {
        stabilityThreshold: 500,
        pollInterval: 100,
    },
    alwaysStat: true,
    ignoreInitial: true,
    persistent: true,
    usePolling: false,
};
exports.SUPPORTED_METHODS = [
    "GET",
    "HEAD",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
    "TRACE",
    "PATCH",
];
exports.SUPPORTED_ENCODING = [
    "br",
    "gzip",
    "*",
    "identity",
];
exports.SUPPORTED_EXTNAMES = [
    ".json",
    ".pdf",
    ".xml",
    ".apng",
    ".gif",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".svgz",
    ".webp",
    ".css",
    ".html",
    ".js",
    ".mjs",
];
exports.MIME_TYPES = {
    ".json": "application/json; charset=utf-8",
    ".pdf": "application/pdf",
    ".xml": "application/xml; charset=utf-8",
    ".apng": "image/apng",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".svgz": "image/svg+xml",
    ".webp": "image/webp",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
};
exports.DEFAULT_SECURE_SERVER_OPTIONS = {
    allowHTTP1: true,
    cert: "",
    ciphers: [
        "TLS_AES_128_GCM_SHA256",
        "TLS_AES_256_GCM_SHA384",
        "TLS_CHACHA20_POLY1305_SHA256",
        "ECDHE-ECDSA-AES128-GCM-SHA256",
        "ECDHE-ECDSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES128-GCM-SHA256",
        "ECDHE-RSA-AES256-GCM-SHA384",
    ].join(":"),
    ecdhCurve: "X25519:prime256v1:secp384r1",
    honorCipherOrder: true,
    key: "",
    minVersion: "TLSv1.2",
    maxVersion: "TLSv1.3",
    rejectUnauthorized: false,
    requestCert: false,
    sigalgs: "ecdsa_secp256r1_sha256:ecdsa_secp384r1_sha384:rsa_pss_rsae_sha256:rsa_pkcs1_sha256",
};
