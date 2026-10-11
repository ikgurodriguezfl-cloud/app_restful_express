# OpenSpec: guía de referencia del proyecto

> Investigación realizada el 6 de octubre de 2026.  
> Versión local verificada: `@fission-ai/openspec` **1.14.1**.  
> Esta guía debe actualizarse cuando cambie la versión del CLI o el esquema del proyecto.

## 1. Qué es OpenSpec

OpenSpec es un framework de desarrollo dirigido por especificaciones (*spec-driven
development*) para coordinar a una persona con agentes de programación basados
en IA. Funciona como una capa ligera de acuerdo: primero se define qué debe
cambiar y cómo debe comportarse; después se implementa y se verifica.

El framework mantiene dos tipos de información:

- **Especificaciones principales**: describen el comportamiento actual y aceptado
  del sistema.
- **Cambios**: contienen la intención, el diseño y las diferencias respecto de
  las especificaciones principales durante un trabajo en curso.

OpenSpec no sustituye al control de versiones, las pruebas, la revisión de código
ni la documentación general del producto. Su objetivo es reducir la ambigüedad
antes y durante el trabajo con agentes.

Es apropiado para cambios que requieren acuerdo sobre alcance o comportamiento,
trabajo con uno o varios agentes, revisiones mediante pull requests y sistemas
lo bastante grandes como para que el contexto informal sea insuficiente. Para
un arreglo trivial de una sola línea puede ser innecesario.

## 2. Instalación y requisitos

La versión consultada requiere Node.js `>=20.19.0`.

```powershell
npm install -g @fission-ai/openspec@latest
openspec --version
```

Para reproducibilidad se puede fijar la versión:

```powershell
npm install -g @fission-ai/openspec@1.14.1
```

También se documentan Homebrew, Yarn Classic, Bun, Deno y Nix como métodos de
instalación. Después de actualizar el paquete, `openspec update` regenera los
archivos de integración de agentes; instalar una versión nueva y actualizar
esas integraciones son operaciones distintas.

## 3. Inicialización y estructura

Inicializar un proyecto:

```powershell
openspec init
```

Variantes habituales:

```powershell
openspec init .\my-project
openspec init --tools claude,cursor
openspec init --tools all
openspec init --profile core
openspec init --force
```

La estructura conceptual es:

```text
openspec/
├── specs/
│   └── <capability-path>/
│       └── spec.md
├── changes/
│   ├── <change-name>/
│   │   ├── proposal.md
│   │   ├── design.md
│   │   ├── tasks.md
│   │   └── specs/
│   │       └── <capability-path>/
│   │           └── spec.md
│   └── archive/
└── config.yaml
```

En este proyecto la raíz es `openspec\` y la configuración actual es:

```yaml
schema: spec-driven
githubCopilot:
  cloudAgent: true
```

No hay cambios activos actualmente. Se debe confirmar la raíz antes de cualquier
operación que escriba:

```powershell
openspec list --json
```

Una respuesta con un objeto `root` confirma que el proyecto está inicializado.
No se debe ejecutar `openspec init` automáticamente en un proyecto ya existente.

## 4. Modelo de artefactos

El esquema configurado `spec-driven` usa esta secuencia:

```text
proposal → specs → design → tasks → apply → verify → archive
```

| Artefacto | Propósito |
|---|---|
| `proposal.md` | Problema, motivación, objetivos, alcance y exclusiones |
| `specs/<capability-path>/spec.md` | Delta de comportamiento; sólo lo que cambia |
| `design.md` | Solución técnica, componentes, decisiones, riesgos y alternativas |
| `tasks.md` | Tareas ejecutables y comprobables de implementación |

### Proposal

Explica por qué se necesita el cambio, qué resultado se espera y qué queda fuera
del alcance. No debe convertirse en una copia de la implementación.

### Especificación delta

Los cambios se expresan con secciones explícitas:

```markdown
## ADDED Requirements

### Requirement: Two-Factor Authentication

The system MUST require a second factor during login.

#### Scenario: OTP required

