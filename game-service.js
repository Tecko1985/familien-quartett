// Austauschbare Service-Schicht: kapselt den gesamten Spielzustand hinter einer
// async/Promise-basierten API mit Subscription-Pattern. In einem späteren Schritt
// wird NUR diese Datei durch echte Firebase-Realtime-Database-Calls ersetzt
// (db.ref('raeume/<code>/...').on('value', ...) statt lokalem State) –
// app.js/index.html/style.css bleiben dabei unverändert.

const STORAGE_KEY = "familienquartett_state";
const RAUMCODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O/1/I, leichter vorzulesen
const EIGENE_SPIELER_ID = "self";
const TEST_NAMEN_POOL = ["Tom", "Lena", "Max", "Sara", "Jonas", "Mia", "Paul"];
const SPIELER_FARBEN = ["#1a56a0", "#057a55", "#c9941f", "#9333ea", "#dc2626", "#0891b2", "#db2777", "#ea580c"];
const MAX_SPIELER = 8;
const AUTO_PLAY_VERZOEGERUNG_MS = 1400;

let gameState = leererZustand();
let listener = null;

function leererZustand() {
  return {
    raumCode: null,
    modus: null, // "host" | "gast"
    spieler: [], // [{ id, name, avatarFarbe, istHost, istSimuliert, kartenAnzahl, istAusgeschieden }]
    spielerKarten: {}, // privat gehalten, NIE komplett über getZustand() exponiert
    amZugSpielerId: null,
    phase: "start", // "start" | "lobby" | "amZug" | "warteAufAndere" | "vergleich" | "beendet"
    aktuelleRunde: { gewaehlteKategorie: null, ausgespielteKarten: [], gewinnerSpielerId: null },
    siegerSpielerId: null
  };
}

function erzeugeRaumCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += RAUMCODE_ZEICHEN[Math.floor(Math.random() * RAUMCODE_ZEICHEN.length)];
  }
  return code;
}

function neueSpielerId() {
  return "spieler-" + Math.random().toString(36).slice(2, 9);
}

function speichereLokal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  } catch (e) {
    // localStorage kann z.B. im privaten Modus fehlschlagen – für den Prototyp unkritisch
  }
}

function ladeLokal() {
  try {
    const gespeichert = localStorage.getItem(STORAGE_KEY);
    if (gespeichert) {
      gameState = JSON.parse(gespeichert);
    }
  } catch (e) {
    gameState = leererZustand();
  }
}

function benachrichtige() {
  speichereLokal();
  if (listener) {
    listener(getZustand());
  }
}

function findeSpieler(spielerId) {
  return gameState.spieler.find(s => s.id === spielerId) || null;
}

function aktiveSpieler() {
  return gameState.spieler.filter(s => !s.istAusgeschieden);
}

function fuegeSpielerHinzu({ name, istHost, istSimuliert }) {
  const id = istSimuliert ? neueSpielerId() : EIGENE_SPIELER_ID;
  const farbe = SPIELER_FARBEN[gameState.spieler.length % SPIELER_FARBEN.length];
  const spieler = { id, name, avatarFarbe: farbe, istHost: !!istHost, istSimuliert: !!istSimuliert, kartenAnzahl: 0, istAusgeschieden: false };
  gameState.spieler.push(spieler);
  gameState.spielerKarten[id] = [];
  return spieler;
}

// --- Öffentliche API ---

async function erstelleRaum(spielerName) {
  if (!spielerName || !spielerName.trim()) {
    return { erfolg: false, fehler: "Bitte einen Namen eingeben." };
  }
  gameState = leererZustand();
  gameState.raumCode = erzeugeRaumCode();
  gameState.modus = "host";
  fuegeSpielerHinzu({ name: spielerName.trim(), istHost: true, istSimuliert: false });
  gameState.phase = "lobby";
  benachrichtige();
  return { erfolg: true, raumCode: gameState.raumCode };
}

