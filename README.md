# Calculatrice Scientifique PWA (React + Vite + TypeScript)

Application PWA qui reproduit la calculatrice scientifique specifiee dans `SPEC_CALCULATRICE_SCIENTIFIQUE_PWA.yaml`.

## Stack

- React + TypeScript
- Vite
- vite-plugin-pwa (offline-first, installable)

## Installation

```bash
npm install
```

## Run dev

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## Architecture

- `src/core/`: normalisation, evaluation, formatage exact/decimal
- `src/state/`: etat, actions, reducer, hook d'interactions
- `src/rendering/`: parser AST et rendu mathematique (fraction, puissance, racine)
- `src/components/`: UI (header, ecran, bandeau mode, clavier)
- `src/pwa/`: enregistrement service worker et config PWA
- `src/spec/spec.ts`: parsing runtime du YAML source de verite

## PWA

- Manifest configure dans `vite.config.ts`
- Service worker genere via `vite-plugin-pwa` (mode `generateSW`)
- Caches runtime: documents (`NetworkFirst`) + assets (`StaleWhileRevalidate`)

## Verification manuelle rapide

1. Saisir `sin(30)` en mode `deg`, puis `=`.
2. Basculer `EXACT/DECIMAL` et verifier le format des resultats.
3. Activer `INV`, saisir `sin` puis verifier insertion `asin(` et extinction du mode `INV`.
4. Utiliser fleches gauche/droite, `Home`, `End`, `Backspace`, `Escape`.
5. Installer la PWA depuis le navigateur, couper le reseau et verifier le rechargement hors ligne.
