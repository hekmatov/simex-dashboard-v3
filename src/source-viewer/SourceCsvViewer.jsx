import React from "react";
import Papa from "papaparse";

import {
  SOURCE_VIEWER_LOAD,
  SOURCE_VIEWER_READY,
  SOURCE_VIEWER_VERSION,
} from "../components/source-data/sourceViewerProtocol.js";
import {
  nextSourceSort,
  sortSourceRows,
} from "./sourceViewerSort.js";

const PAGE_SIZE = 100;

export default function SourceCsvViewer() {
  const [state, setState] = React.useState({
    status: "waiting",
    descriptor: null,
    columns: [],
    rows: [],
    error: "",
  });
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);
  const [sort, setSort] = React.useState(null);

  React.useEffect(() => {
    let loaded = false;
    const announce = () => {
      if (loaded) return;
      window.opener?.postMessage({
        type: SOURCE_VIEWER_READY,
        version: SOURCE_VIEWER_VERSION,
      }, window.location.origin);
    };
    const handleMessage = async (event) => {
      if (
        event.origin !== window.location.origin
        || event.source !== window.opener
        || event.data?.type !== SOURCE_VIEWER_LOAD
      ) {
        return;
      }
      loaded = true;
      const descriptor = event.data.descriptor;
      setState((current) => ({
        ...current,
        status: "loading",
        descriptor,
        error: "",
      }));
      setQuery("");
      setPage(0);
      setSort(null);
      try {
        const csvText = await sourceText(descriptor);
        const parsed = Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });
        if (parsed.errors.length > 0) {
          throw new Error(parsed.errors[0].message);
        }
        const columns = parsed.meta.fields ?? Object.keys(parsed.data[0] ?? {});
        setState({
          status: "ready",
          descriptor,
          columns,
          rows: parsed.data,
          error: "",
        });
      } catch (error) {
        setState({
          status: "error",
          descriptor,
          columns: [],
          rows: [],
          error: boundedMessage(error),
        });
      }
    };
    window.addEventListener("message", handleMessage);
    announce();
    const interval = window.setInterval(announce, 350);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const queryLower = query.trim().toLocaleLowerCase();
  const filteredRows = React.useMemo(() => (
    queryLower
      ? state.rows.filter((row) => state.columns.some((column) => (
          String(row?.[column] ?? "")
            .toLocaleLowerCase()
            .includes(queryLower)
        )))
      : state.rows
  ), [queryLower, state.columns, state.rows]);
  const sortedRows = React.useMemo(
    () => sortSourceRows(filteredRows, sort),
    [filteredRows, sort],
  );
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visibleRows = sortedRows.slice(start, start + PAGE_SIZE);

  return React.createElement(
    "main",
    { className: "source-viewer-shell" },
    React.createElement(
      "header",
      { className: "source-viewer-header" },
      React.createElement("p", { className: "source-viewer-eyebrow" }, "Source data"),
      React.createElement(
        "h1",
        null,
        state.descriptor?.label ?? "Waiting for source",
      ),
      state.descriptor?.sourceId
        ? React.createElement("p", null, state.descriptor.sourceId)
        : null,
    ),
    state.status === "waiting"
      ? React.createElement("p", { role: "status" }, "Waiting for source data…")
      : null,
    state.status === "loading"
      ? React.createElement("p", { role: "status" }, "Loading and parsing the CSV…")
      : null,
    state.status === "error"
      ? React.createElement(
          "section",
          { className: "source-viewer-error", role: "alert" },
          React.createElement("h2", null, "The CSV could not be displayed"),
          React.createElement("p", null, state.error),
        )
      : null,
    state.status === "ready"
      ? React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            { className: "source-viewer-toolbar" },
            React.createElement(
              "label",
              null,
              React.createElement("span", null, "Search all columns"),
              React.createElement("input", {
                type: "search",
                value: query,
                onChange: (event) => {
                  setQuery(event.target.value);
                  setPage(0);
                },
              }),
            ),
            React.createElement(
              "p",
              null,
              `${filteredRows.length.toLocaleString()} of ${state.rows.length.toLocaleString()} rows`,
            ),
          ),
          React.createElement(
            "div",
            { className: "source-viewer-table-wrap" },
            React.createElement(
              "table",
              null,
              React.createElement(
                "thead",
                null,
                React.createElement(
                  "tr",
                  null,
                  state.columns.map((column) => React.createElement(
                    "th",
                    {
                      key: column,
                      scope: "col",
                      "aria-sort": ariaSortForColumn(sort, column),
                    },
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        className: "source-viewer-sort-button",
                        "data-sort-direction": sort?.column === column
                          ? sort.direction
                          : "source",
                        "aria-label": nextSortLabel(sort, column),
                        onClick: () => {
                          setSort((current) => nextSourceSort(current, column));
                          setPage(0);
                        },
                      },
                      React.createElement("span", null, column),
                      React.createElement("span", { "aria-hidden": "true" }, sortGlyph(sort, column)),
                    ),
                  )),
                ),
              ),
              React.createElement(
                "tbody",
                null,
                visibleRows.map((row, rowIndex) => React.createElement(
                  "tr",
                  { key: start + rowIndex },
                  state.columns.map((column) => React.createElement(
                    "td",
                    { key: column },
                    displayValue(row?.[column]),
                  )),
                )),
              ),
            ),
          ),
          React.createElement(
            "footer",
            { className: "source-viewer-pagination" },
            React.createElement(
              "button",
              {
                type: "button",
                disabled: currentPage === 0,
                onClick: () => setPage((value) => Math.max(0, value - 1)),
              },
              "Previous",
            ),
            React.createElement(
              "span",
              null,
              filteredRows.length === 0
                ? "No matching rows"
                : `${(start + 1).toLocaleString()}–${Math.min(
                    start + PAGE_SIZE,
                    filteredRows.length,
                  ).toLocaleString()} of ${filteredRows.length.toLocaleString()}`,
            ),
            React.createElement(
              "button",
              {
                type: "button",
                disabled: currentPage >= pageCount - 1,
                onClick: () => setPage((value) => Math.min(pageCount - 1, value + 1)),
              },
              "Next",
            ),
          ),
        )
      : null,
  );
}

async function sourceText(descriptor) {
  if (descriptor?.version !== SOURCE_VIEWER_VERSION) {
    throw new Error("Unsupported source-viewer message.");
  }
  if (descriptor.mode === "text" && typeof descriptor.csvText === "string") {
    return descriptor.csvText;
  }
  if (descriptor.mode === "path" && typeof descriptor.path === "string") {
    const response = await fetch(descriptor.path);
    if (!response.ok) {
      throw new Error(`Could not load the CSV (${response.status}).`);
    }
    return response.text();
  }
  throw new Error("This source has no CSV file to display.");
}

function displayValue(value) {
  if (value === null) return "null";
  if (value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function ariaSortForColumn(sort, column) {
  if (sort?.column !== column) return "none";
  return sort.direction === "asc" ? "ascending" : "descending";
}

function nextSortLabel(sort, column) {
  if (sort?.column !== column) return `Sort ${column} ascending`;
  if (sort.direction === "asc") return `Sort ${column} descending`;
  return `Restore ${column} to source order`;
}

function sortGlyph(sort, column) {
  if (sort?.column !== column) return "↕";
  return sort.direction === "asc" ? "↑" : "↓";
}

function boundedMessage(error) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.trim() || "The source data could not be loaded.";
  return normalized.length <= 240
    ? normalized
    : `${normalized.slice(0, 239)}…`;
}
