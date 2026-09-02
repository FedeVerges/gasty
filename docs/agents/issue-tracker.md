# Issue tracker: GitHub

Los issues y especificaciones de este repositorio viven en GitHub Issues. Usar `gh` desde este clon.

## Convenciones

- Crear un issue con `gh issue create --title "..." --body "..."`.
- Leer un issue con `gh issue view <número> --comments`.
- Listar issues con `gh issue list --state open` y los filtros de etiqueta necesarios.
- Comentar con `gh issue comment <número> --body "..."`.
- Aplicar etiquetas con `gh issue edit <número> --add-label "..."`.
- Cerrar con `gh issue close <número> --comment "..."`.

## Pull requests como fuente de triage

No. Los pull requests externos no entran en el flujo de triage.

Cuando una skill pida publicar tickets, crear GitHub Issues. Cuando pida consultar un ticket, usar `gh issue view <número> --comments`.
