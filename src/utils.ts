/**
 * Get the folder path from a file/folder path.
 * "projects/notes/idea.md" → "projects/notes"
 * "README.md" → ""
 * "projects" → ""
 */
export function getParentPath(path: string): string {
	const lastSlash = path.lastIndexOf("/");
	return lastSlash === -1 ? "" : path.substring(0, lastSlash);
}

/**
 * Get the name (last segment) from a path.
 * "projects/notes/idea.md" → "idea.md"
 * "README.md" → "README.md"
 * "projects" → "projects"
 */
export function getName(path: string): string {
	const lastSlash = path.lastIndexOf("/");
	return lastSlash === -1 ? path : path.substring(lastSlash + 1);
}

/**
 * Check if childPath is a subfolder of parentPath.
 * isSubfolder("a/b/c", "a/b") → true
 * isSubfolder("a/b", "a/b") → false
 * isSubfolder("a/c", "a/b") → false
 */
export function isSubfolder(childPath: string, parentPath: string): boolean {
	if (parentPath === "") {
		return childPath.includes("/");
	}
	return childPath.startsWith(parentPath + "/");
}
