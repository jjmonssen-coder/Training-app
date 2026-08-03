# 🏋️ Styrkeprogresjon

En enkel web-app for å planlegge og følge styrketrening. Du legger inn dine
egne øvelser, får anbefalt **startvekt** og **repetisjoner**, en **progresjonsplan**,
og følger utviklingen din over tid med grafer.

Alt kjører lokalt i nettleseren – ingen konto, ingen server, ingen skytjeneste.
Dataene dine lagres i nettleserens `localStorage`.

## Kom i gang

Åpne `index.html` i en nettleser. Det er alt – ingen installasjon eller
byggesteg.

```bash
# Alternativ 1: dobbeltklikk index.html i filutforskeren

# Alternativ 2: kjør en lokal server (anbefalt for full funksjonalitet)
python3 -m http.server 8000
# åpne deretter http://localhost:8000
```

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
Velg øvelse og fyll inn vekt × reps for hvert sett. Appen forhåndsutfyller
feltene med dagens anbefaling, så du ser målet ditt før du starter.

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
- Alt lagres lokalt i nettleseren din.
- **Eksporter** til en JSON-fil under Innstillinger for backup.
- **Importer** for å flytte data til en annen enhet/nettleser.
- **Nullstill** sletter alt.

## Teknologi
Ren HTML, CSS og JavaScript. Ingen avhengigheter, ingen byggesteg. Grafen er
tegnet med canvas.

## Ansvarsfraskrivelse
Anbefalingene er generelle utgangspunkt, ikke individuell trenerveiledning.
Bruk god teknikk, varm opp, og juster etter egen form og dagsform.
