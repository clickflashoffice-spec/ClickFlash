import { Project, SyntaxKind } from "ts-morph";

async function main() {
  const project = new Project();
  
  // Add only source files within apps/*/src to avoid breaking public/ or scripts/ files
  project.addSourceFilesAtPaths([
    "apps/*/src/**/*.ts",
    "apps/*/src/**/*.tsx",
    "apps/*/src/**/*.js",
    "apps/*/src/**/*.jsx",
    "!apps/**/node_modules/**",
    "!apps/**/dist/**",
    "!apps/**/.next/**"
  ]);

  const sourceFiles = project.getSourceFiles();
  let filesModified = 0;
  let logsReplaced = 0;

  for (const sourceFile of sourceFiles) {
    let hasModifications = false;
    
    // Find all CallExpressions
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    for (const callExpr of callExpressions) {
      const expression = callExpr.getExpression();
      const text = expression.getText();
      
      if (text === "console.log" || text === "console.error" || text === "console.warn") {
        const method = text.split(".")[1]; // log, error, warn
        
        // Map console methods to logger methods
        let loggerMethod = method;
        if (method === "log") loggerMethod = "info";
        
        expression.replaceWithText(`logger.${loggerMethod}`);
        hasModifications = true;
        logsReplaced++;
      }
    }

    if (hasModifications) {
      // Check if logger is already imported
      const imports = sourceFile.getImportDeclarations();
      const hasLoggerImport = imports.some(imp => 
        imp.getModuleSpecifierValue() === "@/utils/logger" &&
        imp.getNamedImports().some(named => named.getName() === "logger")
      );

      if (!hasLoggerImport) {
        sourceFile.addImportDeclaration({
          namedImports: ["logger"],
          moduleSpecifier: "@/utils/logger"
        });
      }

      filesModified++;
    }
  }

  console.log(`Processed ${sourceFiles.length} files in src/ directories.`);
  console.log(`Modified ${filesModified} files.`);
  console.log(`Replaced ${logsReplaced} console statements.`);

  // Save all modified files
  await project.save();
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
