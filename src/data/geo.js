/**
 * Countries we sell to, their flags, and which of them are EU
 * (the EU list decides the refund ladder).
 */

export const COUNTRY = {
  UK: "United Kingdom",
  US: "United States",
  SE: "Sweden",
  PL: "Poland",
  NO: "Norway",
  NL: "Netherlands",
  DK: "Denmark",
  FI: "Finland",
  PT: "Portugal",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  AT: "Austria",
  BE: "Belgium",
  IE: "Ireland",
  CH: "Switzerland",
  AU: "Australia",
};
export function flag(cc) {
  if (cc === "UK") cc = "GB";
  if (!cc || cc.length !== 2) return "";
  return String.fromCodePoint.apply(
    null,
    cc
      .toUpperCase()
      .split("")
      .map(function (ch) {
        return 0x1f1e6 + ch.charCodeAt(0) - 65;
      }),
  );
}
export function countryName(cc) {
  return flag(cc) + " " + (COUNTRY[cc] || cc);
}
export const EU = [
  "SE",
  "PL",
  "NO",
  "NL",
  "DK",
  "FI",
  "DE",
  "FR",
  "ES",
  "IT",
  "PT",
  "AT",
  "BE",
  "IE",
];
