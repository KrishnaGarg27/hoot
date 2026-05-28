export type PaletteId = "sky" | "cloud" | "bubblegum" | "cream" | "mint";

export type Palette = {
  id: PaletteId;
  name: string;
  bg: string;
  bg2: string;
  card: string;
  ink: string;
  btn: string;
  btnInk: string;
  accentYellow: string;
  accentPink: string;
  accentMint: string;
  accentPinkSoft: string;
  accentMintSoft: string;
  accentYellowSoft: string;
  stageBg: string;
};

export const PALETTES: Record<PaletteId, Palette> = {
  sky: {
    id: "sky", name: "Sky Blue",
    bg: "#B5DDF0", bg2: "#9FD0E6", card: "#FFFFFF", ink: "#0E2E4E",
    btn: "#3E7FA8", btnInk: "#FFFFFF",
    accentYellow: "#FFD94A", accentPink: "#FF9FB8", accentMint: "#A8E6C7",
    accentPinkSoft: "#FFE0E8", accentMintSoft: "#DDF3E6", accentYellowSoft: "#FFF0C2",
    stageBg: "#A6D5E8",
  },
  cloud: {
    id: "cloud", name: "Cloud",
    bg: "#E2E8EE", bg2: "#D2DBE3", card: "#FFFFFF", ink: "#0E2E4E",
    btn: "#3FA3D1", btnInk: "#FFFFFF",
    accentYellow: "#FFD94A", accentPink: "#FF9FB8", accentMint: "#A8E6C7",
    accentPinkSoft: "#B5DDF0", accentMintSoft: "#DDF3E6", accentYellowSoft: "#FFF0C2",
    stageBg: "#C5D3DE",
  },
  bubblegum: {
    id: "bubblegum", name: "Bubblegum",
    bg: "#FBD7E2", bg2: "#F5BFD0", card: "#FFFEFC", ink: "#3A1A38",
    btn: "#E64F88", btnInk: "#FFFFFF",
    accentYellow: "#FFCF5C", accentPink: "#FF8FB2", accentMint: "#B4E3CD",
    accentPinkSoft: "#FFE7EE", accentMintSoft: "#E0F3E9", accentYellowSoft: "#FFEFC8",
    stageBg: "#F2C6D6",
  },
  cream: {
    id: "cream", name: "Mustard Retro",
    bg: "#F2DC93", bg2: "#E8CD75", card: "#FFFAEC", ink: "#274233",
    btn: "#274233", btnInk: "#FFFAEC",
    accentYellow: "#F2C84B", accentPink: "#E89AB6", accentMint: "#A9D9B3",
    accentPinkSoft: "#F5DCDC", accentMintSoft: "#DDEEDD", accentYellowSoft: "#FFF1C2",
    stageBg: "#3E6B4E",
  },
  mint: {
    id: "mint", name: "Fresh Mint",
    bg: "#C8EDD8", bg2: "#B4E2C7", card: "#FFFFFF", ink: "#143E2F",
    btn: "#2E7D5B", btnInk: "#FFFFFF",
    accentYellow: "#FFD773", accentPink: "#FF9FB8", accentMint: "#7FD6A6",
    accentPinkSoft: "#FFE0E8", accentMintSoft: "#DDF3E6", accentYellowSoft: "#FFF0C2",
    stageBg: "#A6DFC0",
  },
};

export const PALETTE_ORDER: PaletteId[] = ["sky", "cloud", "bubblegum", "cream", "mint"];
