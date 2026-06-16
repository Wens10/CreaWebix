import {Worker} from "cluster";
import {hasProps, warn} from "@server/core";
import {MessageTypes} from "../../../utils/common/enums";
import {sendMessageToWorkers} from "../../../utils/master/functions/others";
import {getCert} from "../../../utils/common/functions";

export default ((worker, message: unknown) => {
  if (hasProps(message, {type: "number"}))
    switch (message.type) {
      case MessageTypes.RequestCert:
        sendMessageToWorkers([worker], {
          type: MessageTypes.UpdateCert,
          data: {cert: getCert()},
        });
        break;
      default:
        warn(`Message inconnu (${message.type}) :`, message);
        break;
    }
  else warn("Message inconnu :", message);
}) satisfies (
  // eslint-disable-next-line no-unused-vars
  worker: Worker,
  // eslint-disable-next-line no-unused-vars
  message: unknown,
) => void;
