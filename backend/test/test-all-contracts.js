// backend/test/test-all-contracts.js
// 🧪 PRUEBA DE TODOS LOS CONTRATOS - FASE 2

import knowledgeService from '../src/knowledge/index.js';
import { PublicContractService } from '../src/knowledge/publicContractService.js';
import fs from 'fs';
import path from 'path';

console.log('🧪 ANÁLISIS COMPLETO DE CONTRATOS\n');
console.log('=' .repeat(70));

await knowledgeService.initialize();

const contractService = new PublicContractService(knowledgeService);

// ─── 1. OBTENER TODOS LOS CONTRATOS ──────────────────────────

console.log('\n📊 GENERANDO CONTRATOS PARA TODOS LOS COMPONENTES\n');

const allContracts = contractService.getAllContracts();
const componentNames = Object.keys(allContracts);

console.log(`  Total de componentes: ${componentNames.length}`);
console.log(`  Servicios: ${knowledgeService.getServices().length}`);
console.log(`  Agentes: ${knowledgeService.getAgents().length}`);

// ─── 2. ANALIZAR ESTADÍSTICAS ──────────────────────────────────

console.log('\n📊 ESTADÍSTICAS DE CONTRATOS\n');

let totalMethods = 0;
let totalInherited = 0;
let totalDefined = 0;
let completeContracts = 0;
let incompleteContracts = 0;
let missingSignaturesTotal = 0;

const incompleteList = [];
const noMethodsList = [];

for (const [name, contract] of Object.entries(allContracts)) {
  if (!contract.exists) continue;
  
  const methods = contract.publicMethods || [];
  totalMethods += methods.length;
  
  const inherited = methods.filter(m => m.inherited).length;
  const defined = methods.filter(m => !m.inherited).length;
  totalInherited += inherited;
  totalDefined += defined;
  
  const isComplete = contract.validation?.complete || false;
  if (isComplete) {
    completeContracts++;
  } else {
    incompleteContracts++;
    incompleteList.push(name);
    const missing = contract.validation?.missingSignatures || [];
    missingSignaturesTotal += missing.length;
  }
  
  if (methods.length === 0) {
    noMethodsList.push(name);
  }
}

console.log(`  📌 Métodos totales: ${totalMethods}`);
console.log(`     ├─ Definidos en archivo: ${totalDefined}`);
console.log(`     └─ Heredados (BaseService): ${totalInherited}`);
console.log('');
console.log(`  📌 Contratos:`);
console.log(`     ├─ Completos: ${completeContracts}`);
console.log(`     └─ Incompletos: ${incompleteContracts}`);
console.log('');
console.log(`  📌 Métodos faltantes totales: ${missingSignaturesTotal}`);

// ─── 3. LISTAR COMPONENTES INCOMPLETOS ──────────────────────

if (incompleteList.length > 0) {
  console.log('\n⚠️ COMPONENTES CON CONTRATOS INCOMPLETOS:\n');
  for (const name of incompleteList) {
    const contract = allContracts[name];
    const missing = contract.validation?.missingSignatures || [];
    console.log(`  ❌ ${name}: faltan ${missing.length} métodos`);
    console.log(`     → ${missing.join(', ')}`);
  }
} else {
  console.log('\n✅ ¡TODOS LOS CONTRATOS ESTÁN COMPLETOS!');
}

// ─── 4. LISTAR COMPONENTES SIN MÉTODOS ──────────────────────

if (noMethodsList.length > 0) {
  console.log('\n📌 COMPONENTES SIN MÉTODOS PÚBLICOS:\n');
  for (const name of noMethodsList) {
    console.log(`  📄 ${name}`);
  }
}

// ─── 5. EXPORTAR A ARCHIVO ──────────────────────────────────

console.log('\n💾 EXPORTANDO CONTRATOS A JSON...');

const exportPath = path.join(process.cwd(), 'contracts-export.json');
const exportData = {
  generatedAt: new Date().toISOString(),
  totalComponents: componentNames.length,
  statistics: {
    totalMethods,
    totalInherited,
    totalDefined,
    completeContracts,
    incompleteContracts,
    missingSignaturesTotal
  },
  contracts: allContracts
};

fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
console.log(`  ✅ Contratos exportados a: ${exportPath}`);

// ─── 6. RESUMEN ──────────────────────────────────────────────

console.log('\n' + '=' .repeat(70));
console.log('\n📊 RESUMEN FINAL:');
console.log(`  ✅ Componentes analizados: ${componentNames.length}`);
console.log(`  ✅ Contratos completos: ${completeContracts}/${componentNames.length}`);
console.log(`  📝 Métodos públicos totales: ${totalMethods}`);

if (incompleteList.length === 0) {
  console.log('\n🎉 ¡EXCELENTE! Todos los contratos están completos.');
  console.log('   Fase 2 lista para avanzar a validación automática.');
} else {
  console.log(`\n⚠️ ${incompleteList.length} componentes necesitan revisión.`);
  console.log('   Revisar los contratos incompletos antes de continuar.');
}

console.log('\n✅ Análisis completado');

await knowledgeService.shutdown();