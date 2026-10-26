declare module "jsmediatags" {
  export function read(
    file: Blob | File | string,
    callbacks: {
      onSuccess?: (tag: any) => void;
      onError?: (error: any) => void;
    }
  ): void;
}
