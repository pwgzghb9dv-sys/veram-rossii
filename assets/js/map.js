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

    const map = L.map(el, {
      center: [56, 70],
      zoom: 3,
      minZoom: 2,
      maxZoom: 9,
      scrollWheelZoom: false,
      attributionControl: true,
    });

    // Включаем колесо после клика по карте (чтобы скролл страницы не залипал)
    map.on("focus", () => map.scrollWheelZoom.enable());
    map.on("blur", () => map.scrollWheelZoom.disable());

    // Светлые тайлы — современный приглушённый вид
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 19,
      }
    ).addTo(map);

    function markerIcon(religion) {
      const svg = icons[religion] || "";
      return L.divIcon({
        className: "",
        html: '<span class="map-marker">' + svg + "</span>",
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
      if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
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

  function buildLegend() {
    const legend = document.getElementById("mapLegend");
    if (!legend || !data.RELIGIONS) return;
    legend.removeAttribute("aria-hidden");
    legend.innerHTML = data.RELIGIONS.map(
      (r) =>
        '<li><span class="map-legend__icon" aria-hidden="true">' +
        r.icon +
        "</span>" +
        r.name +
        "</li>"
    ).join("");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
