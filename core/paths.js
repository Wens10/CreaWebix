"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.certChallengesDirPath = exports.workingDirPath = void 0;
const path_1 = require("path");
exports.workingDirPath = process.cwd();
exports.certChallengesDirPath = (0, path_1.join)(exports.workingDirPath, "cert-challenges");
