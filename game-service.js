// Echte Mehrgeräte-Anbindung über Firebase Realtime Database + Anonymous Auth.
// app.js redet weiterhin nur mit derselben gameService-API wie im Mock-Prototyp –
// getZustand()/onZustandsAenderung() liefern exakt dieselbe Form wie zuvor.
//
// Architektur-Kernpunkt (Datenschutz eigener Karten):
//   raeume/$raumCode               -> öffentlicher Zustand, für alle Mitspieler:innen lesbar
//   geheime_karten/$raumCode/$uid  -> private Hand, nur vom eigenen Gerät ODER vom Gastgeber lesbar
// Da Sicherheitsregeln niemandem erlauben, fremde Geheim-Hände zu lesen, übernimmt das
// Gastgeber-Gerät die Rolle des "Schiedsrichters": es vergleicht die Karten und schreibt
// nur das Ergebnis öffentlich. Das Gastgeber-Handy muss daher während der Partie offen bleiben.

const STORAGE_KEY = "familienquartett_raumcode";
const RAUMCODE_ZEICHEN = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O/1/I, leichter vorzulesen
const TEST_NAMEN_POOL = ["Tom", "Lena", "Max", "Sara", "Jonas", "Mia", "Paul"];
const SPIELER_FARBEN = ["#1a56a0", "#057a55", "#c9941f", "#9333ea", "#dc2626", "#0891b2", "#db2777", "#ea580c"];
const MAX_SPIELER = 8;
const AUTO_PLAY_VERZOEGERUNG_MS = 1400;

let eigeneUid = null;
let aktuellerRaumCode = null;
let listener = null;
let roomRef = null;
let ownHandRef = null;
let letzterOeffentlicherZustand = null;
let letzteEigeneKarten = [];
let kategorieWahlUnterwegs = false;
let botZugGeplantFuer = null;

const authBereit = new Promise(resolve => {
  auth.onAuthStateChanged(user => {
    if (user) {
      eigeneUid = user.uid;
      resolve(user.uid);
    }
  });
});
auth.signInAnonymously().catch(err => console.error("Anonyme Anmeldung fehlgeschlagen:", err));

function erzeugeRaumCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += RAUMCODE_ZEICHEN[Math.floor(Math.random() * RAUMCODE_ZEICHEN.length)];
  }
  return code;
}

async function erzeugeEindeutigenRaumCode() {
  for (let versuch = 0; versuch < 5; versuch++) {
    const code = erzeugeRaumCode();
    const snap = await db.ref(`raeume/${code}`).once("value");
    if (!snap.exists()) return code;
  }
  throw new Error("Konnte keinen freien Raum-Code erzeugen.");
}

function zustandOhneRaum() {
  return {
    raumCode: null,
    modus: null,
    eigenerSpielerId: eigeneUid,
    spieler: [],
    amZugSpielerId: null,
    phase: "start",
    kartenSet: "familie",
    eigeneKarten: [],
    aktuelleRunde: { gewaehlteKategorie: null, ausgespielteKarten: [], gewinnerSpielerId: null },
    siegerSpielerId: null,
    maxSpieler: MAX_SPIELER
  };
}

function rundenKartenAlsArray(aktuelleRunde) {
  if (!aktuelleRunde || !aktuelleRunde.ausgespielteKarten) return [];
  return Object.keys(aktuelleRunde.ausgespielteKarten).map(uid => ({
    spielerId: uid,
    karte: aktuelleRunde.ausgespielteKarten[uid]
  }));
}

