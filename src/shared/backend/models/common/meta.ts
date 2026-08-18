import * as z from "@/lib/zod";

export const MetaSchema = z.object({
  pagination: z.object({
    count: z.number(),
    limit: z.number(),
    next: z.number().nullable(),
    page: z.number(),
    pages: z.number(),
    prev: z.number().nullable(),
  }),
});

export type MetaType = z.infer<typeof MetaSchema>;
