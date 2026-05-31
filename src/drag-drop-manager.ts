import { SortOrderStore } from "./store";
import { FileExplorerPatcher } from "./file-explorer-patcher";
import { getParentPath, getName } from "./utils";

export class DragDropManager {
	private store: SortOrderStore;
	private patcher: FileExplorerPatcher;
	private draggedPath: string | null = null;
	private dropIndicator: HTMLElement;

	constructor(store: SortOrderStore, patcher: FileExplorerPatcher) {
		this.store = store;
		this.patcher = patcher;
		this.dropIndicator = document.createElement("div");
		this.dropIndicator.className = "file-sorter-drop-indicator";
	}

	enable(): void {
		const container = document.querySelector(".nav-files-container");
		if (!container) return;

		container.addEventListener("dragstart", this.onDragStart);
		container.addEventListener("dragover", this.onDragOver);
		container.addEventListener("drop", this.onDrop);
		container.addEventListener("dragend", this.onDragEnd);
	}

	disable(): void {
		const container = document.querySelector(".nav-files-container");
		if (!container) return;

		container.removeEventListener("dragstart", this.onDragStart);
		container.removeEventListener("dragover", this.onDragOver);
		container.removeEventListener("drop", this.onDrop);
		container.removeEventListener("dragend", this.onDragEnd);
		this.cleanup();
	}

	private onDragStart = (e: Event): void => {
		const el = e.target as HTMLElement;
		if (!el.closest(".nav-file")) return;

		const title = el.closest(".nav-file")!.querySelector(".nav-file-title");
		const path = title?.getAttribute("data-path");
		if (!path) return;

		this.draggedPath = path;
		this.patcher.pause();
		(e as DragEvent).dataTransfer!.effectAllowed = "move";
		(e as DragEvent).dataTransfer!.setData("text/plain", path);

		requestAnimationFrame(() => {
			el.closest(".nav-file")!.classList.add("is-being-dragged");
		});
	};

	private onDragOver = (e: Event): void => {
		if (!this.draggedPath) return;

		const fileEl = (e.target as HTMLElement).closest(".nav-file") as HTMLElement | null;
		if (!fileEl) {
			this.dropIndicator.remove();
			return;
		}

		e.preventDefault();
		(e as DragEvent).dataTransfer!.dropEffect = "move";

		const targetPath = fileEl.querySelector(".nav-file-title")?.getAttribute("data-path") ?? "";
		if (this.draggedPath === targetPath) {
			this.dropIndicator.remove();
			return;
		}

		const rect = fileEl.getBoundingClientRect();
		const y = (e as DragEvent).clientY - rect.top;
		const position = y < rect.height / 2 ? "before" : "after";

		this.dropIndicator.className =
			"file-sorter-drop-indicator" +
			(position === "before" ? " drop-above" : " drop-below");
		fileEl.parentElement?.insertBefore(
			this.dropIndicator,
			position === "before" ? fileEl : fileEl.nextSibling
		);
	};

	private onDrop = (e: Event): void => {
		if (!this.draggedPath) return;

		const fileEl = (e.target as HTMLElement).closest(".nav-file") as HTMLElement | null;
		if (!fileEl) return;

		e.preventDefault();

		const targetPath = fileEl.querySelector(".nav-file-title")?.getAttribute("data-path") ?? "";
		if (this.draggedPath === targetPath) return;

		const draggedName = getName(this.draggedPath);
		const fromFolder = getParentPath(this.draggedPath);
		const toFolder = getParentPath(targetPath);

		const siblings = Array.from(fileEl.parentElement!.children).filter(
			(el) => el.classList.contains("nav-file") || el.classList.contains("nav-folder")
		);
		const targetItemIndex = siblings.indexOf(fileEl);
		const rect = fileEl.getBoundingClientRect();
		const y = (e as DragEvent).clientY - rect.top;
		const position = y < rect.height / 2 ? "before" : "after";
		const targetIndex = position === "before" ? targetItemIndex : targetItemIndex + 1;

		this.store.moveItem(fromFolder, toFolder, draggedName, targetIndex);
		this.cleanup();
	};

	private onDragEnd = (): void => {
		this.cleanup();
	};

	private cleanup(): void {
		this.dropIndicator.remove();
		document
			.querySelectorAll(".is-being-dragged")
			.forEach((el) => el.classList.remove("is-being-dragged"));
		this.draggedPath = null;
		this.patcher.resume();

		setTimeout(() => {
			this.patcher.reorderAllVisible();
		}, 200);
	}
}