async function tritRaumBei(raumCode, spielerName) {
  if (!spielerName || !spielerName.trim()) {
    return { erfolg: false, fehler: "Bitte einen Namen eingeben." };
  }
  if (!raumCode || !raumCode.trim()) {
    return { erfolg: false, fehler: "Bitte einen Raum-Code eingeben." };
  }
  // Mock-Beitritt: es gibt kein echtes Backend, daher wird eine plausible,
  // bereits leicht gefüllte Lobby simuliert statt eines echten Remote-Raums.
  gameState = leererZustand();
  gameState.raumCode = raumCode.trim().toUpperCase();
  gameState.modus = "gast";
  fuegeSpielerHinzu({ name: TEST_NAMEN_POOL[0] + " (Host)", istHost: true, istSimuliert: true });
  fuegeSpielerHinzu({ name: spielerName.trim(), istHost: false, istSimuliert: false });
  gameState.phase = "lobby";
  benachrichtige();
  return { erfolg: true };
}

async function fuegeTestSpielerHinzu() {
  if (gameState.phase !== "lobby") return { erfolg: false };
  if (gameState.spieler.length >= MAX_SPIELER) return { erfolg: false, fehler: "Lobby ist voll (max. 8)." };
  const verwendeteNamen = gameState.spieler.map(s => s.name);
  const freierName = TEST_NAMEN_POOL.find(n => !verwendeteNamen.includes(n)) || ("Gast " + (gameState.spieler.length + 1));
  fuegeSpielerHinzu({ name: freierName, istHost: false, istSimuliert: true });
  benachrichtige();
  return { erfolg: true };
}

async function starteSpiel() {
  const eigener = findeSpieler(EIGENE_SPIELER_ID);
  if (gameState.phase !== "lobby" || !eigener || !eigener.istHost) return { erfolg: false };
  if (gameState.spieler.length < 2) return { erfolg: false, fehler: "Mindestens 2 Spieler nötig." };

  const gemischt = mischeArray(getMockDeck());
  gameState.spieler.forEach(s => (gameState.spielerKarten[s.id] = []));
  gemischt.forEach((karte, index) => {
    const empfaenger = gameState.spieler[index % gameState.spieler.length];
    gameState.spielerKarten[empfaenger.id].push(karte);
  });
  aktualisiereKartenAnzahl();

  const startSpieler = gameState.spieler[Math.floor(Math.random() * gameState.spieler.length)];
  setzeAmZug(startSpieler.id);
  benachrichtige();
  planeAutoPlayFallsNoetig();
  return { erfolg: true };
}

async function waehleKategorie(kategorieSchluessel) {
  if (gameState.phase !== "amZug" || gameState.amZugSpielerId !== EIGENE_SPIELER_ID) return { erfolg: false };
  loeseRundeAus(kategorieSchluessel);
  return { erfolg: true };
}

async function bestaetigeWeiter() {
  if (gameState.phase !== "vergleich") return { erfolg: false };

  const runde = gameState.aktuelleRunde;
  const gewinnerId = runde.gewinnerSpielerId;

  runde.ausgespielteKarten.forEach(eintrag => {
    gameState.spielerKarten[eintrag.spielerId].shift();
  });
  runde.ausgespielteKarten.forEach(eintrag => {
    gameState.spielerKarten[gewinnerId].push(eintrag.karte);
  });
  aktualisiereKartenAnzahl();

  const nochAktiv = aktiveSpieler();
  if (nochAktiv.length <= 1) {
    gameState.phase = "beendet";
    gameState.siegerSpielerId = nochAktiv.length === 1 ? nochAktiv[0].id : gewinnerId;
    gameState.amZugSpielerId = null;
    benachrichtige();
    return { erfolg: true };
  }

  gameState.aktuelleRunde = { gewaehlteKategorie: null, ausgespielteKarten: [], gewinnerSpielerId: null };
  setzeAmZug(gewinnerId);
  benachrichtige();
  planeAutoPlayFallsNoetig();
  return { erfolg: true };
}

async function neuesSpiel() {
  gameState = leererZustand();
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignorieren
  }
  benachrichtige();
  return { erfolg: true };
}

