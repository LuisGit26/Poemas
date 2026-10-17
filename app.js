
"use strict";

/* =========================================
   1. CONFIGURACIÓN DE SUPABASE
   ========================================= */

// Coloca aquí la URL real de tu proyecto Supabase.
const SUPABASE_URL = "PEGA_AQUI_LA_URL_DE_TU_PROYECTO";

// Utiliza solamente tu clave PUBLICABLE de Supabase.
// Nunca coloques una clave secreta o service_role aquí.
const SUPABASE_PUBLIC_KEY = "PEGA_AQUI_TU_CLAVE_PUBLICABLE";

const BUCKET_NAME = "poemas-imagenes";
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

/* =========================================
   2. POEMAS INCLUIDOS EN LA PÁGINA
   Estos poemas no necesitan SQL.
   ========================================= */

const POEMAS_INCLUIDOS = [
  {
    id: "poema-nunca-fui-su-destino",
    author: "Kiany",
    bio: "",
    title: "Nunca fui su destino",
    category: "Amor",
    text: `Me dispuse a jugar sabiendo que perdería,
le regalé mi corazón aún sabiendo que lo rompería,
le demostré todo lo que por él haría,
y él me demostró que no era a mí a quien quería.`,
    image: "",
    date: ""
  },
  {
    id: "poema-universo-en-tu-mirada",
    author: "Mikey",
    bio: "",
    title: "Universo en tu mirada",
    category: "Amor",
    text: `No hay nada más fascinante
que detenerse a observar a la persona correcta.
Eres el amor de mi vida
y no me canso de repetirlo,
porque cada vez que te veo me quedo sin aliento.
Tu belleza no tiene comparación en este mundo.
Eres como ese atardecer perfecto
que no solo ilumina el camino por el que camino,
sino que logra pausar el tiempo cuando me miras.
Cuando me sostienes la mirada,
entiendo que en tus ojos habita un universo entero.
Es como si todas las galaxias
y cada estrella brillante
hubieran coincidido en un solo punto,
únicamente para recordarme
la inmensa fortuna que tengo de coincidir contigo.
Eres mi sol,
la paz que calma mis tormentas
y mi mayor orgullo.
Te amo con esa intensidad
que supera los límites de mi propio pecho.
Y al final, de eso se trata la vida:
de elegir dónde permanecer.
Mi único deseo
es dedicar cada segundo
a demostrarte que eres
y siempre serás
lo más valioso que habita en mi historia. 🩷`,
    image: "",
    date: ""
  }
];

/* =========================================
   3. ELEMENTOS DE LA PÁGINA
   ========================================= */

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
let poems = [...POEMAS_INCLUIDOS];
let selectedImageFile = null;
let selectedImagePreviewUrl = "";
let loadingPoems = false;

/* =========================================
   4. FUNCIONES GENERALES
   ========================================= */

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
    author: row.autor || "Autor desconocido",
    bio: row.biografia || "",
    title: row.titulo || "Sin título",
    category: row.categoria || "Otros",
    text: row.contenido || "",
    image: row.imagen_url || "",
    date: row.creado_en || ""
  };
}

function showFormMessage(message, type = "") {
  if (!formMessage) return;

  formMessage.textContent = message;
  formMessage.className = "form-message";

  if (type) {
    formMessage.classList.add(type);
  }
}

function setLoading(isLoading) {
  loadingPoems = isLoading;

  if (submitButton) {
    submitButton.disabled = isLoading;
    submitButton.textContent = isLoading
      ? "Enviando..."
      : "Enviar poema ↗";
  }
}

function isSupabaseConfigured() {
  return SUPABASE_URL.startsWith("https://")
    && SUPABASE_URL.includes(".supabase.co")
    && !SUPABASE_URL.includes("PEGA_AQUI")
    && SUPABASE_PUBLIC_KEY.length > 20
    && !SUPABASE_PUBLIC_KEY.includes("PEGA_AQUI")
    && !SUPABASE_PUBLIC_KEY.startsWith("sb_secret_");
}

/* =========================================
   5. COMBINAR POEMAS LOCALES Y DE SUPABASE
   ========================================= */

