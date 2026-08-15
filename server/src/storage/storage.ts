import type { Readable } from "node:stream";

export type StoragePutInput = {
  key: string;
  source: Readable;
  byteSize?: number;
};

export type StoredObject = {
  key: string;
  byteSize: number;
};

export interface MediaStorage {
  put(input: StoragePutInput): Promise<StoredObject>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}
