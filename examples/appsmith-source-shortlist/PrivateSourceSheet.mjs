export default {
  request() {
    return { q: "creator economy", after: "2026-08-01", before: "2026-09-01", limit: 3 };
  },
  idle() {
    const request = this.request();
    return {
      is_synthetic: false,
      status: "idle",
      query: request.q,
      requested_window: { after: request.after, before: request.before },
      applied_window: null,
      partial: null,
      search_index: null,
      access: null,
      note: null,
      candidates: []
    };
  },
  packet() {
    return appsmith.store.arcmiraPrivateSourceSheet || this.idle();
  },
  async search() {
    const pending = { ...this.idle(), status: "loading" };
    await storeValue("arcmiraPrivateSourceSheet", pending, false);
    try {
      const response = await Arcmira_Search.run();
      if (!response || !Array.isArray(response.chunks) || response.chunks.length > 3 || typeof response.query !== "string") {
        throw new Error("Unexpected search response");
      }
      const candidates = response.chunks.map((chunk) => {
        if (!chunk || typeof chunk.text !== "string" || typeof chunk.video_id !== "string" || typeof chunk.watch_url !== "string" || !(chunk.start_seconds == null || (Number.isSafeInteger(chunk.start_seconds) && chunk.start_seconds >= 0))) {
          throw new Error("Unexpected passage");
        }
        const arcmiraUrl = !/[\u0000-\u0020\\]/u.test(chunk.watch_url) && (/^\/watch\?/u.test(chunk.watch_url) || /^https:\/\/arcmira\.com\/watch\?/u.test(chunk.watch_url))
          ? chunk.watch_url.startsWith("/") ? "https://arcmira.com" + chunk.watch_url : chunk.watch_url
          : null;
        const youtubeUrl = /^[A-Za-z0-9_-]{11}$/u.test(chunk.video_id)
          ? "https://www.youtube.com/watch?v=" + encodeURIComponent(chunk.video_id) + (chunk.start_seconds == null ? "" : "&t=" + chunk.start_seconds + "s")
          : null;
        return {
          id: chunk.id ?? null,
          title: chunk.video_title ?? null,
          text: chunk.text,
          start_seconds: chunk.start_seconds ?? null,
          transcript_type: chunk.source ?? null,
          source_label: chunk.source_label ?? null,
          video_id: chunk.video_id,
          channel_id: chunk.channel_id ?? null,
          channel_name: chunk.channel_name ?? null,
          published_at: chunk.published_at ?? null,
          watch_url: chunk.watch_url,
          arcmira_url: arcmiraUrl,
          original_source_url: youtubeUrl,
          speakers: chunk.speakers ?? [],
          cite_line: chunk.cite_line ?? null
        };
      });
      await storeValue("arcmiraPrivateSourceSheet", {
        ...pending,
        status: "ready",
        query: response.query,
        applied_window: response.window ?? null,
        partial: response.partial ?? null,
        search_index: response.search_index ?? null,
        access: response.access ?? null,
        note: response.note ?? null,
        candidates,
        raw_response: response
      }, false);
    } catch {
      await storeValue("arcmiraPrivateSourceSheet", {
        ...pending,
        status: "error",
        note: "Search failed. Check the query response and account access in the private editor before trying again. No previous results are displayed."
      }, false);
    }
    return this.packet();
  },
  summary() {
    const packet = this.packet();
    return "Status: " + packet.status + " | Passages: " + packet.candidates.length +
      " | Requested: " + JSON.stringify(packet.requested_window) +
      " | Applied: " + JSON.stringify(packet.applied_window) +
      " | Partial: " + JSON.stringify(packet.partial) +
      " | Search index: " + JSON.stringify(packet.search_index) +
      " | Access: " + JSON.stringify(packet.access) +
      " | " + (packet.note || (packet.status === "ready" ? "Search response received." : packet.status === "loading" ? "Search in progress." : "No search response yet."));
  },
  csv() {
    const packet = this.packet();
    const fields = ["is_synthetic", "query", "requested_after", "requested_before", "applied_window", "partial", "search_index", "access", "note", "title", "text", "start_seconds", "transcript_type", "source_label", "video_id", "channel_id", "channel_name", "published_at", "watch_url", "arcmira_url", "original_source_url", "speakers", "cite_line"];
    const cell = (value) => {
      let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
      if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };
    const rows = packet.candidates.map((candidate) => ({
      ...candidate,
      is_synthetic: false,
      query: packet.query,
      requested_after: packet.requested_window.after,
      requested_before: packet.requested_window.before,
      applied_window: packet.applied_window,
      partial: packet.partial,
      search_index: packet.search_index,
      access: packet.access,
      note: packet.note
    }));
    return [fields.map(cell).join(","), ...rows.map((row) => fields.map((key) => cell(row[key])).join(","))].join("\r\n") + "\r\n";
  },
  async downloadCSV() {
    return download(this.csv(), "arcmira-source-shortlist.csv", "text/csv");
  },
  async downloadJSON() {
    return download(JSON.stringify(this.packet(), null, 2), "arcmira-source-shortlist.json", "application/json");
  }
};
