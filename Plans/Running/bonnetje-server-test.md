# Plan: Receipt-server testen met testbonnetje

## Doel

De receipt-server in isolatie testen met een echt bonnetje, vóórdat we de volledige app-flow testen. Dit bewijst dat de kern werkt: upload → Anthropic API → gestructureerde JSON.

## Voorbereiding

### Stap 1: Dependencies installeren

```bash
cd /home/damonbot/Documents/GitRepos/BeursManager/receipt-server
npm install
```

### Stap 2: .env aanmaken

```bash
cp .env.example .env
```

Bewerk `receipt-server/.env` en vul in:
```
ANTHROPIC_API_KEY=<jouw Anthropic API key>
RECEIPT_AUTH_TOKEN=test-token-123
PORT=3001
```

**Waar haal je de API key?**
- Ga naar https://console.anthropic.com/settings/keys
- Maak een nieuwe key aan (of gebruik een bestaande)
- Kopieer de `sk-ant-...` waarde naar het `ANTHROPIC_API_KEY` veld

### Stap 3: Server starten

```bash
cd /home/damonbot/Documents/GitRepos/BeursManager/receipt-server
npm start
```

De server draait nu op `http://localhost:3001`. Je zou moeten zien:
```
Receipt-server draait op poort 3001
```

## Test uitvoeren

### Stap 4: Bonnetje sturen via curl

Open een **nieuwe terminal** en voer uit:

```bash
curl -X POST http://localhost:3001/api/receipt/extract \
  -H "Authorization: Bearer test-token-123" \
  -F "image=@/home/damonbot/agentchattr/uploads/7dc45263.jpg"
```

### Verwacht resultaat

Een JSON response als:
```json
{
  "amount": "12.50",
  "description": "Albert Heijn - boodschappen",
  "category": "eten_drinken"
}
```

## Verificatie-checklist

- [ ] Server start zonder fouten
- [ ] curl geeft HTTP 200 terug met geldige JSON
- [ ] `amount` is het **eindtotaal** van het bonnetje (niet subtotaal, BTW, of pinbedrag)
- [ ] `description` bevat een herkenbare winkelnaam
- [ ] `category` is een van: standhuur, reiskosten, verblijf, materiaal_stand, eten_drinken (of null)

**Let op:** als de JSON terugkomt maar `amount` het verkeerde bedrag pakt (bijv. subtotaal of BTW ipv eindtotaal), telt de test als **functioneel mislukt** — ook al is de HTTP-response technisch correct.

## Fout-scenario's testen (optioneel)

```bash
# Zonder auth token → verwacht 401
curl -X POST http://localhost:3001/api/receipt/extract \
  -F "image=@/home/damonbot/agentchattr/uploads/7dc45263.jpg"

# Verkeerd token → verwacht 403
curl -X POST http://localhost:3001/api/receipt/extract \
  -H "Authorization: Bearer fout-token" \
  -F "image=@/home/damonbot/agentchattr/uploads/7dc45263.jpg"

# Geen afbeelding → verwacht 400
curl -X POST http://localhost:3001/api/receipt/extract \
  -H "Authorization: Bearer test-token-123"
```

## Fase B: Web-app flow testen

Pas uitvoeren als Fase A (curl) succesvol is.

### Stap 5: App .env configureren

Bewerk de `.env` in de **Expo app root** (niet `receipt-server/.env`!):
```
EXPO_PUBLIC_RECEIPT_SERVER_URL=http://localhost:3001
EXPO_PUBLIC_RECEIPT_TOKEN=test-token-123
```

### Stap 6: Web-app starten en testen

```bash
cd /home/damonbot/Documents/GitRepos/BeursManager
npm run web
```

1. Ga naar een beurs → Kosten → Nieuwe kostenpost
2. Klik "Kies foto" → selecteer het testbonnetje
3. Controleer: preview verschijnt, loading indicator draait, velden worden ingevuld
4. Controleer: ingevulde waarden kloppen met het bonnetje
5. Opslaan → controleer dat kostenpost correct is aangemaakt

### Verificatie-checklist Fase B

- [ ] Foto-preview verschijnt na selectie
- [ ] "Bonnetje lezen..." indicator verschijnt
- [ ] Velden worden automatisch ingevuld na extractie
- [ ] Ingevulde waarden kloppen inhoudelijk
- [ ] Opslaan werkt correct met foto
- [ ] Opslaan zonder foto werkt nog steeds

## Fase C: iPad-validatie

Pas uitvoeren als Fase B (web) succesvol is. Dit is de **echte hoofd-use-case validatie**.

1. Server bereikbaar maken voor iPad (Cloudflare Tunnel of zelfde netwerk)
2. App op iPad openen
3. Bonnetje fotograferen via camera → extractie → opslaan
4. Dit is pas het moment dat de feature als "klaar voor gebruik" geldt