function getZustand() {
  const raum = letzterOeffentlicherZustand;
  if (!raum) return zustandOhneRaum();

  const spielerListe = Object.keys(raum.spieler || {}).map(uid => ({ id: uid, ...raum.spieler[uid] }));
  const eigenerSpieler = raum.spieler ? raum.spieler[eigeneUid] : null;

  let phaseFuerUi = raum.phase;
  if (raum.phase === "amZug") {
    phaseFuerUi = raum.amZugSpielerId === eigeneUid ? "amZug" : "warteAufAndere";
  } else if (raum.phase === "aufloesungLaeuft") {
    // kurzer Zwischenzustand, während der Gastgeber im Hintergrund vergleicht
    phaseFuerUi = "warteAufAndere";
  }

  return {
    raumCode: aktuellerRaumCode,
    modus: eigenerSpieler ? (eigenerSpieler.istHost ? "host" : "gast") : null,
    eigenerSpielerId: eigeneUid,
    spieler: spielerListe,
    amZugSpielerId: raum.amZugSpielerId || null,
    phase: phaseFuerUi,
    kartenSet: raum.kartenSet || "familie",
    eigeneKarten: letzteEigeneKarten,
    aktuelleRunde: {
      gewaehlteKategorie: raum.aktuelleRunde ? raum.aktuelleRunde.gewaehlteKategorie : null,
      ausgespielteKarten: rundenKartenAlsArray(raum.aktuelleRunde),
      gewinnerSpielerId: raum.aktuelleRunde ? raum.aktuelleRunde.gewinnerSpielerId : null
    },
    siegerSpielerId: raum.siegerSpielerId || null,
    maxSpieler: MAX_SPIELER
  };
}

function benachrichtige() {
  if (listener && letzterOeffentlicherZustand) {
    listener(getZustand());
  }
}

function loeseListenerAb() {
  if (roomRef) roomRef.off();
  if (ownHandRef) ownHandRef.off();
  roomRef = null;
  ownHandRef = null;
  letzterOeffentlicherZustand = null;
  letzteEigeneKarten = [];
}

function betretRaumLokal(code) {
  loeseListenerAb();
  aktuellerRaumCode = code;
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch (e) {
    // unkritisch, falls localStorage nicht verfügbar ist
  }

  roomRef = db.ref(`raeume/${code}`);
  ownHandRef = db.ref(`geheime_karten/${code}/${eigeneUid}/karten`);

  roomRef.on("value", snap => {
    letzterOeffentlicherZustand = snap.val();
    if (!letzterOeffentlicherZustand) return; // Raum wurde beendet/gelöscht
    pruefeUndLoeseAlsHostAus();
    benachrichtige();
  });

  ownHandRef.on("value", snap => {
    letzteEigeneKarten = snap.val() || [];
    benachrichtige();
  });
}

// --- Öffentliche API ---

async function erstelleRaum(spielerName, kartenSet) {
  if (!spielerName || !spielerName.trim()) {
    return { erfolg: false, fehler: "Bitte einen Namen eingeben." };
  }
  await authBereit;
  const code = await erzeugeEindeutigenRaumCode();
  await db.ref(`raeume/${code}`).set({
    erstelltAm: firebase.database.ServerValue.TIMESTAMP,
    hostId: eigeneUid,
    phase: "lobby",
    kartenSet: kartenSet === "auto" ? "auto" : "familie",
    amZugSpielerId: null,
    siegerSpielerId: null,
    naechsteRundeAngefordert: null,
    aktuelleRunde: { gewaehlteKategorie: null, ausgespielteKarten: null, gewinnerSpielerId: null },
    spieler: {
      [eigeneUid]: {
        name: spielerName.trim(),
        avatarFarbe: SPIELER_FARBEN[0],
        istHost: true,
        istSimuliert: false,
        kartenAnzahl: 0,
        istAusgeschieden: false
      }
    }
  });
  betretRaumLokal(code);
  return { erfolg: true, raumCode: code };
}

