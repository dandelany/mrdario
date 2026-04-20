declare module "*.svg?raw" {
  const contents: string;
  export default contents;
}

declare module "*.svg?inline" {
  const contents: string;
  export default contents;
}

declare module "*.svg" {
  const contents: string;
  export default contents;
}

declare module "*.png" {
  const contents: string;
  export default contents;
}
