import {createSecureServer, ServerHttp2Stream} from "http2";
import {MessageTypes} from "../utils/common/enums";
import messageProcessEvent from "../events/workers/process/message";
import {
  createHTTPServer,
  DEFAULT_SECURE_SERVER_OPTIONS,
  Http1Context,
  Http2Context,
  log,
} from "@server/core";
import config from "../config";
import {handleRequest} from "../utils/workers/functions";
import {APIParams, PageParams} from "../utils/workers/types";
import start from "../start/worker";

export default (() => {
  log("Worker lancé");

  const [pageParams, apiParams]: [PageParams, APIParams] = start();

  const secureServer = createSecureServer(DEFAULT_SECURE_SERVER_OPTIONS)
    .on("request", (req, res) => {
      if (req.httpVersionMajor < 2)
        handleRequest(new Http1Context(req, res), pageParams, apiParams);
    })
    .on("stream", (stream, headers) =>
      handleRequest(
        new Http2Context(stream as ServerHttp2Stream, headers),
        pageParams,
        apiParams,
      ),
    );

  createHTTPServer(config.httpPort);

  process
    .on("message", messageProcessEvent.bind(null, secureServer))
    .send?.({type: MessageTypes.RequestCert});
}) satisfies () => void;
