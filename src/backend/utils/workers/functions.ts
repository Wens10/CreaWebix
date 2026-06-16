import {
  Context,
  resolveAPIRequest,
  resolveResourceRequest,
  SUPPORTED_METHODS,
  workingDirPath,
} from "@server/core";
import config from "../../config";
import {join} from "path";
import {APIParams, PageParams} from "./types";

export async function handleRequest(
  context: Context,
  pageParams: PageParams,
  apiParams: APIParams,
): Promise<any> {
  try {
    if (!context.hostname)
      return context
        .respond(400, {headers: {"content-type": "text/plain"}})
        .end("Bad Request");

    const hostname = context.hostname;

    if (config.forceDomainUsage && hostname !== config.domain)
      return context.respond(404, {end: true});

    const path = context.path,
      method = context.method;

    if (!method || !path) return context.respond(500, {end: true});

    if (!SUPPORTED_METHODS.includes(method))
      return context.respond(501, {end: true});

    // Dossier /api du site
    if (path.startsWith("/api"))
      resolveAPIRequest(
        join(workingDirPath, "dist"),
        context,
        path,
        method,
        apiParams,
      );
    // Dossier /public ou /pages du site
    else
      resolveResourceRequest(
        {
          dynamicPages: join(workingDirPath, "dist", "pages"),
          errorPages: join(workingDirPath, "errors"),
          staticPages: join(workingDirPath, "public"),
        },
        context,
        path,
        method,
        pageParams,
      );
  } catch (error) {
    return context.respond(400, {end: true});
  }
}
