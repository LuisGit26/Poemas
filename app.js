
"use strict";

const STORAGE_KEY = "versos_poemas_v1";

const defaultPoems = [
  {
    id: "demo-1",
    author: "Elena Martínez",
    bio: "Escribe sobre el amor, los pequeños detalles y las emociones que nos hacen humanos.",
    title: "Donde nace la luz",
    category: "Esperanza",
    text: "Cuando la noche se alarga\n y parece no terminar,\nsiempre hay una pequeña estrella\nque nos invita a continuar.\n\nPorque incluso en los días grises,\ncuando cuesta volver a creer,\nel alma encuentra nuevos caminos\ny aprende de nuevo a florecer.",
    image: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=80",
    date: "2026-10-12"
  },
  {
    id: "demo-2",
    author: "Mateo Rivera",
    bio: "Poeta aficionado a la naturaleza, los paisajes y la belleza de la vida cotidiana.",
    title: "El idioma de los árboles",
    category: "Naturaleza",
    text: "Los árboles hablan despacio,\ncon palabras de viento y de sol.\nGuardan historias en sus ramas\ny mil secretos en su interior.\n\nNo necesitan grandes discursos\npara enseñarnos a permanecer:\nse aferran a la tierra en silencio\ny nunca se cansan de crecer.",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=80",
    date: "2026-10-10"
  },
  {
    id: "demo-3",
    author: "Lucía Fernández",
    bio: "Encuentra inspiración en los recuerdos, la nostalgia y las historias que deja el tiempo.",
    title: "Cartas que nunca envié",
    category: "Nostalgia",
    text: "Escribí tu nombre en hojas\nque el tiempo quiso llevar,\nguardé palabras y silencios\nque no supe pronunciar.\n\nHoy ya no espero respuestas,\nni promesas por cumplir;\nsolo agradezco el recuerdo\nde lo que aprendí a sentir.",
    image: "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=80",
    date: "2026-10-08"
  },
  {
    id: "demo-4",
    author: "Daniel Torres",
    bio: "Escribe versos de reflexión sobre el crecimiento personal y las decisiones de la vida.",
    title: "El valor de detenerse",
    category: "Reflexión",
    text: "No todo camino es carrera,\nni toda pausa es retroceder.\nA veces descansar un momento\nes la manera de volver a ver.\n\nMira el cielo, escucha el viento,\nrecuerda lo que importa de verdad;\nla vida no siempre pide respuestas,\na veces solo pide respirar.",
    image: "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=900&q=80",
    date: "2026-10-06"
  },
  {
    id: "demo-5",
    author: "Elena Martínez",
    bio: "Escribe sobre el amor, los pequeños detalles y las emociones que nos hacen humanos.",
    title: "La forma de quererte",
    category: "Amor",
    text: "No quiero promesas eternas,\nni palabras de cristal;\nquiero la paz de tu presencia\ny la verdad de tu mirar.\n\nQuiero los días sencillos,\nlas conversaciones sin final,\ny descubrir que en lo pequeño\nvive lo extraordinario del amar.",
    image: "https://images.unsplash.com/photo-1474552226712-ac0f0961a954?auto=format&fit=crop&w=900&q=80",
    date: "2026-10-04"
  },
  {
    id: "demo-6",
    author: "Mateo Rivera",
    bio: "Poeta aficionado a la naturaleza, los paisajes y la belleza de la vida cotidiana.",
    title: "Un nuevo comienzo",
    category: "Esperanza",
    text: "Cada mañana abre una puerta,\ncada amanecer trae una señal;\nno importa cuántas veces caigas,\nsiempre puedes volver a empezar.\n\nQue tus pasos busquen caminos,\nque tus sueños aprendan a andar;\nporque el futuro no está escrito\ny aún hay mucho por contar.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    date: "2026-10-02"
  }
];

const $ = (selector) => document.querySelector(selector);

const poemGrid = $("#poemGrid");
const authorGrid = $("#authorGrid");
const searchInput = $("#searchInput");
const categoryFilter = $("#categoryFilter");
const poemForm = $("#poemForm");
const poemImageInput = $("#poemImage");
const imagePreview = $("#imagePreview");
const imagePreviewWrap = $("#imagePreviewWrap");
const formMessage = $("#formMessage");
const authorProfile = $("#authorProfile");
const authorProfileContent = $("#authorProfileContent");
const readingDialog = $("#readingDialog");

let selectedImage = "";
let activeAuthor = null;
let poems = loadPoems();

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function loadPoems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed.filter((item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.author === "string" &&
          typeof item.title === "string" &&
          typeof item.text === "string"
        );
      }
    }
  } catch (error) {
    console.warn("No se pudieron recuperar las publicaciones.", error);
  }

  return [...defaultPoems];
}

