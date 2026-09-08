import { z } from 'zod';

export const FacadeConfigSchema = z.object({
  schema: z.number().int().positive(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  release: z.discriminatedUnion('strategy', [
    z.object({ strategy: z.literal('github-latest') }).strict(),
    z.object({ strategy: z.literal('tag'), tag: z.string().min(1) }).strict(),
  ]),
}).strict();
export type FacadeConfig = z.infer<typeof FacadeConfigSchema>;
