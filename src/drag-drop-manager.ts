import { SortOrderStore } from "./store";
import { FileExplorerPatcher } from "./file-explorer-patcher";
import { getParentPath, getName } from "./utils";

export class DragDropManager {
	private store: SortOrderStore;
	private patcher: FileExplorerPatcher;
	private draggedPath: string | null = null;
	private dropIndicator!: HTMLElement;

	constructor(store: SortOrderStore, patcher: FileExplorerPatcher) {
		this.store = store;
		this.patcher = patcher;
		this.dropIndicator = document.createElement("div");
		this.dropIndicator.className = "file-sorter-drop-indicator";
	}

	enable(): void {
		const container = document.querySelector(".nav-files-container");
		if (!container) return;

		container.addEventListener("dragstart", this.onDragStart, true);
		container.addEventListener("dragover", this.onDragOver, true);
		container.addEventListener("drop", this.onDrop, true);
		container.addEventListener("dragend", this.onDragEnd, true);
	}

	disable(): void {
		const container = document.querySelector(".nav-files-container");
		if (!container) return;

		container.removeEventListener("dragstart", this.onDragStart, true);
		container.removeEventListener("dragover", this.onDragOver, true);
		container.removeEventListener("drop", this.onDrop, true);
		container.removeEventListener("dragend", this.onDragEnd, true);
		this.cleanup();
	}

	private onDragStart = (e: Event): void => {
		const dragEvent = e as DragEvent;
		const target = (e.target as HTMLElement).closest(".nav-file") as HTMLElement | null;
		if (!target) return;

		const title = target.querySelector(".nav-file-title");
		const path = title?.getAttribute("data-path");
		if (!path) return;

		this.draggedPath = path;
		this.patcher.pause();
		dragEvent.dataTransfer!.effectAllowed = "move";
		dragEvent.dataTransfer!.setData("text/plain", path);

		requestAnimationFrame(() => {
			target.classList.add("is-being-dragged");
		});
	};

	private onDragOver = (e: Event): void => {
		e.preventDefault();
		const dragEvent = e as DragEvent;
		dragEvent.dataTransfer!.dropEffect = "move";

		if (!this.draggedPath) return;

		const target = (e.target as HTMLElement).closest(".nav-file") as HTMLElement | null;
		if (!target) {
			this.dropIndicator.remove();
			return;
		}

		const targetPath = target.querySelector(".nav-file-title")?.getAttribute("data-path") ?? "";
		if (this.draggedPath === targetPath) {
			this.dropIndicator.remove();
			return;
		}

		const rect = target.getBoundingClientRect();
		const y = dragEvent.clientY - rect.top;
		const position = y < rect.height / 2 ? "before" : "after";

		this.dropIndicator.className =
			"file-sorter-drop-indicator" +
			(position === "before" ? " drop-above" : " drop-below");
		target.parentElement?.insertBefore(
			this.dropIndicator,
			position === "before" ? target : target.nextSibling
		);
	};

	private onDrop = (e: Event): void => {
		e.preventDefault();
		e.stopPropagation();
		const dragEvent = e as DragEvent;

		if (!this.draggedPath) {
			this.cleanup();
			return;
		}

		const target = (e.target as HTMLElement).closest(".nav-file") as HTMLElement | null;
		if (!target) {
			this.cleanup();
			return;
		}

		const targetPath = target.querySelector(".nav-file-title")?.getAttribute("data-path") ?? "";
		if (this.draggedPath === targetPath) {
			this.cleanup();
			return;
		}

		const draggedName = getName(this.draggedPath);
		const fromFolder = getParentPath(this.draggedPath);
		const toFolder = getParentPath(targetPath);

		const siblings = Array.from(target.parentElement!.children).filter(
			(el) => el.classList.contains("nav-file") || el.classList.contains("nav-folder")
		);
		const targetItemIndex = siblings.indexOf(target);
		const rect = target.getBoundingClientRect();
		const y = dragEvent.clientY - rect.top;
		const position = y < rect.height / 2 ? "before" : "after";
		const targetIndex = position === "before" ? targetItemIndex : targetItemIndex + 1;

		this.store.moveItem(fromFolder, toFolder, draggedName, targetIndex);
		this.cleanup();
	};

	private onDragEnd = (e: Event): void => {
		this.cleanup();
	};

	private cleanup(): void {
		this.dropIndicator.remove();
		document
			.querySelectorAll(".is-being-dragged")
			.forEach((el) => el.classList.remove("is-being-dragged"));
		this.draggedPath = null;
		this.patcher.resume();

		// Force reorder after Obsidian re-renders
		setTimeout(() => {
			this.patcher.reorderAllVisible();
		}, 200);
	}
}
