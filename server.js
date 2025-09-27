import { constants, createSecureServer, Http2ServerRequest, Http2ServerResponse } from "http2";
import { brotliCompress, deflate, gzip, zstdCompress } from "zlib";
import config from "./config.json" with { type: "json" };
import { createReadStream, readdir, readdirSync, readFile, readFileSync, unlinkSync, writeFile } from "fs";
import { dirname, extname, join } from "path";
import { fileURLToPath } from "url";
import { createServer, IncomingMessage, ServerResponse } from "http";

const { certPath, keyPath, port } = config,
supportedEncoding = ["br", "zstd", "gzip", "deflate", "*"],
extensionsToDelete = [".zst", ".br", ".deflate", ".gz"],
__dirname = dirname(fileURLToPath(import.meta.url)),
implementedMethods = ["GET", "HEAD", "POST"],
fileExts = {
	br: ".br",
	gzip: ".gz",
	zstd: ".zst",
	deflate: ".deflate",
	identity: ""
},
defaultHeaders = {
	HTML: {
		"content-type": "text/html; charset=UTF-8",
		"content-language": "fr",
	},
	CSS: {
		"content-type": "text/css; charset=UTF-8"
	},
	JS: {
		"content-type": "application/javascript; charset=UTF-8"
	},
};

function cleanCompressedFiles(dir) {
  const items = readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = join(dir, item.name);

		if (item.isDirectory()) cleanCompressedFiles(fullPath);
    else if (item.isFile() && extensionsToDelete.includes(extname(item.name).toLowerCase())) {
      try {
        unlinkSync(fullPath);
      } catch (err) {
        console.error(`Erreur lors de la suppression de ${fullPath} :`, err);
      };
    };
  };
};

/**
 * @param { string } filePath 
 */
function compressFile(filePath) {
	readFile(filePath, (err, data) => {			
		if (err) console.log(`[compressDir] readFile (${filePath})`, err);
		else {		
			brotliCompress(data, (err, res) => {
				if (err) console.log(`[compressDir] brotliCompress (${filePath})`, err);
				else writeFile(`${filePath}.br`, res, err => {
					if (err) console.log(`[compressDir] writeFile brotliCompress (${filePath})`, err);
				});
			});

			zstdCompress(data, (err, res) => {
				if (err) console.log(`[compressDir] zstdCompress (${filePath})`, err);
				else writeFile(`${filePath}.zst`, res, err => {
					if (err) console.log(`[compressDir] writeFile zstdCompress (${filePath})`, err);
				});
			});

			deflate(data, (err, res) => {
				if (err) console.log(`[compressDir] deflate (${filePath})`, err);
				else writeFile(`${filePath}.deflate`, res, err => {
					if (err) console.log(`[compressDir] writeFile deflate (${filePath})`, err);
				});
			});

			gzip(data, (err, res) => {
				if (err) console.log(`[compressDir] gzip (${filePath})`, err);
				else writeFile(`${filePath}.gz`, res, err => {
					if (err) console.log(`[compressDir] writeFile gzip (${filePath})`, err);
				});
			});
		};
	});
};

/**
 * @param { string } dirPath 
 * @param { string[] } except 
 */
function compressDir(dirPath, except = []) {
	readdir(dirPath, (err, files) => {		
		if (err) console.log(`[compressDir] readdir (${dirPath})`, err);
		else files.filter(file => !except.includes(file)).forEach(file => compressFile(`${dirPath}/${file}`));
	});
};

/**
 * @param { string } header Accept-Encoding
 * @returns { string | null }
 */
function chooseEncoding(header) {
	const encoding = header
		.split(",")
		.map(v => {
			const [enc, qV] = v.trim().split(";q=");

			return [enc, parseFloat(qV || "1")];
		})
		.filter(v => supportedEncoding.includes(v[0]))
		.sort((a, b) => (b[1] - a[1]) || supportedEncoding.indexOf(a[0]) - supportedEncoding.indexOf(b[0]))[0]?.[0];

	return encoding ? encoding == "*" ? supportedEncoding[0] : encoding : null;
};

/**
 * @param { Http2ServerRequest | IncomingMessage } req 
 * @param { Http2ServerResponse<Http2ServerRequest> | ServerResponse } res 
 */
