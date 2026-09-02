# Carga múltiple desde la entrada inteligente

**Fecha:** 1 de septiembre de 2026
**Estado:** Lista para implementación

## Problema

La entrada inteligente registra una sola transacción por confirmación. Cargar varios gastos o ingresos del día obliga a repetir el flujo, incluso cuando el texto ya contiene todos los datos.

## Solución

La entrada inteligente aceptará varios movimientos separados por coma seguida de espacio (`", "`). Cada fragmento se analizará como una transacción independiente y aparecerá en una previsualización antes de guardar.

Solo se mostrarán y guardarán las transacciones válidas. Los fragmentos inválidos se ignorarán y la interfaz indicará cuántos fueron omitidos. Al confirmar, se limpia todo el campo de entrada.

La carga múltiple admite gastos e ingresos. No admite recurrencias: cada movimiento del lote se guarda con recurrencia `none`, aunque el parser detecte términos como "alquiler" o una cuota. La carga individual conserva su comportamiento actual de reglas recurrentes.

## Historias de usuario

1. Como persona que registra los movimientos del día, quiero escribir varios movimientos en una sola entrada, para cargarlos más rápido.
2. Como persona que usa formatos argentinos, quiero que `250,50` siga siendo un monto decimal, para que no se divida como dos movimientos.
3. Como persona que combina gastos e ingresos, quiero incluir ambos en el mismo lote, para no cambiar de flujo.
4. Como persona que escribe una fecha en un fragmento, quiero que se aplique solo a ese movimiento, para conservar fechas independientes.
5. Como persona que comete un error en una parte, quiero conservar los movimientos válidos, para no repetir toda la carga.
6. Como persona que revisa el lote, quiero ver qué movimientos se guardarán y cuántos se ignorarán, para confirmar con certeza.
7. Como persona que confirma un lote, quiero que todos los movimientos válidos se guarden juntos, para evitar un resultado parcial ante un fallo de persistencia.
8. Como persona que confirma la carga, quiero que el campo quede vacío, para comenzar una nueva entrada limpia.
9. Como persona que escribe "alquiler" en un lote, quiero que se registre como gasto único, para no crear una regla recurrente por accidente.
10. Como persona que usa la carga individual o un chip rápido, quiero que sus reglas actuales no cambien, para mantener el comportamiento conocido.

## Decisiones de implementación

- El único punto de integración es la entrada inteligente inline. Editar una transacción existente no activa carga múltiple.
- El modo múltiple se activa solo con el delimitador `, `. Una coma sin espacio continúa disponible para importes decimales.
- El parser por lote reutiliza el parser actual para cada fragmento y devuelve dos resultados: transacciones parseadas y fragmentos ignorados.
- La previsualización múltiple reemplaza la tarjeta única por una lista de sugerencias del parser. Cada fila muestra descripción, categoría válida, tipo, importe y fecha.
- Las correcciones manuales de tipo, categoría y fecha pertenecen al flujo individual. En esta versión, la previsualización múltiple no ofrece edición por fila.
- La confirmación guarda todas las transacciones válidas dentro de una única operación de IndexedDB. Si esa operación falla, no se guarda ninguna.
- Cada resultado múltiple fuerza `recurring.kind` a `none`. No se crea ni modifica una regla recurrente ni sus transacciones pendientes. Esto respeta ADR 0001.
- Después de guardar, se limpia el texto, sus anulaciones y el aviso de fragmentos ignorados.

## Decisiones de pruebas

- Las pruebas verifican comportamiento observable, no estados internos del componente ni llamadas a helpers.
- El punto principal de prueba es el contrato del parser por lote: separación por `, `, importes decimales, gastos e ingresos mezclados, fechas independientes, errores parciales y recurrencia forzada a `none`.
- Las pruebas de integración comprueban que se persisten todos los resultados válidos o ninguno ante un error, usando la base IndexedDB simulada existente.
- Las pruebas E2E comprueban la lista de previsualización, el aviso de ignorados, el guardado y la limpieza del input.
- Como referencia se reutilizan los patrones de pruebas actuales del parser, de integración y de alta de transacciones.

## Fuera de alcance

- Transferencias entre ahorros y gastos desde ahorros.
- Edición o eliminación de un lote.
- Reglas recurrentes creadas desde una carga múltiple.
- Importación CSV, nuevas categorías, tipos de transacción o migraciones de datos.
- Edición individual de una fila dentro de la previsualización múltiple.

## Ejemplos

```text
birra 25000, super 300000 25/05, sueldo 500000
```

Genera tres transacciones independientes. En cambio:

```text
birra 25000, super
```

Muestra y permite guardar solo "birra 25000". "super" se informa como fragmento ignorado y no permanece en el campo después de guardar.
