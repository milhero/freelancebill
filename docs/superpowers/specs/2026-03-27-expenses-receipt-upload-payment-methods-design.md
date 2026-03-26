# Ausgaben: Beleg-Upload & Zahlungsarten-Auswahl

## Kontext

Beim Erstellen einer neuen Ausgabe gibt es aktuell zwei Probleme:
1. Belege können nicht direkt hochgeladen werden (nur nachträglich in der Detailansicht, und auch dort fehlt die UI)
2. Die Zahlungsmethode ist ein Freitextfeld — es gibt keine vordefinierten Optionen

Ziel: Beleg-Upload beim Erstellen und nachträglich ermöglichen, Kamera-Support auf Mobilgeräten, und ein Dropdown mit Standard- + eigenen Zahlungsarten.

## Zahlungsarten

### Standard-Zahlungsarten (fest im Code)

Neue Datei `packages/web/src/lib/constants/paymentMethods.ts`:

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

### Eigene Zahlungsarten

- Gespeichert als JSON-Array im bestehenden Settings-Objekt
- Neues Feld in der Settings-Tabelle: `customPaymentMethods` (JSON, default `[]`)
- API: Wird über die bestehende Settings-API gespeichert/geladen

### UI: Ausgaben-Formular

- `<Input>` für Zahlungsmethode wird durch `<Select>` ersetzt
- Optionen: Standard-Set + eigene Zahlungsarten aus Settings
- Letzte Option: "Andere..." — zeigt ein Textfeld für einmalige Freitext-Eingabe

### UI: Einstellungen

- Neuer Abschnitt "Zahlungsarten" auf der Settings-Seite
- Liste der eigenen Zahlungsarten mit Hinzufügen/Entfernen

### Betroffene Dateien

- `packages/web/src/lib/constants/paymentMethods.ts` (neu)
- `packages/web/src/routes/(app)/expenses/new/+page.svelte`
- `packages/web/src/routes/(app)/expenses/[id]/+page.svelte`
- `packages/web/src/routes/(app)/settings/+page.svelte`
- `packages/server/src/db/schema/settings.ts` (falls nötig)
- `packages/web/src/lib/api/settings.ts`
- `packages/web/src/lib/i18n/de.ts` + `en.ts` (neue Übersetzungen)

## Beleg-Upload

### Backend (größtenteils vorhanden)

Bereits implementiert:
- `POST /api/expenses/:id/receipt` — Upload-Endpoint
- `DELETE /api/expenses/:id/receipt` — Löschen-Endpoint
- `receiptPath` Spalte in der Expense-Tabelle
- Formate: JPEG, PNG, WebP, PDF (10MB Limit via `@fastify/multipart`)
- Speicherort: `/uploads/receipts/`

### Neue Komponente: `ReceiptUpload.svelte`

Pfad: `packages/web/src/lib/components/ui/ReceiptUpload.svelte`

Funktionalität:
- Zwei Buttons nebeneinander:
  - **Foto aufnehmen**: `<input type="file" accept="image/*" capture="environment">` — öffnet Kamera auf Mobilgeräten
  - **Datei wählen**: `<input type="file" accept="image/*,.pdf">` — normaler File-Picker
- Vorschau: Thumbnail des gewählten Bildes (via `URL.createObjectURL`) oder PDF-Icon
- X-Button zum Entfernen vor dem Speichern
- Props: `file` (bindable), `existingReceiptPath` (optional, für Detailansicht)

### Ablauf: Neue Ausgabe

1. User füllt Formular aus + wählt optional Beleg
2. `POST /api/expenses` — Ausgabe erstellen
3. Falls Beleg vorhanden: `POST /api/expenses/:id/receipt` mit FormData
4. Redirect zu `/expenses`

### Ablauf: Detailansicht

- Wenn Beleg vorhanden: Thumbnail/PDF-Icon anzeigen, klickbar zum Öffnen in neuem Tab
- Buttons: "Ersetzen" und "Löschen"
- Wenn kein Beleg: Upload-Buttons anzeigen (Kamera + Datei)

### Betroffene Dateien

- `packages/web/src/lib/components/ui/ReceiptUpload.svelte` (neu)
- `packages/web/src/routes/(app)/expenses/new/+page.svelte`
- `packages/web/src/routes/(app)/expenses/[id]/+page.svelte`
- `packages/web/src/lib/api/expenses.ts` (Upload-Funktion existiert vermutlich schon)

## Übersetzungen

Neue Keys in `de.ts` und `en.ts`:

```
expenses.paymentMethodSelect: 'Zahlungsart auswählen'
expenses.paymentMethodOther: 'Andere...'
expenses.receipt: 'Beleg'
expenses.takePhoto: 'Foto aufnehmen'
expenses.chooseFile: 'Datei wählen'
expenses.removeReceipt: 'Beleg entfernen'
expenses.replaceReceipt: 'Beleg ersetzen'
expenses.viewReceipt: 'Beleg anzeigen'
settings.paymentMethods: 'Zahlungsarten'
settings.addPaymentMethod: 'Zahlungsart hinzufügen'
settings.customPaymentMethods: 'Eigene Zahlungsarten'
```

## Verifizierung

1. `/expenses/new` aufrufen — Formular rendert korrekt
2. Zahlungsart-Dropdown zeigt Standard-Set + eigene Zahlungsarten
3. "Andere..." öffnet Freitextfeld
4. Beleg über Kamera aufnehmen (Mobilgerät) oder Datei wählen
5. Vorschau wird angezeigt, X zum Entfernen funktioniert
6. Ausgabe erstellen — Beleg wird hochgeladen
7. Detailansicht zeigt Beleg-Vorschau, Ersetzen/Löschen funktioniert
8. In Einstellungen: eigene Zahlungsarten hinzufügen/entfernen
9. Neue Zahlungsart erscheint im Dropdown
