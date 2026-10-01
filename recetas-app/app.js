/* ============================================================
   Recetario Web — lógica de la aplicación (SPA con hash routing)
   ============================================================ */

const CATEGORY_META = {
  "Desayuno":  { icon: "🍳", label: "Desayuno" },
  "Almuerzo":  { icon: "🍽️", label: "Almuerzo" },
  "Cena":      { icon: "🌙", label: "Cena" },
  "Postre":    { icon: "🍰", label: "Postre" },
  "Ensalada":  { icon: "🥗", label: "Ensalada" },
  "Zumos":     { icon: "🥤", label: "Zumos / Batidos" },
};
const CATEGORY_ORDER = ["Desayuno", "Almuerzo", "Cena", "Ensalada", "Postre", "Zumos"];

const DIET_LABELS = { "Paleo": "Paleo", "Keto": "Keto", "reset": "Reset" };
const RESTRICTION_LABELS = { "Low Carb": "Low Carb", "Carbohidrato almidonado": "Carbohidrato almidonado" };

// Paleta para los banners "ilustrados" (no hay fotos reales en la fuente de datos)
const BANNER_GRADIENTS = [
  "from-orange-300 via-amber-200 to-yellow-100",
  "from-rose-300 via-pink-200 to-orange-100",
  "from-emerald-300 via-teal-200 to-cyan-100",
  "from-lime-300 via-green-200 to-emerald-100",
  "from-sky-300 via-blue-200 to-indigo-100",
  "from-fuchsia-300 via-purple-200 to-violet-100",
  "from-amber-300 via-orange-200 to-red-100",
  "from-teal-300 via-cyan-200 to-sky-100",
];

let RECIPES = [];      // base de datos cargada desde recipes.json
let EXTRA_RECIPES = []; // recetas agregadas en esta sesión vía el formulario

function allRecipes() {
  return [...RECIPES, ...EXTRA_RECIPES];
}

function slugify(str) {
  return str
    .toString()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uniqueId(base) {
  const ids = new Set(allRecipes().map(r => r.id));
  if (!ids.has(base)) return base;
  let i = 2;
  while (ids.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

function bannerGradient(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return BANNER_GRADIENTS[hash % BANNER_GRADIENTS.length];
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

/* ------------------------- Carga de datos ------------------------- */

async function loadRecipes() {
  try {
    const res = await fetch("recipes.json", { cache: "no-store" });
    if (!res.ok) throw new Error("fetch failed");
    RECIPES = await res.json();
  } catch (e) {
    // Fallback para cuando el archivo se abre directamente (file://) y el
    // navegador bloquea fetch() por CORS: usamos la copia embebida.
    const fallback = document.getElementById("recipes-fallback");
    if (fallback) {
      RECIPES = JSON.parse(fallback.textContent);
    } else {
      RECIPES = [];
      console.error("No se pudo cargar recipes.json", e);
    }
  }
}

/* --------------------------- Router SPA ---------------------------- */

const app = document.getElementById("app");

function parseHash() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);
  return parts;
}

function navigate(path) {
  location.hash = path;
}

async function router() {
  const parts = parseHash();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });

  if (parts.length === 0) {
    renderHome();
  } else if (parts[0] === "receta" && parts[1]) {
    renderRecipe(decodeURIComponent(parts[1]));
  } else if (parts[0] === "agregar") {
    renderAddForm();
  } else if (parts[0] === "categoria" && parts[1]) {
    renderHome({ categoria: decodeURIComponent(parts[1]) });
  } else {
    renderHome();
  }
}

window.addEventListener("hashchange", router);

/* ----------------------------- Header ------------------------------ */

function headerHtml(currentLabel) {
  const label = currentLabel || "Recetario";
  return `
  <header class="rb-top">
    <a href="../index.html" class="rb-brand" aria-label="Volver al sitio principal">
      <img src="../assets/img/logo-az.png" alt="Alejandra Zerdá" />
    </a>
    <span class="rb-brand-sep">/</span>
    <span class="rb-brand-cur">${escapeHtml(label)}</span>
    <nav class="rb-nav">
      <a href="#/">Inicio</a>
      <a href="../index.html">← al portafolio</a>
      <a href="#/agregar" class="cta hidden">+ Agregar receta</a>
    </nav>
  </header>`;
}

