import {Cert} from "@server/core";

let cert: Cert | null = null;

export function setCert(next: Cert) {
  cert = next;

  return next;
}

export function getCert(): Cert | null {
  return cert;
}