- GIVEN a user with 2FA enabled
- WHEN the user submits valid credentials
- THEN an OTP challenge is presented
```

También existen `MODIFIED`, `REMOVED` y `RENAMED Requirements`. Una delta debe
describir la diferencia, no duplicar toda la especificación principal.

### Design

Documenta el enfoque técnico, los componentes afectados, las decisiones de
arquitectura, integraciones, riesgos y alternativas descartadas.

### Tasks

Las tareas deben ser pequeñas, concretas y verificables:

```markdown
- [ ] Add database migration
- [ ] Implement API endpoint
- [ ] Add focused tests
- [ ] Update documentation
```

Sólo se marca una tarea como completada después de verificar su implementación.
El CLI cuenta como completadas las casillas `[x]` o `[X]`.

## 5. Flujo recomendado

### 5.1 Explorar

```text
/opsx:explore [topic]
```

Permite inspeccionar el código, aclarar requisitos, comparar alternativas,
identificar riesgos y decidir si hace falta un cambio formal. Explorar no
implementa código. Puede capturar pensamiento en artefactos sólo dentro del
alcance confirmado.

### 5.2 Proponer

```text
/opsx:propose add-dark-mode
```

El perfil `spec-driven` genera los artefactos que el esquema necesita. En este
proyecto la propuesta es una fase de planificación: no autoriza a modificar
código. El apply debe iniciarse explícitamente después de revisar los artefactos.

### 5.3 Aplicar

```text
/opsx:apply add-dark-mode
```

El agente debe leer propuesta, delta, diseño y tareas; implementar cada tarea;
marcar las casillas verificadas; y ejecutar las pruebas apropiadas. Antes de
trabajar debe consultar:

```powershell
openspec status --change "add-dark-mode" --json
openspec instructions apply --change "add-dark-mode" --json
```

Si faltan artefactos requeridos, el estado está bloqueado o una tarea exige
ampliar el alcance, se debe detener el apply y resolverlo mediante `propose`,
`update` o una decisión explícita.

### 5.4 Actualizar

```text
/opsx:update add-dark-mode
```

Se usa cuando cambia el entendimiento del problema, el alcance o la solución.
Los artefactos son documentos de trabajo revisables, no fases irreversibles.

### 5.5 Sincronizar

```text
/opsx:sync add-dark-mode
```

Integra las especificaciones delta en `openspec/specs/` sin necesariamente
archivar todo el cambio. Debe usarse sólo con las rutas delta reportadas por
`artifactPaths.specs.existingOutputPaths`; no se deben inferir rutas por
convención.

### 5.6 Verificar

```text
/opsx:verify add-dark-mode
```

Comprueba la correspondencia entre implementación, plan y requisitos. No
sustituye las pruebas unitarias, de integración, end-to-end, lint o type-check
del proyecto.

### 5.7 Archivar

```text
/opsx:archive add-dark-mode
```

Antes de archivar se deben revisar el estado de artefactos, el conteo de tareas,
la sincronización de deltas y la validación. El archivado normalmente:

1. Añade requisitos `ADDED` a las especificaciones principales.
2. Reemplaza requisitos `MODIFIED`.
3. Elimina requisitos `REMOVED`.
4. Conserva los cambios `RENAMED` con su nuevo nombre.
5. Mueve el cambio a `openspec/changes/archive/YYYY-MM-DD-<name>/`.

En un equipo suele ser preferible archivar después de integrar el pull request.

## 6. CLI de consulta y validación

Comandos esenciales:

```powershell
openspec --version
openspec list --json
openspec show <item> --json
openspec status --change <name> --json
openspec instructions <artifact> --change <name> --json
openspec validate <name> --json
openspec validate --all --json
openspec templates --json
openspec schemas --json
openspec new change <name>
openspec update
openspec doctor
```

Se recomienda `--json` cuando la salida se vaya a interpretar
programáticamente. Para inspección humana también existen `view` y `config`.

La configuración de un proyecto puede incluir:

```yaml
schema: spec-driven
context: |
  Constraints that guide artifacts and workflows.
rules:
  proposal:
    - Keep proposals under 500 words
operations:
  apply:
    guidance:
      - Keep test summaries concise
