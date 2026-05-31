import { Plugin } from "obsidian";
import { getParentPath, getName } from "./utils";

export interface SortOrderData {
	orders: Record<string, string[]>;
}

export class SortOrderStore {
	private data: SortOrderData;
	private saveTimeout: ReturnType<typeof setTimeout> | null = null;
	private plugin: Plugin;

	constructor(plugin: Plugin) {
		this.plugin = plugin;
		this.data = { orders: {} };
	}

	async load(): Promise<void> {
		const saved = await this.plugin.loadData();
		if (saved && saved.orders) {
			this.data = saved;
		}
	}

	private debouncedSave(): void {
		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}
		this.saveTimeout = setTimeout(() => {
			this.plugin.saveData(this.data);
		}, 300);
	}

	/**
	 * Get the sort order for a folder. Returns null if no custom order exists.
	 */
	getOrder(folderPath: string): string[] | null {
		return this.data.orders[folderPath] ?? null;
	}

	/**
	 * Set the sort order for a folder.
	 */
	setOrder(folderPath: string, items: string[]): void {
		this.data.orders[folderPath] = items;
		this.debouncedSave();
	}

	/**
	 * Move an item from one folder position to another (or across folders).
	 * Returns false if the move is a no-op.
	 */
	moveItem(
		fromFolder: string,
		toFolder: string,
		itemName: string,
		targetIndex: number
	): boolean {
		if (fromFolder === toFolder) {
			const order = this.data.orders[fromFolder];
			if (!order) return false;
			const currentIndex = order.indexOf(itemName);
			if (currentIndex === -1) return false;
			const adjustedIndex =
				currentIndex < targetIndex ? targetIndex - 1 : targetIndex;
			if (currentIndex === adjustedIndex) return false;
			order.splice(currentIndex, 1);
			order.splice(adjustedIndex, 0, itemName);
			this.debouncedSave();
			return true;
		}

		// Cross-folder move
		if (this.data.orders[fromFolder]) {
			this.data.orders[fromFolder] = this.data.orders[fromFolder].filter(
				(n) => n !== itemName
			);
		}
		if (!this.data.orders[toFolder]) {
			this.data.orders[toFolder] = [];
		}
		this.data.orders[toFolder].splice(targetIndex, 0, itemName);
		this.debouncedSave();
		return true;
	}

	/**
	 * Add a new item to the end of a folder's order.
	 */
	addItem(folderPath: string, itemName: string): void {
		if (!this.data.orders[folderPath]) {
			this.data.orders[folderPath] = [];
		}
		if (!this.data.orders[folderPath].includes(itemName)) {
			this.data.orders[folderPath].push(itemName);
			this.debouncedSave();
		}
	}

	/**
	 * Remove an item from a folder's order.
	 */
	removeItem(folderPath: string, itemName: string): void {
		const order = this.data.orders[folderPath];
		if (!order) return;
		const index = order.indexOf(itemName);
		if (index !== -1) {
			order.splice(index, 1);
			if (order.length === 0) {
				delete this.data.orders[folderPath];
			}
			this.debouncedSave();
		}
	}

	/**
	 * Clear all custom sort orders.
	 */
	resetAll(): void {
		this.data = { orders: {} };
		this.debouncedSave();
	}
}