async function tritRaumBei(raumCode, spielerName) {
  if (!spielerName || !spielerName.trim()) {
    return { erfolg: false, fehler: "Bitte einen Namen eingeben." };
  }
  if (!raumCode || !raumCode.trim()) {
    return { erfolg: false, fehler: "Bitte einen Raum-Code eingeben." };
  }
  await authBereit;
  const code = raumCode.trim().toUpperCase();
  const snap = await db.ref(`raeume/${code}`).once("value");
  if (!snap.exists()) {
    return { erfolg: false, fehler: "Raum nicht gefunden." };
  }
  const raum = snap.val();
  const spielerListe = raum.spieler || {};

  if (spielerListe[eigeneUid]) {
    betretRaumLokal(code); // schon Mitglied, z.B. nach Reload
    return { erfolg: true };
  }
  if (raum.phase !== "lobby") {
    return { erfolg: false, fehler: "Dieses Spiel läuft schon." };
  }
  if (Object.keys(spielerListe).length >= MAX_SPIELER) {
    return { erfolg: false, fehler: "Raum ist voll (max. 8)." };
  }

  const farbe = SPIELER_FARBEN[Object.keys(spielerListe).length % SPIELER_FARBEN.length];
  await db.ref(`raeume/${code}/spieler/${eigeneUid}`).set({
    name: spielerName.trim(),
    avatarFarbe: farbe,
    istHost: false,
    istSimuliert: false,
    kartenAnzahl: 0,
    istAusgeschieden: false
  });
  betretRaumLokal(code);
  return { erfolg: true };
}

async function fuegeTestSpielerHinzu() {
  const raum = letzterOeffentlicherZustand;
  if (!raum || raum.phase !== "lobby" || raum.hostId !== eigeneUid) return { erfolg: false };
  const uids = Object.keys(raum.spieler || {});
  if (uids.length >= MAX_SPIELER) return { erfolg: false, fehler: "Lobby ist voll (max. 8)." };

  const verwendeteNamen = uids.map(uid => raum.spieler[uid].name);
  const freierName = TEST_NAMEN_POOL.find(n => !verwendeteNamen.includes(n)) || ("Gast " + (uids.length + 1));
  const botId = "bot-" + Math.random().toString(36).slice(2, 9);
  const farbe = SPIELER_FARBEN[uids.length % SPIELER_FARBEN.length];

  await db.ref(`raeume/${aktuellerRaumCode}/spieler/${botId}`).set({
    name: freierName,
    avatarFarbe: farbe,
    istHost: false,
    istSimuliert: true,
    kartenAnzahl: 0,
    istAusgeschieden: false
  });
  return { erfolg: true };
}

async function starteSpiel() {
  const raum = letzterOeffentlicherZustand;
  if (!raum || raum.phase !== "lobby" || raum.hostId !== eigeneUid) return { erfolg: false };
  const uids = Object.keys(raum.spieler || {});
  if (uids.length < 2) return { erfolg: false, fehler: "Mindestens 2 Spieler nötig." };

  const gemischt = mischeArray(getMockDeck(raum.kartenSet));
  const haende = {};
  uids.forEach(uid => (haende[uid] = []));
  gemischt.forEach((karte, index) => {
    haende[uids[index % uids.length]].push(karte);
  });

  const code = aktuellerRaumCode;
  const updates = {};
  uids.forEach(uid => {
    updates[`geheime_karten/${code}/${uid}/karten`] = haende[uid];
    updates[`raeume/${code}/spieler/${uid}/kartenAnzahl`] = haende[uid].length;
    updates[`raeume/${code}/spieler/${uid}/istAusgeschieden`] = false;
  });
  updates[`raeume/${code}/amZugSpielerId`] = uids[Math.floor(Math.random() * uids.length)];
  updates[`raeume/${code}/phase`] = "amZug";

  await db.ref().update(updates);
  return { erfolg: true };
}

