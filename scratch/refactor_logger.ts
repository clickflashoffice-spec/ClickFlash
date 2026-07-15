import { Project, SyntaxKind, CallExpression, Node } from "ts-morph";
import * as path from "path";

const project = new Project();
project.addSourceFilesAtPaths([
  "apps/**/*.ts",
  "apps/**/*.tsx",
  "packages/**/*.ts",
  "packages/**/*.tsx",
  "workers/**/*.ts"
]);

let modifiedCount = 0;

for (const sourceFile of project.getSourceFiles()) {
  const filePath = sourceFile.getFilePath();
  
  // Skip tests, scripts, and type declarations where console is usually fine or mocked
  if (
    filePath.includes(".d.ts") ||
    filePath.includes("test") ||
    filePath.includes("spec") ||
    filePath.includes("scripts") ||
    filePath.includes("setupTests") ||
    filePath.includes("vitest.setup")
  ) {
    continue;
  }

  let hasModifications = false;

  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression).reverse();

  for (const callExpr of callExpressions) {
    if (callExpr.wasForgotten()) continue;
    
    const expr = callExpr.getExpression();
    if (!expr || expr.wasForgotten()) continue;
    
    if (Node.isPropertyAccessExpression(expr)) {
      const obj = expr.getExpression();
      if (!obj || obj.wasForgotten()) continue;
      
      const name = expr.getName();

      if (obj.getText() === "console" && ["log", "warn", "error", "info", "debug"].includes(name)) {
        // We found a console call
        hasModifications = true;
        
        const args = callExpr.getArguments();
        if (args.length === 0) continue;

        // Map console methods to logger methods
        const loggerMethod = name === "log" ? "info" : name;
        
        // Rewrite the call
        // Because logger requires (message: string, meta?: any)
        // we'll bundle everything into a string template if there are multiple args,
        // or just pass them if it's already a string.
        let newCall = "";
        
        if (args.length === 1) {
           newCall = `logger.${loggerMethod}(String(${args[0].getText()}))`;
        } else {
           // If first arg is a string literal, keep it as the message, rest as meta array
           if (Node.isStringLiteral(args[0]) || Node.isNoSubstitutionTemplateLiteral(args[0])) {
               const metaArgs = args.slice(1).map(a => a.getText()).join(", ");
               newCall = `logger.${loggerMethod}(${args[0].getText()}, { args: [${metaArgs}] })`;
           } else {
               const allArgs = args.map(a => `String(${a.getText()})`).join(" + ' ' + ");
               newCall = `logger.${loggerMethod}(${allArgs})`;
           }
        }
        
        callExpr.replaceWithText(newCall);
      }
    }
  }

  if (hasModifications) {
    // Check if import { logger } from '@clickflash/logger' exists
    const imports = sourceFile.getImportDeclarations();
    let hasLoggerImport = false;
    for (const imp of imports) {
      if (imp.getModuleSpecifierValue() === "@clickflash/logger") {
        hasLoggerImport = true;
        break;
      }
    }

    if (!hasLoggerImport) {
      sourceFile.addImportDeclaration({
        namedImports: ["logger"],
        moduleSpecifier: "@clickflash/logger"
      });
    }

    modifiedCount++;
  }
}

project.saveSync();
console.log(`Successfully refactored ${modifiedCount} files.`);
