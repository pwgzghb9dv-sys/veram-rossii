/* ============================================================
   map.js — интерактивная конфессиональная карта (Leaflet)
   Единый синий маркер, конфессия — иконкой внутри.
   ============================================================ */
(function () {
  "use strict";

  const data = window.SITE_DATA || {};

  function init() {
    const el = document.getElementById("confessionMap");
    if (!el || typeof window.L === "undefined" || !data.MAP_POINTS) return;

    const L = window.L;
    const points = data.MAP_POINTS;
    const icons = data.ICONS || {};

    // Ограничиваем карту территорией России — только РФ, не мир
    const RUSSIA_BOUNDS = L.latLngBounds([41, 19], [82, 180]);
    const map = L.map(el, {
      center: [62, 94],
      zoom: 3,
      minZoom: 3,
      maxZoom: 9,
      scrollWheelZoom: false,
      attributionControl: true,
      maxBounds: RUSSIA_BOUNDS,
      maxBoundsViscosity: 1.0,
      worldCopyJump: false,
    });

    // Включаем колесо после клика по карте (чтобы скролл страницы не залипал)
    map.on("focus", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());

    // Светлые тайлы — приглушённый вид; тайлы грузим только в пределах РФ
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
        noWrap: true,
        bounds: RUSSIA_BOUNDS,
      }
    ).addTo(map);

    // Контур России: затемняем всё, что вне страны, чтобы остался только силуэт РФ.
    addRussiaMask(L, map, RUSSIA_BOUNDS);

    function markerIcon(religion) {
      const svg = icons[religion] || "";
      return L.divIcon({
        className: "",
        html:
          '<span class="map-marker map-marker--' +
          religion +
          '">' +
          svg +
          "</span>",
        iconSize: [34, 34],
        iconAnchor: [17, 34],
        popupAnchor: [0, -32],
      });
    }

    const bounds = [];
    points.forEach((p) => {
      const marker = L.marker([p.lat, p.lng], {
        icon: markerIcon(p.religion),
        title: p.title,
        keyboard: true,
        alt: p.title,
      }).addTo(map);

      marker.bindPopup(
        '<div class="map-popup__title">' +
          p.title +
          "</div>" +
          '<div class="map-popup__text">' +
          p.text +
          "</div>"
      );
      bounds.push([p.lat, p.lng]);
    });

    function fit() {
      map.invalidateSize();
      // Вид по маркерам (вся раскладка в пределах России), без выхода на мир
      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
      else map.fitBounds(RUSSIA_BOUNDS, { padding: [8, 8] });
    }

    // Контейнер может быть ещё не до конца разложен на момент init —
    // пересчитываем размер и границы после layout, при ресайзе и при
    // появлении карты во вьюпорте.
    fit();
    setTimeout(fit, 300);
    window.addEventListener("resize", fit);

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) fit();
        },
        { threshold: 0.2 }
      );
      io.observe(el);
    }

    buildLegend();
  }

  /* Маска «только Россия»: всё, что вне границ РФ, закрываем фоном секции.
     Источник контура регионов — codeforgermany/click_that_hood (CC). Если
     загрузка не удалась, карта остаётся рабочей, просто без маски. */
  function addRussiaMask(L, map, russiaBounds) {
    const url =
      "https://cdn.jsdelivr.net/gh/codeforgermany/click_that_hood@main/public/data/russia.geojson";

    const maskColor =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--bg-alt")
        .trim() || "#d1e2f3";

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("geo"))))
      .then((geo) => {
        if (!geo || !Array.isArray(geo.features)) return;

        const holes = [];
        geo.features.forEach((f) => {
          const g = f && f.geometry;
          if (!g) return;
          const polys =
            g.type === "Polygon"
              ? [g.coordinates]
              : g.type === "MultiPolygon"
              ? g.coordinates
              : [];
          polys.forEach((poly) => {
            const ring = poly && poly[0];
            if (ring && ring.length > 2) {
              holes.push(ring.map((c) => [c[1], c[0]]));
            }
          });
        });
        if (!holes.length) return;

        // Внешнее кольцо — весь мир; внутренние «дыры» — регионы РФ.
        const world = [
          [-89, -179.9],
          [-89, 179.9],
          [89, 179.9],
          [89, -179.9],
        ];
        L.polygon([world, ...holes], {
          stroke: false,
          fill: true,
          fillColor: maskColor,
          fillOpacity: 1,
          interactive: false,
          className: "map-mask",
        }).addTo(map);

        // Тонкие тёмно-синие границы регионов поверх маски.
        L.geoJSON(geo, {
          interactive: false,
          style: {
            color: "#032a42",
            weight: 0.5,
            opacity: 0.32,
            fill: false,
          },
        }).addTo(map);

        map.invalidateSize();
      })
      .catch(() => {
        /* нет сети/контура — карта работает без маски */
      });
  }

  function buildLegend() {
    const legend = document.getElementById("mapLegend");
    if (!legend || !data.RELIGIONS) return;
    legend.removeAttribute("aria-hidden");
    legend.innerHTML = data.RELIGIONS.map(
      (r) =>
        '<li><span class="map-legend__icon map-legend__icon--' +
        r.id +
        '" aria-hidden="true">' +
        r.icon +
        "</span>" +
        r.name +
        "</li>"
    ).join("");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
