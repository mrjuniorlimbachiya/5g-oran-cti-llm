// Renders data/processed/sample_incident_report.json into a clean, plain-formatted Word
// document -- the "sample incident report ... submitted separately" required by the exercise.
//
// Usage (from the notebooks/ folder, after running 02_cti_alert_generation.ipynb):
//     node generate_incident_report.js
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require("docx");
const fs = require("fs");
const path = require("path");

const FONT = "Calibri";
const dataPath = path.join(__dirname, "..", "data", "processed", "sample_incident_report.json");
const outPath = path.join(__dirname, "..", "outputs", "Sample_Incident_Report.docx");

const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));
const alert = data.alert;
const resp = data.llm_response || {};

const body = (text, opts = {}) => new Paragraph({
  spacing: { after: 160, line: 276 },
  children: [new TextRun({ text: String(text), font: FONT, size: 22, ...opts })],
});

const label = (text) => new Paragraph({
  spacing: { before: 200, after: 60 },
  children: [new TextRun({ text, font: FONT, bold: true, size: 22 })],
});

const heading = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text, font: FONT, bold: true, size: 26 })],
});

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const tableBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder, insideHorizontal: thinBorder, insideVertical: thinBorder };

const cell = (text, bold = false) => new TableCell({
  width: { size: 4500, type: WidthType.DXA },
  margins: { top: 80, bottom: 80, left: 100, right: 100 },
  children: [new Paragraph({ children: [new TextRun({ text: String(text), font: FONT, size: 20, bold })] })],
});

const obsRows = Object.entries(alert.network_observations || {}).map(([k, v]) =>
  new TableRow({ children: [cell(k, true), cell(v)] })
);

const altRows = (alert.alternative_predictions || []).map((a) =>
  new TableRow({ children: [cell(a.class), cell(a.confidence)] })
);

const doc = new Document({
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "Sample CTI Incident Report", font: FONT, bold: true, size: 30 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new TextRun({ text: "LLM-Assisted Cyber Threat Intelligence for 5G O-RAN Security", font: FONT, size: 22, italics: true })],
      }),

      heading("Alert Summary"),
      body(`Alert ID: ${alert.alert_id}`),
      body(`Detection timestamp: ${alert.detection_timestamp}`),
      body(`Predicted threat class: ${alert.predicted_threat_class}`),
      body(`Prediction confidence: ${alert.prediction_confidence}`),
      body(`Affected network component: ${alert.affected_network_component}`),

      label("Alternative predictions"),
      new Table({ width: { size: 9000, type: WidthType.DXA }, borders: tableBorders, rows: [new TableRow({ children: [cell("Class", true), cell("Confidence", true)] }), ...altRows] }),

      label("Network observations"),
      new Table({ width: { size: 9000, type: WidthType.DXA }, borders: tableBorders, rows: [new TableRow({ children: [cell("Feature", true), cell("Value", true)] }), ...obsRows] }),

      heading("LLM-Generated Assessment"),
      label("Contextualisation"),
      body(resp.contextualisation || "N/A"),
      label("Correlation with known attack behaviour"),
      body(resp.correlation_with_known_behaviour || "N/A"),
      label("Severity"),
      body(resp.severity || "N/A"),
      label("Possible impact"),
      body(resp.possible_impact || "N/A"),
      label("Immediate response"),
      body(resp.immediate_response || "N/A"),
      label("Long-term mitigation"),
      body(resp.long_term_mitigation || "N/A"),
      label("Human review required"),
      body(`${resp.human_review_required} -- ${resp.human_review_reason || ""}`),

      heading("Generation Metadata"),
      body(`Generation time: ${data.generation_time_seconds} seconds`),
      body(`Schema validation: ${(data.missing_fields || []).length === 0 ? "passed (all required fields present)" : "missing fields: " + data.missing_fields.join(", ")}`),
      body(`Hallucination check (invented indicators): ${(data.invented_indicators || []).length === 0 ? "none detected" : data.invented_indicators.join(", ")}`),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, buffer);
  console.log("Wrote", outPath);
});
