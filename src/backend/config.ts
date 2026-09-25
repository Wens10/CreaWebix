import "dotenv/config";
import {Config} from "./utils/common/interfaces";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}`);
  }

  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];

  return value === undefined || value === "" ? undefined : value;
}

function requireNumberEnv(name: string): number {
  const value = requireEnv(name);
  const number = Number(value);

  if (Number.isNaN(number)) {
    throw new Error(`La variable ${name} doit être un nombre`);
  }

  return number;
}

export const config: Config = {
  hostname: requireEnv("HOSTNAME"),
  domain: requireEnv("DOMAIN"),

  httpPort: requireNumberEnv("HTTP_PORT"),
  httpsPort: requireNumberEnv("HTTPS_PORT"),

  certDirPath: requireEnv("CERT_DIR_PATH"),

  certType: (() => {
    const value = requireEnv("CERT_TYPE");

    if (value !== "certbot" && value !== "self-signed") {
      throw new Error("CERT_TYPE doit être 'certbot' ou 'self-signed'");
    }

    return value;
  })(),

  forceDomainUsage: process.env["FORCE_DOMAIN_USAGE"] === "true",

  smtpUser: requireEnv("SMTP_USER"),
  smtpPassword: requireEnv("SMTP_PASSWORD"),
  smtpHost: requireEnv("SMTP_HOST"),
  smtpPort: requireNumberEnv("SMTP_PORT"),
  smtpSecure: process.env["SMTP_SECURE"] === "true",
  smtpReceiver: requireEnv("SMTP_RECEIVER"),

  // Optionnel : sans clé, le chatbot répond 503
  groqApiKey: optionalEnv("GROQ_API_KEY"),
  groqModel: optionalEnv("GROQ_MODEL") ?? "openai/gpt-oss-120b",
};

export default config;
