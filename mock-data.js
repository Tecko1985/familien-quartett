// Platzhalter-Kartendecks für den Prototyp. Echte Fotos/Werte kommen später.
// Zwei wählbare Kartensets: "familie" (Standard) und "auto" (klassisches Auto-Quartett).

// --- einfacher seeded Zufallsgenerator, damit beide Decks bei jedem Laden gleich aussehen ---
function erzeugeSeededZufall(seed) {
  let zustand = seed;
  return function () {
    zustand = (zustand * 1103515245 + 12345) & 0x7fffffff;
    return zustand / 0x7fffffff;
  };
}
function zufallInt(zufall, min, max) {
  return Math.floor(zufall() * (max - min + 1)) + min;
}

const AVATAR_FARBEN_POOL = [
  "#1a56a0", "#c9941f", "#9333ea", "#057a55", "#dc2626",
  "#0891b2", "#db2777", "#ea580c", "#4338ca", "#65a30d"
];

// --- Kartenset "Familie" ---

const KATEGORIEN_FAMILIE = {
  lautstaerke: { label: "Lautstärke", icon: "📢" },
  kochkuenste: { label: "Kochkünste", icon: "🍳" },
  sportlichkeit: { label: "Sportlichkeit", icon: "⚽" },
  geduld: { label: "Geduld", icon: "🧘" },
  schlafdauer: { label: "Schlafdauer", icon: "😴" },
  humor: { label: "Humor", icon: "😂" }
};

const KARTENDECK_FAMILIE_BASIS = [
  {
    id: "fam-01", name: "Opa Heinz", rolle: "Großvater", foto: null, avatarFarbe: "#1a56a0",
    eigenschaften: { lautstaerke: 95, kochkuenste: 40, sportlichkeit: 20, geduld: 88, schlafdauer: 65, humor: 70 }
  },
  {
    id: "fam-02", name: "Oma Erna", rolle: "Großmutter", foto: null, avatarFarbe: "#c9941f",
    eigenschaften: { lautstaerke: 60, kochkuenste: 99, sportlichkeit: 15, geduld: 92, schlafdauer: 55, humor: 80 }
  },
  {
    id: "fam-03", name: "Tante Trudi", rolle: "Tante", foto: null, avatarFarbe: "#9333ea",
    eigenschaften: { lautstaerke: 85, kochkuenste: 70, sportlichkeit: 35, geduld: 45, schlafdauer: 40, humor: 95 }
  },
  {
    id: "fam-04", name: "Onkel Bert", rolle: "Onkel", foto: null, avatarFarbe: "#057a55",
    eigenschaften: { lautstaerke: 70, kochkuenste: 25, sportlichkeit: 60, geduld: 50, schlafdauer: 80, humor: 60 }
  },
  {
    id: "fam-05", name: "Cousine Mia", rolle: "Cousine", foto: null, avatarFarbe: "#dc2626",
    eigenschaften: { lautstaerke: 90, kochkuenste: 30, sportlichkeit: 85, geduld: 20, schlafdauer: 30, humor: 75 }
  },
  {
    id: "fam-06", name: "Cousin Finn", rolle: "Cousin", foto: null, avatarFarbe: "#0891b2",
    eigenschaften: { lautstaerke: 55, kochkuenste: 15, sportlichkeit: 95, geduld: 35, schlafdauer: 45, humor: 50 }
  },
  {
    id: "fam-07", name: "Mama Sabine", rolle: "Mutter", foto: null, avatarFarbe: "#db2777",
    eigenschaften: { lautstaerke: 65, kochkuenste: 85, sportlichkeit: 50, geduld: 75, schlafdauer: 35, humor: 65 }
  },
  {
    id: "fam-08", name: "Papa Robert", rolle: "Vater", foto: null, avatarFarbe: "#ea580c",
    eigenschaften: { lautstaerke: 50, kochkuenste: 60, sportlichkeit: 70, geduld: 60, schlafdauer: 90, humor: 85 }
  }
];

