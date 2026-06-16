import {error} from "@server/core";
import {APIHandler} from "../../utils/workers/types";
import config from "../../config";

export default (async (context, _headers, transporter) => {
  const maxByteLength = 1_000_000;

  context
    .getData(maxByteLength)
    .then((data) => {
      const stringifiedData = data.toString();

      const params = new URLSearchParams(stringifiedData),
        nom = params.get("nom"),
        email = params.get("email"),
        tel = params.get("tel"),
        service = params.get("service"),
        budget = params.get("budget"),
        descr = params.get("descr");

      transporter.sendMail(
        {
          from: config.smtpUser,
          to: config.smtpReceiver,
          subject: "Nouveau devis",
          text: `Nom: ${nom}\nEmail: ${email}\nTéléphone: ${tel ?? "aucun"}\nService: ${service ?? "aucun"}\nBudget: ${budget ?? "aucun"}\nDescription :\n${descr}`,
        },
        (err) => {
          if (err) {
            error("Erreur lors de l'envoi d'un mail", err);

            return context.respond(500, {end: true});
          }

          return context.respond(303, {headers: {location: "/"}, end: true});
        },
      );
    })
    .catch((reason) => {
      error(reason);

      return context
        .respond(413)
        .end(`Maximum allowed: ${maxByteLength} bytes`);
    });
}) satisfies APIHandler;
