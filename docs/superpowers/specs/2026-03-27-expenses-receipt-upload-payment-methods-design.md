# Ausgaben: Beleg-Upload & Zahlungsarten-Auswahl

## Kontext

Beim Erstellen einer neuen Ausgabe gibt es aktuell zwei Probleme:
1. Belege können nicht direkt hochgeladen werden (nur nachträglich, und auch dort fehlt die UI)
2. Die Zahlungsmethode ist ein Freitextfeld — es gibt keine vordefinierten Optionen

Ziel: Beleg-Upload beim Erstellen und nachträglich, Kamera-Support auf Mobilgeräten, Dropdown mit Standard- + eigenen Zahlungsarten.

---

## 1. Zahlungsarten

### Standard-Zahlungsarten (fest im Code)

Neue Datei `packages/web/src/lib/constants/paymentMethods.ts` (Verzeichnis `constants/` muss erstellt werden):

```typescript
export const DEFAULT_PAYMENT_METHODS = [
  'Banküberweisung',
  'Bargeld',
  'PayPal',
  'Kreditkarte',
  'Lastschrift',
  'EC-Karte',
] as const;
```

### Eigene Zahlungsarten (Settings)

**Datenbank-Migration erforderlich:**
- Neue Spalte `custom_payment_methods` in `settings`-Tabelle
- Typ: `jsonb`, Default: `'[]'::jsonb`
- Drizzle-Schema: `customPaymentMethods: jsonb('custom_payment_methods').notNull().default('[]')`

**Shared Types aktualisieren** (`shared/src/types/user.ts`):
- `Settings`: `customPaymentMethods: string[]`
- `SettingsUpdate`: `customPaymentMethods?: string[]`

**Server:** Settings-Service und -Route müssen das neue Feld in Read/Write unterstützen.

### UI: Ausgaben-Formular

- `<Input>` für Zahlungsmethode → `<Select>` + konditionaler `<Input>`
- Optionen im Select: Standard-Set + eigene aus Settings + "Andere..."
- Bei "Andere...": Select wird durch ein Textfeld ersetzt (mit "Zurück zum Dropdown"-Link)
- Freitext-Wert wird direkt als `paymentMethod` String gespeichert (kein Prefix/Marker)
- **Formular muss `getSettings()` bei `onMount` laden** für eigene Zahlungsarten

**Vorhandene Freitext-Werte:** Wenn ein Expense eine `paymentMethod` hat, die nicht im Dropdown ist, wird "Andere..." vorausgewählt und der Wert im Textfeld angezeigt.

### UI: Einstellungen

- Neuer Abschnitt "Zahlungsarten" auf der Settings-Seite
- Liste der eigenen Zahlungsarten mit Hinzufügen (Input + Button) und Entfernen (X-Button)

### Betroffene Dateien

- `packages/web/src/lib/constants/paymentMethods.ts` (neu, Verzeichnis erstellen)
- `packages/server/src/db/schema/settings.ts` — neue `jsonb`-Spalte
- `packages/server/src/db/migrations/` — neue Migration
- `shared/src/types/user.ts` — `Settings` + `SettingsUpdate` erweitern
- `packages/server/src/services/settings.service.ts` — neues Feld
- `packages/server/src/routes/settings.ts` — Validierung
- `packages/web/src/routes/(app)/expenses/new/+page.svelte` — Select + getSettings
- `packages/web/src/routes/(app)/expenses/[id]/+page.svelte` — Select + getSettings
- `packages/web/src/routes/(app)/settings/+page.svelte` — neuer Abschnitt
- `packages/web/src/lib/i18n/de.ts` + `en.ts`

---

## 2. Beleg-Upload

### Backend (existiert bereits)

- `POST /api/expenses/:id/receipt` — Upload (ersetzt alten Beleg automatisch)
- `DELETE /api/expenses/:id/receipt` — Löschen
- `receiptPath` Spalte in Expense-Tabelle vorhanden
- Formate: JPEG, PNG, WebP, PDF (10MB Limit via `@fastify/multipart`)
- Speicherort: `/uploads/receipts/`

### Neue Komponente: `ReceiptUpload.svelte`

Pfad: `packages/web/src/lib/components/ui/ReceiptUpload.svelte`

**Props:**
- `file: File | null` (bindable) — für neues Upload im Formular
- `existingReceiptPath: string | null` — für Detailansicht
- `onUpload: (file: File) => Promise<void>` — für direktes Upload in Detailansicht
- `onDelete: () => Promise<void>` — für Löschen in Detailansicht

**UI-Zustände:**
1. **Leer** (kein Beleg): Zwei Buttons — "Foto aufnehmen" + "Datei wählen"
2. **Vorschau** (Datei gewählt, noch nicht gespeichert): Thumbnail/PDF-Icon + X-Button zum Entfernen
3. **Vorhanden** (existierender Beleg): Thumbnail/PDF-Icon + "Ersetzen" + "Löschen" Buttons
4. **Uploading**: Buttons disabled, Spinner auf dem Thumbnail
5. **Fehler**: Fehlermeldung mit Retry-Option

