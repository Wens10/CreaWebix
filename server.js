import { constants, createSecureServer, Http2ServerRequest, Http2ServerResponse } from "http2";
import { brotliCompress, deflate, gzip, zstdCompress } from "zlib";
import config from "./config.json" with { type: "json" };
import { createReadStream, mkdirSync, readdir, readdirSync, readFile, readFileSync, unlinkSync, writeFile } from "fs";
import { dirname, extname, join } from "path";
import { fileURLToPath } from "url";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { createTransport } from "nodemailer";

const { certPath, keyPath, port, emailSenderConfig } = config,
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
},
transporter = createTransport({
	host: emailSenderConfig.host,
	port: emailSenderConfig.port,
	auth: {
		pass: emailSenderConfig.password,
		user: emailSenderConfig.sender
	},
	secure: true
}),
COMPONENT_REGEX = /(?<!\\)(?:\\\\)*\[[A-z]+\]/g;

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
 * @param { string } filePath 
 */
function compressHTMLFile(filePath) {
	readFile(filePath, (err, data) => {
		if (err) console.log(`[compressDir] readFile (${dest})`, err);
		else resolveHTMLComponents(data.toString()).then(res => {
			const dest = filePath.replace("src", "dist");

			writeFile(dest, res, err => {
				if (err) console.log(`[compressDir] writeFile (${dest})`, err);
			});
			
			brotliCompress(res, (err, res) => {
				if (err) console.log(`[compressDir] brotliCompress (${dest})`, err);
				else writeFile(`${dest}.br`, res, err => {
					if (err) console.log(`[compressDir] writeFile brotliCompress (${dest})`, err);
				});
			});

			zstdCompress(res, (err, res) => {
				if (err) console.log(`[compressDir] zstdCompress (${dest})`, err);
				else writeFile(`${dest}.zst`, res, err => {
					if (err) console.log(`[compressDir] writeFile zstdCompress (${dest})`, err);
				});
			});

			deflate(res, (err, res) => {
				if (err) console.log(`[compressDir] deflate (${dest})`, err);
				else writeFile(`${dest}.deflate`, res, err => {
					if (err) console.log(`[compressDir] writeFile deflate (${dest})`, err);
				});
			});

			gzip(res, (err, res) => {
				if (err) console.log(`[compressDir] gzip (${dest})`, err);
				else writeFile(`${dest}.gz`, res, err => {
					if (err) console.log(`[compressDir] writeFile gzip (${dest})`, err);
				});
			});
		}).catch(reason => console.log(`[compressDir] resolveHTMLComponents (${filePath})`, reason));
	});
};

/**
 * @param { string } dirPath 
 * @param { { except?: string[], method?: Function } } options 
 */