function combinePoems(databasePoems = []) {
  const included = [...POEMAS_INCLUIDOS];

  const additionalPoems = databasePoems.filter((poem) => {
    const isDuplicate = included.some((localPoem) =>
      localPoem.title.trim().toLocaleLowerCase("es") ===
        poem.title.trim().toLocaleLowerCase("es")
      &&
      localPoem.author.trim().toLocaleLowerCase("es") ===
        poem.author.trim().toLocaleLowerCase("es")
    );

    return !isDuplicate;
  });

  return [...included, ...additionalPoems];
}

/* =========================================
   6. CARGAR POEMAS PUBLICADOS
   ========================================= */

async function loadPoems() {
  if (!loadMessage) return;

  loadMessage.textContent = "Cargando poemas...";
  loadMessage.hidden = false;

  try {
    const { data, error } = await db
      .from("poemas")
      .select(
        "id, autor, biografia, titulo, categoria, contenido, imagen_url, creado_en"
      )
      .eq("estado", "publicado")
      .order("creado_en", { ascending: false });

    if (error) throw error;

    const databasePoems = (data || []).map(normalizePoem);

    poems = combinePoems(databasePoems);

    renderPoems();
    renderAuthors();
    filterPoems();

    loadMessage.textContent =
      `Hay ${poems.length} poemas disponibles.`;
  } catch (error) {
    console.error("Error al cargar poemas:", error);

    // Aunque falle Supabase, los dos poemas incluidos
    // seguirán apareciendo en la página.
    poems = [...POEMAS_INCLUIDOS];

    renderPoems();
    renderAuthors();
    filterPoems();

    loadMessage.textContent =
      "Mostrando los poemas incluidos en la página. No se pudieron cargar los demás.";
  }
}

/* =========================================
   7. MOSTRAR TARJETAS DE POEMAS
   ========================================= */

