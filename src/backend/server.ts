import cluster from "cluster";
import masterHandler from "./cluster/master";
import workerHandler from "./cluster/worker";

if (cluster.isPrimary) masterHandler(cluster);
else workerHandler();
