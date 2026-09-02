# ADR 0002: Carga inline con sugerencias corregibles

## Estado

Aceptada el 2026-08-20.

## Contexto

La carga de gastos es el flujo principal de Gasty. El parser puede inferir mal el tipo o la categoría y los controles `+` y `−` actuales se confunden con la acción de agregar.

## Decisión

La carga se hará únicamente mediante el input inline de Inicio.

- El parser preselecciona tipo y categoría.
- El tipo se muestra con controles `−` para gasto y `+` para ingreso, con color e iconografía claros.
- La categoría se elige con el desplegable nativo. No habrá un listado horizontal o scrollable en este flujo.
- Si el usuario cambia el tipo, la aplicación reemplaza la categoría por una válida para ese tipo. Si no hay una coincidencia útil, elige "Otros".
- No se muestra un indicador de confianza del parser.
- Un botón `+` junto a la categoría abre una creación rápida. El usuario escribe el nombre; la categoría recibe un emoji neutro y el tipo activo. El botón se transforma en un tick verde para confirmar.
- El control para guardar la transacción también es un tick verde. Tocar un chip rápido nunca guarda automáticamente.
- Los chips rápidos se calculan con todo el historial y muestran la descripción junto al último monto registrado.

## Consecuencias

El estado de la carga debe diferenciar la sugerencia inicial del parser de la selección confirmada por el usuario. El selector de edición reutiliza el mismo control de categoría para evitar dos comportamientos distintos.
