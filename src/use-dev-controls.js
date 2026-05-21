import { useControls } from "leva";

/** En prod : panneau masqué, valeurs par défaut uniquement. */
const PROD_PANEL = { render: () => false };

/**
 * Leva visible en dev, désactivé en prod.
 * @param {string} folder
 * @param {import('leva').Schema | (() => import('leva').Schema)} schema
 * @param {unknown[]} [deps]
 */
export function useDevControls(folder, schema, deps = []) {
  const settings = import.meta.env.DEV ? {} : PROD_PANEL;
  return useControls(folder, schema, settings, deps);
}
