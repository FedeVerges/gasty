# ADR 0001: Reglas recurrentes separadas de los movimientos

## Estado

Aceptada el 2026-08-20.

## Contexto

El modelo actual trata un movimiento recurrente como una fila fuente y sus copias como clones. Eso hace que editar un gasto concreto sea difícil de entender y mezcla el historial financiero con la configuración de la recurrencia.

## Decisión

Una recurrencia será una regla independiente. Cada movimiento que genera será una transacción normal e independiente.

- Editar o eliminar una transacción desde Inicio o Movimientos solo afecta a esa transacción.
- Editar una regla desde Ajustes actualiza las transacciones pendientes desde el mes actual inclusive.
- Las transacciones de meses anteriores no se modifican nunca por un cambio en la regla.
- Eliminar una regla elimina sus transacciones pendientes desde el mes actual inclusive y conserva el historial.
- Las reglas fijas mantienen un horizonte renovable de 12 meses. Las reglas temporales dejan de generarlos al llegar a su cantidad de meses.
- Desde Ajustes se puede modificar el monto, la descripción, la categoría, el día de cobro y la duración de una regla. El recálculo solo afecta las transacciones pendientes.
- Al abrir la aplicación, el motor extiende cada regla fija para conservar 12 meses de transacciones pendientes.

La interfaz no expondrá los conceptos "fuente" ni "clon".

## Consecuencias

El dominio necesita una entidad persistida para las reglas recurrentes y una referencia opcional desde cada transacción a la regla que la generó. La migración debe preservar las transacciones existentes y convertir las relaciones `originalId` actuales sin cambiar datos históricos.

El proyector de meses futuros debe consultar reglas activas, no transacciones especiales.
