# Familien-Quartett

Digitales Kartenspiel nach dem Vorbild des klassischen "Auto Quartett" (Top-Trumps-Prinzip), aber mit Karten von Familienmitgliedern statt Autos. Bis zu 8 Spieler:innen, jede:r mit eigenem Handy.

## Stand

**UI-Prototyp ohne Backend.** Die komplette Oberfläche (Start, Lobby, Spiel, Vergleich, Game Over) ist klickbar, läuft aber rein lokal mit Platzhalter-Kartendeck (`mock-data.js`) und simulierten Mitspieler:innen. Es gibt noch keine echte Mehrgeräte-Synchronisierung.

Die Spiellogik liegt komplett gekapselt in `game-service.js` hinter einer async/Promise-basierten API mit Subscription-Pattern. Das ist absichtlich so gebaut, dass ein späterer Schritt (echte Online-Mehrspieler-Anbindung, z. B. via Firebase Realtime Database wie bei `sc1911-anmeldung`) **nur diese eine Datei ersetzen muss** – `index.html`, `style.css` und `app.js` bleiben dabei unverändert.

## Lokal starten

```
python -m http.server 8768 --directory familien-quartett
```

Danach `http://localhost:8768` öffnen. Alternativ über das Preview-Tool dieses Workspaces (Eintrag `familien-quartett` in `.claude/launch.json`).

## Testdurchlauf

1. "Raum erstellen" → eigenen Namen eingeben → Lobby
2. Über "Test-Spieler hinzufügen" auf 2–8 Spieler auffüllen
3. "Spiel starten"
4. Wenn du am Zug bist: Eigenschaft auf der eigenen Karte antippen
5. Vergleich ansehen, "Weiter" antippen, bis ein:e Spieler:in alle Karten hat

## Offene Punkte für den nächsten Schritt

- Echte Firebase-Anbindung für Mehrgeräte-Sync (Raum-Beitritt über echten Code, geheime Hände pro Gerät)
- Echte Fotos für die Familienmitglieder-Karten
- Hosting-Entscheidung (z. B. GitHub Pages, analog `Materialliste`)
