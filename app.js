
"use strict";

/*
  CONFIGURACIÓN DE SUPABASE
  Reemplaza estos dos valores con los de tu propio proyecto.
  Utiliza la clave publicable (publishable key) o la clave anon
  heredada si tu proyecto todavía la utiliza.
  NUNCA pongas aquí la clave service_role ni una clave secreta.
*/
const SUPABASE_URL = "https://uexxpfgldprrkfndgudm.supabase.co/rest/v1/";
const SUPABASE_PUBLIC_KEY = "sb_publishable_jnlmw7DeY4m76F7sIFzGuQ_pk-7czoi";

const BUCKET_NAME = "poemas-imagenes";
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const $ = (selector) => document.querySelector(selector);

const poemGrid = $("#poemGrid");
const authorGrid = $("#authorGrid");
const emptyPoems = $("#emptyPoems");
const loadMessage = $("#loadMessage");
const poemForm = $("#poemForm");
const poemImageInput = $("#poemImage");
const imagePreview = $("#imagePreview");
const previewImage = $("#previewImage");
const formMessage = $("#formMessage");
const submitButton = $("#submitButton");
const readingDialog = $("#readingDialog");
const dialogContent = $("#dialogContent");
const searchInput = $("#searchInput");
const categoryFilter = $("#categoryFilter");

