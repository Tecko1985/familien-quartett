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
  if (!runde.gewinnerSpielerId) {
    document.getElementById("vergleich-gewinner-text").textContent =
      "Gleichstand! Die nächste Karte wird automatisch in derselben Kategorie verglichen …";
    weiterBtn.style.display = "none";
  } else {
    document.getElementById("vergleich-gewinner-text").textContent =
      `${getSpielerName(zustand, runde.gewinnerSpielerId)} gewinnt die Runde!`;
    weiterBtn.style.display = "block";
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

function render(zustand) {
  showScreen(SCREEN_FUER_PHASE[zustand.phase] || "screen-start");
  renderAbbrechenButton(zustand);
  if (zustand.phase === "lobby") renderLobby(zustand);
  if (zustand.phase === "amZug" || zustand.phase === "warteAufAndere") renderSpiel(zustand);
  if (zustand.phase === "vergleich") renderVergleich(zustand);
  if (zustand.phase === "beendet") renderGameOver(zustand);
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

gameService.onZustandsAenderung(render);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