function footerHtml() {
  return `
  <footer class="mt-16">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-2">
      <p>${allRecipes().length} recetas · hecho con amor por Alejandra Zerdá</p>
      <p><a href="../index.html" style="color:var(--brand);text-decoration:underline;font-family:var(--f-mono);font-size:13px">volver al portafolio ↗</a></p>
    </div>
  </footer>`;
}

/* ------------------------------ Home -------------------------------- */

let currentFilters = { categoria: "", dieta: "", restriccion: "", q: "" };

function renderHome(initial = {}) {
  currentFilters = { categoria: "", dieta: "", restriccion: "", q: "", ...initial };

  const categoryCards = CATEGORY_ORDER.map((cat) => {
    const meta = CATEGORY_META[cat];
    const count = allRecipes().filter(r => r.mealTypes.includes(cat)).length;
    return `
      <button data-cat="${escapeHtml(cat)}"
        class="cat-card group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-neutral-200 hover:border-orange-300 hover:shadow-md transition text-center">
        <span class="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">${meta.icon}</span>
        <span class="text-sm font-semibold text-neutral-700">${meta.label}</span>
        <span class="text-xs text-neutral-400">${count} recetas</span>
      </button>`;
  }).join("");

  app.innerHTML = `
    ${headerHtml()}
    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-10">

      <section class="rb-hero mb-10">
        <p class="rb-prompt">&lt;?php // section 1 ?&gt;</p>
        <h1>¿Qué vamos a cocinar hoy?</h1>
        <p class="rb-hand">lo que sea, lo hacemos rico.</p>
        <p class="lead">Explora recetas por categoría o usa los filtros para encontrar justo lo que buscas. Hay <strong>${allRecipes().length}</strong> recetas en el libro.</p>
      </section>

      <section class="mb-10">
        <div class="flex items-center justify-between mb-4">
          <h2 class="rb-h2">categoría</h2>
          <button id="clear-cat" class="text-sm font-medium hidden" style="color:var(--brand);font-family:var(--f-mono)">× Ver todo</button>
        </div>
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
          ${categoryCards}
        </div>
      </section>

      <section class="mb-6">
        <h2 class="rb-h2 mb-4">filtrar recetas</h2>
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-neutral-200">
          <div>
            <label class="block text-xs font-semibold text-neutral-500 mb-1">Buscar por nombre</label>
            <input id="f-q" type="text" placeholder="Ej: pollo, waffle..."
              class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"/>
          </div>
          <div>
            <label class="block text-xs font-semibold text-neutral-500 mb-1">Categoría</label>
            <select id="f-categoria" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Todas</option>
              ${CATEGORY_ORDER.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(CATEGORY_META[c].label)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-neutral-500 mb-1">Tipo de alimentación</label>
            <select id="f-dieta" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Todas</option>
              ${Object.entries(DIET_LABELS).map(([k, v]) => `<option value="${escapeHtml(k)}">${escapeHtml(v)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-neutral-500 mb-1">Restricciones</label>
            <select id="f-restriccion" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">Todas</option>
              ${Object.entries(RESTRICTION_LABELS).map(([k, v]) => `<option value="${escapeHtml(k)}">${escapeHtml(v)}</option>`).join("")}
            </select>
          </div>
        </div>
      </section>

      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 id="results-title" class="rb-h2">todas las recetas</h2>
          <span id="results-count" class="text-sm" style="color:var(--muted);font-family:var(--f-mono)"></span>
        </div>
        <div id="recipe-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"></div>
        <p id="no-results" class="hidden text-center py-16">No encontramos recetas con esos filtros. Prueba ajustar la búsqueda.</p>
      </section>
    </main>
    ${footerHtml()}
  `;

  document.getElementById("f-categoria").value = currentFilters.categoria;
  document.querySelectorAll(".cat-card").forEach(btn => {
    btn.addEventListener("click", () => {
      currentFilters.categoria = btn.dataset.cat === currentFilters.categoria ? "" : btn.dataset.cat;
      document.getElementById("f-categoria").value = currentFilters.categoria;
      applyFilters();
    });
  });
  document.getElementById("clear-cat").addEventListener("click", () => {
    currentFilters.categoria = "";
    document.getElementById("f-categoria").value = "";
    applyFilters();
  });
  document.getElementById("f-q").addEventListener("input", (e) => { currentFilters.q = e.target.value; applyFilters(); });
  document.getElementById("f-categoria").addEventListener("change", (e) => { currentFilters.categoria = e.target.value; applyFilters(); });
  document.getElementById("f-dieta").addEventListener("change", (e) => { currentFilters.dieta = e.target.value; applyFilters(); });
  document.getElementById("f-restriccion").addEventListener("change", (e) => { currentFilters.restriccion = e.target.value; applyFilters(); });

  applyFilters();
}

function applyFilters() {
  const { categoria, dieta, restriccion, q } = currentFilters;
  const query = q.trim().toLowerCase();

  const filtered = allRecipes().filter(r => {
    if (categoria && !r.mealTypes.includes(categoria)) return false;
    if (dieta && !r.diet.includes(dieta)) return false;
    if (restriccion && !r.restrictions.includes(restriccion)) return false;
    if (query && !r.title.toLowerCase().includes(query)) return false;
    return true;
  });

  const grid = document.getElementById("recipe-grid");
  const noResults = document.getElementById("no-results");
  const countEl = document.getElementById("results-count");
  const titleEl = document.getElementById("results-title");
  const clearBtn = document.getElementById("clear-cat");

  clearBtn.classList.toggle("hidden", !categoria);
  titleEl.textContent = categoria ? CATEGORY_META[categoria].label : "Todas las recetas";
  countEl.textContent = `${filtered.length} receta${filtered.length === 1 ? "" : "s"}`;

  document.querySelectorAll(".cat-card").forEach(btn => {
    const active = btn.dataset.cat === categoria;
    btn.classList.toggle("border-orange-400", active);
    btn.classList.toggle("ring-2", active);
    btn.classList.toggle("ring-orange-200", active);
  });

  if (filtered.length === 0) {
    grid.innerHTML = "";
    noResults.classList.remove("hidden");
    return;
  }
  noResults.classList.add("hidden");
  grid.innerHTML = filtered.map(recipeCardHtml).join("");
}

function recipeCardHtml(r) {
  const grad = bannerGradient(r.id);
  return `
    <a href="#/receta/${encodeURIComponent(r.id)}" class="group block bg-white rounded-2xl border border-neutral-200 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition">
      <div class="h-24 sm:h-28 bg-gradient-to-br ${grad} flex items-center justify-center text-4xl">
        ${r.icon || "🍽️"}
      </div>
      <div class="p-3">
        <h3 class="text-sm font-semibold text-neutral-800 line-clamp-2 group-hover:text-orange-600">${escapeHtml(r.title)}</h3>
        <div class="flex flex-wrap gap-1 mt-2">
          ${r.mealTypes.slice(0, 2).map(m => `<span class="text-[10px] font-medium bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded-full">${escapeHtml(m)}</span>`).join("")}
          ${r.diet.slice(0, 1).map(d => `<span class="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full">${escapeHtml(d)}</span>`).join("")}
        </div>
      </div>
    </a>`;
}

/* --------------------------- Recipe detail --------------------------- */

function renderRecipe(id) {
  const r = allRecipes().find(x => x.id === id);
  if (!r) {
    app.innerHTML = `${headerHtml()}
      <main class="max-w-3xl mx-auto px-4 py-20 text-center">
        <p class="text-5xl mb-4">🔍</p>
        <h1 class="text-xl font-bold text-neutral-800">No encontramos esa receta</h1>
        <a href="#/" class="inline-block mt-4 text-orange-600 font-semibold hover:underline">Volver al inicio</a>
      </main>${footerHtml()}`;
    return;
  }

  const grad = bannerGradient(r.id);
  const badges = [
    ...r.mealTypes.map(m => ({ txt: m, cls: "bg-orange-100 text-orange-700" })),
    ...r.diet.map(d => ({ txt: DIET_LABELS[d] || d, cls: "bg-emerald-100 text-emerald-700" })),
    ...r.restrictions.map(t => ({ txt: t, cls: "bg-sky-100 text-sky-700" })),
  ];

  app.innerHTML = `
    ${headerHtml()}
    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <a href="#/" class="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-orange-600 mb-4">&larr; Volver</a>

      <div class="rounded-3xl overflow-hidden border border-neutral-200 shadow-sm mb-6">
        <div class="relative h-56 sm:h-72 bg-gradient-to-br ${grad} flex items-center justify-center">
          <span class="text-8xl sm:text-9xl drop-shadow-sm">${r.icon || "🍽️"}</span>
          <span class="absolute bottom-3 right-4 text-xs font-medium bg-white/70 backdrop-blur px-2 py-1 rounded-full text-neutral-600">Vista ilustrativa</span>
        </div>
        <div class="bg-white p-5 sm:p-6">
          <h1 class="text-2xl sm:text-3xl font-extrabold text-neutral-900">${escapeHtml(r.title)}</h1>
          <div class="flex flex-wrap gap-1.5 mt-3">
            ${badges.map(b => `<span class="text-xs font-semibold px-2 py-1 rounded-full ${b.cls}">${escapeHtml(b.txt)}</span>`).join("")}
            ${r.portions ? `<span class="text-xs font-semibold px-2 py-1 rounded-full bg-neutral-100 text-neutral-600">🍽️ ${escapeHtml(r.portions)} porciones</span>` : ""}
          </div>
          ${r.instagramLink ? `<a href="${escapeHtml(r.instagramLink)}" target="_blank" rel="noopener" class="inline-flex items-center gap-1 mt-3 text-sm font-medium text-pink-600 hover:underline">📎 Ver video original</a>` : ""}
        </div>
      </div>

      <div class="grid sm:grid-cols-5 gap-6">
        <section class="sm:col-span-2 bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 class="text-lg font-bold text-neutral-800 mb-3">Ingredientes</h2>
          ${r.ingredients.length ? `
          <ul class="space-y-2 text-sm text-neutral-700">
            ${r.ingredients.map(i => `<li class="flex gap-2"><span class="text-orange-400">●</span><span>${escapeHtml(i)}</span></li>`).join("")}
          </ul>` : `<p class="text-sm text-neutral-400">No hay ingredientes registrados para esta receta.</p>`}
        </section>

        <section class="sm:col-span-3 bg-white rounded-2xl border border-neutral-200 p-5">
          <h2 class="text-lg font-bold text-neutral-800 mb-3">Preparación</h2>
          ${r.steps.length ? `
          <ol class="space-y-3 text-sm text-neutral-700">
            ${r.steps.map((s, idx) => `
              <li class="flex gap-3">
                <span class="shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center">${idx + 1}</span>
                <span class="pt-0.5">${escapeHtml(s)}</span>
              </li>`).join("")}
          </ol>` : `<p class="text-sm text-neutral-400">No hay pasos de preparación registrados para esta receta.</p>`}
          ${r.notes ? `<div class="mt-4 text-sm bg-amber-50 text-amber-800 rounded-xl p-3"><strong>Nota:</strong> ${escapeHtml(r.notes)}</div>` : ""}
        </section>
      </div>
    </main>
    ${footerHtml()}
  `;
}

/* ---------------------------- Add recipe form ---------------------------- */

function checkboxGroup(name, options, labelFn = (o) => o) {
  return options.map(o => `
    <label class="inline-flex items-center gap-1.5 text-sm bg-neutral-50 border border-neutral-200 px-2.5 py-1.5 rounded-lg cursor-pointer hover:border-orange-300">
      <input type="checkbox" name="${name}" value="${escapeHtml(o)}" class="rounded text-orange-500 focus:ring-orange-400"/>
      ${escapeHtml(labelFn(o))}
    </label>`).join("");
}

function renderAddForm() {
  app.innerHTML = `
    ${headerHtml()}
    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <a href="#/" class="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-orange-600 mb-4">&larr; Volver</a>
      <h1 class="text-2xl font-extrabold text-neutral-900 mb-1">Agregar nueva receta</h1>
      <p class="text-neutral-500 text-sm mb-6">Se guardará en esta sesión. Al final puedes descargar el <code>recipes.json</code> actualizado para conservarla.</p>

      <form id="add-form" class="space-y-5 bg-white border border-neutral-200 rounded-2xl p-5 sm:p-6">
        <div>
          <label class="block text-sm font-semibold text-neutral-700 mb-1">Nombre de la receta *</label>
          <input required name="title" type="text" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Ej: Tortilla de espinaca"/>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-neutral-700 mb-1">Emoji / ícono</label>
            <input name="icon" type="text" maxlength="4" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="🍳"/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-neutral-700 mb-1">Porciones</label>
            <input name="portions" type="text" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Ej: 2"/>
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-neutral-700 mb-2">Categoría (tipo de comida)</label>
          <div class="flex flex-wrap gap-2">${checkboxGroup("mealTypes", CATEGORY_ORDER, c => CATEGORY_META[c].label)}</div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-neutral-700 mb-2">Tipo de alimentación</label>
          <div class="flex flex-wrap gap-2">${checkboxGroup("diet", Object.keys(DIET_LABELS), k => DIET_LABELS[k])}</div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-neutral-700 mb-2">Restricciones</label>
          <div class="flex flex-wrap gap-2">${checkboxGroup("restrictions", Object.keys(RESTRICTION_LABELS))}</div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-neutral-700 mb-1">Ingredientes (uno por línea) *</label>
          <textarea required name="ingredients" rows="5" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="2 huevos&#10;1 taza de espinaca&#10;Sal al gusto"></textarea>
        </div>

        <div>
          <label class="block text-sm font-semibold text-neutral-700 mb-1">Preparación (un paso por línea) *</label>
          <textarea required name="steps" rows="5" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Batir los huevos&#10;Agregar la espinaca&#10;Cocinar 5 minutos"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-semibold text-neutral-700 mb-1">Link (Instagram / video)</label>
            <input name="instagramLink" type="url" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="https://..."/>
          </div>
          <div>
            <label class="block text-sm font-semibold text-neutral-700 mb-1">Notas</label>
            <input name="notes" type="text" class="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Opcional"/>
          </div>
        </div>

        <div class="flex items-center gap-3 pt-2">
          <button type="submit" class="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-full shadow-sm transition">Guardar receta</button>
          <span id="add-feedback" class="text-sm text-emerald-600 font-medium hidden">¡Receta agregada! Redirigiendo…</span>
        </div>
      </form>

      <div class="mt-6 bg-neutral-50 border border-dashed border-neutral-300 rounded-2xl p-4 text-sm text-neutral-500">
        💾 Las recetas agregadas viven en memoria mientras esta pestaña esté abierta. Usa el botón de abajo cuando quieras
        para descargar un <code>recipes.json</code> con todo (las 207 originales + las que agregues) y reemplazar el archivo
        del proyecto para que queden guardadas de forma permanente.
        <div class="mt-3">
          <button id="download-json" class="text-sm font-semibold text-orange-600 hover:underline">⬇ Descargar recipes.json actualizado</button>
        </div>
      </div>
    </main>
    ${footerHtml()}
  `;

  document.getElementById("download-json").addEventListener("click", downloadRecipesJson);

  document.getElementById("add-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const title = (fd.get("title") || "").toString().trim();
    if (!title) return;

    const ingredients = (fd.get("ingredients") || "").toString().split("\n").map(s => s.trim()).filter(Boolean);
    const steps = (fd.get("steps") || "").toString().split("\n").map(s => s.trim()).filter(Boolean);

    const newRecipe = {
      id: uniqueId(slugify(title)),
      title,
      icon: (fd.get("icon") || "").toString().trim() || "🍽️",
      diet: fd.getAll("diet").map(String),
      mealTypes: fd.getAll("mealTypes").map(String),
      restrictions: fd.getAll("restrictions").map(String),
      portions: (fd.get("portions") || "").toString().trim(),
      instagramLink: (fd.get("instagramLink") || "").toString().trim(),
      ingredients,
      steps,
      notes: (fd.get("notes") || "").toString().trim(),
    };

    EXTRA_RECIPES.push(newRecipe);
    document.getElementById("add-feedback").classList.remove("hidden");
    setTimeout(() => navigate(`/receta/${encodeURIComponent(newRecipe.id)}`), 700);
  });
}

function downloadRecipesJson() {
  const blob = new Blob([JSON.stringify(allRecipes(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "recipes.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ------------------------------- Init ------------------------------- */

(async function init() {
  await loadRecipes();
  router();
})();
