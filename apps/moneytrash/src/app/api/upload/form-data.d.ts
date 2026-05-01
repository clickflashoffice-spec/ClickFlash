/**
 * Minimal ambient typings for the `form-data` npm package.
 *
 * The package is not in moneytrash's package.json dependency list — it is a
 * transitive dep that's loaded dynamically at runtime only when the Node
 * upload path runs (see `uploadUtils.ts`). We declare just the surface area
 * we actually use here so TypeScript doesn't error on the import while still
 * giving us real type-checking on the call sites.
 */
declare module 'form-data' {
  interface FormDataAppendOptions {
    filename?: string;
    contentType?: string;
    knownLength?: number;
  }

  type SubmitCallback = (err: Error | null, res: unknown) => void;

  class FormData {
    append(
      field: string,
      value: unknown,
      options?: string | FormDataAppendOptions,
    ): void;
    getHeaders(): Record<string, string>;
    submit(url: string, callback: SubmitCallback): void;
  }

  export default FormData;
}
