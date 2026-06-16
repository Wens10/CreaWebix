import {workingDirPath} from "@server/core";
import {join} from "path";

export const DEFAULT_EJS_STATIC_PAGE_DIR = join(
  workingDirPath,
  "/views/static",
);
export const DEFAULT_EJS_DYNAMIC_PAGE_DIR = join(
  workingDirPath,
  "/views/dynamic",
);
export const DEFAULT_EJS_DIST_DIR = join(workingDirPath, "/public");
export const DEFAULT_EJS_COMPONENT_DIR = join(
  workingDirPath,
  "/views/components",
);
