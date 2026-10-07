import product from "../../../../product.config.json";

export const PRODUCT = product;
/** Set githubUrl in product.config.json when the repository is ready to share. */
export const PROJECT_GITHUB_URL: string | null = PRODUCT.githubUrl;

export const RESEARCH_LINKS = {
  paper: "https://arxiv.org/abs/2607.28711",
  paperPdf: "https://arxiv.org/pdf/2607.28711",
  video: "https://www.youtube.com/watch?v=95335U-cUh8",
  nobleWikipedia: "https://en.wikipedia.org/wiki/Noble_polyhedron",
  keplerPoinsotWikipedia: "https://en.wikipedia.org/wiki/Kepler%E2%80%93Poinsot_polyhedron",
  stellaSmall: "https://www.software3d.com/Stella.php#small",
  stellaGreat: "https://www.software3d.com/Stella.php#great",
  stella4d: "https://www.software3d.com/Stella.php#stella4D",
} as const;
