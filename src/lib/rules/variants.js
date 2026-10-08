/**
 * Mirrors variant-options.ts on the backend, which decides. "Change size"
 * and "Change color" change exactly one option; the rule does not depend
 * on the option's name, so any store language works. A recognised name
 * only locks the other options for convenience.
 */
const OPTION_NAMES = {
  "Change size": /^(size|sizes|maat|größe|groesse|grösse|taille|talla|taglia|tamanho|storlek|størrelse|koko|rozmiar|velikost|méret|mărime)$/i,
  "Change color": /^(color|colour|kleur|farbe|couleur|colore|cor|färg|farve|farge|väri|kolor|barva|szín|culoare)$/i,
};

export const isSingleOptionReason = (reason) => reason in OPTION_NAMES;

export function optionForReason(reason, options) {
  const re = OPTION_NAMES[reason];
  return re ? (options || []).find((o) => re.test(String(o.name).trim()))?.name : undefined;
}

export function changedOptions(from, to) {
  return (from || []).filter((o) => (to || []).find((t) => t.name === o.name)?.value !== o.value).map((o) => o.name);
}

export function optionChangeProblem(reason, from, to) {
  if (!isSingleOptionReason(reason)) return null;
  const changed = changedOptions(from, to);
  if (changed.length !== 1) return `"${reason}" changes one option only — pick "Change item or quantity" to change more than one.`;
  const named = optionForReason(reason, from);
  if (named && changed[0] !== named) return `"${reason}" may only change the ${named.toLowerCase()}.`;
  return null;
}

/** The variant with exactly these option values, if the product has one. */
export function variantFor(list, values) {
  return (list || []).find((v) => (v.options || []).every((o) => values[o.name] === o.value)) || null;
}