function compressDir(dirPath, options) {
	const except = options?.except || [], method = options?.method || compressFile;

	readdir(dirPath, (err, files) => {		
		if (err) console.log(`[compressDir] readdir (${dirPath})`, err);
		else files.filter(file => !except.includes(file)).forEach(file => method(`${dirPath}/${file}`));
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
			// Forms
			case "/message":
				switch (method) {
					case "POST":
						let data = "";

						req.on("data", chunk => data += chunk).on("end", () => {
							const params = new URLSearchParams(data),
							nom = params.get("nom"),
							email = params.get("email"),
							tel = params.get("tel"),
							service = params.get("service"),
							budget = params.get("budget"),
							descr = params.get("descr");

							transporter.sendMail({
								from: emailSenderConfig.sender,
								to: emailSenderConfig.receiver,
								subject: "Nouveau devis",
								text: `Nom: ${nom}\nEmail: ${email}\nTéléphone: ${tel || "aucun"}\nService: ${service || "aucun"}\nBudget: ${budget || "aucun"}\nDescription :\n${descr}`
							}, err => {
								if (err) console.error("[sendMail]", err);

								res.writeHead(303, { location: "/" }).end();
							});
						});
						break;
					default:
						res.writeHead(405, { allow: "POST" }).end();
						break;
				};
			break;
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
						readFile(`./dist/pages/index.html${fileExts[encoding]}`, (err, data) => {
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
						readFile(`./dist/pages/service-applications.html${fileExts[encoding]}`, (err, data) => {
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
						readFile(`./dist/pages/service-ecommerce.html${fileExts[encoding]}`, (err, data) => {
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
						readFile(`./dist/pages/service-maintenance.html${fileExts[encoding]}`, (err, data) => {
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
						readFile(`./dist/pages/service-seo.html${fileExts[encoding]}`, (err, data) => {
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
						readFile(`./dist/pages/service-uiux.html${fileExts[encoding]}`, (err, data) => {
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
						readFile(`./dist/pages/service-vitrine.html${fileExts[encoding]}`, (err, data) => {
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

/**
 * @param { string } data 
 */
function resolveHTMLComponents(data) {
	let newData = data, componentsLoaded = 0;

	const components = data.match(COMPONENT_REGEX);

	return new Promise((resolve, reject) => {
		if (components) for (const component of components) {
			const componentName = component.replace(/[\\\[\]]/g, "");

			readFile(`./src/components/${componentName}.html`, (err, data) => {
				if (err) reject(err);
				else {
					newData = newData.replace(component, data);

					componentsLoaded++;

					if (components.length === componentsLoaded) resolve(newData);
				};
			});
		}
		else resolve(newData);
	});
};

mkdirSync("./dist/pages", { recursive: true });

cleanCompressedFiles(__dirname);

compressDir("./CSS");
compressDir("./JS");
compressDir("./src/pages", { method: compressHTMLFile });

// HTTPS Server
if (certPath && keyPath) createSecureServer({
	allowHTTP1: true,
	cert: readFileSync(certPath),
	key: readFileSync(keyPath)
}, handleHttp1Request).on("stream", (stream, headers) => {
	const path = headers[":path"], method = headers[":method"], encoding = headers["accept-encoding"] ? chooseEncoding(headers["accept-encoding"]) : "identity";

	if (!implementedMethods.includes(method)) return stream.respond({ ":status": 501 }, { endStream: true });

	switch (path) {
		// Forms
		case "/message":
			switch (method) {
				case "POST":
					let data = "";

					stream.on("data", chunk => data += chunk).on("end", () => {
						const params = new URLSearchParams(data),
						nom = params.get("nom"),
						email = params.get("email"),
						tel = params.get("tel"),
						service = params.get("service"),
						budget = params.get("budget"),
						descr = params.get("descr");

						transporter.sendMail({
							from: emailSenderConfig.sender,
							to: emailSenderConfig.receiver,
							subject: "Nouveau devis",
							text: `Nom: ${nom}\nEmail: ${email}\nTéléphone: ${tel || "aucun"}\nService: ${service || "aucun"}\nBudget: ${budget || "aucun"}\nDescription :\n${descr}`
						}, err => {
							if (err) console.error("[sendMail]", err);

							stream.respond({ ":status": 303, location: "/" }, { endStream: true });
						});
					});
					break;
				default:
					stream.respond({ ":status": 405, allow: "POST" }, { endStream: true });
					break;
			};
			break;
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

					createReadStream(`./dist/pages/index.html${fileExts[encoding]}`).on("error", (err) => {
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

					createReadStream(`./dist/pages/service-applications.html${fileExts[encoding]}`).on("error", (err) => {
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

					createReadStream(`./dist/pages/service-ecommerce.html${fileExts[encoding]}`).on("error", (err) => {
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

					createReadStream(`./dist/pages/service-maintenance.html${fileExts[encoding]}`).on("error", (err) => {
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

					createReadStream(`./dist/pages/service-seo.html${fileExts[encoding]}`).on("error", (err) => {
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

					createReadStream(`./dist/pages/service-uiux.html${fileExts[encoding]}`).on("error", (err) => {
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

					createReadStream(`./dist/pages/service-vitrine.html${fileExts[encoding]}`).on("error", (err) => {
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