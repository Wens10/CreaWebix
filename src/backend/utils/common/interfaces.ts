export interface Config {
  // Réseau
  hostname: string;
  domain: string;
  httpPort: number;
  httpsPort: number;

  // SSL
  certDirPath: string;
  certType: "certbot" | "self-signed";
  forceDomainUsage: boolean;

  // SMTP
  smtpUser: string;
  smtpPassword: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpReceiver: string;
}
