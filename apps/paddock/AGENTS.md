# Design

## Styling Philosophy

- Use **Tailwind CSS v4** utility classes exclusively. No CSS modules or styled-components.
- Use **CSS variables** for all colors (defined in `globals.css` under `:root` and `.dark`). Reference them via Tailwind's `bg-background`, `text-foreground`, `border-border`, etc. Never use hardcoded color values.
- All components must be **responsive** (use Tailwind breakpoints: `sm:`, `md:`, `lg:`, `xl:`).
- Every component must support **dark mode** via the `.dark` class. Use the `dark:` variant when a utility differs in dark mode. The globals.css variables already swap, so most colors will work automatically — only override when needed.

## shadcn Components

- **Before** writing a shadcn-like component from scratch, check `components/ui/` for an existing one.
- If the component doesn't exist there, add it via:
  ```
  pnpm dlx shadcn@latest add <component>
  ```
  This ensures proper styling, accessibility, and consistency with the project's theme.
- Existing components use the `radix-rhea` style (note `data-slot` attributes, `cva` variants, and `Slot` from `radix-ui`). Follow that pattern when extending or creating new UI primitives.
- The `cn()` utility from `@/lib/utils` is used for merging Tailwind classes. Always use it on `className`.

## Component Patterns

- Use `React.ComponentProps<"element">` for prop typing (see `components/ui/button.tsx` for reference).
- Use `class-variance-authority` (`cva`) for variant-based styling.
- Use `radix-ui` primitives (e.g. `Slot.Root`, `Popover.Root`, etc.) for accessible, headless behavior.
- Use `lucide-react` for icons. Icon size conventions: `size-4` (default for inline), `size-3` (xs), `size-5` (lg). Move `["&_svg:not([class*='size-'])]:size-4"` into the component's base classes.

## Imports & Aliases

Project aliases (from `tsconfig.json` paths and `components.json`):
- `@/components` → `components/`
- `@/components/ui` → `components/ui/`
- `@/lib` → `lib/`
- `@/hooks` → `hooks/`
- `@/app` → `app/`

## Linting & Formatting

- **Linter**: Biome (`pnpm lint` runs `biome check`)
- **Formatter**: Biome (`pnpm format` runs `biome format --write`)
- Biome config is in `biome.json` — uses 2-space indent, enables import organizing on save, includes Next.js and React recommended rules.
- Before committing or finishing work, run `pnpm lint` and fix any issues.

# Package Manager

- I strictly use **pnpm**. Never use npm, yarn, or any other package manager.
- Install dependencies with `pnpm add <pkg>`.
- Dev dependencies with `pnpm add -D <pkg>`.
- Run scripts with `pnpm run <script>` (e.g. `pnpm dev`, `pnpm build`, `pnpm lint`).