function handleHttp1Request(req, res) {
  if (req.httpVersion === "1.1") {
		const path = new URL(`http://localhost${req.url}`).pathname, method = req.method, encoding = req.headers["accept-encoding"] ? chooseEncoding(req.headers["accept-encoding"]) : "identity";

		if (!implementedMethods.includes(method)) return res.writeHead(501).end();

		switch (path) {
			// Images
			case "/IMAGES/360_F_214539232_YnUrtuwUEt84gHuU0qG8l7OwZvH4rnPG.jpg":
				switch (method) {
					case "GET":
						readFile(`./IMAGES/360_F_214539232_YnUrtuwUEt84gHuU0qG8l7OwZvH4rnPG.jpg`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { "content-type": "image/jpeg" }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { "content-type": "image/jpeg" }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			// Icons
			case "/ICONS/code.png":
				switch (method) {
					case "GET":
						readFile(`./ICONS/code.png`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { "content-type": "image/png" }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { "content-type": "image/png" }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			case "/ICONS/mobile.png":
				switch (method) {
					case "GET":
						readFile(`./ICONS/mobile.png`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { "content-type": "image/png" }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { "content-type": "image/png" }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			case "/ICONS/palette.png":
				switch (method) {
					case "GET":
						readFile(`./ICONS/palette.png`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { "content-type": "image/png" }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { "content-type": "image/png" }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			// JS
			case "/JS/burgermenu.js":
				switch (method) {
					case "GET":
						readFile(`./JS/burgermenu.js${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.JS, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.JS, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			// CSS
			case "/CSS/services.css":
				switch (method) {
					case "GET":
						readFile(`./CSS/services.css${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.CSS, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.CSS, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
					break;
				};
				break;
			case "/CSS/style.css":
				switch (method) {
					case "GET":
						readFile(`./CSS/style.css${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.CSS, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.CSS, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			// Pages
			case "/":
				switch (method) {
					case "GET":
						readFile(`./PAGES/index.html${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			case "/service-applications":
				switch (method) {
					case "GET":
						readFile(`./PAGES/service-applications.html${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			case "/service-ecommerce":
				switch (method) {
					case "GET":
						readFile(`./PAGES/service-ecommerce.html${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			case "/service-maintenance":
				switch (method) {
					case "GET":
						readFile(`./PAGES/service-maintenance.html${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			case "/service-seo":
				switch (method) {
					case "GET":
						readFile(`./PAGES/service-seo.html${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			case "/service-uiux":
				switch (method) {
					case "GET":
						readFile(`./PAGES/service-uiux.html${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			case "/service-vitrine":
				switch (method) {
					case "GET":
						readFile(`./PAGES/service-vitrine.html${fileExts[encoding]}`, (err, data) => {
							if (err) {
								console.error(`GET ${path}`, err);

								res.writeHead(500).end();
							} else res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end(data);
						});
						break;
					case "HEAD":
						res.writeHead(200, { ...defaultHeaders.HTML, "content-encoding": encoding }).end();
						break;
					default:
						res.writeHead(405, { allow: "GET, HEAD" }).end();
						break;
				};
				break;
			default:
				res.writeHead(404).end();
				break;
		};
  };
};

cleanCompressedFiles(__dirname);

compressDir("./CSS");
compressDir("./JS");
compressDir("./PAGES");

// HTTPS Server
if (certPath && keyPath) createSecureServer({
	allowHTTP1: true,
	cert: readFileSync(certPath),
	key: readFileSync(keyPath)
}, handleHttp1Request).on("stream", (stream, headers) => {
	const path = headers[":path"], method = headers[":method"], encoding = headers["accept-encoding"] ? chooseEncoding(headers["accept-encoding"]) : "identity";

	if (!implementedMethods.includes(method)) return stream.respond({ ":status": 501 }, { endStream: true });

	switch (path) {
		// Images
		case "/IMAGES/360_F_214539232_YnUrtuwUEt84gHuU0qG8l7OwZvH4rnPG.jpg":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, "content-type": "image/jpeg" });

					createReadStream(`./IMAGES/360_F_214539232_YnUrtuwUEt84gHuU0qG8l7OwZvH4rnPG.jpg`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, "content-type": "image/jpeg" }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		// Icons
		case "/ICONS/code.png":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, "content-type": "image/png" });

					createReadStream(`./ICONS/code.png`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, "content-type": "image/png" }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/ICONS/mobile.png":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, "content-type": "image/png" });

					createReadStream(`./ICONS/mobile.png`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, "content-type": "image/png" }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/ICONS/palette.png":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, "content-type": "image/png" });

					createReadStream(`./ICONS/palette.png`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, "content-type": "image/png" }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		// JS
		case "/JS/burgermenu.js":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.JS, "content-encoding": encoding });

					createReadStream(`./JS/burgermenu.js${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.JS, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		// CSS
		case "/CSS/services.css":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.CSS, "content-encoding": encoding });

					createReadStream(`./CSS/services.css${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.CSS, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/CSS/style.css":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.CSS, "content-encoding": encoding });

					createReadStream(`./CSS/style.css${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.CSS, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		// Pages
		case "/":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding });

					createReadStream(`./PAGES/index.html${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/service-applications":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding });

					createReadStream(`./PAGES/service-applications.html${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/service-ecommerce":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding });

					createReadStream(`./PAGES/service-ecommerce.html${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/service-maintenance":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding });

					createReadStream(`./PAGES/service-maintenance.html${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/service-seo":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding });

					createReadStream(`./PAGES/service-seo.html${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/service-uiux":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding });

					createReadStream(`./PAGES/service-uiux.html${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		case "/service-vitrine":
			switch (method) {
				case "GET":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding });

					createReadStream(`./PAGES/service-vitrine.html${fileExts[encoding]}`).on("error", (err) => {
					  console.error(`GET ${path}`, err);

					  stream.close(constants.NGHTTP2_CANCEL);
					}).pipe(stream);
					break;
				case "HEAD":
					stream.respond({ ":status": 200, ...defaultHeaders.HTML, "content-encoding": encoding }, { endStream: true });
					break;
				default:
					stream.respond({ ":status": 405, allow: "GET, HEAD" }, { endStream: true });
					break;
			};
			break;
		default:
			stream.respond({ ":status": 404 }, { endStream: true });
			break;
	};
}).listen(port, () => console.log(`https://localhost:${port}`));
// HTTP Server
else createServer(handleHttp1Request).listen(port, () => console.log(`http://localhost:${port}`));