// Renders a JSON-LD <script> for structured data. Server component; the data is
// authored server-side so JSON.stringify output is trusted.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