const VORNAMEN_MAENNLICH = [
  "Klaus", "Werner", "Manfred", "Horst", "Dieter", "Günther", "Jürgen", "Rolf", "Hans", "Wolfgang",
  "Peter", "Uwe", "Helmut", "Heinrich", "Karl", "Walter", "Gerhard", "Herbert", "Siegfried", "Otto",
  "Kurt", "Erwin", "Hermann", "Alfred", "Willi", "Fritz", "Paul", "Rudi", "Bruno", "Egon",
  "Lukas", "Ben", "Jonas", "Felix", "Tim", "Niklas", "Jan", "David", "Tom", "Niko",
  "Max", "Leon", "Moritz", "Simon", "Anton", "Theo"
];
const VORNAMEN_WEIBLICH = [
  "Ingrid", "Helga", "Renate", "Brigitte", "Ursula", "Monika", "Petra", "Christa", "Gisela", "Elke",
  "Karin", "Marianne", "Gerda", "Sigrid", "Inge", "Anneliese", "Edith", "Lieselotte", "Margot", "Gertrud",
  "Hildegard", "Irmgard", "Frieda", "Else", "Liesel", "Marlene", "Hedwig", "Lotte", "Anita", "Gabi",
  "Waltraud", "Mara", "Emma", "Lea", "Nora", "Sophie", "Lara", "Anna", "Laura", "Julia",
  "Sarah", "Marie", "Hannah", "Lena", "Lina", "Frida"
];
const ROLLEN_MAENNLICH = [
  { kurz: "Onkel", voll: "Onkel" },
  { kurz: "Opa", voll: "Großvater" },
  { kurz: "Cousin", voll: "Cousin" },
  { kurz: "Neffe", voll: "Neffe" },
  { kurz: "Schwager", voll: "Schwager" },
  { kurz: "Patenonkel", voll: "Patenonkel" },
  { kurz: "Urgroßvater", voll: "Urgroßvater" }
];
const ROLLEN_WEIBLICH = [
  { kurz: "Tante", voll: "Tante" },
  { kurz: "Oma", voll: "Großmutter" },
  { kurz: "Cousine", voll: "Cousine" },
  { kurz: "Nichte", voll: "Nichte" },
  { kurz: "Schwägerin", voll: "Schwägerin" },
  { kurz: "Patentante", voll: "Patentante" },
  { kurz: "Urgroßmutter", voll: "Urgroßmutter" }
];

function erzeugeFamilienZusatzkarten() {
  const zufall = erzeugeSeededZufall(42);
  const karten = [];
  VORNAMEN_MAENNLICH.forEach((vorname, i) => {
    const rolle = ROLLEN_MAENNLICH[i % ROLLEN_MAENNLICH.length];
    karten.push({
      id: `fam-extra-m-${i + 1}`,
      name: `${rolle.kurz} ${vorname}`,
      rolle: rolle.voll,
      foto: null,
      avatarFarbe: AVATAR_FARBEN_POOL[i % AVATAR_FARBEN_POOL.length],
      eigenschaften: {
        lautstaerke: zufallInt(zufall, 5, 99),
        kochkuenste: zufallInt(zufall, 5, 99),
        sportlichkeit: zufallInt(zufall, 5, 99),
        geduld: zufallInt(zufall, 5, 99),
        schlafdauer: zufallInt(zufall, 5, 99),
        humor: zufallInt(zufall, 5, 99)
      }
    });
  });
  VORNAMEN_WEIBLICH.forEach((vorname, i) => {
    const rolle = ROLLEN_WEIBLICH[i % ROLLEN_WEIBLICH.length];
    karten.push({
      id: `fam-extra-w-${i + 1}`,
      name: `${rolle.kurz} ${vorname}`,
      rolle: rolle.voll,
      foto: null,
      avatarFarbe: AVATAR_FARBEN_POOL[(i + 3) % AVATAR_FARBEN_POOL.length],
      eigenschaften: {
        lautstaerke: zufallInt(zufall, 5, 99),
        kochkuenste: zufallInt(zufall, 5, 99),
        sportlichkeit: zufallInt(zufall, 5, 99),
        geduld: zufallInt(zufall, 5, 99),
        schlafdauer: zufallInt(zufall, 5, 99),
        humor: zufallInt(zufall, 5, 99)
      }
    });
  });
  return karten;
}

