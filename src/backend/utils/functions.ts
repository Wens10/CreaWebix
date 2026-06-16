import {join, dirname} from "path";
import {
  DEFAULT_EJS_STATIC_PAGE_DIR,
  DEFAULT_EJS_DIST_DIR,
  DEFAULT_EJS_COMPONENT_DIR,
} from "./constants";
import {readdir} from "fs";
import {mkdir, writeFile} from "fs/promises";
import {renderFile} from "ejs";

export function renderStaticEJSFiles(options?: {
  staticPageDir?: string;
  distDir?: string;
  componentsDir?: string;
}) {
  const staticPageDir = options?.staticPageDir ?? DEFAULT_EJS_STATIC_PAGE_DIR,
    distDir = options?.distDir ?? DEFAULT_EJS_DIST_DIR,
    componentsDir = options?.componentsDir ?? DEFAULT_EJS_COMPONENT_DIR;

  readdir(staticPageDir, {recursive: true, encoding: "utf8"}, (err, files) => {
    if (err) throw err;

    files
      .filter((file) => file.endsWith(".ejs"))
      .forEach((file) => {
        renderFile(
          join(staticPageDir, file),
          {},
          {root: componentsDir},
          async (err, str) => {
            if (err) throw err;

            await mkdir(dirname(join(distDir, file)), {recursive: true});
            await writeFile(join(distDir, `${file.slice(0, -4)}.html`), str);
          },
        );
      });
  });
}
