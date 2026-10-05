import { z } from 'zod';

export const cssColorSchema = z
  .string()
  .refine((val) => !/url\(|;|expression/i.test(val), {
    message: 'Color styling must not contain "url(", ";", or "expression"',
  })
  .refine(
    (val) => {
      const hexRegex = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
      const rgbRegex = /^rgba?\(\s*[\d.]+%?\s*(?:,\s*|\s+)[\d.]+%?\s*(?:,\s*|\s+)[\d.]+%?\s*(?:(?:,\s*|\/\s*)[\d.]+%?)?\s*\)$/i;
      const namedRegex = /^[a-zA-Z]+$/;
      return hexRegex.test(val) || rgbRegex.test(val) || namedRegex.test(val);
    },
    {
      message: 'Color must be a valid hex, rgb/rgba, or named color',
    }
  );

export const cssSizeSchema = z
  .string()
  .refine((val) => !/url\(|;|expression/i.test(val), {
    message: 'Size styling must not contain "url(", ";", or "expression"',
  })
  .refine((val) => /^\d+(\.\d+)?(px|rem|em|%|vw|vh)$/.test(val), {
    message: 'Size must be a number followed by px, rem, em, %, vw, or vh',
  });

const safeStyleString = (fieldName: string, maxLen = 100) =>
  z
    .string()
    .max(maxLen)
    .refine((val) => !/url\(|;|expression/i.test(val), {
      message: `${fieldName} must not contain "url(", ";", or "expression"`,
    });

export const textStimulusStylingSchema = z
  .object({
    fontSize: cssSizeSchema.optional(),
    fontWeight: safeStyleString('fontWeight', 50).optional(),
    color: cssColorSchema.optional(),
    fontFamily: safeStyleString('fontFamily', 100).optional(),
    textAlign: z.enum(['left', 'center', 'right']).optional(),
  })
  .optional();

export const imageStimulusStylingSchema = z
  .object({
    width: cssSizeSchema.optional(),
    height: cssSizeSchema.optional(),
    objectFit: z.enum(['contain', 'cover', 'fill']).optional(),
    border: safeStyleString('border', 100).optional(),
  })
  .optional();

export const textStimulusSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('text'),
  content: z
    .string()
    .min(1, 'Text stimulus content must not be empty')
    .max(5000, 'Text stimulus content must be at most 5000 characters'),
  styling: textStimulusStylingSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const imageStimulusSchema = z.object({
  id: z.string().uuid(),
  type: z.literal('image'),
  url: z
    .string()
    .url('Image stimulus must have a valid URL')
    .refine((val) => val.startsWith('https://'), {
      message: 'Image stimulus URL must use HTTPS protocol',
    }),
  altText: z
    .string()
    .max(500, 'altText must be at most 500 characters')
    .optional(),
  styling: imageStimulusStylingSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const stimulusSchema = z.discriminatedUnion('type', [
  textStimulusSchema,
  imageStimulusSchema,
]);

export type StimulusInput = z.infer<typeof stimulusSchema>;
