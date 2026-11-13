/**
 * ReliefStore loads the sample JSON files once, then keeps edits in
 * localStorage. Browser code cannot rewrite the original JSON files.
 * Use Export when a downloadable copy of the current records is needed.
 */
const ReliefStore = (() => {
  const FILES = {
    users: "users.json",
    requests: "relief_requests.json",
    areas: "priority_areas.json",
    routes: "delivery_routes.json",
    distributions: "distributions.json",
    inventory: "relief_inventory.json",
    activities: "activities.json"
  };

  const PREFIX = "rr_v1_";
  const SESSION_KEY = "rr_session_user";

  function dataUrl(file) {
    const path = window.location.pathname.replace(/\\/g, "/");
    const inPages = /\/pages\//.test(path);
    return (inPages ? "../" : "") + "data/" + file;
  }

  async function fetchJson(file) {
    let response;
    try {
      response = await fetch(dataUrl(file), { cache: "no-store" });
    } catch (error) {
      throw new Error("Could not load " + file + ". ");
    }
    if (!response.ok) {
      throw new Error("Could not load " + file + " (" + response.status + "). ");
    }
    return response.json();
  }

  async function seed(keys) {
    const entries = await Promise.all(
      keys.map(async (key) => {
        const data = await fetchJson(FILES[key]);
        if (!Array.isArray(data)) {
          throw new Error(FILES[key] + " must contain an array. ");
        }
        return [key, data];
      })
    );
    entries.forEach(([key, data]) => write(key, data));
  }

  async function init() {
    const missing = Object.keys(FILES).filter((key) => localStorage.getItem(PREFIX + key) == null);
    if (missing.length) await seed(missing);
  }

  async function restoreSamples() {
    Object.keys(FILES).forEach((key) => localStorage.removeItem(PREFIX + key));
    await seed(Object.keys(FILES));
  }

  function read(key) {
    if (!FILES[key]) throw new Error("Unknown collection: " + key);
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return [];
    try {
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  function write(key, records) {
    if (!FILES[key]) throw new Error("Unknown collection: " + key);
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(records));
    } catch (error) {
      throw new Error("The browser could not save these records. Storage may be full.");
    }
  }

  function getById(key, id) {
    return read(key).find((row) => row.id === id) || null;
  }

  function add(key, record) {
    const records = read(key);
    if (records.some((row) => row.id === record.id)) {
      throw new Error("A record with ID " + record.id + " already exists.");
    }
    records.push(record);
    write(key, records);
    return record;
  }

  function update(key, id, patch) {
    const records = read(key);
    const index = records.findIndex((row) => row.id === id);
    if (index === -1) throw new Error("Record " + id + " was not found.");
    records[index] = Object.assign({}, records[index], patch, { id: id });
    write(key, records);
    return records[index];
  }

  function remove(key, id) {
    const records = read(key);
    const next = records.filter((row) => row.id !== id);
    if (next.length === records.length) throw new Error("Record " + id + " was not found.");
    write(key, next);
  }

  function replaceAll(key, records, requiredFields, validateRow) {
    if (!Array.isArray(records)) {
      throw new Error("The JSON file must contain an array of records.");
    }
    const ids = new Set();
    records.forEach((row, index) => {
      if (!row || typeof row !== "object" || Array.isArray(row)) {
        throw new Error("Row " + (index + 1) + " is not an object.");
      }
      requiredFields.forEach((field) => {
        if (row[field] == null || String(row[field]).trim() === "") {
          throw new Error("Row " + (index + 1) + " is missing " + field + ".");
        }
      });
      if (ids.has(row.id)) throw new Error("Duplicate ID " + row.id + " in the import file.");
      ids.add(row.id);
      if (validateRow) {
        const message = validateRow(row, index);
        if (message) throw new Error(message);
      }
    });
    write(key, records);
  }

  function nextNumberedId(records, prefix, width) {
    const used = new Set(records.map((row) => row.id));
    const pattern = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)$");
    let max = 0;
    records.forEach((row) => {
      const match = String(row.id || "").match(pattern);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    });
    let number = max + 1;
    let id = prefix + String(number).padStart(width, "0");
    while (used.has(id)) {
      number += 1;
      id = prefix + String(number).padStart(width, "0");
    }
    return id;
  }

  function nextReference(records, field, prefix, width) {
    return nextNumberedId(
      records.map((row) => ({ id: row[field] })),
      prefix,
      width
    );
  }

  function logActivity(entry) {
    const activities = read("activities");
    const record = {
      id: nextNumberedId(activities, "ACT-", 3),
      at: new Date().toISOString(),
      actor: entry.actor || "System",
      action: entry.action,
      detail: entry.detail || "",
      module: entry.module || "system",
      barangay: entry.barangay || ""
    };
    activities.unshift(record);
    write("activities", activities.slice(0, 150));
    return record;
  }

  function download(filename, content, type) {
    const blob = new Blob([content], { type: type || "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toCsv(rows) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const escapeCell = (value) => {
      let text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
      if (/^[=+\-@]/.test(text)) text = "'" + text;
      if (/[",\n\r]/.test(text)) return '"' + text.replace(/"/g, '""') + '"';
      return text;
    };
    const lines = [headers.join(",")];
    rows.forEach((row) => {
      lines.push(headers.map((header) => escapeCell(row[header])).join(","));
    });
    return lines.join("\r\n");
  }

  function getSessionId() {
    return sessionStorage.getItem(SESSION_KEY);
  }

  function setSessionId(id) {
    sessionStorage.setItem(SESSION_KEY, id);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  return {
    init,
    restoreSamples,
    read,
    write,
    getById,
    add,
    update,
    remove,
    replaceAll,
    nextNumberedId,
    nextReference,
    logActivity,
    download,
    toCsv,
    getSessionId,
    setSessionId,
    clearSession
  };
})();
