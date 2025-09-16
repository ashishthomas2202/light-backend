import { z } from "zod";

export const Cmd = z.object({
  mode: z.string().default("off"),
  color: z.string().default("#000000"),
  brightness: z.number().int().min(0).max(255).default(128),
  speed: z.number().int().min(1).max(10).default(5),
  segment: z.tuple([z.number().int(), z.number().int()]).optional(),
  duration: z.number().int().min(0).max(3600).default(0),
});
