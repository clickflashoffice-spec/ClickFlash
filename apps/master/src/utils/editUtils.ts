import { ManualEdits } from "../types/shared";

export interface EditorPreset {
  id: string;
  name: string;
  category:
    | "all"
    | "basic"
    | "portrait"
    | "nature"
    | "vintage"
    | "b&w"
    | "artistic";
  edits: Partial<ManualEdits>;
}

export interface ControlDefinition {
  key: keyof ManualEdits;
  name: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
}

export const EDITOR_CATEGORIES = [
  { id: "all", name: "All" },
  { id: "basic", name: "Basic" },
  { id: "portrait", name: "Portrait" },
  { id: "nature", name: "Nature" },
  { id: "vintage", name: "Vintage" },
  { id: "b&w", name: "B&W" },
  { id: "artistic", name: "Artistic" },
] as const;

export const ADJUSTMENT_SECTIONS = {
  basic: ["exposure", "contrast", "saturate", "vibrance"],
  color: ["temperature", "tint", "hueRotate"],
  tone: ["highlights", "shadows", "whites", "blacks", "clarity", "vignette"],
  effects: ["soften", "grayscale", "sepia", "invert"],
} as const;

export const EDITOR_CONTROLS: ControlDefinition[] = [
  {
    key: "exposure",
    name: "Exposure",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "contrast",
    name: "Contrast",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "saturate",
    name: "Saturation",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "vibrance",
    name: "Vibrance",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "temperature",
    name: "Temperature",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "tint",
    name: "Tint",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "highlights",
    name: "Highlights",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "shadows",
    name: "Shadows",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "whites",
    name: "Whites",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "blacks",
    name: "Blacks",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "clarity",
    name: "Clarity",
    min: -100,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "vignette",
    name: "Vignette",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "",
  },
  {
    key: "hueRotate",
    name: "Hue",
    min: -180,
    max: 180,
    step: 1,
    defaultValue: 0,
    unit: "°",
  },
  {
    key: "soften",
    name: "Softness",
    min: 0,
    max: 20,
    step: 0.5,
    defaultValue: 0,
    unit: "px",
  },
  {
    key: "grayscale",
    name: "Grayscale",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "%",
  },
  {
    key: "sepia",
    name: "Sepia",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "%",
  },
  {
    key: "invert",
    name: "Invert",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 0,
    unit: "%",
  },
];

export const EDITOR_PRESETS: EditorPreset[] = [
  { id: "normal", name: "Normal", category: "basic", edits: {} },
  {
    id: "vivid",
    name: "Vivid",
    category: "basic",
    edits: { contrast: 10, saturate: 20, vibrance: 20, clarity: 10 },
  },
  {
    id: "dramatic",
    name: "Dramatic",
    category: "basic",
    edits: { contrast: 30, clarity: 30, shadows: -20, highlights: 10 },
  },
  {
    id: "vintage",
    name: "Vintage",
    category: "vintage",
    edits: {
      sepia: 30,
      contrast: -10,
      exposure: 5,
      saturate: -20,
      temperature: 15,
    },
  },
  {
    id: "retro",
    name: "Retro",
    category: "vintage",
    edits: {
      sepia: 50,
      contrast: -15,
      exposure: 10,
      saturate: -30,
      vignette: 30,
    },
  },
  {
    id: "noir",
    name: "Noir",
    category: "b&w",
    edits: { grayscale: 100, contrast: 20, exposure: -5 },
  },
  {
    id: "landscape",
    name: "Landscape",
    category: "nature",
    edits: { saturate: 15, clarity: 25, contrast: 10, vibrance: 20 },
  },
  {
    id: "portrait",
    name: "Portrait",
    category: "portrait",
    edits: { contrast: -5, exposure: 5, saturate: -5, clarity: -10 },
  },
  {
    id: "warm",
    name: "Warm",
    category: "artistic",
    edits: { temperature: 30, tint: 10, contrast: 5, saturate: 5 },
  },
  {
    id: "cold",
    name: "Cold",
    category: "artistic",
    edits: { temperature: -30, tint: -10, contrast: 10, saturate: -10 },
  },
];
