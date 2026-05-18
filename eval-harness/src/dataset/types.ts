import { z } from 'zod';

export const TravelConstraintsSchema = z.object({
  origin: z.string().nullable(),
  destination: z.string().nullable(),
  duration_days: z.number().nullable(),
  hotel_rating_min: z.number().nullable(),
  transport_type: z.string().nullable(),
});

export const ShoppingConstraintsSchema = z.object({
  category: z.string().nullable(),
  brand: z.string().nullable(),
  min_specs: z.array(z.string()).nullable(),
  preferred_features: z.array(z.string()).nullable(),
});

export const ExtractionSchema = z.object({
  domain: z.enum(['travel', 'shopping', 'unknown']),
  budget: z.number().nullable(),
  travel_constraints: TravelConstraintsSchema.nullable(),
  shopping_constraints: ShoppingConstraintsSchema.nullable(),
  needs_clarification: z.boolean(),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

export interface TestCase {
  id: string;
  input: string;
  expected_domain: 'travel' | 'shopping' | 'unknown';
  expected_output: ExtractionResult;
}