```

`context` y `rules` son restricciones para producir artefactos; no deben
copiarse automáticamente dentro de ellos. `operations` es orientación adicional
para operaciones como apply y archive.

## 7. Stores y esquemas

OpenSpec puede trabajar con repositorios de especificaciones independientes
(*stores*) para compartir specs entre proyectos. Si el usuario selecciona un
store, primero se consulta:

```powershell
openspec store list --json
```

Después se mantiene `--store <id>` en todos los comandos compatibles:
`list`, `show`, `status`, `instructions`, `validate`, `archive`, `context`,
`schemas` y `view`. Sin store explícito, el CLI usa la raíz local más cercana.

El esquema instalado y disponible en este proyecto es:

```text
spec-driven — proposal → specs → design → tasks
```

La CLI también permite descubrir o trabajar con esquemas personalizados:

```powershell
openspec schema init
openspec schema fork spec-driven with-review
openspec schema validate
openspec schema which
```

No se debe elegir otro esquema salvo que el usuario lo solicite explícitamente
o el proyecto lo configure.

## 8. Reglas operativas para este proyecto

1. Leer `openspec/config.yaml` y respetar el esquema configurado.
2. Usar `openspec list --json` y `openspec status --change ... --json` antes
   de escribir o implementar.
3. Seguir las instrucciones del CLI para cada artefacto; son la autoridad del
   esquema instalado.
4. Leer todos los artefactos dependientes antes de crear el siguiente.
5. Mantener las deltas enfocadas en diferencias de comportamiento.
6. No implementar desde `explore` ni desde `propose`.
7. No marcar tareas sin verificación.
8. Validar antes de presentar un cambio como listo o archivarlo.
9. No crear una raíz OpenSpec como efecto lateral de una consulta.
10. Mantener la documentación general fuera de `openspec/`; este archivo sirve
    como referencia persistente en `docs/knowledge/`.

## 9. Problemas frecuentes

### `openspec` no se encuentra

Comprobar Node.js y reinstalar el paquete global:

```powershell
npm install -g @fission-ai/openspec@1.14.1
openspec --version
```

### El proyecto no tiene raíz

`openspec list --json` devuelve `root: null`. Sólo ante una petición explícita
de inicialización se debe ejecutar `openspec init`.

### Un apply está bloqueado

Consultar `openspec status --change <name> --json` e
`openspec instructions apply --change <name> --json`. Crear o reparar los
artefactos faltantes; no comenzar la implementación suponiendo el contenido.

### El archivado muestra tareas incompletas

Revisar el archivo de tareas y marcar únicamente `[x]`/`[X]` después de ejecutar
las pruebas o verificaciones correspondientes. No inferir que un artefacto listo
implica que todas las tareas están terminadas.

### La delta no coincide con la spec principal

Detener el archivado o sync, revisar `ADDED`, `MODIFIED`, `REMOVED` y `RENAMED`,
y resolver la divergencia de forma explícita. Para una capacidad nueva sólo las
secciones `ADDED` pueden crear la spec principal.

## 10. Fuentes primarias

- [Repositorio oficial de OpenSpec](https://github.com/Fission-AI/OpenSpec)
- [README oficial](https://github.com/Fission-AI/OpenSpec)
- [Conceptos principales](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md)
- [Overview oficial](https://github.com/Fission-AI/OpenSpec/blob/main/docs/overview.md)
- [Getting Started](https://github.com/Fission-AI/OpenSpec/blob/main/docs/getting-started.md)
- [Team Workflow](https://github.com/Fission-AI/OpenSpec/blob/main/docs/team-workflow.md)
- [CLI](https://github.com/Fission-AI/OpenSpec/blob/main/docs/cli.md)
- [Commands](https://github.com/Fission-AI/OpenSpec/blob/main/docs/commands.md)
- [Installation](https://openspec.dev/docs/installation)
- [Paquete npm y versión publicada](https://registry.npmjs.org/@fission-ai/openspec/latest)

Las fuentes externas pueden cambiar. La versión local y las reglas efectivas del
proyecto se comprueban con `openspec --version`, `openspec schemas --json` y los
archivos generados bajo `.github/` y `.opencode/`.
