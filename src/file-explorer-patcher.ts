import { SortOrderStore } from "./store";
import { getName } from "./utils";

export class FileExplorerPatcher {
	private observer: MutationObserver | null = null;
	private store: SortOrderStore;

	constructor(store: SortOrderStore) {
		this.store = store;
	}

	enable(): void {
		this.observer = new MutationObserver((mutations) => {
			this.handleMutations(mutations);
		});

		const container = document.querySelector(".nav-files-container");
		if (container) {
			this.observer.observe(container, {
				childList: true,
				subtree: true,
			});
			this.reorderAllVisible();
		}
	}

	disable(): void {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
	}

	private handleMutations(mutations: MutationRecord[]): void {
		const foldersToReorder = new Set<Element>();

		for (const mutation of mutations) {
			if (mutation.type === "childList") {
				const target = mutation.target as Element;
				if (target.classList.contains("nav-folder-children")) {
					foldersToReorder.add(target);
				} else {
					const children = target.querySelector(
						".nav-folder-children"
					);
					if (children) {
						foldersToReorder.add(children);
					}
				}
			}
		}

		for (const container of foldersToReorder) {
			this.ensureDraggable(container);
			this.reorderChildren(container);
		}
	}

	/**
	 * Reorder the children of a .nav-folder-children container
	 * according to the saved sort order.
	 */
	reorderChildren(container: Element): void {
		const folderPath = this.getFolderPath(container);
		const order = this.store.getOrder(folderPath);
		if (!order) return;

		const children = Array.from(container.children).filter((el) =>
			el.classList.contains("nav-file") ||
			el.classList.contains("nav-folder")
		) as HTMLElement[];

		if (children.length === 0) return;

		const orderMap = new Map<string, number>();
		order.forEach((name, index) => orderMap.set(name, index));

		const sorted = [...children].sort((a, b) => {
			const aName = this.getItemName(a);
			const bName = this.getItemName(b);
			const aIndex = orderMap.get(aName);
			const bIndex = orderMap.get(bName);

			if (aIndex !== undefined && bIndex !== undefined) {
				return aIndex - bIndex;
			}
			if (aIndex !== undefined) return -1;
			if (bIndex !== undefined) return 1;
			return 0;
		});

		let changed = false;
		for (let i = 0; i < sorted.length; i++) {
			if (container.children[i] !== sorted[i]) {
				changed = true;
				break;
			}
		}

		if (changed) {
			requestAnimationFrame(() => {
				for (const el of sorted) {
					container.appendChild(el);
				}
			});
		}
	}

	/**
	 * Get the folder path for a .nav-folder-children container.
	 */
	getFolderPath(container: Element): string {
		const folderEl = container.closest(".nav-folder");
		if (!folderEl) return "";
		const titleEl = folderEl.querySelector(".nav-folder-title");
		return titleEl?.getAttribute("data-path") ?? "";
	}

	/**
	 * Get the name of a file/folder item from its DOM element.
	 */
	getItemName(el: HTMLElement): string {
		const title =
			el.querySelector(".nav-file-title") ??
			el.querySelector(".nav-folder-title");
		const path = title?.getAttribute("data-path") ?? "";
		return getName(path);
	}

	/**
	 * Ensure all folder elements are draggable.
	 */
	private ensureDraggable(container: Element): void {
		const folders = container.querySelectorAll(".nav-folder");
		folders.forEach((folder) => {
			if (!folder.getAttribute("draggable")) {
				folder.setAttribute("draggable", "true");
			}
		});
	}

	/**
	 * Reorder all currently visible folder containers.
	 */
	reorderAllVisible(): void {
		const containers = document.querySelectorAll(
			".nav-folder-children"
		);
		containers.forEach((container) => {
			this.ensureDraggable(container);
			this.reorderChildren(container);
		});
	}
}
