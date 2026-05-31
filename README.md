# Obsidian File Sorter

An Obsidian plugin that enables drag-and-drop reordering of files in the native left sidebar file explorer.

## Features

- Drag and drop files to reorder them in the native file explorer
- Each folder maintains its own independent sort order
- Sort order persists across Obsidian restarts
- New files are appended to the end of their folder's sort order
- Settings panel with a "Reset Sort Order" button

## Known Limitations

- **Folder dragging is not supported.** Obsidian overrides DOM manipulation for folder elements, making drag-and-drop reordering of folders unreliable.
- **Subfolder expansion may be affected.** Enabling this plugin may interfere with expanding/collapsing subfolders in the file explorer. If you experience issues with folder navigation, consider disabling the plugin.

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
