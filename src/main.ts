import { Plugin, TFile, TFolder, TAbstractFile, PluginSettingTab, App, Setting } from "obsidian";
import { SortOrderStore } from "./store";
import { FileExplorerPatcher } from "./file-explorer-patcher";
import { DragDropManager } from "./drag-drop-manager";
import { getParentPath, getName } from "./utils";

export default class FileSorterPlugin extends Plugin {
	store!: SortOrderStore;
	patcher!: FileExplorerPatcher;
	dragDrop!: DragDropManager;

	async onload(): Promise<void> {
		this.store = new SortOrderStore(this);
		await this.store.load();

		this.patcher = new FileExplorerPatcher(this.store);
		this.dragDrop = new DragDropManager(this.store);

		this.app.workspace.onLayoutReady(() => {
			this.patcher.enable();
			this.dragDrop.enable();
		});

		this.registerEvent(
			this.app.vault.on("create", (file: TAbstractFile) => {
				if (file instanceof TFile || file instanceof TFolder) {
					const folderPath = getParentPath(file.path);
					const name = getName(file.path);
					this.store.addItem(folderPath, name);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
				const oldFolder = getParentPath(oldPath);
				const oldName = getName(oldPath);
				const newFolder = getParentPath(file.path);
				const newName = getName(file.path);

				if (oldFolder === newFolder) {
					const order = this.store.getOrder(oldFolder);
					if (order) {
						const index = order.indexOf(oldName);
						if (index !== -1) {
							order[index] = newName;
							this.store.setOrder(oldFolder, order);
						}
					}
				} else {
					this.store.removeItem(oldFolder, oldName);
					this.store.addItem(newFolder, newName);
				}
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (file: TAbstractFile) => {
				const folderPath = getParentPath(file.path);
				const name = getName(file.path);
				this.store.removeItem(folderPath, name);
			})
		);

		this.addSettingTab(new FileSorterSettingTab(this.app, this));
	}

	onunload(): void {
		this.patcher.disable();
		this.dragDrop.disable();
	}
}

class FileSorterSettingTab extends PluginSettingTab {
	plugin: FileSorterPlugin;

	constructor(app: App, plugin: FileSorterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Reset sort order")
			.setDesc(
				"Clear all custom sort orders and restore Obsidian's default sorting."
			)
			.addButton((btn) =>
				btn
					.setButtonText("Reset")
					.setWarning()
					.onClick(() => {
						this.plugin.store.resetAll();
						this.plugin.patcher.reorderAllVisible();
					})
			);
	}
}
