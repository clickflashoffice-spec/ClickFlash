module.exports = function(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  const consoleCalls = root.find(j.CallExpression, {
    callee: {
      type: 'MemberExpression',
      object: { name: 'console' }
    }
  });

  if (consoleCalls.length === 0) return fileInfo.source;

  let hasChanges = false;
  const importName = 'logger';

  consoleCalls.forEach(path => {
    const propName = path.node.callee.property.name;
    if (propName === 'log') {
      path.node.callee.property.name = 'info';
    } else if (['error', 'warn', 'debug', 'info'].includes(propName)) {
      // keep same
    } else {
      return; // ignore console.table etc
    }
    path.node.callee.object.name = importName;
    hasChanges = true;
  });

  if (hasChanges) {
    const hasLoggerImport = root.find(j.ImportDeclaration).some(path => {
      // Check if importing from "@/utils/logger" or "../utils/logger"
      if (!path.node.source.value) return false;
      const src = path.node.source.value.toString();
      if (src.includes('logger')) {
        return path.node.specifiers.some(spec => spec.local && spec.local.name === importName);
      }
      return false;
    });

    if (!hasLoggerImport) {
      // Detect if this is backend or frontend based on file path
      // If frontend (has /src/), use @/utils/logger. If backend, use relative path to backend/utils/logger, or if alias exists.
      // Assuming alias @/utils/logger works for both or frontend only.
      // Wait, ClickFlash apps often have alias for backend? Let's just use @/utils/logger.
      const importStatement = j.importDeclaration(
        [j.importSpecifier(j.identifier('logger'))],
        j.literal('@/utils/logger')
      );
      
      const imports = root.find(j.ImportDeclaration);
      if (imports.length > 0) {
        imports.at(imports.length - 1).insertAfter(importStatement);
      } else {
        root.get().node.program.body.unshift(importStatement);
      }
    }
  }

  return hasChanges ? root.toSource() : fileInfo.source;
};
