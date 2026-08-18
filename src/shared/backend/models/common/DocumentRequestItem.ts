import * as z from "@/lib/zod";

const DocumentSchema = z.object({
  id: z.string(),
  filename: z.string(),
  contentType: z.string(),
  byteSize: z.number(),
  createdAt: z.string(),
  downloadable: z.boolean(),
  tags: z.array(
    z.object({
      value: z.string(),
      human: z.string(),
      severity: z.string(),
    }),
  ),
});

export const DocumentRequestItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  required: z.boolean(),
  contentTypes: z.array(z.string()),
  requestGroup: z
    .object({
      title: z.string(),
    })
    .optional(),
  documents: z.array(DocumentSchema),
});

export type DocumentRequestItemType = z.infer<typeof DocumentRequestItemSchema>;
