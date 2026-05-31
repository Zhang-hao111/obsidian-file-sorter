# Obsidian File Sorter

An Obsidian plugin that enables drag-and-drop reordering of files and folders in the native left sidebar file explorer.

## Features

- Drag and drop files/folders to reorder them in the native file explorer
- Each folder maintains its own independent sort order
- Sort order persists across Obsidian restarts
- New files are appended to the end of their folder's sort order
- No extra UI elements — entire item is draggable
- Drag feedback matches Obsidian's native design language
- Settings panel with a "Reset Sort Order" button

## Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release
2. Create a folder `obsidian-file-sorter` in your vault's `.obsidian/plugins/` directory
3. Place the downloaded files into that folder
4. Enable the plugin in Obsidian's Community Plugins settings

## Development

```bash
npm install
npm run dev    # watch mode
npm run build  # production build
```

## License

MIT