const KARTENDECK_FAMILIE = KARTENDECK_FAMILIE_BASIS.concat(erzeugeFamilienZusatzkarten());

// --- Kartenset "Auto" ---

const KATEGORIEN_AUTO = {
  leistung: { label: "Leistung (PS)", icon: "🐎" },
  hubraum: { label: "Hubraum (ccm)", icon: "🔧" },
  hoechstgeschwindigkeit: { label: "Höchstgeschw. (km/h)", icon: "🚀" },
  drehmoment: { label: "Drehmoment (Nm)", icon: "⚙️" },
  preis: { label: "Preis (€)", icon: "💰" },
  gewicht: { label: "Gewicht (kg)", icon: "⚖️" },
  zuladung: { label: "Zuladung (kg)", icon: "📦" },
  kofferraum: { label: "Kofferraum (l)", icon: "🧳" },
  reichweite: { label: "Reichweite (km)", icon: "⛽" },
  sitzplaetze: { label: "Sitzplätze", icon: "💺" }
};

// 100 reale Fahrzeugmodelle mit ungefähren, gerundeten Herstellerangaben
// (Basiswerte je Modellreihe, je nach Ausstattung/Motorisierung in der Realität abweichend).
// Reihenfolge je Eintrag:
// [Name, Typ, Leistung PS, Hubraum ccm (0 = vollelektrisch), Höchstgeschw. km/h, Drehmoment Nm,
//  Preis €, Gewicht kg, Zuladung kg, Kofferraum l, Reichweite km, Sitzplätze]
const AUTO_DATEN = [
  ["Porsche 911 Carrera", "Sportwagen", 385, 2981, 293, 450, 122000, 1520, 305, 132, 700, 4],
  ["Porsche 718 Cayman", "Sportwagen", 300, 1988, 275, 380, 60000, 1405, 255, 150, 600, 2],
  ["Porsche Taycan", "Elektro", 408, 0, 230, 345, 90000, 2185, 305, 407, 480, 4],
  ["Porsche Cayenne", "SUV", 340, 2995, 245, 450, 80000, 2030, 685, 770, 750, 5],
  ["Ferrari 488 GTB", "Sportwagen", 670, 3902, 330, 760, 250000, 1475, 200, 230, 500, 2],
  ["Ferrari Roma", "Sportwagen", 620, 3855, 320, 760, 215000, 1570, 250, 272, 550, 4],
  ["Lamborghini Huracán", "Sportwagen", 640, 5204, 325, 600, 230000, 1422, 220, 150, 480, 2],
  ["Lamborghini Urus", "SUV", 666, 3996, 305, 850, 230000, 2200, 600, 616, 600, 5],
  ["McLaren 720S", "Sportwagen", 720, 3994, 341, 770, 290000, 1419, 200, 366, 500, 2],
  ["Audi R8 V10", "Sportwagen", 620, 5204, 331, 580, 175000, 1655, 245, 226, 500, 2],
  ["Nissan GT-R", "Sportwagen", 570, 3799, 315, 637, 115000, 1752, 250, 315, 500, 4],
  ["Chevrolet Corvette C8", "Sportwagen", 495, 6162, 312, 637, 105000, 1530, 230, 357, 550, 2],
  ["BMW M4 Competition", "Sportwagen", 510, 2993, 290, 650, 95000, 1725, 380, 440, 550, 4],
  ["Mercedes-AMG GT", "Sportwagen", 476, 3982, 304, 700, 145000, 1645, 280, 350, 600, 2],
  ["Aston Martin Vantage", "Sportwagen", 535, 3982, 314, 685, 165000, 1628, 250, 350, 550, 2],
  ["Jaguar F-Type", "Sportwagen", 450, 4999, 280, 580, 95000, 1665, 250, 311, 500, 2],
  ["Toyota GR Supra", "Sportwagen", 340, 2998, 250, 500, 65000, 1525, 280, 290, 500, 2],
  ["Alpine A110", "Sportwagen", 300, 1798, 250, 340, 65000, 1100, 200, 196, 500, 2],
  ["Lotus Emira", "Sportwagen", 400, 1998, 290, 430, 90000, 1450, 200, 208, 450, 2],
  ["Maserati MC20", "Sportwagen", 630, 2992, 325, 730, 220000, 1500, 220, 350, 500, 2],
  ["Bugatti Chiron", "Sportwagen", 1500, 7993, 420, 1600, 2500000, 1996, 200, 100, 460, 2],
  ["Koenigsegg Jesko", "Sportwagen", 1600, 4998, 480, 1500, 3000000, 1420, 150, 90, 380, 2],
  ["BMW 320d", "Limousine", 190, 1995, 235, 400, 47000, 1545, 480, 480, 800, 5],
  ["BMW 530i", "Limousine", 252, 1998, 250, 350, 65000, 1670, 500, 530, 750, 5],
  ["BMW 740i", "Limousine", 280, 2998, 250, 450, 100000, 1825, 530, 515, 700, 5],
  ["Audi A4", "Limousine", 204, 1984, 240, 320, 48000, 1535, 490, 460, 750, 5],
  ["Audi A6", "Limousine", 245, 1968, 245, 400, 60000, 1665, 530, 530, 800, 5],
  ["Audi A8", "Limousine", 340, 2995, 250, 500, 95000, 1995, 560, 505, 700, 5],
  ["Mercedes C-Klasse", "Limousine", 204, 1991, 240, 320, 50000, 1610, 470, 455, 800, 5],
  ["Mercedes E-Klasse", "Limousine", 265, 1991, 250, 400, 65000, 1735, 500, 540, 750, 5],
  ["Mercedes S-Klasse", "Limousine", 367, 2999, 250, 500, 110000, 2065, 530, 550, 700, 5],
  ["Lexus IS", "Limousine", 309, 2487, 230, 270, 55000, 1665, 470, 480, 650, 5],
  ["Genesis G80", "Limousine", 300, 2497, 240, 360, 60000, 1870, 480, 480, 650, 5],
  ["VW Golf", "Kompaktklasse", 150, 1498, 224, 250, 30000, 1340, 540, 380, 650, 5],
  ["VW Polo", "Kleinwagen", 95, 999, 192, 175, 22000, 1130, 450, 351, 600, 5],
  ["Opel Corsa", "Kleinwagen", 100, 1199, 191, 205, 20000, 1185, 420, 309, 600, 5],
  ["Fiat 500", "Kleinwagen", 70, 1242, 165, 102, 16000, 930, 350, 185, 550, 4],
  ["Renault Clio", "Kleinwagen", 100, 999, 187, 160, 19000, 1180, 420, 391, 600, 5],
  ["Toyota Yaris", "Kleinwagen", 116, 1490, 175, 120, 21000, 1080, 400, 270, 700, 5],
  ["Ford Fiesta", "Kleinwagen", 100, 998, 188, 170, 20000, 1163, 430, 311, 600, 5],
  ["Mini Cooper", "Kleinwagen", 136, 1499, 210, 220, 28000, 1255, 380, 211, 550, 4],
  ["Seat Ibiza", "Kleinwagen", 95, 999, 187, 175, 19000, 1140, 420, 355, 600, 5],
  ["Skoda Fabia", "Kleinwagen", 110, 999, 200, 200, 20000, 1170, 430, 380, 600, 5],
  ["VW Tiguan", "SUV", 150, 1498, 198, 250, 38000, 1620, 600, 615, 650, 5],
  ["BMW X3", "SUV", 190, 1998, 213, 400, 50000, 1825, 600, 550, 700, 5],
  ["BMW X5", "SUV", 265, 1998, 222, 400, 70000, 2150, 750, 650, 700, 5],
  ["Audi Q5", "SUV", 204, 1984, 220, 320, 50000, 1845, 590, 550, 650, 5],
  ["Audi Q7", "SUV", 286, 2995, 245, 600, 75000, 2175, 770, 770, 700, 7],
  ["Mercedes GLC", "SUV", 197, 1991, 215, 320, 52000, 1875, 600, 550, 700, 5],
  ["Mercedes GLE", "SUV", 272, 2999, 240, 500, 78000, 2255, 700, 630, 700, 5],
  ["Range Rover Sport", "SUV", 300, 2996, 209, 500, 95000, 2300, 700, 780, 650, 5],
  ["Range Rover", "SUV", 350, 2996, 210, 500, 120000, 2510, 750, 900, 650, 5],
  ["Volvo XC60", "SUV", 250, 1969, 200, 350, 55000, 1900, 630, 483, 700, 5],
  ["Volvo XC90", "SUV", 300, 1969, 230, 420, 70000, 2100, 700, 680, 700, 7],
  ["Toyota RAV4", "SUV", 218, 2487, 180, 221, 40000, 1690, 600, 580, 800, 5],
  ["Hyundai Tucson", "SUV", 150, 1598, 188, 280, 33000, 1565, 560, 539, 650, 5],
  ["Kia Sportage", "SUV", 150, 1598, 188, 280, 32000, 1580, 560, 526, 650, 5],
  ["Skoda Kodiaq", "SUV", 190, 1968, 211, 400, 42000, 1755, 600, 720, 700, 7],
  ["Dacia Duster", "SUV", 130, 1332, 180, 240, 20000, 1300, 500, 467, 650, 5],
  ["Jeep Wrangler", "Geländewagen", 272, 1995, 177, 400, 55000, 2050, 480, 548, 500, 5],
  ["Land Rover Defender", "Geländewagen", 300, 2996, 191, 400, 65000, 2200, 750, 916, 750, 5],
  ["Tesla Model X", "Elektro", 670, 0, 250, 967, 105000, 2350, 645, 745, 560, 7],
  ["Tesla Model Y", "Elektro", 384, 0, 217, 510, 50000, 2000, 405, 854, 530, 5],
  ["Tesla Model 3", "Elektro", 366, 0, 201, 493, 43000, 1830, 388, 561, 550, 5],
  ["Tesla Model S", "Elektro", 670, 0, 250, 1020, 95000, 2065, 480, 793, 600, 5],
  ["VW ID.3", "Elektro", 204, 0, 160, 310, 40000, 1800, 460, 385, 450, 5],
  ["VW ID.4", "Elektro", 204, 0, 160, 310, 45000, 2050, 550, 543, 500, 5],
  ["VW ID.7", "Elektro", 286, 0, 180, 545, 55000, 2150, 580, 532, 700, 5],
  ["BMW i4", "Elektro", 340, 0, 190, 430, 60000, 2050, 480, 470, 500, 5],
  ["BMW iX", "Elektro", 326, 0, 200, 630, 80000, 2440, 530, 500, 600, 5],
  ["Audi e-tron GT", "Elektro", 530, 0, 245, 830, 100000, 2350, 470, 405, 480, 4],
  ["Mercedes EQS", "Elektro", 333, 0, 210, 565, 110000, 2480, 480, 610, 700, 5],
  ["Mercedes EQE", "Elektro", 292, 0, 210, 530, 75000, 2350, 480, 430, 600, 5],
  ["Hyundai Ioniq 5", "Elektro", 325, 0, 185, 605, 50000, 2100, 520, 527, 500, 5],
  ["Kia EV6", "Elektro", 325, 0, 185, 605, 48000, 2095, 520, 480, 500, 5],
  ["Polestar 2", "Elektro", 408, 0, 205, 660, 50000, 2128, 510, 405, 480, 5],
  ["Renault Zoe", "Elektro", 135, 0, 140, 245, 30000, 1577, 420, 338, 390, 5],
  ["Fiat 500e", "Elektro", 118, 0, 150, 220, 30000, 1380, 350, 185, 320, 4],
  ["Skoda Enyaq", "Elektro", 204, 0, 160, 310, 45000, 2150, 580, 585, 530, 5],
  ["Cupra Born", "Elektro", 231, 0, 160, 310, 42000, 1900, 480, 385, 540, 5],
  ["VW Passat Variant", "Kombi", 150, 1498, 222, 250, 38000, 1500, 600, 650, 700, 5],
  ["Audi A6 Avant", "Kombi", 245, 1968, 245, 400, 62000, 1735, 540, 565, 800, 5],
  ["Mercedes E-Klasse T-Modell", "Kombi", 265, 1991, 250, 400, 68000, 1815, 510, 615, 750, 5],
  ["Skoda Octavia Combi", "Kombi", 150, 1498, 220, 250, 32000, 1410, 590, 640, 700, 5],
  ["Volvo V90", "Kombi", 250, 1969, 230, 350, 60000, 1810, 600, 560, 750, 5],
  ["VW Touran", "Van", 150, 1498, 200, 250, 35000, 1600, 600, 743, 650, 7],
  ["VW Sharan", "Van", 150, 1968, 197, 340, 42000, 1800, 650, 745, 650, 7],
  ["Mercedes V-Klasse", "Van", 190, 1950, 190, 440, 60000, 2200, 800, 1030, 650, 8],
  ["Ford Galaxy", "Van", 150, 1997, 198, 370, 40000, 1750, 650, 700, 650, 7],
  ["Renault Espace", "Van", 160, 1749, 200, 380, 45000, 1750, 600, 680, 650, 7],
  ["Ford Ranger", "Pickup", 205, 1996, 180, 500, 45000, 2100, 950, 0, 700, 5],
  ["Toyota Hilux", "Pickup", 204, 2755, 175, 500, 42000, 2070, 1000, 0, 700, 5],
  ["VW Amarok", "Pickup", 205, 1996, 180, 500, 46000, 2150, 1000, 0, 700, 5],
  ["RAM 1500", "Pickup", 395, 5654, 190, 556, 60000, 2400, 900, 0, 700, 6],
  ["Ford F-150", "Pickup", 400, 3496, 180, 690, 55000, 2400, 900, 0, 700, 6],
  ["Smart Fortwo", "Kleinstwagen", 90, 999, 159, 135, 17000, 980, 270, 260, 550, 2],
  ["Renault Twingo", "Kleinstwagen", 95, 898, 168, 135, 16000, 990, 300, 219, 550, 4],
  ["Suzuki Jimny", "Geländewagen", 102, 1462, 145, 130, 22000, 1135, 350, 113, 550, 4],
  ["Subaru Impreza WRX STI", "Sportwagen", 300, 2457, 255, 407, 50000, 1530, 350, 350, 500, 5],
  ["Toyota Corolla", "Kompaktklasse", 122, 1798, 180, 142, 26000, 1320, 480, 361, 700, 5]
];

