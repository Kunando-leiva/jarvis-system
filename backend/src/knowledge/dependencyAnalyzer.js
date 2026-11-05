// backend/src/knowledge/dependencyAnalyzer.js
// 🕸️ ANALIZADOR DE DEPENDENCIAS - Descubre relaciones entre componentes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DependencyAnalyzer {
  constructor(knowledgeService) {
    this.knowledge = knowledgeService;
    this.dependencies = new Map();
  }

  /**
   * Analiza todos los servicios y construye un grafo de dependencias
   */
  analyze() {
    const services = this.knowledge.getServices();
    const srcPath = path.join(this.knowledge.projectRoot, 'backend', 'src');
    
    for (const service of services) {
      const filePath = service.path;
      if (!fs.existsSync(filePath)) continue;
      
      const content = fs.readFileSync(filePath, 'utf-8');
      const imports = this._extractImports(content);
      const exports = this._extractExports(content);
      
      this.dependencies.set(service.name, {
        file: service.name,
        path: filePath,
        imports: imports,
        exports: exports,
        usedBy: [],
      });
    }
    
    // Construir relaciones inversas (usedBy)
    for (const [name, data] of this.dependencies) {
      for (const [otherName, otherData] of this.dependencies) {
        if (otherData.imports.includes(name) || otherData.imports.some(i => i.includes(name))) {
          data.usedBy.push(otherName);
        }
      }
    }
    
    return this.dependencies;
  }

  _extractImports(content) {
    const imports = [];
    // Import statements: import X from 'Y'
    const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  _extractExports(content) {
    const exports = [];
    // export statements
    const exportRegex = /export\s+(?:default\s+)?(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  /**
   * Obtiene dependencias de un componente
   */
  getDependencies(componentName) {
    return this.dependencies.get(componentName) || null;
  }

  /**
   * Encuentra qué componentes dependen de otro
   */
  getDependents(componentName) {
    const result = [];
    for (const [name, data] of this.dependencies) {
      if (data.imports.some(i => i.includes(componentName))) {
        result.push(name);
      }
    }
    return result;
  }
}