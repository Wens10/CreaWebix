import {createTransport} from "nodemailer";
import {APIParams, PageParams} from "../utils/workers/types";
import {error, log, warn} from "@server/core";
import config from "../config";

export default (() => {
  const transporter = createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    pool: true,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPassword,
    },
  });

  transporter.verify((err, success) => {
    if (err)
      return error(
        "Erreur lors de la vérification de la configuration SMTP",
        err,
      );

    if (success) log("Configuration SMTP valide");
    else warn("Configuration SMTP invalide");
  });

  return [[transporter], [transporter]];
}) satisfies () => [PageParams, APIParams];
