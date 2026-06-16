import {Cluster, Worker} from "cluster";
import {error} from "@server/core";

export default ((cluster, worker, code, signal) => {
  error(`Worker mort (${worker.process.pid}): ${code} - ${signal}`);

  cluster.fork();
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  cluster: Cluster,
  // eslint-disable-next-line no-unused-vars
  worker: Worker,
  // eslint-disable-next-line no-unused-vars
  code: number,
  // eslint-disable-next-line no-unused-vars
  signal: string,
) => void;
