import { z } from 'zod';

export const FacadeConfigSchema = z.object({
  schema: z.number().int().positive(),
  repository: z.string().regex(/^[^/]+\/[^/]+$/),
  release: z.object({ strategy: z.enum(['github-latest', 'tag']), tag: z.string().min(1).optional() }).superRefine((value, context) => {
    if (value.strategy === 'tag' && value.tag === undefined) context.addIssue({ code: z.ZodIssueCode.custom, message: 'release.tag is required when strategy is tag', path: ['tag'] });
  }),
});
export type FacadeConfig = z.infer<typeof FacadeConfigSchema>;