async function waehleKategorie(kategorieSchluessel) {
  const raum = letzterOeffentlicherZustand;
  if (!raum || raum.phase !== "amZug" || raum.amZugSpielerId !== eigeneUid) return { erfolg: false };
  if (kategorieWahlUnterwegs) return { erfolg: false };
  kategorieWahlUnterwegs = true;
  try {
    await db.ref(`raeume/${aktuellerRaumCode}`).update({
      phase: "aufloesungLaeuft",
      "aktuelleRunde/gewaehlteKategorie": kategorieSchluessel
    });
    return { erfolg: true };
  } finally {
    kategorieWahlUnterwegs = false;
  }
}

async function bestaetigeWeiter() {
  const raum = letzterOeffentlicherZustand;
  if (!raum || raum.phase !== "vergleich") return { erfolg: false };
  await db.ref(`raeume/${aktuellerRaumCode}/naechsteRundeAngefordert`).set(true);
  return { erfolg: true };
}

async function neuesSpiel() {
  const raum = letzterOeffentlicherZustand;
  const code = aktuellerRaumCode;
  if (raum && code && raum.hostId === eigeneUid) {
    const updates = { [`raeume/${code}`]: null };
    Object.keys(raum.spieler || {}).forEach(uid => {
      updates[`geheime_karten/${code}/${uid}`] = null;
    });
    db.ref().update(updates).catch(() => {});
  }
  loeseListenerAb();
  aktuellerRaumCode = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // unkritisch
  }
  if (listener) listener(zustandOhneRaum());
  return { erfolg: true };
}

function onZustandsAenderung(callback) {
  listener = callback;
  let gespeicherterCode = null;
  try {
    gespeicherterCode = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    // unkritisch
  }
  if (gespeicherterCode) {
    authBereit.then(() => betretRaumLokal(gespeicherterCode));
  } else {
    callback(zustandOhneRaum());
  }
}

// --- Gastgeber-Schiedsrichter-Logik (einzige Instanz mit Zugriff auf alle Geheim-Hände) ---

function pruefeUndLoeseAlsHostAus() {
  const raum = letzterOeffentlicherZustand;
  if (!raum || raum.hostId !== eigeneUid) return;

  if (raum.phase === "aufloesungLaeuft" && raum.aktuelleRunde && raum.aktuelleRunde.gewaehlteKategorie && !raum.aktuelleRunde.ausgespielteKarten) {
    loeseRundeAufAlsHost(raum.aktuelleRunde.gewaehlteKategorie);
  }
  if (raum.phase === "vergleich" && raum.naechsteRundeAngefordert) {
    fuehreRundenTransferAusAlsHost();
  }
  if (raum.phase === "amZug" && raum.amZugSpielerId && raum.spieler[raum.amZugSpielerId] && raum.spieler[raum.amZugSpielerId].istSimuliert) {
    planeBotZugFallsNoetig(raum.amZugSpielerId);
  }
}

async function loeseRundeAufAlsHost(kategorieSchluessel) {
  const code = aktuellerRaumCode;
  const raum = letzterOeffentlicherZustand;
  const aktiveUids = Object.keys(raum.spieler).filter(uid => !raum.spieler[uid].istAusgeschieden);

  const schnappschuesse = await Promise.all(
    aktiveUids.map(uid => db.ref(`geheime_karten/${code}/${uid}/karten`).once("value"))
  );
  const topKarten = {};
  aktiveUids.forEach((uid, i) => {
    const hand = schnappschuesse[i].val() || [];
    if (hand[0]) topKarten[uid] = hand[0];
  });

  const beteiligteUids = Object.keys(topKarten);
  let gewinnerUid = beteiligteUids[0];
  beteiligteUids.forEach(uid => {
    if (topKarten[uid].eigenschaften[kategorieSchluessel] > topKarten[gewinnerUid].eigenschaften[kategorieSchluessel]) {
      gewinnerUid = uid;
    }
  });
  // Hinweis: bei Gleichstand gewinnt deterministisch der erste gefundene Höchstwert
  // (vereinfachte Regel für diesen Schritt, keine "Bockrunde").

  await db.ref().update({
    [`raeume/${code}/phase`]: "vergleich",
    [`raeume/${code}/aktuelleRunde/ausgespielteKarten`]: topKarten,
    [`raeume/${code}/aktuelleRunde/gewinnerSpielerId`]: gewinnerUid
  });
}

