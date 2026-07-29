import { el, refreshIcons } from "../utils/dom-utils.js";
import { readFileAsDataURL, getFileExtension } from "../utils/file-utils.js";
import { toast } from "./toast.js";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg"];

function isJpeg(file) {
  const okType = file.type === "image/jpeg" || file.type === "";
  const okExtension = ACCEPTED_EXTENSIONS.includes(getFileExtension(file.name));
  return okType && okExtension;
}

/**
 * Square photo picker used on the Jovem form. Validates JPEG + 5MB max,
 * shows a live preview, and exposes the current value as a data URL string
 * (or null) so the page can read it when building the save payload.
 */
export function createPhotoUpload({ value = null, label = "Foto (JPEG, até 5MB)" } = {}) {
  let currentValue = value;

  const fileInput = el("input", { type: "file", accept: ".jpg,.jpeg,image/jpeg", class: "visually-hidden" });
  const img = el("img", { alt: "Foto do jovem", style: "width:100%;height:100%;object-fit:cover;border-radius:inherit;" });
  const placeholder = el("div", { class: "photo-square-placeholder" }, [
    el("i", { "data-lucide": "camera", class: "icon" }),
    el("span", {}, "Adicionar foto"),
  ]);
  const removeBtn = el("button", {
    type: "button",
    class: "photo-square-remove",
    "aria-label": "Remover foto",
    onClick: (e) => {
      e.stopPropagation();
      setValue(null);
    },
  }, [el("i", { "data-lucide": "x", class: "icon icon-sm" })]);

  const square = el(
    "div",
    { class: "photo-square", tabindex: "0", role: "button", "aria-label": label },
    [img, placeholder, removeBtn, fileInput]
  );

  function render() {
    if (currentValue) {
      img.src = currentValue;
      img.hidden = false;
      placeholder.hidden = true;
      removeBtn.hidden = false;
    } else {
      img.hidden = true;
      placeholder.hidden = false;
      removeBtn.hidden = true;
    }
    refreshIcons();
  }

  async function handleFile(file) {
    if (!file) return;
    if (!isJpeg(file)) {
      toast.error("Envie uma imagem em formato JPEG (.jpg/.jpeg).");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("A foto deve ter no máximo 5MB.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      setValue(dataUrl);
    } catch {
      toast.error("Não foi possível carregar a foto selecionada.");
    }
  }

  function setValue(next) {
    currentValue = next;
    render();
  }

  square.addEventListener("click", () => fileInput.click());
  square.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener("change", (e) => {
    handleFile(e.target.files[0]);
    fileInput.value = "";
  });
  square.addEventListener("dragover", (e) => {
    e.preventDefault();
    square.classList.add("dragover");
  });
  square.addEventListener("dragleave", () => square.classList.remove("dragover"));
  square.addEventListener("drop", (e) => {
    e.preventDefault();
    square.classList.remove("dragover");
    handleFile(e.dataTransfer.files[0]);
  });

  render();

  return {
    element: el("div", { class: "form-group photo-square-wrap" }, [el("label", {}, label), square]),
    getValue: () => currentValue,
    setValue,
  };
}
