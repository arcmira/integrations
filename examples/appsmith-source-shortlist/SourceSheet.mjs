export default {
  fixture() {
    return {
      is_synthetic: true,
      status: "demo",
      query: "creator economy",
      requested_window: { after: "2026-08-01", before: "2026-09-01" },
      applied_window: null,
      partial: null,
      search_index: null,
      coverage_note: "Synthetic demonstration. No search was run; coverage and transcript quality are not measured.",
      candidates: [
        { title: "Synthetic recording A", text: "A creator can turn one interview into a short source-backed story.", start_seconds: 42, transcript_type: "synthetic", video_id: null, published_at: null, watch_url: null },
        { title: "Synthetic recording B", text: "Keep the original context beside each candidate quote before editing.", start_seconds: 95.5, transcript_type: "synthetic", video_id: null, published_at: null, watch_url: null },
        { title: "Synthetic recording C", text: "A timestamped shortlist gives the editor a place to begin, not a finished cut.", start_seconds: 180, transcript_type: "synthetic", video_id: null, published_at: null, watch_url: null }
      ]
    };
  },
  packet() {
    return appsmith.store.arcmiraSourceSheet || this.fixture();
  },
  async demo() {
    return storeValue("arcmiraSourceSheet", this.fixture(), false);
  },
  async empty() {
    return storeValue("arcmiraSourceSheet", { ...this.fixture(), status: "demo_empty", candidates: [] }, false);
  },
  csv() {
    const packet = this.packet();
    const fields = ["is_synthetic", "query", "requested_after", "requested_before", "applied_window", "partial", "search_index", "coverage_note", "title", "text", "start_seconds", "transcript_type", "video_id", "published_at", "watch_url"];
    const cell = (value) => {
      let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
      if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = packet.candidates.map((candidate) => ({
      ...candidate,
      is_synthetic: packet.is_synthetic,
      query: packet.query,
      requested_after: packet.requested_window.after,
      requested_before: packet.requested_window.before,
      applied_window: packet.applied_window,
      partial: packet.partial,
      search_index: packet.search_index,
      coverage_note: packet.coverage_note
    }));
    return [fields.map(cell).join(","), ...rows.map((row) => fields.map((key) => cell(row[key])).join(","))].join("\r\n") + "\r\n";
  },
  async downloadCSV() {
    return download(this.csv(), "arcmira-synthetic-source-shortlist.csv", "text/csv");
  },
  async downloadJSON() {
    return download(JSON.stringify(this.packet(), null, 2), "arcmira-synthetic-source-shortlist.json", "application/json");
  }
};
