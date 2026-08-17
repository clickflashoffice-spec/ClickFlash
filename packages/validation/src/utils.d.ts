import { z } from 'zod';
/**
 * Validate data against a Zod schema, throwing on failure.
 */
export declare function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T;
/**
 * Validate data against a Zod schema, returning null on failure.
 */
export declare function validateOrNull<T>(schema: z.ZodSchema<T>, data: unknown): T | null;
/**
 * Validate partial data against a Zod object schema.
 */
export declare function validatePartial<T extends z.ZodRawShape>(schema: z.ZodObject<T>, data: unknown): z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{ [k_1 in keyof T]: z.ZodOptional<T[k_1]>; }>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never;
/**
 * Validate and return a typed result with success/error info.
 */
export declare function validateSafe<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: string[];
};
/**
 * Sanitize a string to prevent XSS attacks.
 * Escapes HTML entities and strips dangerous patterns.
 */
export declare function sanitizeHtml(input: string): string;
/**
 * Sanitize all string values in an object recursively.
 */
export declare function sanitizeObject<T>(obj: T): T;
/**
 * Generate a CSRF token using crypto.
 */
export declare function generateCsrfToken(): string;
/**
 * Validate that the provided CSRF token matches the expected token.
 */
export declare function validateCsrfToken(provided: string | undefined, expected: string): boolean;
//# sourceMappingURL=utils.d.ts.map