**Kamera-Button:**
- `<input type="file" accept="image/*" capture="environment">` — öffnet Kamera auf Mobilgeräten
- Auf Desktop verhält sich der Button identisch zum File-Picker (Browser-Standardverhalten)
- Kein separates Verstecken auf Desktop nötig — der Effekt ist akzeptabel

**Client-seitige Validierung:**
- Dateigröße: max 10MB (vor Upload prüfen, Fehlermeldung anzeigen)
- Dateityp: nur `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

**Datei-Picker:**
- `<input type="file" accept="image/*,.pdf">` — normaler File-Picker

### Ablauf: Neue Ausgabe

1. User füllt Formular aus + wählt optional Beleg
2. `POST /api/expenses` — Ausgabe erstellen
3. Falls Beleg vorhanden: `POST /api/expenses/:id/receipt` mit FormData
4. **Bei Upload-Fehler:** Ausgabe bleibt erhalten, spezifischer Error-Toast "Beleg konnte nicht hochgeladen werden", Redirect zur Detailansicht (wo User den Upload erneut versuchen kann)
5. Bei Erfolg: Redirect zu `/expenses`

### Ablauf: Detailansicht

- **Beleg vorhanden:** Thumbnail/PDF-Icon anzeigen, klickbar zum Öffnen im neuen Tab. Buttons: "Ersetzen" (öffnet File-Picker, Upload ersetzt alten Beleg per `POST /api/expenses/:id/receipt`) und "Löschen" (`DELETE /api/expenses/:id/receipt`)
- **Kein Beleg:** Upload-Buttons anzeigen (Kamera + Datei)

**Bestehender Bug fixen:** In `/expenses/[id]/+page.svelte` verwendet die Beleg-Sektion `t('expenses.tags')` als Label statt `t('expenses.receipt')`.

### Betroffene Dateien

- `packages/web/src/lib/components/ui/ReceiptUpload.svelte` (neu)
- `packages/web/src/routes/(app)/expenses/new/+page.svelte`
- `packages/web/src/routes/(app)/expenses/[id]/+page.svelte` (+ Bug-Fix Label)
- `packages/web/src/lib/api/expenses.ts`

---

## 3. Übersetzungen

Neue Keys in `de.ts` und `en.ts`:

```
expenses.paymentMethodSelect → 'Zahlungsart auswählen' / 'Select payment method'
expenses.paymentMethodOther → 'Andere...' / 'Other...'
expenses.paymentMethodCustom → 'Zurück zur Auswahl' / 'Back to selection'
expenses.receipt → 'Beleg' / 'Receipt'
expenses.takePhoto → 'Foto aufnehmen' / 'Take photo'
expenses.chooseFile → 'Datei wählen' / 'Choose file'
expenses.removeReceipt → 'Beleg entfernen' / 'Remove receipt'
expenses.replaceReceipt → 'Beleg ersetzen' / 'Replace receipt'
expenses.viewReceipt → 'Beleg anzeigen' / 'View receipt'
expenses.receiptUploadFailed → 'Beleg konnte nicht hochgeladen werden' / 'Failed to upload receipt'
expenses.uploadingReceipt → 'Beleg wird hochgeladen...' / 'Uploading receipt...'
expenses.fileTooLarge → 'Datei zu groß (max. 10 MB)' / 'File too large (max 10 MB)'
settings.paymentMethods → 'Zahlungsarten' / 'Payment methods'
settings.addPaymentMethod → 'Zahlungsart hinzufügen' / 'Add payment method'
settings.customPaymentMethods → 'Eigene Zahlungsarten' / 'Custom payment methods'
```

---

## 4. Verifizierung

1. `/expenses/new` aufrufen — Formular rendert korrekt
2. Zahlungsart-Dropdown zeigt Standard-Set + eigene Zahlungsarten
3. "Andere..." zeigt Freitextfeld, "Zurück zur Auswahl" wechselt zurück
4. Beleg über Kamera aufnehmen (Mobilgerät) oder Datei wählen
5. Vorschau wird angezeigt, X zum Entfernen funktioniert
6. Datei > 10MB zeigt Fehlermeldung
7. Ausgabe erstellen — Beleg wird hochgeladen
8. Bei Upload-Fehler: Expense bleibt, Error-Toast, Redirect zu Detailansicht
9. Detailansicht zeigt Beleg-Vorschau, Ersetzen/Löschen funktioniert
10. In Einstellungen: eigene Zahlungsarten hinzufügen/entfernen
11. Neue Zahlungsart erscheint im Dropdown
12. Vorhandener Freitext-Wert wird unter "Andere..." angezeigt
