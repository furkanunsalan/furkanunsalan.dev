import { config, fields, collection, singleton } from "@keystatic/core";

export default config({
  // Local storage in dev (no auth, writes to filesystem); GitHub-backed in
  // production so /keystatic gates behind GitHub OAuth.
  storage:
    process.env.NODE_ENV === "production"
      ? {
          kind: "github",
          repo: { owner: "furkanunsalan", name: "furkanunsalan.dev" },
        }
      : { kind: "local" },
  ui: {
    brand: { name: "furkanunsalan.dev" },
  },
  collections: {
    posts: collection({
      label: "Posts",
      slugField: "title",
      path: "content/posts/*/",
      format: { contentField: "content" },
      schema: {
        title: fields.slug({ name: { label: "Title" } }),
        date: fields.date({ label: "Date" }),
        tags: fields.array(fields.text({ label: "Tag" }), {
          label: "Tags",
          itemLabel: (props) => props.value,
        }),
        banner: fields.image({
          label: "Banner image (optional)",
          description:
            "Shown as a small thumbnail on the writing list and as a hero on the post page.",
          directory: "public/posts",
          publicPath: "/posts/",
        }),
        content: fields.markdoc({
          label: "Content",
          options: {
            image: {
              directory: "public/posts",
              publicPath: "/posts/",
            },
          },
        }),
      },
    }),
    experiences: collection({
      label: "Experiences",
      slugField: "id",
      path: "content/experiences/*/",
      format: { data: "json" },
      schema: {
        id: fields.slug({
          name: {
            label: "ID",
            description: "Stable identifier (e.g. acme-2024-engineer)",
          },
        }),
        order: fields.integer({
          label: "Order",
          description:
            "Lower number appears first. Same value for every role at a company.",
          defaultValue: 100,
        }),
        organization: fields.text({ label: "Organization" }),
        title: fields.text({ label: "Title" }),
        startDate: fields.date({ label: "Start date" }),
        endDate: fields.date({ label: "End date (leave empty if current)" }),
        comment: fields.text({ label: "Comment", multiline: true }),
        links: fields.array(
          fields.object({
            label: fields.text({ label: "Label" }),
            url: fields.url({ label: "URL" }),
          }),
          {
            label: "Links",
            itemLabel: (props) => props.fields.label.value || "link",
          },
        ),
        images: fields.array(
          fields.image({
            label: "Image",
            directory: "public/experiences",
            publicPath: "/experiences/",
          }),
          {
            label: "Images",
            itemLabel: (props) => props.value?.filename ?? "image",
          },
        ),
      },
    }),
    projects: collection({
      label: "Projects (custom)",
      slugField: "slug",
      path: "content/projects/*/",
      format: { contentField: "content" },
      schema: {
        slug: fields.slug({
          name: {
            label: "Slug",
            description: "URL fragment, e.g. acme-app",
          },
        }),
        name: fields.text({ label: "Name" }),
        description: fields.text({ label: "Description", multiline: true }),
        metric: fields.text({
          label: "Metric",
          description: "Shown instead of stars, e.g. 5000+ users",
        }),
        link: fields.url({ label: "Link" }),
        language: fields.text({ label: "Language / stack" }),
        order: fields.integer({
          label: "Order",
          description: "Lower number appears first.",
          defaultValue: 100,
        }),
        image: fields.image({
          label: "Image",
          directory: "public/projects",
          publicPath: "/projects/",
        }),
        content: fields.markdoc({
          label: "Long description",
          options: {
            image: {
              directory: "public/projects",
              publicPath: "/projects/",
            },
          },
        }),
      },
    }),
    tools: collection({
      label: "Tools",
      slugField: "name",
      path: "content/tools/*/",
      format: { data: "json" },
      schema: {
        name: fields.slug({ name: { label: "Name" } }),
        brand: fields.text({ label: "Brand" }),
        what: fields.text({ label: "Type", description: "e.g. keyboard" }),
        category: fields.select({
          label: "Category",
          options: [
            { label: "Tech", value: "tech" },
            { label: "Desk", value: "desk" },
            { label: "Other", value: "other" },
          ],
          defaultValue: "tech",
        }),
        comment: fields.text({ label: "Comment", multiline: true }),
        favorite: fields.checkbox({ label: "Favorite" }),
        link: fields.url({ label: "Link" }),
      },
    }),
  },
  singletons: {
    home: singleton({
      label: "Home page",
      path: "content/settings/home/",
      format: { data: "json" },
      schema: {
        intro: fields.text({
          label: "Intro paragraph",
          description: "The short bio on the homepage.",
          multiline: true,
        }),
        timezone: fields.text({
          label: "Timezone (IANA)",
          description: "e.g. Europe/Istanbul, America/New_York",
          defaultValue: "Europe/Istanbul",
        }),
        timezoneLabel: fields.text({
          label: "Timezone short label",
          description: "Shown next to the clock, e.g. IST, EST, GMT",
          defaultValue: "IST",
        }),
        pgpId: fields.text({
          label: "PGP key ID",
          description: "Shown under the clock. Leave empty to hide.",
          defaultValue: "A728E9CA9578CBA7",
        }),
        socials: fields.array(
          fields.object({
            name: fields.text({ label: "Name" }),
            url: fields.text({ label: "URL" }),
            icon: fields.select({
              label: "Icon",
              options: [
                { label: "GitHub", value: "github" },
                { label: "LinkedIn", value: "linkedin" },
                { label: "Mail", value: "mail" },
                { label: "CV / Document", value: "cv" },
                { label: "Medium", value: "medium" },
                { label: "RSS", value: "rss" },
                { label: "X / Twitter", value: "x" },
                { label: "YouTube", value: "youtube" },
                { label: "Instagram", value: "instagram" },
                { label: "Mastodon", value: "mastodon" },
                { label: "BlueSky", value: "bluesky" },
                { label: "Website / Globe", value: "globe" },
              ],
              defaultValue: "globe",
            }),
          }),
          {
            label: "Socials",
            itemLabel: (props) => props.fields.name.value || "social",
          },
        ),
      },
    }),
    githubProjects: singleton({
      label: "GitHub project visibility",
      path: "content/settings/github-projects/",
      format: { data: "json" },
      schema: {
        repos: fields.array(
          fields.object({
            name: fields.text({ label: "Repo name" }),
            visible: fields.checkbox({
              label: "Show on /projects",
              defaultValue: true,
            }),
            pinned: fields.checkbox({
              label: "Pin to top",
              defaultValue: false,
            }),
          }),
          {
            label: "Repos",
            description:
              "One row per GitHub repo. Run `npm run sync:github-projects` to fetch fresh repos from GitHub and merge them into this list — existing toggles are preserved.",
            itemLabel: (props) =>
              `${props.fields.name.value || "repo"}${props.fields.visible.value ? "" : "  (hidden)"}${props.fields.pinned.value ? "  ★" : ""}`,
          },
        ),
      },
    }),
  },
});
