import {MessageTypes} from "../../../utils/common/enums";
import {hasProps, log, warn} from "@server/core";
import config from "../../../config";
import {Http2SecureServer} from "http2";

let ready = false;

export default ((server, message) => {
  if (!hasProps(message, {type: "number", data: "object"}))
    return warn("Message inconnu :", message);

  const data = message.data;

  switch (message.type) {
    case MessageTypes.UpdateCert:
      if (hasProps(data, {cert: "cert"})) {
        server.setSecureContext({
          cert: data.cert.cert,
          key: data.cert.key,
        });

        if (!ready)
          server.listen(config.httpsPort, config.hostname, () => {
            log("Serveur HTTPS lancé !");

            ready = true;
          });
      }
      break;
    default:
      warn(`Message inconnu (${message.type}) :`, message);
      break;
  }
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  server: Http2SecureServer,
  // eslint-disable-next-line no-unused-vars
  message: unknown,
) => void;
