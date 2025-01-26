import fs from 'fs';
import path from 'path';

/**
 * Custom import callback for Solidity compiler.
 * Resolves imports from local project files and node_modules.
 *
 * @param importPath - The import path specified in the Solidity file.
 * @returns An object containing the file contents or an error message.
 */
export function findImports(importPath: string) {
  // Define potential base paths for resolving imports
  const basePaths = [
    path.resolve(__dirname, '../contracts'),    // Local contracts directory
    path.resolve(__dirname, '../../node_modules') // node_modules directory
  ];

  // Attempt to resolve and read the import from each base path
  for (const basePath of basePaths) {
    try {
      const fullPath = path.resolve(basePath, importPath);
      console.log(`Trying to resolve: ${importPath} in ${fullPath}`);
      const content = fs.readFileSync(fullPath, 'utf8');
      console.log(`Resolved: ${importPath}`);
      return { contents: content };
    } catch (error) {
      console.log(`Failed to resolve: ${importPath} in ${basePath}`);
    }
  }

  // If the file is not found in any base path, return an error
  return { error: `Import not found: ${importPath}` };
}