async function fuehreRundenTransferAusAlsHost() {
  const code = aktuellerRaumCode;
  const raum = letzterOeffentlicherZustand;
  const runde = raum.aktuelleRunde;
  const gewinnerUid = runde.gewinnerSpielerId;
  const beteiligteUids = Object.keys(runde.ausgespielteKarten);

  const schnappschuesse = await Promise.all(
    beteiligteUids.map(uid => db.ref(`geheime_karten/${code}/${uid}/karten`).once("value"))
  );

  const updates = {};
  const gewonneneKarten = [];
  beteiligteUids.forEach((uid, i) => {
    const hand = (schnappschuesse[i].val() || []).slice();
    const obersteKarte = hand.shift();
    if (obersteKarte) gewonneneKarten.push(obersteKarte);
    updates[`geheime_karten/${code}/${uid}/karten`] = hand;
  });
  const gewinnerRestHand = updates[`geheime_karten/${code}/${gewinnerUid}/karten`] || [];
  updates[`geheime_karten/${code}/${gewinnerUid}/karten`] = gewinnerRestHand.concat(gewonneneKarten);

  let nochAktiveAnzahl = 0;
  let letzterAktiverUid = null;
  Object.keys(raum.spieler).forEach(uid => {
    const aktuelleAnzahl = beteiligteUids.includes(uid)
      ? updates[`geheime_karten/${code}/${uid}/karten`].length
      : raum.spieler[uid].kartenAnzahl;
    const ausgeschieden = aktuelleAnzahl === 0;
    updates[`raeume/${code}/spieler/${uid}/kartenAnzahl`] = aktuelleAnzahl;
    updates[`raeume/${code}/spieler/${uid}/istAusgeschieden`] = ausgeschieden;
    if (!ausgeschieden) {
      nochAktiveAnzahl++;
      letzterAktiverUid = uid;
    }
  });

  updates[`raeume/${code}/naechsteRundeAngefordert`] = null;

  if (nochAktiveAnzahl <= 1) {
    updates[`raeume/${code}/phase`] = "beendet";
    updates[`raeume/${code}/siegerSpielerId`] = letzterAktiverUid || gewinnerUid;
    updates[`raeume/${code}/amZugSpielerId`] = null;
  } else {
    updates[`raeume/${code}/phase`] = "amZug";
    updates[`raeume/${code}/amZugSpielerId`] = gewinnerUid;
    updates[`raeume/${code}/aktuelleRunde`] = { gewaehlteKategorie: null, ausgespielteKarten: null, gewinnerSpielerId: null };
  }

  await db.ref().update(updates);
}

function planeBotZugFallsNoetig(botUid) {
  if (botZugGeplantFuer === botUid) return; // schon geplant
  botZugGeplantFuer = botUid;
  setTimeout(async () => {
    botZugGeplantFuer = null;
    const raum = letzterOeffentlicherZustand;
    if (!raum || raum.phase !== "amZug" || raum.amZugSpielerId !== botUid) return;
    const handSnap = await db.ref(`geheime_karten/${aktuellerRaumCode}/${botUid}/karten`).once("value");
    const hand = handSnap.val() || [];
    if (!hand.length) return;
    const kategorien = Object.keys(hand[0].eigenschaften);
    const zufallsKategorie = kategorien[Math.floor(Math.random() * kategorien.length)];
    await db.ref(`raeume/${aktuellerRaumCode}`).update({
      phase: "aufloesungLaeuft",
      "aktuelleRunde/gewaehlteKategorie": zufallsKategorie
    });
  }, AUTO_PLAY_VERZOEGERUNG_MS);
}

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
