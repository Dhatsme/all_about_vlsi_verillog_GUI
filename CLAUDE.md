# Claude Instructions for This Repository

## Commit Messages

Every commit message must be:
- **One line only** — no body, no bullet points
- **Crisp and specific** — say what changed, not just "update files"
- **prefixed with a type** — use one of: `feat`, `fix`, `docs`, `refactor`, `chore`, `style`, `test`
- **Written in the imperative mood** — "add X", "fix Y", "remove Z"
- **Under 72 characters**

### Format

```
<type>: <concise summary of what changed and why>
```

### Good examples

```
feat: add L7 SystemVerilog assertions lesson to module m16
fix: replace ##1 SVA delay with |-> for Verilator 5.020 compatibility
docs: add 50-chapter SystemVerilog coding curriculum
chore: add CLAUDE.md with commit message guidelines
style: make lesson page mobile-friendly with bottom tab bar
refactor: extract SPI interface signals into dedicated sv interface
test: add constrained random testbench for AXI-Lite slave
```

### Bad examples — never do these

```
updated files
fix bug
changes
WIP
misc updates
added some stuff to the lesson
```

## General Rules

- Always push to the branch specified at the start of the session.
- Never push to a different branch without explicit permission.
- Never force-push without explicit instruction.
- Confirm before any destructive git operation.