function getZustand() {
  const eigeneKarten = gameState.spielerKarten[EIGENE_SPIELER_ID] || [];
  return {
    raumCode: gameState.raumCode,
    modus: gameState.modus,
    eigenerSpielerId: EIGENE_SPIELER_ID,
    spieler: gameState.spieler.map(s => ({ ...s })),
    amZugSpielerId: gameState.amZugSpielerId,
    phase: gameState.phase,
    eigeneKarten: eigeneKarten.map(k => ({ ...k, eigenschaften: { ...k.eigenschaften } })),
    aktuelleRunde: {
      gewaehlteKategorie: gameState.aktuelleRunde.gewaehlteKategorie,
      ausgespielteKarten: gameState.aktuelleRunde.ausgespielteKarten.map(e => ({ ...e })),
      gewinnerSpielerId: gameState.aktuelleRunde.gewinnerSpielerId
    },
    siegerSpielerId: gameState.siegerSpielerId,
    maxSpieler: MAX_SPIELER
  };
}

// Subscription-Pattern statt Rückgabewert – wird in Schritt 2 1:1 durch einen
// Firebase .on('value', ...)-Listener ersetzt. Feuert wie Firebase sofort einmal
// mit dem aktuellen Stand, danach bei jeder Änderung erneut.
function onZustandsAenderung(callback) {
  listener = callback;
  listener(getZustand());
}

// --- Interne Hilfsfunktionen ---

function aktualisiereKartenAnzahl() {
  gameState.spieler.forEach(s => {
    s.kartenAnzahl = (gameState.spielerKarten[s.id] || []).length;
    if (s.kartenAnzahl === 0 && gameState.phase !== "lobby") {
      s.istAusgeschieden = true;
    }
  });
}

function setzeAmZug(spielerId) {
  gameState.amZugSpielerId = spielerId;
  gameState.phase = spielerId === EIGENE_SPIELER_ID ? "amZug" : "warteAufAndere";
}

function loeseRundeAus(kategorieSchluessel) {
  const mitspieler = aktiveSpieler();
  const ausgespielteKarten = mitspieler.map(s => ({
    spielerId: s.id,
    karte: gameState.spielerKarten[s.id][0]
  }));

  let gewinnerEintrag = ausgespielteKarten[0];
  ausgespielteKarten.forEach(eintrag => {
    const wert = eintrag.karte.eigenschaften[kategorieSchluessel];
    const bisherigerBestwert = gewinnerEintrag.karte.eigenschaften[kategorieSchluessel];
    if (wert > bisherigerBestwert) {
      gewinnerEintrag = eintrag;
    }
  });
  // Hinweis: bei Gleichstand gewinnt deterministisch der erste in Spielreihenfolge
  // gefundene Höchstwert (vereinfachte Regel für den UI-Prototyp, keine "Bockrunde").

  gameState.aktuelleRunde = {
    gewaehlteKategorie: kategorieSchluessel,
    ausgespielteKarten,
    gewinnerSpielerId: gewinnerEintrag.spielerId
  };
  gameState.phase = "vergleich";
  benachrichtige();
}

function planeAutoPlayFallsNoetig() {
  const amZug = findeSpieler(gameState.amZugSpielerId);
  if (!amZug || !amZug.istSimuliert || gameState.phase !== "warteAufAndere") return;

  setTimeout(() => {
    // Mock-Verhalten: simulierte Mitspieler entfallen ersatzlos, sobald in Schritt 2
    // echte Mitspieler:innen selbst entscheiden.
    if (gameState.amZugSpielerId !== amZug.id || gameState.phase !== "warteAufAndere") return;
    const karte = gameState.spielerKarten[amZug.id][0];
    const kategorien = Object.keys(karte.eigenschaften);
    const zufallsKategorie = kategorien[Math.floor(Math.random() * kategorien.length)];
    loeseRundeAus(zufallsKategorie);
  }, AUTO_PLAY_VERZOEGERUNG_MS);
}

ladeLokal();

const gameService = {
  erstelleRaum,
  tritRaumBei,
  fuegeTestSpielerHinzu,
  starteSpiel,
  waehleKategorie,
  bestaetigeWeiter,
  neuesSpiel,
  getZustand,
  onZustandsAenderung
};