function erzeugeAutoDeck() {
  return AUTO_DATEN.map((eintrag, i) => {
    const [name, typ, leistung, hubraum, vmax, drehmoment, preis, gewicht, zuladung, kofferraum, reichweite, sitze] = eintrag;
    return {
      id: `auto-${i + 1}`,
      name,
      rolle: typ,
      foto: null,
      avatarFarbe: AVATAR_FARBEN_POOL[i % AVATAR_FARBEN_POOL.length],
      eigenschaften: {
        leistung,
        hubraum,
        hoechstgeschwindigkeit: vmax,
        drehmoment,
        preis,
        gewicht,
        zuladung,
        kofferraum,
        reichweite,
        sitzplaetze: sitze
      }
    };
  });
}

const KARTENDECK_AUTO = erzeugeAutoDeck();

// --- Zugriff über Kartenset-Schlüssel ("familie" | "auto") ---

function getKategorien(kartenSet) {
  return kartenSet === "auto" ? KATEGORIEN_AUTO : KATEGORIEN_FAMILIE;
}

// Gibt immer eine frische Kopie zurück, damit niemand versehentlich das Original-Deck mutiert.
function getMockDeck(kartenSet) {
  const deck = kartenSet === "auto" ? KARTENDECK_AUTO : KARTENDECK_FAMILIE;
  return deck.map(karte => ({
    ...karte,
    eigenschaften: { ...karte.eigenschaften }
  }));
}

// Generischer Fisher-Yates-Shuffle, mutiert nicht das übergebene Array.
function mischeArray(array) {
  const kopie = [...array];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}