let db = null;
let poems = [];
let selectedImageFile = null;
let selectedImagePreviewUrl = "";
let loadingPoems = false;

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function initials(name) {
  return String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function normalizePoem(row) {
  return {
    id: row.id,
    author: row.autor,
    bio: row.biografia || "",
    title: row.titulo,
    category: row.categoria || "Otros",
    text: row.contenido,
    image: row.imagen_url || "",
    date: row.creado_en
  };
}

function showFormMessage(message, type = "") {
  formMessage.textContent = message;
  formMessage.className = "form-message";
  if (type) formMessage.classList.add(type);
}

function setLoading(isLoading) {
  loadingPoems = isLoading;
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "Enviando..." : "Enviar poema ↗";
}

function isSupabaseConfigured() {
  return SUPABASE_URL.startsWith("https://")
    && !SUPABASE_URL.includes("PEGA_AQUI")
    && SUPABASE_PUBLIC_KEY.length > 20
    && !SUPABASE_PUBLIC_KEY.includes("PEGA_AQUI");
}

/* Obtener los poemas aprobados de la base de datos */
async function loadPoems() {
  loadMessage.textContent = "Cargando poemas...";
  loadMessage.hidden = false;

  try {
    const { data, error } = await db
      .from("poemas")
      .select("id, autor, biografia, titulo, categoria, contenido, imagen_url, creado_en")
      .eq("estado", "publicado")
      .order("creado_en", { ascending: false });

    if (error) throw error;

    poems = (data || []).map(normalizePoem);
    renderPoems();
    renderAuthors();
    filterPoems();
    loadMessage.textContent = poems.length
      ? `Hay ${poems.length} poema${poems.length === 1 ? "" : "s"} publicado${poems.length === 1 ? "" : "s"}.`
      : "Todavía no hay poemas publicados. ¡Puedes enviar el primero!";
  } catch (error) {
    console.error("Error al cargar poemas:", error);
    loadMessage.textContent =
      "No pudimos cargar los poemas. Revisa la configuración de Supabase y vuelve a intentarlo.";
    poems = [];
    renderPoems();
    renderAuthors();
    filterPoems();
  }
}

/* Crear las tarjetas de poemas */
function renderPoems(list = poems) {
  if (!poemGrid) return;

  poemGrid.innerHTML = list.map((poem) => {
    const excerpt = poem.text.length > 190
      ? `${poem.text.slice(0, 190).trim()}…`
      : poem.text;

    const imageMarkup = poem.image
      ? `<div class="poem-card-image">
           <img src="${escapeHTML(poem.image)}"
                alt="Imagen del poema ${escapeHTML(poem.title)}"
                loading="lazy">
         </div>`
      : "";

    return `
      <article class="poem-card">
        ${imageMarkup}
        <div class="poem-card-body">
          <span class="poem-category">${escapeHTML(poem.category)}</span>
          <h3>${escapeHTML(poem.title)}</h3>
          <p class="poem-excerpt">${escapeHTML(excerpt)}</p>
          <div class="poem-card-footer">
            <button class="author-link" type="button"
                    data-author="${escapeHTML(poem.author)}"
                    title="Buscar poemas de este autor">
              ${escapeHTML(poem.author)}
            </button>
            <button class="read-link" type="button" data-read="${escapeHTML(poem.id)}">
              Leer poema ↗
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  emptyPoems.hidden = list.length > 0;
}

/* Agrupar poemas por autor */
function getAuthors() {
  const authors = new Map();

  poems.forEach((poem) => {
    const key = poem.author.trim().toLocaleLowerCase("es");
    if (!authors.has(key)) {
      authors.set(key, {
        name: poem.author,
        bio: poem.bio,
        poems: []
      });
    }

    const author = authors.get(key);
    author.poems.push(poem);
    if (!author.bio && poem.bio) author.bio = poem.bio;
  });

  return Array.from(authors.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es")
  );
}

function renderAuthors() {
  const authors = getAuthors();
  $("#authorCount").textContent =
    `${authors.length} ${authors.length === 1 ? "autor" : "autores"}`;

  authorGrid.innerHTML = authors.map((author) => `
    <article class="author-card">
      <div class="author-avatar" aria-hidden="true">
        ${escapeHTML(initials(author.name))}
      </div>
      <h3>${escapeHTML(author.name)}</h3>
      <p>${author.poems.length} ${author.poems.length === 1 ? "poema publicado" : "poemas publicados"}</p>
      <button type="button" data-author="${escapeHTML(author.name)}">
        Ver sus poemas
      </button>
    </article>
  `).join("");
}

/* Búsqueda por título, texto, autor y categoría */
function filterPoems() {
  const query = searchInput.value.trim().toLocaleLowerCase("es");
  const category = categoryFilter.value;

  const filtered = poems.filter((poem) => {
    const matchesQuery = [
      poem.title,
      poem.author,
      poem.text,
      poem.category
    ].some((value) =>
      String(value).toLocaleLowerCase("es").includes(query)
    );

    const matchesCategory = !category || poem.category === category;
    return matchesQuery && matchesCategory;
  });

  renderPoems(filtered);
}

/* Mostrar un poema completo en la ventana de lectura */
function openPoem(id) {
  const poem = poems.find((item) => String(item.id) === String(id));
  if (!poem) return;

  const imageMarkup = poem.image
    ? `<img class="dialog-poem-image" src="${escapeHTML(poem.image)}"
         alt="Imagen del poema ${escapeHTML(poem.title)}">`
    : "";

  dialogContent.innerHTML = `
    <span class="poem-category">${escapeHTML(poem.category)}</span>
    <h2 class="dialog-poem-title">${escapeHTML(poem.title)}</h2>
    <p class="dialog-author">Por ${escapeHTML(poem.author)}
      ${poem.date ? ` · ${escapeHTML(formatDate(poem.date))}` : ""}
    </p>
    ${imageMarkup}
    <div class="dialog-poem-text">${escapeHTML(poem.text)}</div>
    ${poem.bio ? `<p class="section-description">Sobre el autor: ${escapeHTML(poem.bio)}</p>` : ""}
  `;

  if (!readingDialog.open) readingDialog.showModal();
}

function filterByAuthor(name) {
  searchInput.value = name;
  categoryFilter.value = "";
  filterPoems();
  $("#poemas").scrollIntoView({ behavior: "smooth" });
}

function resetImageSelection() {
  if (selectedImagePreviewUrl) {
    URL.revokeObjectURL(selectedImagePreviewUrl);
  }

  selectedImagePreviewUrl = "";
  selectedImageFile = null;
  poemImageInput.value = "";
  previewImage.removeAttribute("src");
  imagePreview.hidden = true;
}

function validateImage(file) {
  if (!file) return true;

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    showFormMessage("Elige una imagen JPG, PNG o WEBP.", "error");
    return false;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    showFormMessage("La imagen supera el límite de 2 MB.", "error");
    return false;
  }

  return true;
}

/* Vista previa de imagen */
poemImageInput.addEventListener("change", () => {
  const file = poemImageInput.files?.[0];
  showFormMessage("");

  if (!file) {
    resetImageSelection();
    return;
  }

  if (!validateImage(file)) {
    resetImageSelection();
    return;
  }

  if (selectedImagePreviewUrl) URL.revokeObjectURL(selectedImagePreviewUrl);
  selectedImageFile = file;
  selectedImagePreviewUrl = URL.createObjectURL(file);
  previewImage.src = selectedImagePreviewUrl;
  imagePreview.hidden = false;
});

$("#removeImage").addEventListener("click", resetImageSelection);

/* Subir la imagen seleccionada a Supabase Storage */
async function uploadPoemImage(file) {
  if (!file) return null;

  const extensionByType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  const extension = extensionByType[file.type];
  if (!extension) throw new Error("Formato de imagen no admitido.");

  const safeRandomId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const filePath = `${safeRandomId}.${extension}`;

  const { error: uploadError } = await db.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });

  if (uploadError) throw uploadError;

  const { data } = db.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/* Enviar poema: siempre queda pendiente de revisión */
poemForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (loadingPoems) return;

  if (!db) {
    showFormMessage("Primero configura la URL y la clave de Supabase en app.js.", "error");
    return;
  }

  const author = $("#authorName").value.trim();
  const title = $("#poemTitle").value.trim();
  const bio = $("#authorBio").value.trim();
  const category = $("#poemCategory").value;
  const text = $("#poemText").value.trim();
  const file = selectedImageFile;

  if (!author || !title || !text) {
    showFormMessage("Completa tu nombre, el título y el contenido del poema.", "error");
    return;
  }

  if (author.length > 60 || title.length > 100 || text.length > 10000 || bio.length > 250) {
    showFormMessage("Uno de los campos supera el límite permitido.", "error");
    return;
  }

  if (file && !validateImage(file)) return;

  setLoading(true);
  showFormMessage("Enviando tu poema. Espera un momento...");

  try {
    const imageUrl = await uploadPoemImage(file);

    const { error } = await db.from("poemas").insert({
      autor: author,
      biografia: bio,
      titulo: title,
      categoria: category,
      contenido: text,
      imagen_url: imageUrl,
      estado: "pendiente"
    });

    if (error) throw error;

    poemForm.reset();
    resetImageSelection();
    showFormMessage(
      "¡Poema enviado! Está pendiente de revisión. Aparecerá para todos cuando sea aprobado.",
      "success"
    );
  } catch (error) {
    console.error("Error al enviar poema:", error);
    showFormMessage(
      "No se pudo enviar el poema. Comprueba la conexión, la tabla, el bucket y sus permisos de Supabase.",
      "error"
    );
  } finally {
    setLoading(false);
  }
});

/* Eventos de búsqueda, lectura y autores */
searchInput.addEventListener("input", filterPoems);
categoryFilter.addEventListener("change", filterPoems);

document.addEventListener("click", (event) => {
  const readButton = event.target.closest("[data-read]");
  if (readButton) {
    openPoem(readButton.dataset.read);
    return;
  }

  const authorButton = event.target.closest("[data-author]");
  if (authorButton) {
    filterByAuthor(authorButton.dataset.author);
  }
});

$("#closeDialog").addEventListener("click", () => readingDialog.close());

readingDialog.addEventListener("click", (event) => {
  if (event.target === readingDialog) readingDialog.close();
});

/* Menú para celulares */
const menuToggle = $("#menuToggle");
const navLinks = $("#navLinks");

menuToggle.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  menuToggle.textContent = isOpen ? "×" : "☰";
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    menuToggle.textContent = "☰";
  });
});

$("#currentYear").textContent = new Date().getFullYear();

/* Inicialización */
async function startApp() {
  if (!isSupabaseConfigured()) {
    loadMessage.textContent =
      "Configura SUPABASE_URL y SUPABASE_PUBLIC_KEY en app.js para cargar los poemas compartidos.";
    $("#authorCount").textContent = "0 autores";
    renderPoems([]);
    renderAuthors();
    return;
  }

  try {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
    await loadPoems();
  } catch (error) {
    console.error("No se pudo iniciar Supabase:", error);
    loadMessage.textContent = "No se pudo conectar con la base de datos. Revisa la configuración.";
  }
}

startApp();
