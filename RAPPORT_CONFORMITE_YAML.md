# Rapport de conformite YAML -> Implementation

Source unique: `SPEC_CALCULATRICE_SCIENTIFIQUE_PWA.yaml`.

## 1. Lecture et parsing du YAML

- Implementation: `src/spec/spec.ts`
- Action: import du YAML brut via `?raw` puis parsing `js-yaml`.
- Statut: conforme.

## 2. Etat applicatif

- Champs implementes: `expr`, `cursorPos`, `angleMode`, `exactMode`, `shiftOn`, `lastAns`, `isResult`, `resultMain`, `resultSub`, `isError`, `swipeDragStartX`.
- Implementation: `src/state/types.ts`, `src/state/reducer.ts`.
- Statut: conforme.

## 3. Layout et hierarchie visuelle

- Root en colonne, ordre header/screen/mode/keypad/espace bas.
- Header: dimensions du bouton retour, tag CALCULS, titre.
- Screen card: ordre interne (status, expression, separateur, resultat, render zone).
- Mode strip: 2 boutons EXACT/DECIMAL.
- Keypad: grille 7x5, gaps, taille bouton via formule base*0.82.
- Implementation: `src/components/*`, `src/index.css`.
- Statut: conforme.

## 4. Palette

- Couleurs appliquees via variables CSS reprenant les valeurs YAML.
- Implementation: `src/index.css`.
- Statut: conforme.

## 5. Mapping clavier tactile

- Grille `keypad_map` reproduite.
- `shift_mapping` applique (sin/cos/tan -> asin/acos/atan, etc.).
- Consommation du shift apres insertion inverse: active.
- Implementation: `src/components/Keypad.tsx`, `src/state/actions.ts`, `src/state/useCalculator.ts`.
- Statut: conforme.

## 6. Regles d'entree

- Insert apres resultat: reset pour digit/paren/pi/e.
- Continuation operateur apres resultat: expression repart de `ans` si disponible.
- Substitution `ans`: insertion `(lastAns)`.
- Delete et Clear conformes.
- Curseur: gauche/droite/home/end, tap positioning, swipe horizontal (seuil 6, pas round(dx/10)).
- Implementation: `src/state/reducer.ts`, `src/components/ScreenCard.tsx`.
- Statut: conforme.

## 7. Pipeline de normalisation

Ordre implemente dans `src/core/engine.ts`:
1. `pi` -> `3.141592653589793`
2. `ans` -> `(lastAns)`
3. `aEb` -> `(a*10^b)`
4. expansion factorielle (0..20)
5. implicite `2(` -> `2*(`
6. implicite `)4` -> `)*4`
7. implicite `2e` -> `2*e` (sans casser `exp`)
8. trig en degre: `sin/cos/tan((pi/180)*(x))`
9. inverse trig en degre: `((180/pi)*asin(x))` etc.
10. `ln(` -> `log(`
11. `exp(` -> `e^(`

- Statut: conforme.

## 8. Evaluation

- Moteur: `mathjs` sur expression normalisee.
- Echec parse/eval: `resultMain=''`, `resultSub=''`, `isError=false`.
- `NaN`/infini: `Indefini`, erreur vraie.
- Mode exact: tentative expression en `pi`, sinon fraction rationnelle, sinon decimal.
- Mode decimal: `= decimal`.
- Implementation: `src/core/engine.ts`.
- Statut: conforme.

## 9. Format numerique

- Entier si abs < 1e15.
- 8 chiffres significatifs si abs < 1e-4 ou >= 1e10.
- Sinon 10 chiffres significatifs.
- Implementation: `formatNumber` dans `src/core/engine.ts`.
- Statut: conforme.

## 10. Representation exacte

- Fraction: denominateur 2..1000, epsilon 1e-9.
- Pi: multiple entier epsilon 1e-9, fractions denominateur 2..20, reduction gcd.
- Implementation: `toFraction`, `toPiExpression` dans `src/core/engine.ts`.
- Statut: conforme.

## 11. Rendu expression + zone math

- Coloration tokens selon priorite fonctions.
- Curseur clignotant 2px x 15px, periode 1000ms, duty cycle 50%.
- Parser precedence add/sub > mul/div/mod > pow > unary > atom.
- AST nodes: num/const/sci/neg/paren/fact/fn/binop.
- Rendu fractions (division en exact), exposants (`^`), sqrt avec overline, abs avec barres.
- Fallback parse rendu: texte brut monospace.
- Implementation: `src/rendering/ExpressionLine.tsx`, `src/rendering/ast.ts`, `src/rendering/MathExpressionView.tsx`.
- Statut: conforme.

## 12. Clavier physique

- Enter/NumpadEnter calc, Backspace delete, Escape clear.
- ArrowLeft/ArrowRight deplacement curseur.
- Home/End debut/fin.
- Raccourcis `p/s/c/t/l/n/r` implementes.
- Shift+Arrow logique applicative: si `shiftOn` alors gauche->debut, droite->fin, puis shift off.
- Implementation: `src/state/useCalculator.ts`, `src/state/reducer.ts`.
- Statut: conforme.

## 13. Historique / persistance

- Autosave debounce 700ms en localStorage.
- Payload type scientific + inputs/results conformes spec.
- Implementation: `src/state/useCalculator.ts`.
- Statut: conforme.

## 14. PWA installable et offline-first

- Plugin: `vite-plugin-pwa`.
- Manifest et icone applicative configures.
- Service worker enregistre au bootstrap.
- Strategie cache runtime document+assets.
- Implementation: `vite.config.ts`, `src/pwa/registerSW.ts`, `public/icon.svg`.
- Statut: conforme.

## 15. Ambiguites et decisions de fidelite

- Rendu visuel `div` (division): representation textuelle `div` en mode inline et fraction en exact mode.
- Taps curseur: calcul position via ratio horizontal sur largeur de la ligne.
- Expression de continuation post-resultat sur operateur: reprise via `ans`.
- Ces choix privilegient la fidelite comportementale definie dans la spec quand le YAML ne fournit pas de detail d'implementation Flutter exact.
