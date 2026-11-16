/* Aplomo Abogados — interacciones del sitio */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function store(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  /* ---------- Año del pie ---------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Cabecera: sombra al hacer scroll + barra móvil ---------- */
  var header = $(".header");
  var mobileCta = $(".mobile-cta");
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (mobileCta) mobileCta.classList.toggle("is-visible", y > 600);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Menú móvil ---------- */
  var burger = $(".burger");
  if (burger) {
    burger.addEventListener("click", function () {
      var open = document.body.classList.toggle("nav-open");
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });
    $$(".mobile-nav a").forEach(function (a) {
      a.addEventListener("click", function () { document.body.classList.remove("nav-open"); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.body.classList.contains("nav-open")) burger.click();
    });
  }

  /* ---------- Animaciones de entrada ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Contadores ---------- */
  function fmt(n, decimals) {
    var parts = n.toFixed(decimals).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(",");
  }
  var counters = $$("[data-count]");
  if ("IntersectionObserver" in window && !reduced) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        co.unobserve(en.target);
        var el = en.target;
        var to = parseFloat(el.getAttribute("data-count"));
        var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
        var t0 = null, dur = 1600;
        function tick(t) {
          if (!t0) t0 = t;
          var p = Math.min(1, (t - t0) / dur);
          var e = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(to * e, dec);
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { co.observe(el); });
  }

  /* ---------- Calculadora de plazos LOE ---------- */
  var calc = $("[data-calc]");
  if (calc) {
    var fRec = $("#calc-recepcion", calc);
    var fDano = $("#calc-dano", calc);
    var pill = $("[data-calc-pill]", calc);
    var verdict = $("[data-calc-verdict]", calc);
    var detail = $("[data-calc-detail]", calc);
    var tl = $("[data-calc-timeline]", calc);
    var cta = $("[data-calc-cta]", calc);
    var initial = [verdict.innerHTML, detail.innerHTML];
    var labels = { 10: "daños estructurales", 3: "defectos de habitabilidad", 1: "defectos de acabado" };
    var todayISO = new Date().toISOString().slice(0, 10);
    fRec.max = todayISO;
    fDano.max = todayISO;

    function parse(v) {
      if (!v) return null;
      var p = v.split("-");
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      return isNaN(d) ? null : d;
    }
    function addYears(d, y) { var r = new Date(d); r.setFullYear(r.getFullYear() + y); return r; }
    function fdate(d) { return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }); }
    function days(a, b) { return Math.round((b - a) / 86400000); }
    function human(n) {
      if (n > 730) return "unos " + Math.round(n / 365) + " años";
      if (n > 60) return "unos " + Math.round(n / 30.4) + " meses";
      return n + (n === 1 ? " día" : " días");
    }
    function set(state, pillText, v, d) {
      pill.setAttribute("data-state", state);
      pill.textContent = pillText;
      verdict.innerHTML = v;
      detail.innerHTML = d;
    }

    function run() {
      var rec = parse(fRec.value);
      var dano = parse(fDano.value);
      var years = parseInt(($("input[name=tipo]:checked", calc) || {}).value || "10", 10);
      var today = new Date(); today.setHours(0, 0, 0, 0);

      if (!rec) {
        tl.hidden = true; cta.hidden = true;
        pill.removeAttribute("data-state");
        pill.textContent = "Introduce la fecha de recepción";
        verdict.innerHTML = initial[0];
        detail.innerHTML = initial[1];
        return;
      }
      if (rec > today) {
        tl.hidden = true; cta.hidden = true;
        set("warn", "Revisa la fecha", "La fecha de recepción <em>no puede ser futura</em>.", "Indica la fecha en que se recibió la obra o se entregaron las llaves.");
        return;
      }

      var fin = addYears(rec, years);
      var label = labels[years];

      if (dano && dano < rec) {
        set("warn", "Revisa las fechas", "El daño no puede aparecer <em>antes de la recepción</em>.", "Si los defectos ya existían al recibir la obra, puede haber otras vías (reservas en el acta, cumplimiento contractual). Cuéntanoslo.");
      } else if (dano) {
        if (dano > fin) {
          set("bad", "Fuera de garantía LOE", "El daño apareció <em>después</em> de la garantía de " + years + (years === 1 ? " año" : " años") + ".",
            "La garantía para " + label + " terminó el " + fdate(fin) + ". Aun así, podría existir acción contractual (5 años) u otra calificación del daño. Merece la pena que lo revisemos.");
        } else {
          var limite = addYears(dano, 2);
          var left = days(today, limite);
          if (left >= 0) {
            set(left < 120 ? "warn" : "ok", left < 120 ? "A tiempo, pero urge" : "Estás a tiempo",
              "Tienes hasta el <em>" + fdate(limite) + "</em> para reclamar.",
              "El daño está dentro de la garantía de " + years + (years === 1 ? " año" : " años") + " para " + label + ". Desde que apareció, quedan " + human(left) + " para ejercitar la acción (art. 18 LOE).");
          } else {
            set("bad", "Plazo posiblemente vencido", "El plazo de 2 años habría vencido el <em>" + fdate(limite) + "</em>.",
              "Si enviaste un burofax o reclamación fehaciente, el plazo pudo interrumpirse y volver a empezar. También pueden existir otras vías. Revisémoslo.");
          }
        }
      } else {
        var rest = days(today, fin);
        if (rest >= 0) {
          set("ok", "Garantía vigente", "La garantía para " + label + " cubre hasta el <em>" + fdate(fin) + "</em>.",
            "Quedan " + human(rest) + " de garantía. Si el daño ya ha aparecido, indica cuándo para calcular tu plazo de reclamación.");
        } else {
          set("bad", "Garantía vencida", "La garantía de " + label + " terminó el <em>" + fdate(fin) + "</em>.",
            "Prueba con otro tipo de daño o indica cuándo apareció. Puede seguir abierta la vía contractual u otras acciones.");
        }
      }

      // Línea de tiempo
      tl.hidden = false; cta.hidden = false;
      var total = fin - rec;
      var pct = function (d) { return Math.max(0, Math.min(100, ((d - rec) / total) * 100)); };
      $("[data-tl-fill]", calc).style.width = pct(today) + "%";
      $("[data-tl-today]", calc).style.left = pct(today) + "%";
      var dm = $("[data-tl-dmg]", calc);
      if (dano && dano >= rec) { dm.hidden = false; dm.style.left = pct(dano) + "%"; } else { dm.hidden = true; }
      $("[data-tl-start]", calc).textContent = "Recepción · " + rec.toLocaleDateString("es-ES");
      $("[data-tl-end]", calc).textContent = "Fin garantía · " + fin.toLocaleDateString("es-ES");
    }

    calc.addEventListener("input", run);
    calc.addEventListener("change", run);
    calc.addEventListener("submit", function (e) { e.preventDefault(); });
  }

  /* ---------- Filtros de casos ---------- */
  var filters = $$("[data-filter]");
  if (filters.length) {
    var cases = $$("[data-area]");
    filters.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        filters.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        cases.forEach(function (c) { c.hidden = f !== "all" && c.getAttribute("data-area").split(" ").indexOf(f) === -1; });
      });
    });
    // Permite enlazar un filtro directamente: /casos/#tecnico
    var hashFilter = location.hash.slice(1).replace(/[^a-z-]/g, "");
    var target = hashFilter && $('[data-filter="' + hashFilter + '"]');
    if (target) target.click();
  }

  /* ---------- Subnavegación activa (áreas) ---------- */
  var subLinks = $$(".subnav a");
  if (subLinks.length && "IntersectionObserver" in window) {
    var targets = subLinks.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        subLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    targets.forEach(function (t) { so.observe(t); });
  }

  /* ---------- Índice del artículo ---------- */
  var tocLinks = $$(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var heads = tocLinks.map(function (a) { return $(a.getAttribute("href")); }).filter(Boolean);
    var to = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        tocLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "0px 0px -70% 0px" });
    heads.forEach(function (h) { to.observe(h); });
  }

  /* ---------- Zona de adjuntos ---------- */
  $$(".dropzone").forEach(function (dz) {
    var input = $("input[type=file]", dz);
    var list = $(".dropzone__files", dz);
    function show(files) {
      if (!files || !files.length) { list.textContent = ""; return; }
      var names = Array.prototype.map.call(files, function (f) { return f.name; });
      list.textContent = names.length + (names.length === 1 ? " archivo: " : " archivos: ") + names.join(", ");
    }
    dz.addEventListener("click", function (e) { if (e.target !== input) input.click(); });
    dz.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    input.addEventListener("change", function () { show(input.files); });
    ["dragenter", "dragover"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.add("is-over"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      dz.addEventListener(ev, function (e) { e.preventDefault(); dz.classList.remove("is-over"); });
    });
    dz.addEventListener("drop", function (e) {
      if (e.dataTransfer && e.dataTransfer.files) {
        try { input.files = e.dataTransfer.files; } catch (err) { /* navegadores antiguos */ }
        show(e.dataTransfer.files);
      }
    });
  });

  /* ---------- Preselección de área desde la URL (?area=reformas) ---------- */
  var areaSel = $("#f-area");
  if (areaSel && window.URLSearchParams) {
    var area = new URLSearchParams(location.search).get("area");
    if (area && areaSel.querySelector('option[value="' + area.replace(/[^a-z-]/g, "") + '"]')) areaSel.value = area;
  }

  /* ---------- Formulario de contacto ---------- */
  $$("form[data-contact]").forEach(function (form) {
    var wrap = form.closest("[data-form-wrap]") || form;
    var msgs = {
      valueMissing: "Este campo es obligatorio.",
      typeMismatch: "Revisa el formato.",
      patternMismatch: "Revisa el formato.",
      tooShort: "Cuéntanos un poco más (mínimo 20 caracteres)."
    };
    function check(el) {
      var field = el.closest(".field") || el.closest(".check");
      if (!field) return true;
      var ok = el.checkValidity();
      field.classList.toggle("has-error", !ok);
      var err = $(".error", field);
      if (err && !ok) {
        var v = el.validity;
        err.textContent = v.valueMissing ? msgs.valueMissing : v.tooShort ? msgs.tooShort : msgs.typeMismatch;
      }
      return ok;
    }
    $$("input, select, textarea", form).forEach(function (el) {
      el.addEventListener("blur", function () { if (el.value) check(el); });
      el.addEventListener("input", function () {
        var f = el.closest(".field, .check");
        if (f && f.classList.contains("has-error")) check(el);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var fields = $$("input, select, textarea", form).filter(function (el) { return el.willValidate; });
      var firstBad = null;
      fields.forEach(function (el) { if (!check(el) && !firstBad) firstBad = el; });
      if (firstBad) { firstBad.focus(); return; }
      if (form.querySelector(".hp input") && form.querySelector(".hp input").value) return; // bot

      var btn = $("button[type=submit]", form);
      var label = btn.innerHTML;
      btn.disabled = true;
      btn.textContent = "Enviando…";

      var endpoint = form.getAttribute("data-endpoint");
      var done = function () {
        var ref = "APL-" + new Date().getFullYear() + "-" + String(Math.floor(1000 + Math.random() * 9000));
        var refEl = $("[data-ref]", wrap);
        if (refEl) refEl.textContent = ref;
        wrap.classList.add("is-sent");
        wrap.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      };
      var fail = function () {
        btn.disabled = false;
        btn.innerHTML = label;
        alert("No hemos podido enviar el formulario. Escríbenos a hola@aplomoabogados.es.");
      };

      if (endpoint) {
        fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
          .then(function (r) { if (r.ok) done(); else fail(); })
          .catch(fail);
      } else {
        // Sin backend configurado: simulamos el envío (ver README).
        setTimeout(done, 900);
      }
    });
  });

  /* ---------- Cookies ---------- */
  var banner = $(".cookie");
  var KEY = "aplomo_cookies_v1";
  var gaMeta = document.querySelector('meta[name="ga-id"]');
  var gaLoaded = false;
  // Google Analytics 4: solo tras consentimiento expreso (LSSI / RGPD).
  function loadAnalytics() {
    if (gaLoaded || !gaMeta || !gaMeta.content) return;
    gaLoaded = true;
    var id = gaMeta.content;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", id, { anonymize_ip: true });
    var sc = document.createElement("script");
    sc.async = true;
    sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(sc);
  }
  try { if (JSON.parse(store(KEY) || "{}").analytics) loadAnalytics(); } catch (err) { /* nada */ }
  if (banner) {
    var analytics = $("[data-cookie-analytics]", banner);
    var saved = store(KEY);
    if (!saved) setTimeout(function () { banner.classList.add("is-visible"); }, 900);

    function save(val) {
      store(KEY, JSON.stringify({ analytics: val, date: new Date().toISOString() }));
      banner.classList.remove("is-visible", "show-prefs");
      if (val) loadAnalytics();
      else if (gaLoaded) location.reload(); // retirar el consentimiento descarga GA
    }
    $$("[data-cookie]", banner).forEach(function (b) {
      b.addEventListener("click", function () {
        var act = b.getAttribute("data-cookie");
        if (act === "accept") save(true);
        else if (act === "reject") save(false);
        else if (act === "config") {
          if (banner.classList.contains("show-prefs")) save(!!analytics.checked);
          else { banner.classList.add("show-prefs"); b.textContent = "Guardar"; }
        }
      });
    });
    $$("[data-cookie-open]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        try { var s = JSON.parse(store(KEY) || "{}"); analytics.checked = !!s.analytics; } catch (err) { /* nada */ }
        banner.classList.add("is-visible", "show-prefs");
        var cfg = $("[data-cookie=config]", banner);
        if (cfg) cfg.textContent = "Guardar";
      });
    });
  }
})();