function savePoems() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(poems));
    return true;
  } catch (error) {
    console.error("No se pudieron guardar los poemas.", error);
    return false;
  }
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

function getAuthors() {
  const authors = new Map();

  poems.forEach((poem) => {
    const key = poem.author.trim().toLocaleLowerCase("es");

    if (!authors.has(key)) {
      authors.set(key, {
        name: poem.author.trim(),
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

  return [...authors.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "es")
  );
}

function renderPoems(list = poems, target = poemGrid) {
  if (!target) return;

  if (!list.length) {
    target.innerHTML = "";
    return;
  }

  target.innerHTML = list.map((poem) => {
    const image = poem.image || "";
    const imageMarkup = image
      ? `<img src="${escapeHTML(image)}" alt="Imagen del poema ${escapeHTML(poem.title)}" loading="lazy">`
      : "";

    const excerpt = poem.text.split(/\n+/)
      .filter(Boolean)
      .slice(0, 3)
      .join("\n");

    return `
      <article class="poem-card">
        <div class="poem-card-image">
          ${imageMarkup}
          <span class="poem-category">${escapeHTML(poem.category || "Otros")}</span>
        </div>
        <div class="poem-card-body">
          <h3>${escapeHTML(poem.title)}</h3>
          <p class="poem-author">Por ${escapeHTML(poem.author)}</p>
          <p class="poem-excerpt">${escapeHTML(excerpt)}</p>
          <div class="poem-card-footer">
            <span class="small-date">${escapeHTML(formatDate(poem.date))}</span>
            <button class="read-link" data-read="${escapeHTML(poem.id)}">
              Leer poema ↗
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderAuthors() {
  const authors = getAuthors();

  $("#authorCount").textContent =
    `${authors.length} ${authors.length === 1 ? "autor" : "autores"}`;

  authorGrid.innerHTML = authors.map((author) => {
    const count = author.poems.length;

    return `
      <article class="author-card">
        <div class="author-avatar" aria-hidden="true">
          ${escapeHTML(initials(author.name))}
        </div>
        <div class="author-info">
          <h3>${escapeHTML(author.name)}</h3>
          <p>${escapeHTML(author.bio || "Autor de nuestra comunidad literaria.")}</p>
          <p>${count} ${count === 1 ? "poema publicado" : "poemas publicados"}</p>
          <button class="author-open" data-author="${escapeHTML(author.name)}">
            Visitar su espacio ↗
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function showAuthor(name) {
  const author = getAuthors().find((item) =>
    item.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es")
  );

  if (!author) return;

  activeAuthor = author.name;
  authorProfile.classList.remove("hidden");
  $("#autores").classList.add("hidden");
  $("#poemas").classList.add("hidden");
  $("#biblioteca").classList.add("hidden");
  $("#publicar").classList.add("hidden");

  authorProfileContent.innerHTML = `
    <div class="profile-banner">
      <div class="author-avatar" aria-hidden="true">
        ${escapeHTML(initials(author.name))}
      </div>
      <div>
        <span class="eyebrow">ESPACIO DE AUTOR</span>
        <h2>${escapeHTML(author.name)}</h2>
        <p>${escapeHTML(author.bio || "Un autor que comparte sus palabras con nuestra comunidad.")}</p>
        <p>${author.poems.length} ${author.poems.length === 1 ? "poema" : "poemas"} en su colección</p>
      </div>
    </div>
    <h3 class="profile-subtitle">Poemas de ${escapeHTML(author.name)}</h3>
    <div class="poem-grid" id="authorPoemGrid"></div>
    <p class="empty-state ${author.poems.length ? "hidden" : ""}">
      Este autor todavía no tiene poemas.
    </p>
  `;

  renderPoems(author.poems, $("#authorPoemGrid"));
  authorProfile.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeAuthor() {
  activeAuthor = null;
  authorProfile.classList.add("hidden");
  $("#autores").classList.remove("hidden");
  $("#poemas").classList.remove("hidden");
  $("#biblioteca").classList.remove("hidden");
  $("#publicar").classList.remove("hidden");
}

function openPoem(id) {
  const poem = poems.find((item) => item.id === id);

  if (!poem) return;

  const imageMarkup = poem.image
    ? `<img src="${escapeHTML(poem.image)}" alt="Imagen de ${escapeHTML(poem.title)}">`
    : "";

  $("#readingContent").innerHTML = `
    <div class="reading-content">
      ${imageMarkup}
      <span class="eyebrow">${escapeHTML(poem.category || "Poesía")}</span>
      <h2>${escapeHTML(poem.title)}</h2>
      <p class="poem-author">Por ${escapeHTML(poem.author)}</p>
      <p class="full-poem">${escapeHTML(poem.text)}</p>
      <p class="small-date">${escapeHTML(formatDate(poem.date))}</p>
      <button class="text-link" data-author="${escapeHTML(poem.author)}">
        Conocer al autor ↗
      </button>
    </div>
  `;

  if (typeof readingDialog.showModal === "function") {
    readingDialog.showModal();
  } else {
    readingDialog.setAttribute("open", "");
  }
}

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
      String(value || "").toLocaleLowerCase("es").includes(query)
    );

    const matchesCategory = !category || poem.category === category;

    return matchesQuery && matchesCategory;
  });

  renderPoems(filtered);
  $("#emptyPoems").classList.toggle("hidden", filtered.length > 0);
}

function showImagePreview(dataUrl) {
  selectedImage = dataUrl;
  imagePreview.src = dataUrl;
  imagePreviewWrap.classList.remove("hidden");
}

function removeSelectedImage() {
  selectedImage = "";
  poemImageInput.value = "";
  imagePreview.removeAttribute("src");
  imagePreviewWrap.classList.add("hidden");
}

poemImageInput.addEventListener("change", () => {
  const file = poemImageInput.files[0];

  if (!file) {
    removeSelectedImage();
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    removeSelectedImage();
    formMessage.textContent = "Selecciona una imagen JPG, PNG o WebP.";
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    removeSelectedImage();
    formMessage.textContent = "La imagen supera el límite de 2 MB.";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result !== "string") {
      formMessage.textContent = "No se pudo leer la imagen.";
      return;
    }

    showImagePreview(reader.result);
    formMessage.textContent = "";
  };

  reader.onerror = () => {
    formMessage.textContent = "No se pudo abrir la imagen seleccionada.";
  };

  reader.readAsDataURL(file);
});

$("#removeImage").addEventListener("click", removeSelectedImage);

poemForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "";

  const author = $("#authorName").value.trim();
  const bio = $("#authorBio").value.trim();
  const title = $("#poemTitle").value.trim();
  const category = $("#poemCategory").value;
  const text = $("#poemText").value.trim();

  if (!author || !title || !category || !text) {
    formMessage.textContent = "Completa todos los campos obligatorios.";
    return;
  }

  if (!$("#confirmRights").checked) {
    formMessage.textContent = "Confirma que tienes los derechos para publicar.";
    return;
  }

  const normalizedAuthor = author.toLocaleLowerCase("es");
  const existingAuthor = getAuthors().find((item) =>
    item.name.toLocaleLowerCase("es") === normalizedAuthor
  );

  const poem = {
    id: `poem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    author: existingAuthor ? existingAuthor.name : author,
    bio: bio || (existingAuthor ? existingAuthor.bio : ""),
    title,
    category,
    text,
    image: selectedImage,
    date: new Date().toLocaleDateString("en-CA")
  };

  poems.unshift(poem);

  if (!savePoems()) {
    poems.shift();
    formMessage.textContent =
      "No se pudo guardar. Prueba con una imagen más pequeña o elimina publicaciones de prueba.";
    return;
  }

  renderPoems();
  renderAuthors();
  filterPoems();

  poemForm.reset();
  removeSelectedImage();

  formMessage.textContent =
    "Poema añadido en este navegador. No se ha publicado en un servidor compartido.";

  $("#poemas").scrollIntoView({ behavior: "smooth" });
});

searchInput.addEventListener("input", filterPoems);
categoryFilter.addEventListener("change", filterPoems);

$("#backToAuthors").addEventListener("click", () => {
  closeAuthor();
  $("#autores").scrollIntoView({ behavior: "smooth" });
});

document.addEventListener("click", (event) => {
  const readButton = event.target.closest("[data-read]");
  const authorButton = event.target.closest("[data-author]");
  const categoryButton = event.target.closest("[data-category]");

  if (readButton) {
    openPoem(readButton.dataset.read);
  }

  if (authorButton) {
    if (readingDialog.open) {
      readingDialog.close();
    }

    closeAuthor();
    showAuthor(authorButton.dataset.author);
  }

  if (categoryButton) {
    categoryFilter.value = categoryButton.dataset.category;
    filterPoems();
    $("#poemas").scrollIntoView({ behavior: "smooth" });
  }
});

$("#closeDialog").addEventListener("click", () => {
  readingDialog.close();
});

readingDialog.addEventListener("click", (event) => {
  if (event.target === readingDialog) {
    readingDialog.close();
  }
});

const menuToggle = $("#menuToggle");
const mainNav = $("#mainNav");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
  menuToggle.textContent = isOpen ? "×" : "☰";
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menú");
    menuToggle.textContent = "☰";
  });
});

$("#currentYear").textContent = new Date().getFullYear();

renderPoems();
renderAuthors();
