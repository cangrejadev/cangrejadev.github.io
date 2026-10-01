/* Alejandra Zerdá — site behaviour (no dependencies) */
(function () {
  "use strict";

  var root = document.documentElement;
  var TAG_COLORS = ["purple", "blue", "green", "orange", "pink", "yellow"];

  var META = {
    en: {
      title: "Alejandra Zerdá — Technical Project & Program Manager",
      description:
        "Alejandra Zerdá Guzmán — Technical Project & Program Manager and Scrum Master in Colombia. 10+ years leading digital transformation projects for international organizations.",
      theme: "Toggle dark mode",
    },
    es: {
      title: "Alejandra Zerdá — Project & Program Manager técnica",
      description:
        "Alejandra Zerdá Guzmán — Project & Program Manager técnica y Scrum Master en Colombia. Más de 10 años liderando proyectos de transformación digital para organizaciones internacionales.",
      theme: "Cambiar modo oscuro",
    },
  };

  function store(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function currentLang() {
    return root.getAttribute("data-ui-lang") === "es" ? "es" : "en";
  }

  /* ---------- Language ---------- */
  function applyLang(lang, persist) {
    root.setAttribute("data-ui-lang", lang);
    root.setAttribute("lang", lang);
    document.title = META[lang].title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", META[lang].description);
    document.querySelectorAll("[data-set-lang]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang));
    });
    var tt = document.getElementById("themeToggle");
    if (tt) tt.setAttribute("aria-label", META[lang].theme);
    formatDates(lang);
    if (persist) store("az-lang", lang);
  }

  document.querySelectorAll("[data-set-lang]").forEach(function (b) {
    b.addEventListener("click", function () {
      applyLang(b.getAttribute("data-set-lang"), true);
    });
  });

  /* ---------- Theme ---------- */
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  var themeBtn = document.getElementById("themeToggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      store("az-theme", next);
    });
  }

  /* ---------- Roles (from data-elements, editable in admin) ---------- */
  var roles = document.querySelector(".roles[data-elements]");
  if (roles) {
    var list = (roles.getAttribute("data-elements") || "")
      .split(",")
      .map(function (s) {
        return s.trim().replace(/\.$/, "");
      })
      .filter(Boolean);
    roles.textContent = "";
    list.forEach(function (r, i) {
      var t = document.createElement("span");
      t.className = "tag tag-" + TAG_COLORS[i % TAG_COLORS.length];
      t.textContent = r;
      roles.appendChild(t);
    });
  }

  /* ---------- Email obfuscation ---------- */
  // The real address is never dropped into the DOM as text or as a
  // mailto: href. Visible labels use the human-readable "user (at)
  // domain (dot) tld" form, and the real mailto: link is only built
  // the moment a human focuses, hovers over or clicks the link.
  function emailAt(el) {
    var u = el.getAttribute("data-user") || "";
    var d = el.getAttribute("data-domain") || "";
    if (!u || !d) return "";
    // String.fromCharCode keeps the literal "@" out of the source too
    return u + String.fromCharCode(64) + d;
  }
  function obfuscateDisplay(u, d) {
    return u + " (at) " + d.replace(/\./g, " (dot) ");
  }
  document.querySelectorAll(".obf-email").forEach(function (el) {
    // The CSS ::before pseudo-element paints user@domain from the data
    // attributes, so the DOM text content stays empty and the string
    // never appears in copy, in textContent, or in find-in-page.
    if (el.textContent.trim()) el.textContent = "";
  });
  document.querySelectorAll(".obf-email-link").forEach(function (a) {
    // Keep href="#" permanently so "Copy link address" and the browser's
    // status bar never expose the email. The real mailto: is opened only
    // when the visitor clicks, via window.location.
    a.addEventListener("click", function (ev) {
      var e = emailAt(a);
      if (!e) return;
      ev.preventDefault();
      window.location.href = "mailto:" + e;
    });
    // Block the context menu on these links so right-click → copy link
    // can't leak anything either.
    a.addEventListener("contextmenu", function (ev) {
      ev.preventDefault();
    });
  });

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById("menuToggle");
  var nav = document.getElementById("mainnav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      var open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- Comma lists -> tags ---------- */
  function tagify(el, color) {
    var items = el.textContent
      .split(",")
      .map(function (s) {
        return s.trim();
      })
      .filter(Boolean);
    el.textContent = "";
    items.forEach(function (txt, i) {
      var t = document.createElement("span");
      t.className = "tag tag-" + (color || TAG_COLORS[i % TAG_COLORS.length]);
      t.textContent = txt;
      el.appendChild(t);
    });
  }
  document.querySelectorAll(".card-body .tags").forEach(function (el) {
    tagify(el, "gray");
  });
  document.querySelectorAll(".skill-tags").forEach(function (el) {
    var m = el.className.match(/tag-color-(\w+)/);
    tagify(el, m ? m[1] : null);
  });

  /* ---------- Testimonial initials ---------- */
  document.querySelectorAll(".testimonial-item figcaption").forEach(function (fc) {
    var name = fc.querySelector(".t-name");
    if (!name || fc.querySelector(".t-avatar")) return;
    var initials = name.textContent
      .trim()
      .split(/\s+/)
      .filter(function (w) {
        return /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w);
      })
      .slice(0, 2)
      .map(function (w) {
        return w.charAt(0).toUpperCase();
      })
      .join("");
    var av = document.createElement("span");
    av.className = "t-avatar";
    av.setAttribute("aria-hidden", "true");
    av.textContent = initials;
    fc.insertBefore(av, fc.firstChild);
  });

  /* ---------- Toggles without body ---------- */
  var toggles = Array.prototype.slice.call(document.querySelectorAll(".timeline-item"));
  toggles.forEach(function (d) {
    if (!d.querySelector(".timeline-content")) {
      d.classList.add("no-body");
      d.querySelector("summary").addEventListener("click", function (e) {
        e.preventDefault();
      });
      d.querySelector("summary").setAttribute("tabindex", "-1");
    }
  });
  var toggleAll = document.getElementById("toggleAll");
  if (toggleAll) {
    var expandable = toggles.filter(function (d) {
      return !d.classList.contains("no-body") && d.closest('[data-edu-list="experience"]');
    });
    if (expandable[0]) expandable[0].open = true;
    toggleAll.addEventListener("click", function () {
      var open = toggleAll.getAttribute("aria-expanded") !== "true";
      expandable.forEach(function (d) {
        d.open = open;
      });
      toggleAll.setAttribute("aria-expanded", String(open));
      var spans = toggleAll.querySelectorAll("[data-lang]");
      spans.forEach(function (s) {
        var es = s.getAttribute("data-lang") === "es";
        s.textContent = open
          ? es ? "Contraer todo" : "Collapse all"
          : es ? "Expandir todo" : "Expand all";
      });
    });
  }

  /* ---------- Portfolio filter (database views) ---------- */
  var views = document.querySelectorAll(".db-view");
  views.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = btn.getAttribute("data-filter");
      views.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", String(on));
      });
      document.querySelectorAll(".portfolio-item").forEach(function (item) {
        var cats = (item.getAttribute("data-category") || "").split(/\s+/);
        item.classList.toggle("is-hidden", f !== "*" && cats.indexOf(f) === -1);
      });
    });
  });

  /* ---------- Dates ---------- */
  function formatDates(lang) {
    document.querySelectorAll("time.b-date[datetime]").forEach(function (t) {
      var d = new Date(t.getAttribute("datetime") + "T12:00:00");
      if (isNaN(d)) return;
      try {
        t.textContent = d.toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch (e) {}
    });
  }

  /* ---------- Top bar border + TOC highlight ---------- */
  var topbar = document.querySelector(".topbar");
  function onScroll() {
    if (topbar) topbar.classList.toggle("scrolled", window.scrollY > 8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var tocLinks = Array.prototype.slice.call(document.querySelectorAll("#myMenu a"));
  if ("IntersectionObserver" in window && tocLinks.length) {
    var byId = {};
    tocLinks.forEach(function (a) {
      byId[(a.getAttribute("href") || "").slice(1)] = a;
    });
    var obs = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && byId[en.target.id]) {
            tocLinks.forEach(function (a) {
              a.classList.remove("active");
            });
            byId[en.target.id].classList.add("active");
          }
        });
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    Object.keys(byId).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) obs.observe(sec);
    });
  }

  applyLang(currentLang(), false);
})();
