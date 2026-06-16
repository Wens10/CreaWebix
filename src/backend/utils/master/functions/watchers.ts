import {relative, resolve, sep} from "path";
import {watch} from "chokidar";
import {readFile} from "fs/promises";
import {sendMessageToWorkers} from "./others";
import {DEFAULT_WATCHER_OPTIONS, error, WatcherIgnoreFn} from "@server/core";
import {getCert, setCert} from "../../common/functions";
import cluster from "cluster";
import {MessageTypes} from "../../common/enums";
import config from "../../../config";
import {Stats} from "fs";

const validDomain = config.domain,
  certsDirPath = resolve(config.certDirPath);

async function updateCertificate(
  ignored: WatcherIgnoreFn,
  path: string,
  stats: Stats | undefined,
) {
  if (ignored(path, stats)) return;

  const resolvedPath = resolve(path);

  if (relative(certsDirPath, resolvedPath).split(sep)[0] === validDomain) {
    const certificat = getCert();

    let sendToWorker = false;

    if (resolvedPath.endsWith("privkey.pem"))
      try {
        const cert = setCert({
          cert: Buffer.from(""),
          ...certificat,
          key: await readFile(resolvedPath),
        });

        if (cert.cert.length !== 0) sendToWorker = true;
      } catch (err) {
        error(
          `Erreur lors de la lecture de la clé (voir les chemins dans ${resolvedPath}):`,
          err,
        );
      }
    else if (resolvedPath.endsWith("fullchain.pem"))
      try {
        const cert = setCert({
          key: Buffer.from(""),
          ...certificat,
          cert: await readFile(resolvedPath),
        });

        if (cert.key.length !== 0) sendToWorker = true;
      } catch (err) {
        error(
          `Erreur lors de la lecture du certificat (voir les chemins dans ${resolvedPath}):`,
          err,
        );
      }

    if (cluster.workers && sendToWorker)
      sendMessageToWorkers(
        Object.values(cluster.workers).filter((worker) => worker !== undefined),
        {
          type: MessageTypes.UpdateCert,
          data: {cert: getCert()},
        },
      );
  }
}

// Regarde chaque modification des certificats pour chaque sites
export function watchCertificates() {
  const ignored: WatcherIgnoreFn = (path, stats) => {
    if (!stats) return false;

    const resolvedPath = resolve(path),
      domain = relative(certsDirPath, resolvedPath).split(sep)[0],
      isValidDomain = domain === validDomain;

    if (stats.isDirectory()) {
      if (
        !domain ||
        domain === "" ||
        resolvedPath === certsDirPath ||
        isValidDomain
      )
        return false;
      else return true;
    } else if (
      isValidDomain &&
      (stats.isFile() || stats.isSymbolicLink()) &&
      (resolvedPath.endsWith("privkey.pem") ||
        resolvedPath.endsWith("fullchain.pem"))
    )
      return false;
    else return true;
  };

  watch(certsDirPath, {
    ...DEFAULT_WATCHER_OPTIONS,
    followSymlinks: true,
    depth: 1,
  })
    .on("add", updateCertificate.bind(null, ignored))
    .on("change", updateCertificate.bind(null, ignored))
    .on(
      "error",
      error.bind(
        null,
        `Erreur rencontré avec le watcher du certificat (${certsDirPath}):`,
      ),
    );
}
