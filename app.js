// Steuert ausschließlich Screens/Rendering/Events. Redet NIE direkt mit mock-data.js,
// sondern ausschließlich über die gameService-API (siehe game-service.js).

const SCREEN_FUER_PHASE = {
  start: "screen-start",
  lobby: "screen-lobby",
  amZug: "screen-spiel",
  warteAufAndere: "screen-spiel",
  vergleich: "screen-vergleich",
  beendet: "screen-game-over",
  abgebrochen: "screen-abgebrochen"
};

const PHASEN_MIT_ABBRUCH_BUTTON = ["amZug", "warteAufAndere", "vergleich"];

let ausstehenderModus = null; // "erstellen" | "beitreten"
let raumcodeEingabe = "";
let ausstehenderKartenSet = "familie";
let ausstehenderDeckgroesse = "normal";

const DECKGROESSE_LABEL = { klein: "5 Karten/Spieler:in", normal: "10 Karten/Spieler:in", gross: "Maximum aus dem Kartenpool" };

let kvAusgewaehltesDeck = "familie";
let kvBearbeiteteKarte = null;
let kvNeuesFoto = undefined; // undefined = unveraendert, sonst Daten-URL des neuen Fotos

function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
  document.getElementById(screenId).classList.add("active");
}

function getSpielerName(zustand, spielerId) {
  const spieler = zustand.spieler.find(s => s.id === spielerId);
  return spieler ? spieler.name : "?";
}

function getEigenerSpieler(zustand) {
  return zustand.spieler.find(s => s.id === zustand.eigenerSpielerId) || null;
}

