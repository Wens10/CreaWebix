import {Context} from "@server/core";
import {Transporter} from "nodemailer";

export type PageHandler = (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  ...params: [...APIParams, ...id: number[]]
) => string | null | Promise<string | null>;

export type APIHandler = (
  // eslint-disable-next-line no-unused-vars
  context: Context,
  // eslint-disable-next-line no-unused-vars
  headers: Context["headers"],
  // eslint-disable-next-line no-unused-vars
  ...params: [...APIParams, ...id: number[]]
) => void;

export type PageParams = [Transporter];

export type APIParams = [Transporter];
