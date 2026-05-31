import { SortOrderStore } from "./store";
import { FileExplorerPatcher } from "./file-explorer-patcher";
import { getParentPath, getName, isSubfolder } from "./utils";

export class DragDropManager {
	private store: SortOrderStore;
	private patcher: FileExplorerPatcher;
	private draggedPath: string | null = null;
	private currentDropTarget: HTMLElement | null = null;
	private currentDropPosition: "before" | "after" | "into" | null = null;
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

		container.addEventListener("dragstart", this.onDragStart);
		container.addEventListener("dragover", this.onDragOver);
		container.addEventListener("drop", this.onDrop);
		container.addEventListener("dragend", this.onDragEnd);
		container.addEventListener("dragleave", this.onDragLeave);
	}

	disable(): void {
		const container = document.querySelector(".nav-files-container");
		if (!container) return;

		container.removeEventListener("dragstart", this.onDragStart);
		container.removeEventListener("dragover", this.onDragOver);
		container.removeEventListener("drop", this.onDrop);
		container.removeEventListener("dragend", this.onDragEnd);
		container.removeEventListener("dragleave", this.onDragLeave);
		this.cleanup();
	}

	private onDragStart = (e: Event): void => {
		const dragEvent = e as DragEvent;
		const target = this.getItemElement(dragEvent.target as HTMLElement);
		if (!target) return;

		const title =
			target.querySelector(".nav-file-title") ??
			target.querySelector(".nav-folder-title");
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

		const target = this.getItemElement(dragEvent.target as HTMLElement);
		if (!target || this.draggedPath === this.getPath(target)) {
			this.clearDropState();
			return;
		}

		const targetPath = this.getPath(target);
		const isFolder = target.classList.contains("nav-folder");

		// Prevent dropping a folder into its own subfolder
		if (
			this.isFolder(this.draggedPath) &&
			isSubfolder(targetPath, this.draggedPath)
		) {
			this.clearDropState();
			return;
		}

		const rect = target.getBoundingClientRect();
		const y = dragEvent.clientY - rect.top;
		const ratio = y / rect.height;

		let position: "before" | "after" | "into";
		if (isFolder && ratio > 0.25 && ratio < 0.75) {
			position = "into";
		} else if (ratio < 0.5) {
			position = "before";
		} else {
			position = "after";
		}

		if (
			this.currentDropTarget !== target ||
			this.currentDropPosition !== position
		) {
			this.clearDropState();
			this.currentDropTarget = target;
			this.currentDropPosition = position;

			if (position === "into") {
				target.classList.add("drop-into");
			} else {
				this.dropIndicator.className =
					"file-sorter-drop-indicator" +
					(position === "before"
						? " drop-above"
						: " drop-below");
				target.parentElement?.insertBefore(
					this.dropIndicator,
					position === "before" ? target : target.nextSibling
				);
			}
		}
	};

	private onDrop = (e: Event): void => {
		e.preventDefault();
		const dragEvent = e as DragEvent;

		if (
			!this.draggedPath ||
			!this.currentDropTarget ||
			!this.currentDropPosition
		) {
			this.cleanup();
			return;
		}

		const targetPath = this.getPath(this.currentDropTarget);
		const draggedName = getName(this.draggedPath);
		const fromFolder = getParentPath(this.draggedPath);

		let toFolder: string;
		let targetIndex: number;

		if (this.currentDropPosition === "into") {
			toFolder = targetPath;
			const targetContainer =
				this.currentDropTarget.querySelector(
					".nav-folder-children"
				);
			const existingOrder = this.store.getOrder(toFolder);
			targetIndex = existingOrder
				? existingOrder.length
				: targetContainer?.children.length ?? 0;
		} else {
			toFolder = this.getFolderPath(this.currentDropTarget);
			const siblings = Array.from(
				this.currentDropTarget.parentElement!.children
			).filter(
				(el) =>
					el.classList.contains("nav-file") ||
					el.classList.contains("nav-folder")
			);
			const targetItemIndex = siblings.indexOf(this.currentDropTarget);
			targetIndex =
				this.currentDropPosition === "before"
					? targetItemIndex
					: targetItemIndex + 1;
		}

		// Update store
		this.store.moveItem(fromFolder, toFolder, draggedName, targetIndex);

		// Update DOM
		if (this.currentDropPosition === "into") {
			const targetContainer =
				this.currentDropTarget.querySelector(
					".nav-folder-children"
				);
			if (targetContainer) {
				const draggedEl = this.findDraggedElement();
				if (draggedEl) {
					targetContainer.appendChild(draggedEl);
				}
			}
		} else {
			const draggedEl = this.findDraggedElement();
			if (draggedEl) {
				this.currentDropTarget.parentElement?.insertBefore(
					draggedEl,
					this.currentDropPosition === "before"
						? this.currentDropTarget
						: this.currentDropTarget.nextSibling
				);
			}
		}

		this.cleanup();
	};

	private onDragEnd = (e: Event): void => {
		this.cleanup();
	};

	private onDragLeave = (e: Event): void => {
		const dragEvent = e as DragEvent;
		const related = dragEvent.relatedTarget as HTMLElement;
		if (
			this.currentDropTarget &&
			(!related || !this.currentDropTarget.contains(related))
		) {
			this.clearDropState();
		}
	};

	private cleanup(): void {
		this.clearDropState();
		document
			.querySelectorAll(".is-being-dragged")
			.forEach((el) => el.classList.remove("is-being-dragged"));
		this.draggedPath = null;
		this.patcher.resume();
	}

	private clearDropState(): void {
		if (this.currentDropTarget) {
			this.currentDropTarget.classList.remove("drop-into");
		}
		this.dropIndicator.remove();
		this.currentDropTarget = null;
		this.currentDropPosition = null;
	}

	private getItemElement(el: HTMLElement): HTMLElement | null {
		if (
			el.classList.contains("nav-file") ||
			el.classList.contains("nav-folder")
		) {
			return el;
		}
		return el.closest(".nav-file") ?? el.closest(".nav-folder");
	}

	private getPath(el: HTMLElement): string {
		const title =
			el.querySelector(".nav-file-title") ??
			el.querySelector(".nav-folder-title");
		return title?.getAttribute("data-path") ?? "";
	}

	private isFolder(path: string): boolean {
		return !!document.querySelector(
			`.nav-folder-title[data-path="${CSS.escape(path)}"]`
		);
	}

	private getFolderPath(el: HTMLElement): string {
		const folderEl = el.closest(".nav-folder-children");
		if (!folderEl) return "";
		const parentFolder = folderEl.closest(".nav-folder");
		if (!parentFolder) return "";
		const title = parentFolder.querySelector(".nav-folder-title");
		return title?.getAttribute("data-path") ?? "";
	}

	private findDraggedElement(): HTMLElement | null {
		if (!this.draggedPath) return null;
		const escaped = CSS.escape(this.draggedPath);
		return (
			document.querySelector(
				`.nav-file-title[data-path="${escaped}"]`
			)?.closest(".nav-file") ??
			(document.querySelector(
				`.nav-folder-title[data-path="${escaped}"]`
			)?.closest(".nav-folder") as HTMLElement | null)
		);
	}
}
