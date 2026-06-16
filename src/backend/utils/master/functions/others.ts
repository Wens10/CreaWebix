import {UpdateCertMessage} from "../interfaces";
import {Worker} from "cluster";

export function sendMessageToWorkers(
  workers: Worker[],
  message: UpdateCertMessage,
) {
  for (const worker of workers) worker?.send(message);
}
