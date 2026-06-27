// Platzhalter-Kartendeck für den UI-Prototyp. Echte Familienfotos/-werte kommen später.

const KATEGORIEN = {
  lautstaerke: { label: "Lautstärke", icon: "📢" },
  kochkuenste: { label: "Kochkünste", icon: "🍳" },
  sportlichkeit: { label: "Sportlichkeit", icon: "⚽" },
  geduld: { label: "Geduld", icon: "🧘" },
  schlafdauer: { label: "Schlafdauer", icon: "😴" },
  humor: { label: "Humor", icon: "😂" }
};

const KARTENDECK = [
  {
    id: "card-01", name: "Opa Heinz", rolle: "Großvater", foto: null, avatarFarbe: "#1a56a0",
    eigenschaften: { lautstaerke: 95, kochkuenste: 40, sportlichkeit: 20, geduld: 88, schlafdauer: 65, humor: 70 }
  },
  {
    id: "card-02", name: "Oma Erna", rolle: "Großmutter", foto: null, avatarFarbe: "#c9941f",
    eigenschaften: { lautstaerke: 60, kochkuenste: 99, sportlichkeit: 15, geduld: 92, schlafdauer: 55, humor: 80 }
  },
  {
    id: "card-03", name: "Tante Trudi", rolle: "Tante", foto: null, avatarFarbe: "#9333ea",
    eigenschaften: { lautstaerke: 85, kochkuenste: 70, sportlichkeit: 35, geduld: 45, schlafdauer: 40, humor: 95 }
  },
  {
    id: "card-04", name: "Onkel Bert", rolle: "Onkel", foto: null, avatarFarbe: "#057a55",
    eigenschaften: { lautstaerke: 70, kochkuenste: 25, sportlichkeit: 60, geduld: 50, schlafdauer: 80, humor: 60 }
  },
  {
    id: "card-05", name: "Cousine Mia", rolle: "Cousine", foto: null, avatarFarbe: "#dc2626",
    eigenschaften: { lautstaerke: 90, kochkuenste: 30, sportlichkeit: 85, geduld: 20, schlafdauer: 30, humor: 75 }
  },
  {
    id: "card-06", name: "Cousin Finn", rolle: "Cousin", foto: null, avatarFarbe: "#0891b2",
    eigenschaften: { lautstaerke: 55, kochkuenste: 15, sportlichkeit: 95, geduld: 35, schlafdauer: 45, humor: 50 }
  },
  {
    id: "card-07", name: "Mama Sabine", rolle: "Mutter", foto: null, avatarFarbe: "#db2777",
    eigenschaften: { lautstaerke: 65, kochkuenste: 85, sportlichkeit: 50, geduld: 75, schlafdauer: 35, humor: 65 }
  },
  {
    id: "card-08", name: "Papa Robert", rolle: "Vater", foto: null, avatarFarbe: "#ea580c",
    eigenschaften: { lautstaerke: 50, kochkuenste: 60, sportlichkeit: 70, geduld: 60, schlafdauer: 90, humor: 85 }
  }
];

// Gibt immer eine frische Kopie zurück, damit niemand versehentlich das Original-Deck mutiert.
function getMockDeck() {
  return KARTENDECK.map(karte => ({
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
