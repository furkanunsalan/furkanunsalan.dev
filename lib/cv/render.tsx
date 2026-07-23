import path from "node:path";
import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  Link,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { CvDocumentModel } from "@/types";

// Roboto (vendored woff in public/fonts) — matches the original Word document.
const fontDir = path.join(process.cwd(), "public", "fonts");
let registered = false;
function ensureFonts() {
  if (registered) return;
  Font.register({
    family: "Roboto",
    fonts: [
      { src: path.join(fontDir, "Roboto-Regular.woff"), fontWeight: "normal" },
      { src: path.join(fontDir, "Roboto-Bold.woff"), fontWeight: "bold" },
      {
        src: path.join(fontDir, "Roboto-Italic.woff"),
        fontWeight: "normal",
        fontStyle: "italic",
      },
      {
        src: path.join(fontDir, "Roboto-BoldItalic.woff"),
        fontWeight: "bold",
        fontStyle: "italic",
      },
    ],
  });
  // Don't auto-hyphenate — the source document doesn't.
  Font.registerHyphenationCallback((word) => [word]);
  registered = true;
}

const NAVY = "#1f3864";
const INK = "#202020";
const GRAY = "#595959";

const s = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9.5,
    color: INK,
    lineHeight: 1.3,
    paddingTop: 34,
    paddingBottom: 34,
    paddingHorizontal: 40,
  },
  // Name + role override the inherited line box: at 21pt the page's body-sized
  // line box is too short and the role would overlap the name. Only the header
  // is special-cased; everything else uses the page's 1.3.
  name: { fontSize: 21, fontWeight: "bold", color: NAVY, lineHeight: 1.1 },
  role: {
    fontSize: 10.5,
    color: NAVY,
    lineHeight: 1.2,
    marginTop: 1,
    marginBottom: 8,
  },

  contactRow: { flexDirection: "row", marginBottom: 8 },
  contactCol: { flexDirection: "column", width: "50%" },
  contactLine: { flexDirection: "row", marginBottom: 1.5 },
  contactLabel: { fontWeight: "bold", width: 52 },
  contactValue: { flexShrink: 1 },

  para: { marginBottom: 6 },
  labeled: { marginBottom: 6 },
  label: { fontWeight: "bold" },

  sectionHeader: {
    fontSize: 11,
    fontWeight: "bold",
    color: NAVY,
    borderBottomWidth: 1,
    borderBottomColor: NAVY,
    paddingBottom: 1.5,
    marginTop: 9,
    marginBottom: 5,
  },

  entryTitle: { fontSize: 10, fontWeight: "bold", color: INK },
  entryDates: {
    fontSize: 8.5,
    fontStyle: "italic",
    color: GRAY,
    marginBottom: 2,
  },
  entrySub: { fontStyle: "italic", color: INK },
  entry: { marginBottom: 7 },

  bulletRow: { flexDirection: "row", marginBottom: 1.5, paddingLeft: 10 },
  bulletDot: { width: 10 },
  bulletText: { flexShrink: 1 },
});

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((b, i) => (
        <View key={i} style={s.bulletRow}>
          <Text style={s.bulletDot}>•</Text>
          <Text style={s.bulletText}>{b}</Text>
        </View>
      ))}
    </>
  );
}

function ContactLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.contactLine}>
      <Text style={s.contactLabel}>{label}</Text>
      <Text style={s.contactValue}>{value}</Text>
    </View>
  );
}

function CvDocument({ model }: { model: CvDocumentModel }) {
  const c = model.contact;
  return (
    <Document
      title={`${model.header.name} — ${model.variant === "short" ? "Resume" : "CV"}`}
      author={model.header.name}
    >
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{model.header.name}</Text>
        <Text style={s.role}>{model.header.role}</Text>

        <View style={s.contactRow}>
          <View style={s.contactCol}>
            {c.address ? (
              <ContactLine label="Address" value={c.address} />
            ) : null}
            {c.phone ? <ContactLine label="Phone" value={c.phone} /> : null}
            {c.email ? <ContactLine label="E-mail" value={c.email} /> : null}
          </View>
          <View style={s.contactCol}>
            {c.github ? <ContactLine label="Github" value={c.github} /> : null}
            {c.web ? <ContactLine label="Web" value={c.web} /> : null}
            {c.linkedin ? (
              <ContactLine label="Linkedin" value={c.linkedin} />
            ) : null}
          </View>
        </View>

        {model.summary ? <Text style={s.para}>{model.summary}</Text> : null}

        {model.skills.length > 0 && (
          <Text style={s.labeled}>
            <Text style={s.label}>Skills: </Text>
            {model.skills.join(", ")}
          </Text>
        )}

        {model.certifications.length > 0 && (
          <Text style={s.labeled}>
            <Text style={s.label}>Certifications: </Text>
            {model.certifications.map((cert, i) => (
              <Text key={i}>
                {i > 0 ? ", " : ""}
                {cert.name}
                {cert.date ? (
                  <Text style={s.entrySub}> ({cert.date})</Text>
                ) : null}
              </Text>
            ))}
          </Text>
        )}

        {model.languages.length > 0 && (
          <Text style={s.labeled}>
            <Text style={s.label}>Languages: </Text>
            {model.languages.map((l, i) => (
              <Text key={i}>
                {i > 0 ? ", " : ""}
                {l.name}
                {l.level ? <Text style={s.entrySub}> ({l.level})</Text> : null}
              </Text>
            ))}
          </Text>
        )}

        {model.education.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Education</Text>
            {model.education.map((e, i) => (
              <View key={i} style={s.entry}>
                <Text style={s.entryTitle}>
                  {e.degree}
                  {e.dates ? `  ${e.dates}` : ""}
                </Text>
                {e.line ? <Text style={s.entrySub}>{e.line}</Text> : null}
                <Bullets items={e.bullets} />
              </View>
            ))}
          </View>
        )}

        {model.projects.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Projects</Text>
            {model.projects.map((p, i) => (
              <View key={i} style={s.entry}>
                <Text>
                  <Text style={s.entryTitle}>{p.name}</Text>
                  {p.url ? <Text style={s.entrySub}> | {p.url}</Text> : null}
                </Text>
                {p.description ? <Text>{p.description}</Text> : null}
                {p.techStack ? (
                  <Text style={s.entrySub}>
                    <Text style={{ fontWeight: "bold", fontStyle: "italic" }}>
                      Tech Stack:{" "}
                    </Text>
                    {p.techStack}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {model.work.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Work Experience</Text>
            {model.work.map((w, i) => (
              <View key={i} style={s.entry}>
                <Text>
                  <Text style={s.entryTitle}>{w.org}</Text>
                  {w.role ? <Text style={s.entrySub}> | {w.role}</Text> : null}
                </Text>
                {w.dates ? <Text style={s.entryDates}>{w.dates}</Text> : null}
                <Bullets items={w.bullets} />
              </View>
            ))}
          </View>
        )}

        {model.volunteering.length > 0 && (
          <View>
            <Text style={s.sectionHeader}>Volunteering</Text>
            {model.volunteering.map((v, i) => (
              <View key={i} style={s.entry}>
                <Text>
                  <Text style={s.entryTitle}>{v.org}</Text>
                  {v.role ? <Text style={s.entrySub}> | {v.role}</Text> : null}
                </Text>
                {v.dates ? <Text style={s.entryDates}>{v.dates}</Text> : null}
                <Bullets items={v.bullets} />
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}

export async function renderCvPdf(model: CvDocumentModel): Promise<Buffer> {
  ensureFonts();
  return renderToBuffer(<CvDocument model={model} />);
}
