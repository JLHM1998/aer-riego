# Área Experimental de Riego (AER) — Visor interactivo

Visor web del experimento de **riego por déficit controlado (ETc) en maíz morado
(Pop Corn)** sobre 16 lisímetros, en el Área Experimental de Riego de la
Universidad Nacional Agraria La Molina (La Molina, Lima, Perú).

Grupo de investigación **Teledetección y Cambio Climático aplicado a la
Agricultura y Recursos Hídricos** — UNALM.

## Qué muestra

- Ortomosaico de dron (25-08-2026, GSD 1 cm/px, EPSG:32718) servido como teselas XYZ WebP.
- Los 16 lisímetros como shapes clicables, coloreados por tratamiento
  (T1 = 100 % ETc, T2 = 120 %, T3 = 80 %, T4 = 60 %).
- Ficha de cada unidad experimental (código, tratamiento, repetición) al estilo
  del letrero de campo.
- Capas opcionales: ruta de vuelo (249 waypoints, Litchi Hub) y posiciones de las
  84 fotos.

## Estructura

```
public/
  index.html          página principal
  css/ js/ vendor/    estilos, lógica (Leaflet 1.9) y librerías
  tiles/              teselas XYZ del ortomosaico (z16–z24, WebP)
  data/               lisimetros.geojson, vuelo.geojson, camaras.geojson
  img/                logos UNALM y TyC
vercel.json           configuración de despliegue (Vercel)
```

## Despliegues

- **Producción (Vercel):** https://aer-riego.vercel.app

## Flujo de datos

Fotogrametría con dron DJI Lito X1 (plan de vuelo Litchi Hub) → WebODM
(ortomosaico GeoTIFF 1 cm/px) → teselas WebP + shapes de lisímetros (Python:
rasterio, OpenCV, GeoPandas) → este visor estático.

---

Ing. José Luis Huanuqueño Murillo · 2026
