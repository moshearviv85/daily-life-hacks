import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/data/articles' }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    category: z.enum(['nutrition', 'recipes', 'tips']),
    tags: z.array(z.string()),
    image: z.string(),
    imageAlt: z.string(),
    date: z.coerce.date(),
    publishAt: z.coerce.date().optional(),
    author: z.string().optional(),
    featured: z.boolean().default(false),
    editorsPick: z.boolean().default(false),
    whatsHot: z.boolean().default(false),
    mustRead: z.boolean().default(false),
    // Recipe fields
    prepTime: z.string().optional(),
    cookTime: z.string().optional(),
    totalTime: z.string().optional(),
    servings: z.coerce.number().optional(),
    calories: z.coerce.number().optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    ingredients: z.array(z.string()).optional(),
    steps: z.array(z.string()).optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string()
    })).optional(),
  }),
});

export const collections = { articles };