function renderPoems(list = poems) {
  if (!poemGrid) return;

  poemGrid.innerHTML = list.map((poem) => {
    const poemText = String(poem.text || "");

    const excerpt = poemText.length > 190
      ? `${poemText.slice(0, 190).trim()}…`
      : poemText;

    const imageMarkup = poem.image
      ? `<div class="poem-card-image">
           <img
             src="${escapeHTML(poem.image)}"
             alt="Imagen del poema ${escapeHTML(poem.title)}"
             loading="lazy">
         </div>`
      : "";

    return `
      <article class="poem-card">
        ${imageMarkup}

        <div class="poem-card-body">
          <span class="poem-category">
            ${escapeHTML(poem.category)}
          </span>

          <h3>${escapeHTML(poem.title)}</h3>

          <p class="poem-excerpt">
            ${escapeHTML(excerpt)}
          </p>

          <div class="poem-card-footer">
            <button
              class="author-link"
              type="button"
              data-author="${escapeHTML(poem.author)}"
              title="Buscar poemas de este autor">
              ${escapeHTML(poem.author)}
            </button>

            <button
              class="read-link"
              type="button"
              data-read="${escapeHTML(poem.id)}">
              Leer poema ↗
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  if (emptyPoems) {
    emptyPoems.hidden = list.length > 0;
  }
}

/* =========================================
   8. MOSTRAR AUTORES
   ========================================= */

function getAuthors() {
  const authors = new Map();

  poems.forEach((poem) => {
    const name = String(poem.author || "Autor desconocido");
    const key = name.trim().toLocaleLowerCase("es");

    if (!authors.has(key)) {
      authors.set(key, {
        name,
        bio: poem.bio || "",
        poems: []
      });
    }

    const author = authors.get(key);
    author.poems.push(poem);

    if (!author.bio && poem.bio) {
      author.bio = poem.bio;
    }
  });

  return Array.from(authors.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es")
  );
}

function renderAuthors() {
  if (!authorGrid) return;

  const authors = getAuthors();
  const authorCount = $("#authorCount");

  if (authorCount) {
    authorCount.textContent =
      `${authors.length} ${authors.length === 1 ? "autor" : "autores"}`;
  }

  authorGrid.innerHTML = authors.map((author) => `
    <article class="author-card">
      <div class="author-avatar" aria-hidden="true">
        ${escapeHTML(initials(author.name))}
      </div>

      <h3>${escapeHTML(author.name)}</h3>

      <p>
        ${author.poems.length}
        ${author.poems.length === 1
          ? "poema publicado"
          : "poemas publicados"}
      </p>

      <button
        type="button"
        data-author="${escapeHTML(author.name)}">
        Ver sus poemas
      </button>
    </article>
  `).join("");
}

/* =========================================
   9. BUSCADOR Y FILTROS
   ========================================= */

function filterPoems() {
  if (!searchInput || !categoryFilter) {
    renderPoems();
    return;
  }

  const query = searchInput.value
    .trim()
    .toLocaleLowerCase("es");

  const category = categoryFilter.value;

  const filtered = poems.filter((poem) => {
    const matchesQuery = [
      poem.title,
      poem.author,
      poem.text,
      poem.category
    ].some((value) =>
      String(value || "")
        .toLocaleLowerCase("es")
        .includes(query)
    );

    const matchesCategory =
      !category || poem.category === category;

    return matchesQuery && matchesCategory;
  });

  renderPoems(filtered);
}

/* =========================================
   10. LECTURA COMPLETA DE UN POEMA
   ========================================= */

function openPoem(id) {
  const poem = poems.find(
    (item) => String(item.id) === String(id)
  );

  if (!poem || !readingDialog || !dialogContent) return;

  const imageMarkup = poem.image
    ? `<img
         class="dialog-poem-image"
         src="${escapeHTML(poem.image)}"
         alt="Imagen del poema ${escapeHTML(poem.title)}">`
    : "";

  dialogContent.innerHTML = `
    <span class="poem-category">
      ${escapeHTML(poem.category)}
    </span>

    <h2 class="dialog-poem-title">
      ${escapeHTML(poem.title)}
    </h2>

    <p class="dialog-author">
      Por ${escapeHTML(poem.author)}
      ${poem.date
        ? ` · ${escapeHTML(formatDate(poem.date))}`
        : ""}
    </p>

    ${imageMarkup}

    <div class="dialog-poem-text">${escapeHTML(poem.text)}</div>

    ${poem.bio
      ? `<p class="section-description">
           Sobre el autor: ${escapeHTML(poem.bio)}
         </p>`
      : ""}
  `;

  if (!readingDialog.open) {
    readingDialog.showModal();
  }
}

/* =========================================
   11. FILTRAR POR AUTOR
   ========================================= */

function filterByAuthor(name) {
  if (!searchInput || !categoryFilter) return;

  searchInput.value = name;
  categoryFilter.value = "";

  filterPoems();

  $("#poemas")?.scrollIntoView({
    behavior: "smooth"
  });
}

/* =========================================
   12. CONTROL DE IMÁGENES
   ========================================= */

function resetImageSelection() {
  if (selectedImagePreviewUrl) {
    URL.revokeObjectURL(selectedImagePreviewUrl);
  }

  selectedImagePreviewUrl = "";
  selectedImageFile = null;

  if (poemImageInput) poemImageInput.value = "";

  if (previewImage) {
    previewImage.removeAttribute("src");
  }

  if (imagePreview) {
    imagePreview.hidden = true;
  }
}

function validateImage(file) {
  if (!file) return true;

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    showFormMessage(
      "Elige una imagen JPG, PNG o WEBP.",
      "error"
    );
    return false;
  }

  if (file.size > MAX_IMAGE_SIZE) {
    showFormMessage(
      "La imagen supera el límite de 2 MB.",
      "error"
    );
    return false;
  }

  return true;
}

if (poemImageInput) {
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

    if (selectedImagePreviewUrl) {
      URL.revokeObjectURL(selectedImagePreviewUrl);
    }

    selectedImageFile = file;
    selectedImagePreviewUrl = URL.createObjectURL(file);

    if (previewImage) {
      previewImage.src = selectedImagePreviewUrl;
    }

    if (imagePreview) {
      imagePreview.hidden = false;
    }
  });
}

$("#removeImage")?.addEventListener(
  "click",
  resetImageSelection
);

/* =========================================
   13. SUBIR IMÁGENES A SUPABASE
   ========================================= */

async function uploadPoemImage(file) {
  if (!file) return null;

  const extensionByType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp"
  };

  const extension = extensionByType[file.type];

  if (!extension) {
    throw new Error("Formato de imagen no admitido.");
  }

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

/* =========================================
   14. ENVIAR POEMAS PARA REVISIÓN
   ========================================= */

if (poemForm) {
  poemForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (loadingPoems) return;

    if (!db) {
      showFormMessage(
        "Para enviar poemas, configura correctamente Supabase.",
        "error"
      );
      return;
    }

    const author = $("#authorName")?.value.trim() || "";
    const title = $("#poemTitle")?.value.trim() || "";
    const bio = $("#authorBio")?.value.trim() || "";
    const category = $("#poemCategory")?.value || "Otros";
    const text = $("#poemText")?.value.trim() || "";
    const file = selectedImageFile;

    if (!author || !title || !text) {
      showFormMessage(
        "Completa tu nombre, el título y el contenido del poema.",
        "error"
      );
      return;
    }

    if (
      author.length > 60 ||
      title.length > 100 ||
      text.length > 10000 ||
      bio.length > 250
    ) {
      showFormMessage(
        "Uno de los campos supera el límite permitido.",
        "error"
      );
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
        "No se pudo enviar el poema. Comprueba la conexión, la tabla, el almacenamiento y sus permisos de Supabase.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  });
}

/* =========================================
   15. EVENTOS DE BÚSQUEDA Y LECTURA
   ========================================= */

searchInput?.addEventListener("input", filterPoems);
categoryFilter?.addEventListener("change", filterPoems);

document.addEventListener("click", (event) => {
  const target = event.target;

  if (!(target instanceof Element)) return;

  const readButton = target.closest("[data-read]");

  if (readButton) {
    openPoem(readButton.dataset.read);
    return;
  }

  const authorButton = target.closest("[data-author]");

  if (authorButton) {
    filterByAuthor(authorButton.dataset.author);
  }
});

$("#closeDialog")?.addEventListener("click", () => {
  readingDialog?.close();
});

readingDialog?.addEventListener("click", (event) => {
  if (event.target === readingDialog) {
    readingDialog.close();
  }
});

/* =========================================
   16. MENÚ PARA CELULARES
   ========================================= */

const menuToggle = $("#menuToggle");
const navLinks = $("#navLinks");

menuToggle?.addEventListener("click", () => {
  if (!navLinks) return;

  const isOpen = navLinks.classList.toggle("open");

  menuToggle.setAttribute(
    "aria-expanded",
    String(isOpen)
  );

  menuToggle.setAttribute(
    "aria-label",
    isOpen ? "Cerrar menú" : "Abrir menú"
  );

  menuToggle.textContent = isOpen ? "×" : "☰";
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");

    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Abrir menú");

    if (menuToggle) menuToggle.textContent = "☰";
  });
});

/* =========================================
   17. INICIALIZAR LA PÁGINA
   ========================================= */

const currentYear = $("#currentYear");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

async function startApp() {
  // Mostrar inmediatamente los dos poemas incluidos.
  poems = [...POEMAS_INCLUIDOS];

  renderPoems();
  renderAuthors();
  filterPoems();

  if (!isSupabaseConfigured()) {
    if (loadMessage) {
      loadMessage.hidden = false;
      loadMessage.textContent =
        "Los poemas incluidos están disponibles. Configura Supabase para cargar y recibir más poemas.";
    }

    return;
  }

  try {
    if (!window.supabase?.createClient) {
      throw new Error(
        "No se encontró la biblioteca de Supabase. Revisa index.html."
      );
    }

    db = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLIC_KEY
    );

    await loadPoems();
  } catch (error) {
    console.error("No se pudo iniciar Supabase:", error);

    poems = [...POEMAS_INCLUIDOS];

    renderPoems();
    renderAuthors();
    filterPoems();

    if (loadMessage) {
      loadMessage.hidden = false;
      loadMessage.textContent =
        "Los poemas incluidos están disponibles. No se pudo conectar con Supabase.";
    }
  }
}

startApp();
