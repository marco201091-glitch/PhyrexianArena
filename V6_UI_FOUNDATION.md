# V6 UI foundation

Regola: una capability, una primitive condivisa. Mai creare popup, validazioni o input locali se esiste la primitive V6.

| Capability | Web | Expo |
| --- | --- | --- |
| Testo e cursore | native `Input` / `Textarea` | native `Input` / `TextInput` |
| Form e validazione | React Hook Form + Zod + `components/ui/form.tsx` | validazione dominio condivisa; `Input` espone label/error/hint/accessibilità |
| Dialog bloccanti | `AppModal` su Radix Dialog | `components/ui/modal.tsx` |
| Legacy dialog | `ModalOverlay` / `ModalCard`, già focus-safe | non applicabile |
| Sheet/drawer | Vaul 1.1.2 | modal/sheet nativo esistente |
| E2E mobile | Maestro, `expo/e2e` | Maestro, `testID` stabili |

## Regole di adozione

1. Nuove modali Web usano `AppModal`; niente overlay manuali.
2. Nuove form complesse usano schema Zod e RHF; validazione server resta obbligatoria.
3. Trasformazioni input non avvengono durante `onChange` se alterano il cursore; normalizzare su blur/submit.
4. Ogni flusso critico nuovo espone `testID` stabile prima del test device finale.
5. Lexical entra solo con requisiti WYSIWYG espliciti e piano migrazione dati Markdown.