function avatarInitiale(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

// --- Karten-Rendering ---

function erzeugeKartenElement(karte, { waehlbar }, kategorien) {
  const wrapper = document.createElement("div");
  wrapper.className = "quartett-karte";
  wrapper.style.setProperty("--avatar-farbe", karte.avatarFarbe);

  const fotoHtml = karte.foto
    ? `<img src="${karte.foto}" alt="${karte.name}">`
    : `<img class="avatar-fallback" src="avatar-placeholder.svg" alt="Kein Foto">`;

  const eigenschaftenHtml = Object.keys(karte.eigenschaften).map(schluessel => {
    const meta = kategorien[schluessel] || { label: schluessel, icon: "▫️" };
    const klasse = waehlbar ? "eigenschaft waehlbar" : "eigenschaft";
    return `
      <li class="${klasse}" data-kategorie="${schluessel}">
        <span class="eig-icon">${meta.icon}</span>
        <span class="eig-label">${meta.label}</span>
        <span class="eig-wert">${karte.eigenschaften[schluessel]}</span>
      </li>`;
  }).join("");

  wrapper.innerHTML = `
    <div class="karte-kopf">
      <span class="karte-name">${karte.name}</span>
      <span class="karte-rolle">${karte.rolle}</span>
    </div>
    <div class="karte-foto">${fotoHtml}</div>
    <ul class="karte-eigenschaften">${eigenschaftenHtml}</ul>
  `;

  if (waehlbar) {
    wrapper.querySelectorAll(".eigenschaft").forEach(li => {
      li.addEventListener("click", () => gameService.waehleKategorie(li.dataset.kategorie));
    });
  }

  return wrapper;
}

// --- Render je Screen ---

function renderLobby(zustand) {
  document.getElementById("lobby-raumcode").textContent = zustand.raumCode || "------";
  document.getElementById("lobby-zaehler").textContent = `${zustand.spieler.length}/${zustand.maxSpieler} Spieler:innen`;

  const liste = document.getElementById("lobby-spielerliste");
  liste.innerHTML = "";
  zustand.spieler.forEach(s => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="spieler-avatar" style="background:${s.avatarFarbe}">${avatarInitiale(s.name)}</span>
      <span class="spieler-name">${s.name}</span>
      <span class="spieler-badge">${s.istHost ? "Gastgeber:in" : ""}</span>
    `;
    liste.appendChild(li);
  });

  const eigener = getEigenerSpieler(zustand);
  const istHost = !!(eigener && eigener.istHost);
  document.getElementById("btn-test-spieler").style.display = istHost ? "block" : "none";
  document.getElementById("btn-spiel-starten").style.display = istHost ? "block" : "none";
  document.getElementById("btn-spiel-starten").disabled = zustand.spieler.length < 2;
  document.getElementById("lobby-warte-hinweis").style.display = istHost ? "none" : "block";
  const modusLabel = zustand.kartenSet === "auto" ? "🚗 Auto-Quartett" : "🎴 Familien-Quartett";
  const groesseLabel = DECKGROESSE_LABEL[zustand.deckgroesse] || DECKGROESSE_LABEL.normal;
  document.getElementById("lobby-modus").textContent = `${modusLabel} · ${groesseLabel}`;
}

function renderSpiel(zustand) {
  const eigeneKarte = zustand.eigeneKarten[0];
  const amZug = zustand.phase === "amZug";
  const kategorien = getKategorien(zustand.kartenSet);

  document.getElementById("spiel-eigene-kartenanzahl").textContent = `🂠 ${zustand.eigeneKarten.length} Karten`;
  document.getElementById("spiel-status-text").textContent = amZug
    ? "Du bist am Zug"
    : `Warte auf ${getSpielerName(zustand, zustand.amZugSpielerId)} …`;
  document.getElementById("spiel-hinweis").textContent = amZug
    ? "Wähle eine Eigenschaft deiner Karte aus."
    : "Die Karten werden gleich aufgedeckt.";

  const buehne = document.getElementById("spiel-karte-container");
  buehne.innerHTML = "";
  if (eigeneKarte) {
    buehne.appendChild(erzeugeKartenElement(eigeneKarte, { waehlbar: amZug }, kategorien));
  }
}

function renderVergleich(zustand) {
  const runde = zustand.aktuelleRunde;
  const kategorien = getKategorien(zustand.kartenSet);
  const meta = kategorien[runde.gewaehlteKategorie] || { label: runde.gewaehlteKategorie, icon: "▫️" };
  document.getElementById("vergleich-kategorie-label").textContent = `${meta.icon} ${meta.label}`;

  const liste = document.getElementById("vergleich-liste");
  liste.innerHTML = "";
  runde.ausgespielteKarten
    .slice()
    .sort((a, b) => b.karte.eigenschaften[runde.gewaehlteKategorie] - a.karte.eigenschaften[runde.gewaehlteKategorie])
    .forEach(eintrag => {
      const spielerName = getSpielerName(zustand, eintrag.spielerId);
      const istGewinner = eintrag.spielerId === runde.gewinnerSpielerId;
      const istEigene = eintrag.spielerId === zustand.eigenerSpielerId;
      const li = document.createElement("li");
      li.className = "quartett-karte--mini" + (istGewinner ? " gewinner" : "") + (istEigene ? " eigene" : "");
      li.innerHTML = `
        <span class="mini-avatar" style="background:${eintrag.karte.avatarFarbe}">${avatarInitiale(spielerName)}</span>
        <span class="mini-name">${spielerName} – ${eintrag.karte.name}</span>
        <span class="mini-wert">${eintrag.karte.eigenschaften[runde.gewaehlteKategorie]}</span>
      `;
      liste.appendChild(li);
    });

  const weiterBtn = document.getElementById("btn-vergleich-weiter");
  const bereitText = document.getElementById("vergleich-bereit-text");
  if (!runde.gewinnerSpielerId) {
    document.getElementById("vergleich-gewinner-text").textContent =
      "Gleichstand! Die nächste Karte wird automatisch in derselben Kategorie verglichen …";
    weiterBtn.style.display = "none";
    bereitText.textContent = "";
  } else {
    document.getElementById("vergleich-gewinner-text").textContent =
      `${getSpielerName(zustand, runde.gewinnerSpielerId)} gewinnt die Runde!`;
    weiterBtn.style.display = "block";
    bereitText.textContent =
      `${runde.weiterBestaetigtAnzahl}/${runde.weiterBestaetigtGesamt} Spieler:innen bereit – spätestens nach 10 Sekunden geht’s automatisch weiter.`;
    if (runde.habeIchBestaetigt) {
      weiterBtn.disabled = true;
      weiterBtn.textContent = "Du bist bereit – warte auf die anderen …";
    } else {
      weiterBtn.disabled = false;
      weiterBtn.textContent = "Weiter";
    }
  }
}

function renderGameOver(zustand) {
  document.getElementById("game-over-sieger").textContent =
    `${getSpielerName(zustand, zustand.siegerSpielerId)} hat alle Karten gesammelt!`;

  const liste = document.getElementById("game-over-endstand");
  liste.innerHTML = "";
  zustand.spieler
    .slice()
    .sort((a, b) => b.kartenAnzahl - a.kartenAnzahl)
    .forEach(s => {
      const li = document.createElement("li");
      li.textContent = `${s.name} – ${s.kartenAnzahl} Karten`;
      liste.appendChild(li);
    });
}

function renderAbbrechenButton(zustand) {
  const btn = document.getElementById("btn-spiel-abbrechen");
  const sichtbar = PHASEN_MIT_ABBRUCH_BUTTON.includes(zustand.phase);
  btn.style.display = sichtbar ? "inline-block" : "none";
  if (sichtbar) {
    const eigener = getEigenerSpieler(zustand);
    btn.textContent = eigener && eigener.istHost ? "Spiel abbrechen" : "Spiel verlassen";
  }
}

function renderKartenverwaltungButton(zustand) {
  const btn = document.getElementById("btn-kartenverwaltung-oeffnen");
  btn.style.display = PHASEN_MIT_ABBRUCH_BUTTON.includes(zustand.phase) ? "none" : "inline-block";
}

function render(zustand) {
  showScreen(SCREEN_FUER_PHASE[zustand.phase] || "screen-start");
  renderAbbrechenButton(zustand);
  renderKartenverwaltungButton(zustand);
  if (zustand.phase === "lobby") renderLobby(zustand);
  if (zustand.phase === "amZug" || zustand.phase === "warteAufAndere") renderSpiel(zustand);
  if (zustand.phase === "vergleich") renderVergleich(zustand);
  if (zustand.phase === "beendet") renderGameOver(zustand);
}

// --- Kartenverwaltung (Karten bearbeiten + Fotos hinterlegen) ---

function erzeugeKvEintrag(karte) {
  const div = document.createElement("div");
  div.className = "kv-karten-eintrag";

  const thumb = document.createElement("span");
  thumb.className = "kv-thumb";
  thumb.style.background = karte.avatarFarbe;
  const img = document.createElement("img");
  img.alt = "";
  if (karte.foto) {
    img.src = karte.foto;
  } else {
    img.src = "avatar-placeholder.svg";
    img.className = "avatar-fallback";
  }
  thumb.appendChild(img);

  const name = document.createElement("span");
  name.className = "kv-name";
  name.textContent = karte.name;

  const rolle = document.createElement("span");
  rolle.className = "kv-rolle";
  rolle.textContent = karte.rolle;

  div.append(thumb, name, rolle);
  div.addEventListener("click", () => oeffneKartenBearbeitung(karte));
  return div;
}

async function ladeUndZeigeKartenverwaltung() {
  showScreen("screen-kartenverwaltung");
  document.getElementById("kv-deck-familie").classList.toggle("aktiv", kvAusgewaehltesDeck === "familie");
  document.getElementById("kv-deck-auto").classList.toggle("aktiv", kvAusgewaehltesDeck === "auto");

  const liste = document.getElementById("kv-kartenliste");
  liste.innerHTML = "";
  const ladeHinweis = document.createElement("p");
  ladeHinweis.className = "hinweis-text";
  ladeHinweis.textContent = "Lade Karten …";
  liste.appendChild(ladeHinweis);

  let karten;
  try {
    karten = await gameService.ladeKartenZurBearbeitung(kvAusgewaehltesDeck);
  } catch (e) {
    liste.innerHTML = "";
    const fehlerText = document.createElement("p");
    fehlerText.className = "hinweis-text fehler";
    fehlerText.textContent = "Karten konnten nicht geladen werden.";
    liste.appendChild(fehlerText);
    return;
  }
  liste.innerHTML = "";
  karten.forEach(karte => liste.appendChild(erzeugeKvEintrag(karte)));
}

function oeffneKartenBearbeitung(karte) {
  kvBearbeiteteKarte = karte;
  kvNeuesFoto = undefined;
  document.getElementById("kb-fehler").textContent = "";
  document.getElementById("kb-name").value = karte.name;
  document.getElementById("kb-rolle").value = karte.rolle;
  document.getElementById("kb-foto-vorschau").src = karte.foto || "avatar-placeholder.svg";

  const kategorien = getKategorien(kvAusgewaehltesDeck);
  const container = document.getElementById("kb-eigenschaften-felder");
  container.innerHTML = "";
  Object.keys(kategorien).forEach(schluessel => {
    const meta = kategorien[schluessel];
    const label = document.createElement("label");
    label.className = "kb-feld-label";
    label.textContent = `${meta.icon} ${meta.label}`;
    const input = document.createElement("input");
    input.type = "number";
    input.className = "eingabe";
    input.dataset.kategorie = schluessel;
    input.value = karte.eigenschaften[schluessel];
    container.append(label, input);
  });

  showScreen("screen-karte-bearbeiten");
}

// --- Event-Wiring ---

document.getElementById("btn-raum-erstellen").addEventListener("click", () => {
  ausstehenderModus = "erstellen";
  ausstehenderKartenSet = document.getElementById("checkbox-auto-modus").checked ? "auto" : "familie";
  const deckgroesseInput = document.querySelector('input[name="deckgroesse"]:checked');
  ausstehenderDeckgroesse = deckgroesseInput ? deckgroesseInput.value : "normal";
  document.getElementById("name-eingabe-titel").textContent = "Wie heißt du?";
  document.getElementById("input-spielername").value = "";
  document.getElementById("name-eingabe-fehler").textContent = "";
  showScreen("screen-name-eingabe");
});

document.getElementById("btn-raum-beitreten").addEventListener("click", () => {
  const code = document.getElementById("input-raumcode").value.trim();
  if (!code) {
    document.getElementById("start-fehler").textContent = "Bitte einen Raum-Code eingeben.";
    return;
  }
  document.getElementById("start-fehler").textContent = "";
  raumcodeEingabe = code;
  ausstehenderModus = "beitreten";
  document.getElementById("name-eingabe-titel").textContent = "Wie heißt du?";
  document.getElementById("input-spielername").value = "";
  document.getElementById("name-eingabe-fehler").textContent = "";
  showScreen("screen-name-eingabe");
});

document.getElementById("input-raumcode").addEventListener("input", e => {
  e.target.value = e.target.value.toUpperCase();
});

document.getElementById("btn-name-bestaetigen").addEventListener("click", async () => {
  const name = document.getElementById("input-spielername").value.trim();
  const fehlerEl = document.getElementById("name-eingabe-fehler");
  const ergebnis = ausstehenderModus === "erstellen"
    ? await gameService.erstelleRaum(name, ausstehenderKartenSet, ausstehenderDeckgroesse)
    : await gameService.tritRaumBei(raumcodeEingabe, name);

  if (!ergebnis.erfolg) {
    fehlerEl.textContent = ergebnis.fehler || "Das hat nicht funktioniert.";
  }
});

document.getElementById("btn-name-zurueck").addEventListener("click", () => {
  showScreen("screen-start");
});

document.getElementById("btn-test-spieler").addEventListener("click", () => {
  gameService.fuegeTestSpielerHinzu();
});

document.getElementById("btn-bestenliste-oeffnen").addEventListener("click", async () => {
  const koerper = document.getElementById("bestenliste-koerper");
  const leerText = document.getElementById("bestenliste-leer");
  koerper.innerHTML = "";
  leerText.style.display = "none";
  showScreen("screen-bestenliste");

  let eintraege;
  try {
    eintraege = await gameService.ladeBestenliste();
  } catch (e) {
    leerText.textContent = "Bestenliste konnte nicht geladen werden.";
    leerText.style.display = "block";
    return;
  }
  if (eintraege.length === 0) {
    leerText.textContent = "Noch keine beendeten Spiele.";
    leerText.style.display = "block";
    return;
  }
  eintraege.forEach(eintrag => {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.textContent = eintrag.name;
    const tdGespielt = document.createElement("td");
    tdGespielt.textContent = eintrag.gespielt;
    const tdGewonnen = document.createElement("td");
    tdGewonnen.textContent = eintrag.gewonnen;
    const tdProzent = document.createElement("td");
    tdProzent.textContent = `${eintrag.prozent}%`;
    tr.append(tdName, tdGespielt, tdGewonnen, tdProzent);
    koerper.appendChild(tr);
  });
});

document.getElementById("btn-bestenliste-zurueck").addEventListener("click", () => {
  showScreen("screen-start");
});

document.getElementById("btn-spiel-starten").addEventListener("click", () => {
  gameService.starteSpiel();
});

document.getElementById("btn-vergleich-weiter").addEventListener("click", () => {
  gameService.bestaetigeWeiter();
});

document.getElementById("btn-neues-spiel").addEventListener("click", () => {
  gameService.neuesSpiel();
});

document.getElementById("btn-abbruch-zurueck").addEventListener("click", () => {
  gameService.neuesSpiel();
});

document.getElementById("btn-spiel-abbrechen").addEventListener("click", () => {
  const zustand = gameService.getZustand();
  const eigener = getEigenerSpieler(zustand);
  const istHost = !!(eigener && eigener.istHost);
  const frage = istHost
    ? "Spiel für alle Mitspieler:innen abbrechen?"
    : "Spiel verlassen? Deine Karten werden gleichmäßig an die übrigen Mitspieler:innen verteilt.";
  if (!window.confirm(frage)) return;
  gameService.verlasseSpiel();
});

document.getElementById("btn-kartenverwaltung-oeffnen").addEventListener("click", () => {
  ladeUndZeigeKartenverwaltung();
});

document.getElementById("kv-deck-familie").addEventListener("click", () => {
  kvAusgewaehltesDeck = "familie";
  ladeUndZeigeKartenverwaltung();
});

document.getElementById("kv-deck-auto").addEventListener("click", () => {
  kvAusgewaehltesDeck = "auto";
  ladeUndZeigeKartenverwaltung();
});

document.getElementById("btn-kartenverwaltung-zurueck").addEventListener("click", () => {
  showScreen("screen-start");
});

document.getElementById("kb-foto-input").addEventListener("change", e => {
  const datei = e.target.files[0];
  if (!datei) return;
  const reader = new FileReader();
  reader.onload = () => {
    const bild = new Image();
    bild.onload = () => {
      const maxBreite = 480;
      const maxHoehe = 360;
      let { width, height } = bild;
      const skalierung = Math.min(maxBreite / width, maxHoehe / height, 1);
      width = Math.round(width * skalierung);
      height = Math.round(height * skalierung);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(bild, 0, 0, width, height);
      kvNeuesFoto = canvas.toDataURL("image/jpeg", 0.8);
      document.getElementById("kb-foto-vorschau").src = kvNeuesFoto;
    };
    bild.src = reader.result;
  };
  reader.readAsDataURL(datei);
});

document.getElementById("btn-kb-speichern").addEventListener("click", async () => {
  const karte = kvBearbeiteteKarte;
  if (!karte) return;
  const name = document.getElementById("kb-name").value.trim();
  const rolle = document.getElementById("kb-rolle").value.trim();
  const fehlerEl = document.getElementById("kb-fehler");
  if (!name || !rolle) {
    fehlerEl.textContent = "Bitte Name und Rolle ausfüllen.";
    return;
  }
  const eigenschaften = {};
  document.querySelectorAll("#kb-eigenschaften-felder input").forEach(input => {
    eigenschaften[input.dataset.kategorie] = Number(input.value) || 0;
  });
  const daten = {
    name,
    rolle,
    foto: kvNeuesFoto !== undefined ? kvNeuesFoto : (karte.foto || null),
    eigenschaften
  };
  fehlerEl.textContent = "";
  try {
    await gameService.speichereKartenUebersteuerung(kvAusgewaehltesDeck, karte.id, daten);
  } catch (e) {
    fehlerEl.textContent = "Speichern fehlgeschlagen.";
    return;
  }
  await ladeUndZeigeKartenverwaltung();
});

document.getElementById("btn-kb-zuruecksetzen").addEventListener("click", async () => {
  const karte = kvBearbeiteteKarte;
  if (!karte) return;
  try {
    await gameService.setzeKarteZurueck(kvAusgewaehltesDeck, karte.id);
  } catch (e) {
    document.getElementById("kb-fehler").textContent = "Zurücksetzen fehlgeschlagen.";
    return;
  }
  await ladeUndZeigeKartenverwaltung();
});

document.getElementById("btn-kb-abbrechen").addEventListener("click", () => {
  showScreen("screen-kartenverwaltung");
});

gameService.onZustandsAenderung(render);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
