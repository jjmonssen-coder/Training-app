# 🏋️ Styrkeprogresjon

En enkel web-app for å planlegge og følge styrketrening. Du legger inn dine
egne øvelser, får anbefalt **startvekt** og **repetisjoner**, en **progresjonsplan**,
og følger utviklingen din over tid med grafer.

Alt kjører lokalt i nettleseren – ingen konto, ingen server, ingen skytjeneste.
Dataene dine lagres i nettleserens `localStorage`.

## Kom i gang

**Enklest (anbefalt):** dobbeltklikk oppstartsfila for ditt system – den
starter en lokal server og åpner appen på `http://localhost:8000`:

- **Windows:** `start.bat`
- **Mac:** `start.command`
- **Linux:** `start.sh` (eller `./start.sh` i terminalen)

La vinduet som åpnes stå åpent mens du bruker appen; lukk det for å stoppe.
Åpne alltid appen på denne måten – da huskes alle data mellom øktene.

**Manuelt alternativ:**

```bash
python3 -m http.server 8000   # åpne deretter http://localhost:8000
```

> **Viktig om lagring:** Bruk den lokale versjonen (over) for å logge data over
> tid. En eventuell nettbasert forhåndsvisning kjører i en sandkasse som kan
> nullstille lagringen mellom åpninger, og egner seg bare for å se på appen.
> Å dobbeltklikke `index.html` direkte (adresse `file://`) fungerer også, men
> noen nettlesere lagrer ikke data på `file://` – derfor er lokal server tryggest.

## På iPhone / mobil

Appen er en installerbar web-app (PWA) med eget ikon, fullskjerm og
offline-støtte. For å bruke den på iPhone må den ligge på en nettadresse
(telefonen når ikke en fil på PC-en din).

**Alternativ A – GitHub Pages (gratis, anbefalt):**
1. På GitHub: **Settings → Pages**.
2. Under *Build and deployment* velg **Deploy from a branch**, velg denne
   greinen og mappe `/ (root)`, og lagre.
3. Etter et par minutter får du en URL som `https://<brukernavn>.github.io/training-app/`.
4. Åpne URL-en i **Safari** på iPhone.

**Alternativ B – samme Wi-Fi (rask test, PC-en må være på):**
1. Start serveren på PC-en slik at den er synlig på nettverket:
   `python3 -m http.server 8000 --bind 0.0.0.0`
2. Finn PC-ens lokale IP (f.eks. `192.168.1.42`).
3. På iPhone (samme Wi-Fi): åpne `http://192.168.1.42:8000` i Safari.

**Legg til på Hjem-skjerm (begge alternativer):**
I Safari: trykk **Del**-knappen → **Legg til på Hjem-skjerm**. Da får du et
app-ikon som åpner appen i fullskjerm, og Safari husker dataene dine.

> Data lagres per enhet. For å flytte historikk mellom PC og iPhone: bruk
> **Eksporter** på den ene og **Importer** på den andre (Innstillinger → Data).

## Slik fungerer den

### 1. Profil
Ved første oppstart legger du inn kroppsvekt, enhet (kg/lb), erfaringsnivå og
treningsmål. Dette brukes til å beregne anbefalinger.

### 2. Øvelser
Legg inn dine egne øvelser. For hver øvelse velger du en **type** (f.eks.
«overkropp press» eller «underkropp stor»), og appen foreslår automatisk:

- **Startvekt** – basert på kroppsvekt, øvelsestype og erfaringsnivå
- **Repetisjonsområde** – basert på målet ditt
- **Vektøkning** – hvor mye vekt du legger på når du progrederer

Du kan overstyre alle forslagene.

### 3. Logg økt
En økt kan inneholde flere øvelser. Velg en øvelse, fyll inn vekt × reps (eller
sekunder) for hvert sett, og bytt til neste øvelse – **det du fyller inn
beholdes per øvelse**. «Dagens økt» viser alt du har lagt inn så langt. Når du
er ferdig med alle øvelsene, trykker du **«Lagre hele økten»**, som lagrer hver
øvelse for seg. Vekten forhåndsutfylles fra anbefalingen; reps/sekunder skriver
du inn selv (anbefalt antall vises som hint i feltet).

### 4. Utvikling
Se estimert 1RM over tid i en graf, nøkkeltall (endring i %, tyngste vekt,
antall økter), fullstendig historikk, og **neste anbefalte mål**.

## Anbefalingene bak appen

### Startvekt
Beregnes som `kroppsvekt × faktor(øvelsestype) × faktor(nivå)`, avrundet til
nærmeste vektøkning. Dette gir en trygg arbeidsvekt for ~10 reps som du
justerer etter hvordan første sett kjennes.

| Øvelsestype | Andel av kroppsvekt (nybegynner) |
|---|---|
| Underkropp, stor (knebøy, markløft) | 0,50 |
| Underkropp, liten (utfall, leg curl) | 0,25 |
| Overkropp press (benk, skulderpress) | 0,35 |
| Overkropp trekk (roing, nedtrekk) | 0,35 |
| Isolasjon (biceps, triceps) | 0,10 |

Nivåfaktor: nybegynner ×1,0 · middels ×1,35 · erfaren ×1,7.

### Repetisjoner (etter mål)
| Mål | Reps |
|---|---|
| Maksimal styrke | 3–5 |
| Muskelvekst | 8–12 |
| Blanding | 5–8 |

### Progresjonsplan (dobbel progresjon)
1. Tren i repområdet med samme vekt.
2. Øk med **+1 rep** per økt til du treffer øvre grense (f.eks. 12) på **alle**
   sett.
3. Da øker du vekten med ett steg og starter på nedre grense (f.eks. 8) igjen.

Dette er en trygg og effektiv metode for jevn framgang, spesielt for
muskelvekst.

### Estimert 1RM
Beregnes med **Epley-formelen**: `1RM = vekt × (1 + reps / 30)`. Den lar deg
sammenligne styrke på tvers av økter selv om vekt og reps varierer.

## Data og personvern
- Alt lagres lokalt i nettleseren din (`localStorage`).
- **Eksporter** til en JSON-fil under Innstillinger for backup.
- **Automatisk backup**: velg i Innstillinger at appen skal laste ned en
  backup-fil automatisk etter hver økt eller hver 3./5./10. økt. Nedlastingen
  skjer i det du lagrer en økt.
- **Importer** for å flytte data til en annen enhet/nettleser, eller for å
  gjenopprette fra en backup.
- **Nullstill** sletter alt.

> Å oppdatere appens kode sletter ikke historikken – dataene ligger adskilt fra
> koden under en fast lagringsnøkkel, og innlasteren er bakoverkompatibel. Åpne
> appen på samme «adresse» hver gang (f.eks. alltid `http://localhost:8000`),
> siden `localStorage` er knyttet til adressen.

## Teknologi
Ren HTML, CSS og JavaScript. Ingen avhengigheter, ingen byggesteg. Grafen er
tegnet med canvas.

## Ansvarsfraskrivelse
Anbefalingene er generelle utgangspunkt, ikke individuell trenerveiledning.
Bruk god teknikk, varm opp, og juster etter egen form og dagsform.
