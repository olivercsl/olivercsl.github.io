import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Practical notes on infrastructure work. Markdown in src/content/blog,
 * one file per article, so adding a post needs no code changes.
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Shown as a chip on the index. */
    topic: z.string(),
    /** Minutes, stated so the reader can judge before starting. */
    readingMinutes: z.number(),
    author: z.string().default('Oliver Zhang'),
  }),
});

export const collections = { blog };
