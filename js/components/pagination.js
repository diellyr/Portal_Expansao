import { el } from "../utils/dom-utils.js";
import { formatNumber } from "../utils/formatters.js";

export function renderPagination(container, { page, pageSize, total, onPageChange }) {
  container.innerHTML = "";
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  const controls = el("div", { class: "pagination-controls" }, [
    el("button", { type: "button", disabled: page === 1 || undefined, "aria-label": "Página anterior", onClick: () => onPageChange(page - 1) }, "‹"),
  ]);

  const maxButtons = 5;
  let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  startPage = Math.max(1, endPage - maxButtons + 1);

  for (let p = startPage; p <= endPage; p++) {
    controls.appendChild(
      el(
        "button",
        { type: "button", class: p === page ? "active" : "", "aria-current": p === page ? "page" : undefined, onClick: () => onPageChange(p) },
        String(p)
      )
    );
  }

  controls.appendChild(
    el("button", { type: "button", disabled: page === totalPages || undefined, "aria-label": "Próxima página", onClick: () => onPageChange(page + 1) }, "›")
  );

  container.appendChild(
    el("div", { class: "pagination" }, [
      el("span", { class: "pagination-info" }, `Mostrando ${formatNumber(start)}–${formatNumber(end)} de ${formatNumber(total)}`),
      controls,
    ])
  );
}
