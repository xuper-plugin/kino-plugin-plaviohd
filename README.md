# PlavioHD — plugin de Kino

Películas, series y deportes en vivo del addon de Stremio **PlavioHD**
([plaviohd.vercel.app](https://plaviohd.vercel.app/manifest.json)), en formato nativo de Kino.

El addon no trae catálogo de películas ni series (solo responde enlaces por id de IMDb), así que el plugin descubre los
títulos con el TMDB de Kino (búsqueda, tendencias, géneros) y pide los enlaces al addon cuando reproduces.

## Instalar

En Kino: **Plugins ▸ Agregar un plugin ▸ Kino**, y pega la dirección de este repositorio. Requiere Kino 0.9.55 o posterior.

## Qué trae

- **Sección PlavioHD** con Inicio, Películas y Series: tendencias, en cartelera, populares, mejor valoradas y géneros.
- **Búsqueda** de películas y series, y fichas con episodios.
- **En vivo**: deportes en vivo, fútbol, críquet y TV deportiva 24/7, con la competición en el título.
- **Fuentes** del addon: HDHub, MovieBox, 9xflix, Vidy, Cinezo, Vidzee y VixSrc (ajuste **Fuentes de video**). El plugin
  envía al addon su configuración completa; sin ella el addon omite fuentes enteras.
- **Audio**: español latino primero cuando existe (MovieBox lo etiqueta `esla`), luego español, original e inglés; el
  hindi y otros idiomas van al final. Se cambia en **Audio preferido**.
- Calidad y tamaño máximo ordenan las copias, no las ocultan; el resto queda en el menú de servidores. Si abres un título
  otra vez poco después porque no cargó, sirve otra copia.
- **Regiones de TV en vivo**: US, UK, CA, AU, NZ.

## Notas

- Casi todos los archivos vienen en inglés o hindi, con subtítulos incrustados en algunos. Las copias en español son
  pocas.
- El plugin solo ofrece los enlaces que pueden reproducirse directo (pixeldrain, relays, mp4, HLS y DASH); las páginas
  de descarga que piden un navegador (hubcloud, hubdrive, fastdl) se descartan.
- Kino pide tu aprobación al instalar («Puede reproducir video desde cualquier servidor»): los archivos están en
  servidores de terceros que cambian a menudo.
- No está afiliado con el addon, los sitios ni los canales que lista.
