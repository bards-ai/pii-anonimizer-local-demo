export const SITE_TITLE = "PII Anonymizer";
export const SITE_DESCRIPTION =
  "Browser-based PII detection powered by bardsai/eu-pii-anonimization-multilang. All inference runs locally in your browser — no data leaves your device.";

export const NAV_ITEMS = [
  { label: "Demo", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "About", href: "/about" },
] as const;

export const DOCS_META = [
  {
    slug: "entity-categories",
    title: "Entity Categories",
    description: "Full reference of 35 entity classes across 8 categories",
    icon: "tag",
  },
  {
    slug: "model-card",
    title: "Model Card",
    description: "Architecture, performance metrics, training details, and limitations",
    icon: "chart",
  },
  {
    slug: "integration",
    title: "Integration Guide",
    description: "Python, JavaScript, and ONNX usage examples",
    icon: "code",
  },
] as const;
