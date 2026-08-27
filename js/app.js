/* Área Experimental de Riego — visor de lisímetros */
(function () {
  "use strict";

  var TRATAMIENTOS = {
    T1: { pct: 100, color: "#2f9e4f", desc: "Lámina de riego al 100 % de la ETc (testigo)" },
    T2: { pct: 120, color: "#2b62c9", desc: "Lámina de riego al 120 % de la ETc (sobre-riego)" },
    T3: { pct: 80,  color: "#f0b400", desc: "Lámina de riego al 80 % de la ETc (déficit leve)" },
    T4: { pct: 60,  color: "#e03c2f", desc: "Lámina de riego al 60 % de la ETc (déficit severo)" }
  };

  var map = L.map("map", {
    zoomControl: true,
    zoomSnap: 0.25,
    minZoom: 17,
    maxZoom: 25,
    maxBounds: [[-12.0801, -76.9481], [-12.0766, -76.9440]],
    maxBoundsViscosity: 0.8,
    attributionControl: true
  });
  map.attributionControl.setPrefix(false);

  L.tileLayer("tiles/{z}/{x}/{y}.webp", {
    minZoom: 16,
    maxNativeZoom: 24,
    maxZoom: 25,
    bounds: [[-12.07875, -76.94660], [-12.07785, -76.94547]],
    errorTileUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    attribution: "Ortomosaico dron 25-08-2026 · WebODM · Ing. J. L. Huanuqueño"
  }).addTo(map);

  map.setView([-12.0782, -76.9459], 19);

  var capaLis = null;
  var capaVuelo = null;
  var capaCamaras = null;
  var seleccionado = null;
  var filtro = null;   // tratamiento activo en la leyenda
  var enfocado = null; // código en modo enfoque (solo contorno + código)
  var capas = {};      // código -> layer

  function estilo(f) {
    var t = TRATAMIENTOS[f.properties.tratamiento] || { color: "#999" };
    var dim = filtro && filtro !== f.properties.tratamiento;
    var sel = seleccionado === f.properties.codigo;
    if (enfocado) {
      if (enfocado === f.properties.codigo) {
        return {
          className: "lis-shape",
          color: t.color, weight: 4.5, opacity: 1,
          fillColor: t.color, fillOpacity: 0
        };
      }
      return {
        className: "lis-shape",
        color: t.color, weight: 2.5, opacity: 0.12,
        fillColor: t.color, fillOpacity: 0.02
      };
    }
    return {
      className: "lis-shape",
      color: dim ? "#8a8074" : t.color,
      weight: sel ? 5.5 : 3.5,
      opacity: dim ? 0.35 : 1,
      fillColor: t.color,
      fillOpacity: dim ? 0.04 : (sel ? 0.42 : 0.24)
    };
  }

  function actualizarEtiquetas() {
    Object.keys(capas).forEach(function (code) {
      var tt = capas[code].getTooltip();
      var el = tt && tt.getElement();
      if (!el) return;
      var visible = !enfocado || enfocado === code;
      el.style.opacity = visible ? "1" : "0";
      el.classList.toggle("lis-label-foco", enfocado === code);
    });
  }

  function salirDeFoco() {
    if (!enfocado) return;
    enfocado = null;
    capaLis.setStyle(estilo);
    actualizarEtiquetas();
  }

  function abrirFicha(p) {
    var t = TRATAMIENTOS[p.tratamiento];
    document.getElementById("f-unidad").textContent = p.unidad;
    document.getElementById("f-trat").textContent = p.tratamiento + " (" + t.pct + "% ETc)";
    document.getElementById("f-rep").textContent = p.repeticion;
    document.getElementById("f-codigo").textContent = p.codigo;
    document.getElementById("f-dot").style.background = t.color;
    var area = Math.PI * p.radio_m * p.radio_m;
    document.getElementById("f-meta").textContent =
      "⌀ " + (2 * p.radio_m).toFixed(1) + " m · área " + area.toFixed(1) +
      " m² · " + t.desc;
    var sheet = document.getElementById("sheet");
    sheet.hidden = false;
    requestAnimationFrame(function () { sheet.classList.add("open"); });
  }

  function cerrarFicha() {
    var sheet = document.getElementById("sheet");
    sheet.classList.remove("open");
    seleccionado = null;
    salirDeFoco();
    if (capaLis) capaLis.setStyle(estilo);
    setTimeout(function () { if (!sheet.classList.contains("open")) sheet.hidden = true; }, 300);
  }

  var DATA_V = "?v=3"; // subir al cambiar los datos, evita caché vieja en el celular
  fetch("data/lisimetros.geojson" + DATA_V)
    .then(function (r) { return r.json(); })
    .then(function (gj) {
      capaLis = L.geoJSON(gj, {
        style: estilo,
        onEachFeature: function (f, layer) {
          capas[f.properties.codigo] = layer;
          layer.bindTooltip(f.properties.codigo, {
            permanent: true, direction: "center", className: "lis-label"
          });
          layer.on("click", function (e) {
            L.DomEvent.stopPropagation(e); // no cerrar la ficha con el click del mapa
            seleccionado = f.properties.codigo;
            if (enfocado && enfocado !== seleccionado) {
              enfocado = null;
              actualizarEtiquetas();
            }
            capaLis.setStyle(estilo);
            abrirFicha(f.properties);
          });
        }
      }).addTo(map);
      map.fitBounds(capaLis.getBounds(), {
        paddingTopLeft: [14, 160],
        paddingBottomRight: [14, 200]
      });
      construirLeyenda(gj);
    });

  function construirLeyenda(gj) {
    var conteo = {};
    gj.features.forEach(function (f) {
      conteo[f.properties.tratamiento] = (conteo[f.properties.tratamiento] || 0) + 1;
    });
    var cont = document.getElementById("legend-chips");
    ["T1", "T2", "T3", "T4"].forEach(function (k) {
      var t = TRATAMIENTOS[k];
      var b = document.createElement("button");
      b.className = "chip";
      b.style.setProperty("--chip", t.color);
      b.innerHTML = "<span class='dot'></span>" + k + " · " + t.pct + "%";
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", function () {
        filtro = (filtro === k) ? null : k;
        document.querySelectorAll(".chip").forEach(function (c) {
          var esta = c === b && filtro === k;
          c.classList.toggle("active", esta);
          c.classList.toggle("dimmed", filtro !== null && !esta);
          c.setAttribute("aria-pressed", esta ? "true" : "false");
        });
        capaLis.setStyle(estilo);
      });
      cont.appendChild(b);
    });

    // tarjetas del modal
    var ac = document.getElementById("about-treats");
    ["T1", "T2", "T3", "T4"].forEach(function (k) {
      var t = TRATAMIENTOS[k];
      var d = document.createElement("div");
      d.className = "treat-card";
      d.style.setProperty("--chip", t.color);
      d.innerHTML = "<b>" + k + " · " + t.pct + "% ETc</b><small>" +
        t.desc.replace("Lámina de riego al ", "") + "</small>";
      ac.appendChild(d);
    });
  }

  // Capas opcionales
  document.getElementById("chk-vuelo").addEventListener("change", function (e) {
    if (e.target.checked) {
      if (capaVuelo) { capaVuelo.addTo(map); return; }
      fetch("data/vuelo.geojson" + DATA_V).then(function (r) { return r.json(); }).then(function (gj) {
        capaVuelo = L.geoJSON(gj, {
          style: { color: "#e0a800", weight: 1.6, opacity: 0.85, dashArray: "6 4" }
        }).addTo(map);
      });
    } else if (capaVuelo) { map.removeLayer(capaVuelo); }
  });

  document.getElementById("chk-camaras").addEventListener("change", function (e) {
    if (e.target.checked) {
      if (capaCamaras) { capaCamaras.addTo(map); return; }
      fetch("data/camaras.geojson" + DATA_V).then(function (r) { return r.json(); }).then(function (gj) {
        capaCamaras = L.geoJSON(gj, {
          pointToLayer: function (f, ll) {
            return L.circleMarker(ll, {
              radius: 3, color: "#fff", weight: 1, fillColor: "#563063", fillOpacity: 0.9
            });
          }
        }).addTo(map);
      });
    } else if (capaCamaras) { map.removeLayer(capaCamaras); }
  });

  // Ficha
  document.getElementById("btn-close").addEventListener("click", cerrarFicha);
  document.getElementById("sheet-grab").addEventListener("click", cerrarFicha);
  document.getElementById("btn-zoom").addEventListener("click", function () {
    if (!seleccionado || !capas[seleccionado]) return;
    enfocado = seleccionado;
    capaLis.setStyle(estilo);
    actualizarEtiquetas();
    var sheet = document.getElementById("sheet");
    var esMovil = window.innerWidth < 700;
    var padAbajo = esMovil ? (sheet.offsetHeight || 320) + 24 : 40;
    var padDer = esMovil ? 20 : 500;
    map.flyToBounds(capas[seleccionado].getBounds().pad(0.35), {
      paddingTopLeft: [20, 130],
      paddingBottomRight: [padDer, padAbajo],
      duration: 1.1,
      easeLinearity: 0.2
    });
  });
  map.on("click", cerrarFicha);

  // Modal
  var about = document.getElementById("about");
  document.getElementById("btn-info").addEventListener("click", function () { about.hidden = false; });
  document.getElementById("btn-about-close").addEventListener("click", function () { about.hidden = true; });
  about.addEventListener("click", function (e) { if (e.target === about) about.hidden = true; });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { about.hidden = true; cerrarFicha(); }
  });
})();
