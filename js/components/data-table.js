import { el, refreshIcons } from "../utils/dom-utils.js";
import { emptyState } from "./empty-state.js";

/**
 * columns: [{ key, label, sortable, render(row) -> string|Node }]
 * actions(row) -> array of { icon, label, onClick, className }
 */
export function renderDataTable(container, { columns, rows, actions, sort, onSortChange, emptyMessage = "Nenhum registro encontrado." }) {
  container.innerHTML = "";

  if (!rows.length) {
    container.appendChild(emptyState({ icon: "search-x", title: emptyMessage }));
    return;
  }

  const thead = el(
    "thead",
    {},
    el(
      "tr",
      {},
      [
        ...columns.map((col) => {
          const isSorted = sort?.key === col.key;
          const th = el(
            "th",
            {
              class: col.sortable === false ? "no-sort" + (isSorted ? " sorted" : "") : isSorted ? "sorted" : "",
              onClick: col.sortable === false ? undefined : () => onSortChange?.(col.key),
              scope: "col",
            },
            [col.label, col.sortable === false ? null : el("span", { class: "sort-indicator" }, isSorted ? (sort.dir === "asc" ? "▲" : "▼") : "↕")]
          );
          return th;
        }),
        actions ? el("th", { class: "no-sort", scope: "col" }, "Ações") : null,
      ].filter(Boolean)
    )
  );

  const tbody = el(
    "tbody",
    {},
    rows.map((row) =>
      el(
        "tr",
        {},
        [
          ...columns.map((col) => {
            const value = col.render ? col.render(row) : row[col.key];
            const td = el("td", { "data-label": col.label });
            if (value instanceof Node) td.appendChild(value);
            else td.innerHTML = value ?? "";
            return td;
          }),
          actions
            ? el(
                "td",
                { class: "col-actions", "data-label": "Ações" },
                actions(row).map((action) =>
                  el(
                    "button",
                    {
                      class: action.className || "btn btn-ghost btn-sm btn-icon",
                      type: "button",
                      "aria-label": action.label,
                      "data-tooltip": action.label,
                      onClick: () => action.onClick(row),
                    },
                    [el("i", { "data-lucide": action.icon, class: "icon icon-sm" })]
                  )
                )
              )
            : null,
        ].filter(Boolean)
      )
    )
  );

  const table = el("table", { class: "data-table cards-on-mobile" }, [thead, tbody]);
  container.appendChild(el("div", { class: "table-wrap" }, table));
  refreshIcons();
}

export function sortRows(rows, sort) {
  if (!sort?.key) return rows;
  const sorted = [...rows].sort((a, b) => {
    const va = a[sort.key];
    const vb = b[sort.key];
    if (va === vb) return 0;
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === "number" && typeof vb === "number") return va - vb;
    return String(va).localeCompare(String(vb), "pt-BR");
  });
  return sort.dir === "desc" ? sorted.reverse() : sorted;
}
