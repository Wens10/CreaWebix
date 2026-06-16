import {readFile} from "fs/promises";
import {certChallengesDirPath, error, isCertExpiringSoon} from "@server/core";
import {Worker} from "cluster";
import {MessageTypes} from "../../common/enums";
import {execSync} from "child_process";
import {sendMessageToWorkers} from "./others";
import config from "../../../config";
import {join} from "path";
import {setCert} from "../../common/functions";

const domain = config.domain,
  generateCertCommand =
    config.certType === "certbot"
      ? `certbot certonly --webroot -w ${certChallengesDirPath} -d ${domain} --agree-tos --non-interactive --quiet --preferred-challenges http`
      : `openssl ecparam -genkey -name prime256v1 -out ${config.certDirPath}/privkey.pem && openssl req -new -x509 -key ${config.certDirPath}/privkey.pem -out ${config.certDirPath}/fullchain.pem -days 90 -subj "/CN=fallback.invalid"`;

function generateCert(): void {
  try {
    execSync(generateCertCommand, {
      stdio: ["ignore", "ignore", "pipe"],
    });
  } catch (err) {
    error(`Erreur lors de la génération du certificat (${domain}) :`, err);

    throw err;
  }
}

export async function ensureSiteCertificate(
  workers: NodeJS.Dict<Worker>,
  throwOnError = false,
) {
  const certPath = join(config.certDirPath, "fullchain.pem");

  try {
    if (isCertExpiringSoon(certPath, {})) generateCert();

    sendMessageToWorkers(
      Object.values(workers).filter((worker) => worker !== undefined),
      {
        type: MessageTypes.UpdateCert,
        data: {
          cert: setCert({
            cert: await readFile(certPath),
            key: await readFile(join(config.certDirPath, "privkey.pem")),
          }),
        },
      },
    );
  } catch (err) {
    if (throwOnError) throw err;

    error(
      "Erreur lors de la lecture de la clé et/ou du certificat du site :",
      err,
    );
  }
}
