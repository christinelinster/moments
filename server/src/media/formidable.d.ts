declare module "formidable" {
  import type { IncomingMessage } from "node:http";

  export type FormidableFile = {
    filepath: string;
    originalFilename: string | null;
    mimetype: string | null;
    size: number;
  };

  export type FormidableFields = Record<string, string[] | undefined>;
  export type FormidableFiles = Record<
    string,
    FormidableFile | FormidableFile[] | undefined
  >;

  export type FormidableOptions = {
    allowEmptyFiles?: boolean;
    keepExtensions?: boolean;
    maxFileSize?: number;
    maxFiles?: number;
    multiples?: boolean;
  };

  export type FormidableForm = {
    parse(
      request: IncomingMessage,
      callback: (
        error: (Error & { code?: number }) | null,
        fields: FormidableFields,
        files: FormidableFiles,
      ) => void,
    ): void;
  };

  export default function formidable(options?: FormidableOptions): FormidableForm;
}
