import { config, fields, collection } from "@keystatic/core";

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
        content: fields.markdoc({ label: "Content" }),
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
});
