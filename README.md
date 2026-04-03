# Cake Workflow Builder

Visual workflow builder for Cake skills - create SKILL.md files without writing markdown.

## Features

- **Drag-and-drop workflow designer** - Create workflow phases visually
- **Agent configuration** - Configure Explore, Plan, or general-purpose agents per step
- **Model selection** - Choose between Opus, Sonnet, or Haiku for each phase
- **Subagent control** - Configure parallel/sequential execution, iterations, timeouts
- **Context management** - Define inputs and outputs for each phase
- **Approval gates** - Add user confirmation checkpoints
- **Export to SKILL.md** - Generate valid skill files for Claude Code
- **Import existing skills** - Load and edit SKILL.md files

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to use the builder.

## Usage

1. **Drag nodes** from the left sidebar onto the canvas
2. **Connect nodes** by dragging from one handle to another
3. **Configure nodes** by clicking them and using the right panel
4. **Export** your workflow as a SKILL.md file or package

## Tech Stack

- Next.js 14 (App Router)
- React Flow for the node editor
- Zustand for state management
- Tailwind CSS for styling
- TypeScript for type safety

## Related

- [Cake CLI](https://github.com/CachoobiDoobi/cake-cli) - The skill this builder creates workflows for

## License

MIT
