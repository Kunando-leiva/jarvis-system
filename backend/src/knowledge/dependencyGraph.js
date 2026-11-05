// backend/src/knowledge/dependencyGraph.js
// 🔗 DEPENDENCY GRAPH - Grafo de dependencias del sistema

import { ComponentAnalyzer } from './componentAnalyzer.js';
import { logger } from '../core/logger.js';

export class DependencyGraph {
  constructor(knowledgeService) {
    this.knowledge = knowledgeService;
    this.componentAnalyzer = new ComponentAnalyzer(knowledgeService);
    this.graph = null;
    this.initialized = false;
  }

  /**
   * Construye el grafo de dependencias
   */
  buildGraph() {
    const components = this._getAllComponents();
    const graph = {};

    for (const componentName of components) {
      // Usar ComponentAnalyzer para obtener dependencias detalladas
      const analysis = this.componentAnalyzer.analyze(componentName);
      
      if (analysis.exists) {
        graph[componentName] = {
          type: analysis.type || 'unknown',
          path: analysis.path,
          internalDependencies: analysis.internalDependencies || [],
          externalDependencies: analysis.externalDependencies || [],
          nodeDependencies: analysis.nodeDependencies || [],
          publicMethods: analysis.publicMethods || [],
          usedBy: [] // Se llenará después
        };
      }
    }

    // Llenar usedBy (quién usa a quién)
    for (const [name, data] of Object.entries(graph)) {
      const usedBy = [];
      for (const [otherName, otherData] of Object.entries(graph)) {
        if (otherData.internalDependencies.includes(name)) {
          usedBy.push(otherName);
        }
      }
      data.usedBy = usedBy;
    }

    this.graph = graph;
    this.initialized = true;
    
    logger.debug('[DependencyGraph] Grafo construido', {
      nodes: Object.keys(graph).length,
      edges: this._countEdges(graph)
    });

    return graph;
  }

  /**
   * Obtiene las dependencias de un componente
   */
  getDependencies(componentName) {
    if (!this.initialized) {
      this.buildGraph();
    }
    
    const node = this.graph?.[componentName];
    if (!node) {
      return {
        internalDependencies: [],
        externalDependencies: [],
        nodeDependencies: []
      };
    }

    return {
      internalDependencies: node.internalDependencies || [],
      externalDependencies: node.externalDependencies || [],
      nodeDependencies: node.nodeDependencies || []
    };
  }

  /**
   * Obtiene los dependientes de un componente
   */
  getDependents(componentName) {
    if (!this.initialized) {
      this.buildGraph();
    }
    
    const node = this.graph?.[componentName];
    if (!node) {
      return [];
    }

    return node.usedBy || [];
  }

  /**
   * Obtiene el grafo completo
   */
  getGraph() {
    if (!this.initialized) {
      this.buildGraph();
    }
    return this.graph;
  }

  // ─── PRIVADOS ────────────────────────────────────────────────

  _getAllComponents() {
    const components = [];
    
    const services = this.knowledge.getServices();
    for (const service of services) {
      components.push(service.name);
    }
    
    const agents = this.knowledge.getAgents();
    for (const agent of agents) {
      components.push(agent.name);
    }
    
    return components;
  }

  _countEdges(graph) {
    let count = 0;
    for (const [name, data] of Object.entries(graph)) {
      count += (data.internalDependencies || []).length;
    }
    return count;
  }
}