import type { PokemonForm } from "@/types/pokemon";

/**
 * The real Mega Evolution roster — the original Gen 6-7 lineup, plus Pokémon Legends: Z-A's new
 * Mega Evolutions as they're added — layered onto whichever species object ends up at that id in
 * data/pokemon/index.ts's merge (curated or generated). This table only needs to know the mega
 * form itself, not re-supply the species' base data.
 *
 * Every Gen 6-7 Pokémon that can Mega Evolve is represented here, including Rayquaza — which
 * uniquely unlocks via knowing the move Dragon Ascent rather than holding a Mega Stone, so its
 * entry sets `requiredMove` instead of `requiredItem` (see MechanicsEngine's mega-evolution
 * check, which branches on whichever field is present). Not included: Primal Kyogre/Groudon,
 * since Primal Reversion is a distinct mechanic from Mega Evolution in the real games, not
 * modeled by this engine's BattleMechanic union. Charizard, Lucario, and Gallade already have
 * their mega forms defined directly in the curated speciesList.ts and are intentionally not
 * duplicated here.
 */
export const MEGA_EVOLUTIONS: { speciesId: string; form: PokemonForm }[] = [
  {
    speciesId: "venusaur",
    form: {
      id: "mega-venusaur",
      name: "Mega Venusaur",
      types: ["Grass", "Poison"],
      baseStats: { hp: 80, attack: 100, defense: 123, specialAttack: 122, specialDefense: 120, speed: 80 },
      abilities: ["thick-fat"],
      formCategory: "mega",
      requiredItem: "venusaurite",
    },
  },
  {
    speciesId: "blastoise",
    form: {
      id: "mega-blastoise",
      name: "Mega Blastoise",
      types: ["Water"],
      baseStats: { hp: 79, attack: 103, defense: 120, specialAttack: 135, specialDefense: 115, speed: 78 },
      abilities: ["mega-launcher"],
      formCategory: "mega",
      requiredItem: "blastoisinite",
    },
  },
  {
    speciesId: "beedrill",
    form: {
      id: "mega-beedrill",
      name: "Mega Beedrill",
      types: ["Bug", "Poison"],
      baseStats: { hp: 65, attack: 150, defense: 40, specialAttack: 15, specialDefense: 80, speed: 145 },
      abilities: ["adaptability"],
      formCategory: "mega",
      requiredItem: "beedrillite",
    },
  },
  {
    speciesId: "pidgeot",
    form: {
      id: "mega-pidgeot",
      name: "Mega Pidgeot",
      types: ["Normal", "Flying"],
      baseStats: { hp: 83, attack: 80, defense: 80, specialAttack: 135, specialDefense: 80, speed: 121 },
      abilities: ["no-guard"],
      formCategory: "mega",
      requiredItem: "pidgeotite",
    },
  },
  {
    speciesId: "alakazam",
    form: {
      id: "mega-alakazam",
      name: "Mega Alakazam",
      types: ["Psychic"],
      baseStats: { hp: 55, attack: 50, defense: 65, specialAttack: 175, specialDefense: 105, speed: 150 },
      abilities: ["trace"],
      formCategory: "mega",
      requiredItem: "alakazite",
    },
  },
  {
    speciesId: "slowbro",
    form: {
      id: "mega-slowbro",
      name: "Mega Slowbro",
      types: ["Water", "Psychic"],
      baseStats: { hp: 95, attack: 75, defense: 180, specialAttack: 130, specialDefense: 80, speed: 30 },
      abilities: ["shell-armor"],
      formCategory: "mega",
      requiredItem: "slowbronite",
    },
  },
  {
    speciesId: "gengar",
    form: {
      id: "mega-gengar",
      name: "Mega Gengar",
      types: ["Ghost", "Poison"],
      baseStats: { hp: 60, attack: 65, defense: 80, specialAttack: 170, specialDefense: 95, speed: 130 },
      abilities: ["shadow-tag"],
      formCategory: "mega",
      requiredItem: "gengarite",
    },
  },
  {
    speciesId: "kangaskhan",
    form: {
      id: "mega-kangaskhan",
      name: "Mega Kangaskhan",
      types: ["Normal"],
      baseStats: { hp: 105, attack: 125, defense: 100, specialAttack: 60, specialDefense: 100, speed: 100 },
      abilities: ["parental-bond"],
      formCategory: "mega",
      requiredItem: "kangaskhanite",
    },
  },
  {
    speciesId: "pinsir",
    form: {
      id: "mega-pinsir",
      name: "Mega Pinsir",
      types: ["Bug", "Flying"],
      baseStats: { hp: 65, attack: 155, defense: 120, specialAttack: 65, specialDefense: 90, speed: 105 },
      abilities: ["aerilate"],
      formCategory: "mega",
      requiredItem: "pinsirite",
    },
  },
  {
    speciesId: "gyarados",
    form: {
      id: "mega-gyarados",
      name: "Mega Gyarados",
      types: ["Water", "Dark"],
      baseStats: { hp: 95, attack: 155, defense: 109, specialAttack: 70, specialDefense: 130, speed: 81 },
      abilities: ["mold-breaker"],
      formCategory: "mega",
      requiredItem: "gyaradosite",
    },
  },
  {
    speciesId: "aerodactyl",
    form: {
      id: "mega-aerodactyl",
      name: "Mega Aerodactyl",
      types: ["Rock", "Flying"],
      baseStats: { hp: 80, attack: 135, defense: 85, specialAttack: 70, specialDefense: 95, speed: 150 },
      abilities: ["tough-claws"],
      formCategory: "mega",
      requiredItem: "aerodactylite",
    },
  },
  {
    speciesId: "mewtwo",
    form: {
      id: "mega-mewtwo-x",
      name: "Mega Mewtwo X",
      types: ["Psychic", "Fighting"],
      baseStats: { hp: 106, attack: 190, defense: 100, specialAttack: 154, specialDefense: 100, speed: 130 },
      abilities: ["steadfast"],
      formCategory: "mega",
      requiredItem: "mewtwonite-x",
    },
  },
  {
    speciesId: "mewtwo",
    form: {
      id: "mega-mewtwo-y",
      name: "Mega Mewtwo Y",
      types: ["Psychic"],
      baseStats: { hp: 106, attack: 150, defense: 70, specialAttack: 194, specialDefense: 120, speed: 140 },
      abilities: ["insomnia"],
      formCategory: "mega",
      requiredItem: "mewtwonite-y",
    },
  },
  {
    speciesId: "ampharos",
    form: {
      id: "mega-ampharos",
      name: "Mega Ampharos",
      types: ["Electric", "Dragon"],
      baseStats: { hp: 90, attack: 95, defense: 105, specialAttack: 165, specialDefense: 110, speed: 45 },
      abilities: ["mold-breaker"],
      formCategory: "mega",
      requiredItem: "ampharosite",
    },
  },
  {
    speciesId: "steelix",
    form: {
      id: "mega-steelix",
      name: "Mega Steelix",
      types: ["Steel", "Ground"],
      baseStats: { hp: 75, attack: 125, defense: 230, specialAttack: 55, specialDefense: 95, speed: 30 },
      abilities: ["sand-force"],
      formCategory: "mega",
      requiredItem: "steelixite",
    },
  },
  {
    speciesId: "scizor",
    form: {
      id: "mega-scizor",
      name: "Mega Scizor",
      types: ["Bug", "Steel"],
      baseStats: { hp: 70, attack: 150, defense: 140, specialAttack: 65, specialDefense: 100, speed: 75 },
      abilities: ["technician"],
      formCategory: "mega",
      requiredItem: "scizorite",
    },
  },
  {
    speciesId: "heracross",
    form: {
      id: "mega-heracross",
      name: "Mega Heracross",
      types: ["Bug", "Fighting"],
      baseStats: { hp: 80, attack: 185, defense: 115, specialAttack: 40, specialDefense: 105, speed: 75 },
      abilities: ["skill-link"],
      formCategory: "mega",
      requiredItem: "heracronite",
    },
  },
  {
    speciesId: "houndoom",
    form: {
      id: "mega-houndoom",
      name: "Mega Houndoom",
      types: ["Dark", "Fire"],
      baseStats: { hp: 75, attack: 90, defense: 90, specialAttack: 140, specialDefense: 90, speed: 115 },
      abilities: ["solar-power"],
      formCategory: "mega",
      requiredItem: "houndoominite",
    },
  },
  {
    speciesId: "tyranitar",
    form: {
      id: "mega-tyranitar",
      name: "Mega Tyranitar",
      types: ["Rock", "Dark"],
      baseStats: { hp: 100, attack: 164, defense: 150, specialAttack: 95, specialDefense: 120, speed: 71 },
      abilities: ["sand-stream"],
      formCategory: "mega",
      requiredItem: "tyranitarite",
    },
  },
  {
    speciesId: "sceptile",
    form: {
      id: "mega-sceptile",
      name: "Mega Sceptile",
      types: ["Grass", "Dragon"],
      baseStats: { hp: 70, attack: 110, defense: 75, specialAttack: 145, specialDefense: 85, speed: 145 },
      abilities: ["lightning-rod"],
      formCategory: "mega",
      requiredItem: "sceptilite",
    },
  },
  {
    speciesId: "blaziken",
    form: {
      id: "mega-blaziken",
      name: "Mega Blaziken",
      types: ["Fire", "Fighting"],
      baseStats: { hp: 80, attack: 160, defense: 80, specialAttack: 130, specialDefense: 80, speed: 100 },
      abilities: ["speed-boost"],
      formCategory: "mega",
      requiredItem: "blazikenite",
    },
  },
  {
    speciesId: "swampert",
    form: {
      id: "mega-swampert",
      name: "Mega Swampert",
      types: ["Water", "Ground"],
      baseStats: { hp: 100, attack: 150, defense: 110, specialAttack: 95, specialDefense: 110, speed: 70 },
      abilities: ["swift-swim"],
      formCategory: "mega",
      requiredItem: "swampertite",
    },
  },
  {
    speciesId: "gardevoir",
    form: {
      id: "mega-gardevoir",
      name: "Mega Gardevoir",
      types: ["Psychic", "Fairy"],
      baseStats: { hp: 68, attack: 85, defense: 65, specialAttack: 165, specialDefense: 135, speed: 100 },
      abilities: ["pixilate"],
      formCategory: "mega",
      requiredItem: "gardevoirite",
    },
  },
  {
    speciesId: "sableye",
    form: {
      id: "mega-sableye",
      name: "Mega Sableye",
      types: ["Dark", "Ghost"],
      baseStats: { hp: 50, attack: 85, defense: 125, specialAttack: 85, specialDefense: 115, speed: 20 },
      abilities: ["magic-bounce"],
      formCategory: "mega",
      requiredItem: "sablenite",
    },
  },
  {
    speciesId: "mawile",
    form: {
      id: "mega-mawile",
      name: "Mega Mawile",
      types: ["Steel", "Fairy"],
      baseStats: { hp: 50, attack: 105, defense: 125, specialAttack: 55, specialDefense: 95, speed: 50 },
      abilities: ["huge-power"],
      formCategory: "mega",
      requiredItem: "mawilite",
    },
  },
  {
    speciesId: "aggron",
    form: {
      id: "mega-aggron",
      name: "Mega Aggron",
      types: ["Steel"],
      baseStats: { hp: 70, attack: 140, defense: 230, specialAttack: 60, specialDefense: 80, speed: 50 },
      abilities: ["filter"],
      formCategory: "mega",
      requiredItem: "aggronite",
    },
  },
  {
    speciesId: "medicham",
    form: {
      id: "mega-medicham",
      name: "Mega Medicham",
      types: ["Fighting", "Psychic"],
      baseStats: { hp: 60, attack: 100, defense: 85, specialAttack: 80, specialDefense: 85, speed: 100 },
      abilities: ["pure-power"],
      formCategory: "mega",
      requiredItem: "medichamite",
    },
  },
  {
    speciesId: "manectric",
    form: {
      id: "mega-manectric",
      name: "Mega Manectric",
      types: ["Electric"],
      baseStats: { hp: 70, attack: 75, defense: 80, specialAttack: 135, specialDefense: 80, speed: 135 },
      abilities: ["intimidate"],
      formCategory: "mega",
      requiredItem: "manectite",
    },
  },
  {
    speciesId: "sharpedo",
    form: {
      id: "mega-sharpedo",
      name: "Mega Sharpedo",
      types: ["Water", "Dark"],
      baseStats: { hp: 70, attack: 140, defense: 70, specialAttack: 110, specialDefense: 65, speed: 105 },
      abilities: ["strong-jaw"],
      formCategory: "mega",
      requiredItem: "sharpedonite",
    },
  },
  {
    speciesId: "camerupt",
    form: {
      id: "mega-camerupt",
      name: "Mega Camerupt",
      types: ["Fire", "Ground"],
      baseStats: { hp: 70, attack: 120, defense: 100, specialAttack: 145, specialDefense: 105, speed: 20 },
      abilities: ["sheer-force"],
      formCategory: "mega",
      requiredItem: "cameruptite",
    },
  },
  {
    speciesId: "altaria",
    form: {
      id: "mega-altaria",
      name: "Mega Altaria",
      types: ["Dragon", "Fairy"],
      baseStats: { hp: 75, attack: 110, defense: 110, specialAttack: 110, specialDefense: 105, speed: 80 },
      abilities: ["pixilate"],
      formCategory: "mega",
      requiredItem: "altarianite",
    },
  },
  {
    speciesId: "banette",
    form: {
      id: "mega-banette",
      name: "Mega Banette",
      types: ["Ghost"],
      baseStats: { hp: 64, attack: 165, defense: 75, specialAttack: 93, specialDefense: 83, speed: 75 },
      abilities: ["prankster"],
      formCategory: "mega",
      requiredItem: "banettite",
    },
  },
  {
    speciesId: "absol",
    form: {
      id: "mega-absol",
      name: "Mega Absol",
      types: ["Dark"],
      baseStats: { hp: 65, attack: 150, defense: 60, specialAttack: 115, specialDefense: 60, speed: 115 },
      abilities: ["magic-bounce"],
      formCategory: "mega",
      requiredItem: "absolite",
    },
  },
  {
    speciesId: "glalie",
    form: {
      id: "mega-glalie",
      name: "Mega Glalie",
      types: ["Ice"],
      baseStats: { hp: 80, attack: 120, defense: 80, specialAttack: 120, specialDefense: 80, speed: 100 },
      abilities: ["refrigerate"],
      formCategory: "mega",
      requiredItem: "glalitite",
    },
  },
  {
    speciesId: "salamence",
    form: {
      id: "mega-salamence",
      name: "Mega Salamence",
      types: ["Dragon", "Flying"],
      baseStats: { hp: 95, attack: 145, defense: 130, specialAttack: 120, specialDefense: 90, speed: 120 },
      abilities: ["aerilate"],
      formCategory: "mega",
      requiredItem: "salamencite",
    },
  },
  {
    speciesId: "metagross",
    form: {
      id: "mega-metagross",
      name: "Mega Metagross",
      types: ["Steel", "Psychic"],
      baseStats: { hp: 80, attack: 145, defense: 150, specialAttack: 105, specialDefense: 110, speed: 110 },
      abilities: ["tough-claws"],
      formCategory: "mega",
      requiredItem: "metagrossite",
    },
  },
  {
    speciesId: "latias",
    form: {
      id: "mega-latias",
      name: "Mega Latias",
      types: ["Dragon", "Psychic"],
      baseStats: { hp: 80, attack: 100, defense: 120, specialAttack: 140, specialDefense: 150, speed: 110 },
      abilities: ["levitate"],
      formCategory: "mega",
      requiredItem: "latiasite",
    },
  },
  {
    speciesId: "latios",
    form: {
      id: "mega-latios",
      name: "Mega Latios",
      types: ["Dragon", "Psychic"],
      baseStats: { hp: 80, attack: 130, defense: 100, specialAttack: 160, specialDefense: 120, speed: 110 },
      abilities: ["levitate"],
      formCategory: "mega",
      requiredItem: "latiosite",
    },
  },
  {
    speciesId: "diancie",
    form: {
      id: "mega-diancie",
      name: "Mega Diancie",
      types: ["Rock", "Fairy"],
      baseStats: { hp: 50, attack: 160, defense: 110, specialAttack: 160, specialDefense: 110, speed: 110 },
      abilities: ["magic-bounce"],
      formCategory: "mega",
      requiredItem: "diancite",
    },
  },
  {
    speciesId: "abomasnow",
    form: {
      id: "mega-abomasnow",
      name: "Mega Abomasnow",
      types: ["Grass", "Ice"],
      baseStats: { hp: 90, attack: 132, defense: 105, specialAttack: 132, specialDefense: 105, speed: 30 },
      abilities: ["snow-warning"],
      formCategory: "mega",
      requiredItem: "abomasite",
    },
  },
  {
    speciesId: "lopunny",
    form: {
      id: "mega-lopunny",
      name: "Mega Lopunny",
      types: ["Normal", "Fighting"],
      baseStats: { hp: 65, attack: 136, defense: 94, specialAttack: 54, specialDefense: 96, speed: 135 },
      abilities: ["scrappy"],
      formCategory: "mega",
      requiredItem: "lopunnite",
    },
  },
  {
    speciesId: "audino",
    form: {
      id: "mega-audino",
      name: "Mega Audino",
      types: ["Normal", "Fairy"],
      baseStats: { hp: 103, attack: 60, defense: 126, specialAttack: 80, specialDefense: 126, speed: 50 },
      abilities: ["healer"],
      formCategory: "mega",
      requiredItem: "audinite",
    },
  },
  {
    speciesId: "garchomp",
    form: {
      id: "mega-garchomp",
      name: "Mega Garchomp",
      types: ["Dragon", "Ground"],
      baseStats: { hp: 108, attack: 170, defense: 115, specialAttack: 120, specialDefense: 95, speed: 92 },
      abilities: ["sand-force"],
      formCategory: "mega",
      requiredItem: "garchompite",
    },
  },
  {
    speciesId: "rayquaza",
    form: {
      id: "mega-rayquaza",
      name: "Mega Rayquaza",
      types: ["Dragon", "Flying"],
      baseStats: { hp: 105, attack: 180, defense: 100, specialAttack: 180, specialDefense: 100, speed: 115 },
      abilities: ["delta-stream"],
      formCategory: "mega",
      requiredMove: "dragon-ascent",
    },
  },
  // Pokémon Legends: Z-A (2026) introduced new Mega Evolutions beyond the original Gen 6-7
  // roster above, starting with the three Kalos starters plus a handful of others; more may be
  // added here as they're confirmed. Mega Chesnaught's ability is its own hidden ability
  // (Bulletproof) promoted to the only one, rather than a wholly new ability.
  {
    speciesId: "chesnaught",
    form: {
      id: "mega-chesnaught",
      name: "Mega Chesnaught",
      types: ["Grass", "Fighting"],
      baseStats: { hp: 88, attack: 137, defense: 172, specialAttack: 74, specialDefense: 115, speed: 44 },
      abilities: ["bulletproof"],
      formCategory: "mega",
      requiredItem: "chesnaughtite",
    },
  },
];
