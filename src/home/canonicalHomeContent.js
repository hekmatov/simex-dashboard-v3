export const CANONICAL_HOME_REPOSITORY_URL = "https://github.com/hekmatov/simex-dashboard-v3";

export const CANONICAL_HOME_CONTENT = deepFreeze({
  hero: {
    deliveryLabel: "Cloudflare beta",
    headline: "SimEx Dashboard",
    summary: "A practical workspace for exploring exercise data, shaping dashboard views, and presenting the situation clearly.",
    primaryAction: {
      label: "Open the dashboard",
      mode: "view",
    },
  },
  capabilities: [
    {
      number: "01",
      title: "View",
      description: "Explore the prepared biomedical and socio-economic exercise views.",
    },
    {
      number: "02",
      title: "Build",
      description: "Shape pages, sections, and charts around the story your exercise needs to tell.",
    },
    {
      number: "03",
      title: "Present",
      description: "Move from analysis to a focused, briefing-ready view for your audience.",
    },
  ],
  resources: {
    heading: "Project resources",
    description: "Find the source, follow progress, or contribute to the dashboard’s next steps.",
    repository: {
      label: "View the repository",
      destination: CANONICAL_HOME_REPOSITORY_URL,
    },
  },
  faq: {
    heading: "Getting started with building",
    description: "A few practical answers for shaping your first SimEx dashboard.",
    items: [
      {
        question: "How do I add a chart?",
        answer: "Switch to Build and choose Add chart. Select a chart type, choose the data source and fields, then save the chart draft when it is ready.",
      },
      {
        question: "How do I organize pages and sections?",
        answer: "In Build, open Pages & sections to add, rename, reorder, or remove pages and sections. Use Save Layout Changes when you are happy with the structure.",
      },
      {
        question: "How do I change the dashboard theme and colours?",
        answer: "Open Dashboard look from any workspace to choose the appearance, visual style, colour profile, and chart colours. Selections are saved automatically and applied immediately.",
      },
      {
        question: "How do I add source material and supporting content?",
        answer: "In Build, use Source content to manage data and media, or Add static content for text and narrative panels. The QMD editor supports font choice, bold, underline, italics, lists, tables, and a live preview.",
      },
      {
        question: "How do I show change over time?",
        answer: "Use Chrono Studio to connect compatible chart data to a shared timeline. Scene Studio lets you compose and review time-based scenes before presenting them.",
      },
      {
        question: "How do I prepare a presentation?",
        answer: "Switch to Present, choose charts for the audience scene, select a layout, then open the Audience display to control the briefing.",
      },
      {
        question: "How do I save or share my dashboard?",
        answer: "Use Download package in Build to save a portable dashboard package. Upload package restores a compatible package later.",
      },
    ],
  },
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
