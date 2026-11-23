import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { CONTENT_CLUSTER_IDS, CONTENT_PARENT_PILLARS } from './content/clusters';

const articles = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/data/articles',
    // Filename only. Without this, a stale Content Layer cache can keep a
    // second entry for the same file (seen on beans-and-rice and meal-prep)
    // and the later id wins.
    generateId: ({ entry }) =>
      entry.replace(/\\/g, '/').replace(/^.*\//, '').replace(/\.md$/i, ''),
  }),
  schema: z.object({
    title: z.string(),
    excerpt: z.string(),
    category: z.enum(['nutrition', 'recipes', 'tips']),
    tags: z.array(z.string()),
    image: z.string(),
    imageAlt: z.string(),
    quickAnswer: z.string().optional(),
    date: z.coerce.date(),
    dateModified: z.coerce.date().optional(),
    // Public modified day for schema, sitemap, feeds, and the visible Updated
    // line. Set only for a changed number or claim, or a body change of at
    // least 15%. Link, citation, title, author, caption, and template edits
    // leave it unset so they do not move dateModified.
    substantiveUpdate: z.coerce.date().optional(),
    publishAt: z.coerce.date().optional(),
    author: z.string().optional(),
    cluster: z.enum(CONTENT_CLUSTER_IDS).optional(),
    parentPillar: z.enum(CONTENT_PARENT_PILLARS).optional(),
    featured: z.boolean().default(false),
    editorsPick: z.boolean().default(false),
    whatsHot: z.boolean().default(false),
    mustRead: z.boolean().default(false),
    // Stays false until a later edit opts a non-excluded page in. Combined
    // with AFFILIATE_LINKS_ENABLED (also default off) this renders nothing.
    affiliateEligible: z.boolean().default(false),
    // Recipe fields
    prepTime: z.string().optional(),
    cookTime: z.string().optional(),
    totalTime: z.string().optional(),
    servings: z.coerce.number().optional(),
    calories: z.coerce.number().optional(),
    ingredientsGrams: z.array(z.object({
      item: z.string(),
      grams: z.number().positive(),
      fdcId: z.number().int().positive(),
    })).optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
    recipeName: z.string().optional(),
    recipeCategory: z.string().optional(),
    recipeCuisine: z.string().optional(),
    ingredients: z.array(z.string()).optional(),
    steps: z.array(z.string()).optional(),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string()
    })).optional(),
  }),
});

export const collections = { articles };
