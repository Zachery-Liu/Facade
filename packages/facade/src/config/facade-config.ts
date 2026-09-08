import { z } from 'zod';

const ReleaseSelectionSchema = z.discriminatedUnion('strategy', [
  z.object({ strategy: z.literal('github-latest') }).strict(),
  z.object({ strategy: z.literal('tag'), tag: z.string().min(1) }).strict(),
]);

export const FacadeConfigSchema = z.object({
  schema: z.number().int().positive(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  release: ReleaseSelectionSchema,
}).strict();
export type FacadeConfig = z.infer<typeof FacadeConfigSchema>;

export const FacadeConfigInputSchema = z.object({
  schema: z.number().int().positive(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/).optional(),
  release: ReleaseSelectionSchema.optional(),
}).strict();
export type FacadeConfigInput = z.infer<typeof FacadeConfigInputSchema>;
