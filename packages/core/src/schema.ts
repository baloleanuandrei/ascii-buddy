import { z } from "zod";
import { ALL_COMPONENTS, ALL_PACK_IDS } from "./types.js";

export const componentIdSchema = z.enum(ALL_COMPONENTS);
export const packIdSchema = z.enum(ALL_PACK_IDS);

export const brandSpecSchema = z.object({
  name: z.string().min(1).max(40),
  packageName: z
    .string()
    .regex(/^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9-]*$/, "invalid npm package name"),
  tagline: z.string().max(80).optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #RRGGBB hex"),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "must be a #RRGGBB hex")
    .optional(),
  pack: packIdSchema,
  figletFont: z.string().min(1),
  tone: z.enum(["terse", "friendly", "playful"]),
  components: z.array(componentIdSchema).optional(),
  renderer: z.enum(["stdout", "ink"]).optional(),
  target: z.enum(["ts", "py", "both"]).optional(),
});

export type BrandSpecParsed = z.infer<typeof brandSpecSchema>;

const toneRecordSchema = z.object({
  terse: z.array(z.string()),
  friendly: z.array(z.string()),
  playful: z.array(z.string()),
});

export const stylePackSchema = z.object({
  id: z.string().min(1),
  symbols: z.object({
    success: z.string(),
    error: z.string(),
    warning: z.string(),
    info: z.string(),
    selected: z.string().optional(),
    unselected: z.string().optional(),
  }),
  sectionDivider: z.object({
    left: z.string(),
    right: z.string(),
    fill: z.string(),
  }),
  tableBorders: z.enum(["single", "double", "rounded", "ascii"]),
  spinnerFrames: z.array(z.string()).min(1),
  spinnerInterval: z.number().int().positive(),
  microcopy: z.object({
    success: toneRecordSchema,
    error: toneRecordSchema,
    warning: toneRecordSchema,
    info: toneRecordSchema,
  }),
});
