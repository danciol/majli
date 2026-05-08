export const AUTH_EMAIL_DOMAIN = 'wizyto-app.pl';

export const loginToEmail = (login: string): string =>
  `${login.toLowerCase().trim()}@${AUTH_EMAIL_DOMAIN}`;
