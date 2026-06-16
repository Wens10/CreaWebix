import {MessageTypes} from "../common/enums";
import {Cert} from "@server/core";

export interface UpdateCertMessage {
  type: MessageTypes.UpdateCert;
  data: {
    cert: Cert | null;
  };
}
