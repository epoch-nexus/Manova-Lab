import { z } from 'zod';

export const textStimulusStylingSchema = z.object({
  fontSize: z.string().optional(),
  fontWeight: z.string().optional(),
  color: z.string().optional(),
  fontFamily: z.string().optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
}).optional();

export const imageStimulusStylingSchema = z.object({
  width: z.string().optional(),
  height: z.string().optional(),
  objectFit: z.enum(['contain', 'cover', 'fill']).optional(),
  border: z.string().optional(),
}).optional();

export const textStimulusSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('text'),
  content: z.string().min(1, 'Text stimulus content must not be empty'),
  styling: textStimulusStylingSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const imageStimulusSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('image'),
  url: z.string().url('Image stimulus must have a valid URL'),
  altText: z.string().optional(),
  styling: imageStimulusStylingSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const stimulusSchema = z.discriminatedUnion('type', [
  textStimulusSchema,
  imageStimulusSchema,
]);

export type StimulusInput = z.infer<typeof stimulusSchema>;
