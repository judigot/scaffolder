import { IFolder, IStructure } from '@/components/FileViewer.tsx';

/**
 * Finds all folders that match a wildcard path pattern.
 * Supports '**' to recursively match all subdirectories.
 */
export const findFoldersWithWildcard = (
  root: IStructure,
  pathPattern: string
): IFolder[] => {
  // Split the path by '/' and filter out empty segments
  const pathSegments = pathPattern.split('/').filter(Boolean);
  
  // Start with the root folders
  let folders: IFolder[] = root.filter(
    (item): item is IFolder => item.type === 'folder'
  );
  
  // If no path segments, return empty array
  if (pathSegments.length === 0) {
    return [];
  }
  
  // Flag to track if we're in '**' recursive mode
  let isRecursiveWildcard = false;
  let segmentIndex = 0;
  
  // Process each segment
  while (segmentIndex < pathSegments.length) {
    const segment = pathSegments[segmentIndex];
    
    // If we encounter '**', enter recursive mode
    if (segment === '**') {
      isRecursiveWildcard = true;
      segmentIndex++;
      
      // If '**' is the last segment, return all folders and their descendants
      if (segmentIndex >= pathSegments.length) {
        return getAllDescendantFolders(folders);
      }
      
      continue;
    }
    
    // If in recursive mode, find all descendants that match the current segment
    if (isRecursiveWildcard) {
      const remainingPath = pathSegments.slice(segmentIndex).join('/');
      return getAllDescendantFoldersMatchingPath(folders, remainingPath);
    }
    
    // Standard path segment matching
    const matchingFolders: IFolder[] = [];
    
    for (const folder of folders) {
      if (folder.name === segment) {
        matchingFolders.push(folder);
      }
    }
    
    // Update folders for next iteration
    folders = matchingFolders.flatMap(folder => 
      folder.children.filter(
        (item): item is IFolder => item.type === 'folder'
      )
    );
    
    segmentIndex++;
    
    // If we've reached the end of the path, return current matching folders
    if (segmentIndex >= pathSegments.length) {
      return matchingFolders;
    }
  }
  
  return folders;
};

/**
 * Gets all descendant folders recursively from a list of parent folders.
 */
export const getAllDescendantFolders = (folders: IFolder[]): IFolder[] => {
  const result = [...folders];
  
  const queue = [...folders];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {continue;}
    
    const childFolders = current.children.filter(
      (item): item is IFolder => item.type === 'folder'
    );
    
    result.push(...childFolders);
    queue.push(...childFolders);
  }
  
  return result;
};

/**
 * Recursively finds all folders that match the remaining path pattern.
 */
export const getAllDescendantFoldersMatchingPath = (
  rootFolders: IFolder[],
  remainingPath: string
): IFolder[] => {
  const result: IFolder[] = [];
  
  // Get all descendant folders
  const allDescendants = getAllDescendantFolders(rootFolders);
  
  // For each descendant, check if its sub-path matches the remaining path
  for (const folder of allDescendants) {
    const matchingFolders = findFoldersWithWildcard(
      [folder],
      remainingPath
    );
    
    result.push(...matchingFolders);
  }
  
  return result;
};

/**
 * Builds the full path for a folder by traversing the folder structure.
 * Uses a breadth-first search to find the shortest path to the folder.
 */
export const buildFolderPath = (
  targetFolder: IFolder,
  root: IStructure
): string => {
  // Special case for root level folders
  const rootLevelFolder = root.find(
    (item): item is IFolder => 
      item.type === 'folder' && item === targetFolder
  );
  
  if (rootLevelFolder) {
    return `/${rootLevelFolder.name}`;
  }
  
  // Use breadth-first search to find paths to the target folder
  interface IQueueItem {
    folder: IFolder;
    path: string;
  }
  
  const queue: IQueueItem[] = root
    .filter((item): item is IFolder => item.type === 'folder')
    .map(folder => ({ 
      folder, 
      path: `/${folder.name}`
    }));
  
  const visited = new Set<IFolder>();
  
  while (queue.length > 0) {
    const queueItem = queue.shift();
    // Safety check to satisfy TypeScript
    if (!queueItem) {continue;}
    
    const { folder, path } = queueItem;
    
    if (visited.has(folder)) {continue;}
    visited.add(folder);
    
    // Check if this is our target folder
    if (folder === targetFolder) {
      return path;
    }
    
    // Add child folders to the queue
    const childFolders = folder.children.filter(
      (item): item is IFolder => item.type === 'folder'
    );
    
    for (const childFolder of childFolders) {
      if (!visited.has(childFolder)) {
        queue.push({
          folder: childFolder,
          path: `${path}/${childFolder.name}`
        });
      }
    }
  }
  
  // If no path is found, return just the folder name (fallback)
  return `/${targetFolder.name}`;
};
