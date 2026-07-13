export type GenerateVideoResult =
  | { mode: "lambda"; renderId: string; bucketName: string }
  | { mode: "local"; fileId: string };