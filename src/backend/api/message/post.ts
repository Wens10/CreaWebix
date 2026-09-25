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
          // Gmail refuse d'envoyer au nom d'une autre adresse : on envoie depuis
          // notre compte et on met le client en "Répondre à"
          from: {
            name: `${nom ?? "Client"} via CreaWebix`,
            address: config.smtpUser,
          },
          to: config.smtpReceiver,
          ...(email ? {replyTo: {name: nom ?? "", address: email}} : {}),
          subject: `Nouveau devis${nom ? ` - ${nom}` : ""}`,
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
