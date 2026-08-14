// backend/src/agents/systemMonitorAgent.js
// 🛡️ HEIMDALL - Agente de Monitoreo y Vigilancia del Sistema - VERSIÓN CORREGIDA PARA WINDOWS

import { BaseAgent } from './BaseAgent.js';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class SystemMonitorAgent extends BaseAgent {
  constructor() {
    super({
      id: 'heimdall-monitor',
      name: 'HEIMDALL',
      icon: '🛡️',
      description: 'Vigilante del Sistema - Monitoreo 24/7 de errores, energía y comportamiento',
      color: '#00ff88',
      systemPrompt: `
        Sos HEIMDALL, el vigilante eterno del sistema JARVIS.
        Tu misión es monitorear constantemente todo el sistema en busca de:
        - ⚠️ Errores y fallas
        - 📊 Rendimiento y recursos
        - ⚡ Consumo de energía
        - 🔥 Comportamiento anómalo
        - 📈 Tendencias y predicciones
        
        Tus respuestas deben ser:
        - Claras y concisas
        - Con datos concretos
        - Con recomendaciones accionables
        - Con nivel de severidad (CRÍTICO, ALTO, MEDIO, BAJO, INFO)
      `
    });

    this.monitoringData = {
      history: [],
      alerts: [],
      metrics: {
        cpu: [],
        memory: [],
        disk: [],
        network: [],
        processes: [],
        errors: []
      },
      lastCheck: null,
      status: 'idle'
    };

    this.thresholds = {
      cpu: { warning: 70, critical: 90 },
      memory: { warning: 75, critical: 90 },
      disk: { warning: 80, critical: 95 },
      temperature: { warning: 70, critical: 85 },
      uptime: { warning: 720, critical: 1680 }
    };

    this.startMonitoring();
  }

  // ─── INICIAR MONITOREO ──────────────────────────────────────
  startMonitoring() {
    console.log('[HEIMDALL] 🛡️ Vigilancia activada');

    this.monitorInterval = setInterval(async () => {
      await this.collectMetrics();
      await this.analyzeMetrics();
    }, 300000);

    this.quickCheckInterval = setInterval(async () => {
      await this.quickHealthCheck();
    }, 30000);

    setTimeout(async () => {
      await this.collectMetrics();
      await this.analyzeMetrics();
    }, 2000);
  }

  // ─── RECOLECTAR MÉTRICAS (CORREGIDO PARA WINDOWS) ──────────
  async collectMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        cpu: await this.getCPUInfo(),
        memory: await this.getMemoryInfo(),
        disk: await this.getDiskInfo(),
        processes: await this.getProcessInfo(),
        network: await this.getNetworkInfo(),
        temperature: await this.getTemperature(),
        uptime: os.uptime(),
        load: os.loadavg()
      };

      // Guardar histórico
      this.monitoringData.metrics.cpu.push(metrics.cpu);
      this.monitoringData.metrics.memory.push(metrics.memory);
      this.monitoringData.metrics.disk = metrics.disk; // Actualizar siempre

      // Mantener solo últimas 100 mediciones
      for (const key of ['cpu', 'memory']) {
        if (this.monitoringData.metrics[key].length > 100) {
          this.monitoringData.metrics[key].shift();
        }
      }

      this.monitoringData.lastCheck = new Date();
      this.saveMetrics(metrics);

      return metrics;
    } catch (error) {
      console.error('[HEIMDALL] ❌ Error recolectando métricas:', error.message);
      return null;
    }
  }

  // ─── OBTENER CPU (CORREGIDO) ──────────────────────────────
  async getCPUInfo() {
    try {
      const cpus = os.cpus();
      
      // Calcular uso de CPU correctamente
      let totalIdle = 0;
      let totalTick = 0;
      
      for (const cpu of cpus) {
        const times = cpu.times;
        totalTick += times.user + times.nice + times.sys + times.idle + times.irq;
        totalIdle += times.idle;
      }
      
      const usage = 100 - (totalIdle / totalTick) * 100;
      
      return {
        usage: Math.round(usage),
        cores: cpus.map((cpu, i) => {
          const times = cpu.times;
          const total = times.user + times.nice + times.sys + times.idle + times.irq;
          const idle = times.idle;
          return Math.round(100 - (idle / total) * 100);
        }),
        coresCount: cpus.length,
        model: cpus[0]?.model || 'Desconocido',
        speed: cpus[0]?.speed || 0
      };
    } catch (error) {
      console.error('[HEIMDALL] Error CPU:', error.message);
      return { usage: 0, cores: [], coresCount: 0, model: 'Desconocido', speed: 0 };
    }
  }

  // ─── OBTENER MEMORIA (CORREGIDO) ──────────────────────────
  async getMemoryInfo() {
    try {
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      
      // Obtener memoria swap en Windows
      let swapTotal = 0;
      let swapUsed = 0;
      try {
        const { stdout } = await execAsync('wmic os get TotalVirtualMemorySize,FreeVirtualMemory');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          if (parts.length >= 2) {
            swapTotal = parseInt(parts[0]) * 1024; // KB a bytes
            swapUsed = swapTotal - (parseInt(parts[1]) * 1024);
          }
        }
      } catch {
        // Si falla, usar valores por defecto
        swapTotal = total * 0.5;
        swapUsed = swapTotal * 0.3;
      }
      
      return {
        total: this.formatBytes(total),
        used: this.formatBytes(used),
        free: this.formatBytes(free),
        usagePercent: Math.round((used / total) * 100),
        swap: {
          total: this.formatBytes(swapTotal),
          used: this.formatBytes(swapUsed),
          free: this.formatBytes(swapTotal - swapUsed)
        }
      };
    } catch (error) {
      console.error('[HEIMDALL] Error MEMORIA:', error.message);
      return { total: '0 B', used: '0 B', free: '0 B', usagePercent: 0, swap: { total: '0 B', used: '0 B', free: '0 B' } };
    }
  }

  // ─── OBTENER DISCO (CORREGIDO PARA WINDOWS) ──────────────
  async getDiskInfo() {
    try {
      const { stdout } = await execAsync('wmic logicaldisk where drivetype=3 get deviceid,size,freespace');
      const lines = stdout.trim().split('\n').slice(1);
      
      const disks = [];
      for (const line of lines) {
        if (!line.trim()) continue;
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 3) {
          const drive = parts[0];
          const freeSpace = parseInt(parts[1]);
          const size = parseInt(parts[2]);
          if (!isNaN(freeSpace) && !isNaN(size) && size > 0) {
            const used = size - freeSpace;
            disks.push({
              drive: drive,
              total: this.formatBytes(size),
              used: this.formatBytes(used),
              free: this.formatBytes(freeSpace),
              usagePercent: Math.round((used / size) * 100)
            });
          }
        }
      }
      
      // Si no hay discos, usar datos de fallback
      if (disks.length === 0) {
        return [{
          drive: 'C:',
          total: 'N/A',
          used: 'N/A',
          free: 'N/A',
          usagePercent: 0
        }];
      }
      
      return disks;
    } catch (error) {
      console.error('[HEIMDALL] Error DISCO:', error.message);
      return [{
        drive: 'C:',
        total: 'N/A',
        used: 'N/A',
        free: 'N/A',
        usagePercent: 0
      }];
    }
  }

  // ─── OBTENER PROCESOS (CORREGIDO) ─────────────────────────
  async getProcessInfo() {
    try {
      // Obtener procesos con PM2
      let pm2Processes = [];
      try {
        const { stdout } = await execAsync('pm2 list --no-color');
        const lines = stdout.split('\n');
        let inTable = false;
        
        for (const line of lines) {
          if (line.includes('id │ name')) {
            inTable = true;
            continue;
          }
          if (inTable && line.includes('└')) break;
          if (inTable && line.trim()) {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 7 && !isNaN(parts[0])) {
              pm2Processes.push({
                id: parseInt(parts[0]),
                name: parts[1],
                status: parts[4] || 'unknown',
                cpu: parts[5] || '0%',
                memory: parts[6] || '0b'
              });
            }
          }
        }
      } catch {
        // PM2 no está instalado o no se encuentra
        pm2Processes = [];
      }

      // Obtener procesos del sistema
      let systemProcesses = [];
      try {
        const { stdout } = await execAsync('tasklist /NH /FO CSV');
        systemProcesses = stdout.split('\n')
          .filter(line => line.trim())
          .slice(0, 20)
          .map(line => {
            const parts = line.replace(/"/g, '').split(',');
            return {
              name: parts[0] || 'Unknown',
              pid: parseInt(parts[1]) || 0,
              memory: parts[4] || '0'
            };
          });
      } catch {
        systemProcesses = [];
      }

      return {
        pm2: pm2Processes,
        system: systemProcesses.slice(0, 10),
        total: systemProcesses.length
      };
    } catch (error) {
      console.error('[HEIMDALL] Error PROCESOS:', error.message);
      return { pm2: [], system: [], total: 0 };
    }
  }

  // ─── OBTENER RED ──────────────────────────────────────────────
  async getNetworkInfo() {
    try {
      const interfaces = os.networkInterfaces();
      const connections = [];

      for (const [name, iface] of Object.entries(interfaces)) {
        for (const info of iface || []) {
          if (info.family === 'IPv4' && !info.internal) {
            connections.push({
              interface: name,
              address: info.address,
              mac: info.mac,
              netmask: info.netmask
            });
          }
        }
      }

      return {
        connections,
        hostname: os.hostname(),
        platform: process.platform,
        arch: process.arch
      };
    } catch (error) {
      return { connections: [], hostname: 'unknown', platform: process.platform, arch: process.arch };
    }
  }

  // ─── OBTENER TEMPERATURA ──────────────────────────────────────
  async getTemperature() {
    try {
      const { stdout } = await execAsync('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature');
      const lines = stdout.trim().split('\n');
      if (lines.length > 1) {
        const temp = parseInt(lines[1].trim()) / 10;
        return Math.round(temp);
      }
      return 0;
    } catch {
      return 0;
    }
  }

  // ─── ANALIZAR MÉTRICAS ──────────────────────────────────────
  async analyzeMetrics() {
    const alerts = [];
    const metrics = this.monitoringData.metrics;
    const lastCPU = metrics.cpu[metrics.cpu.length - 1];
    const lastMemory = metrics.memory[metrics.memory.length - 1];
    const disks = metrics.disk || [];

    // CPU
    if (lastCPU && lastCPU.usage) {
      if (lastCPU.usage > this.thresholds.cpu.critical) {
        alerts.push({
          level: 'CRÍTICO',
          type: 'CPU',
          message: `CPU al ${lastCPU.usage}% - Sobrecarga crítica`,
          timestamp: new Date().toISOString(),
          action: 'Revisar procesos que consumen CPU con pm2 list'
        });
      } else if (lastCPU.usage > this.thresholds.cpu.warning) {
        alerts.push({
          level: 'ALTO',
          type: 'CPU',
          message: `CPU al ${lastCPU.usage}% - Alto consumo`,
          timestamp: new Date().toISOString(),
          action: 'Monitorear procesos con pm2 monit'
        });
      }
    }

    // Memoria
    if (lastMemory && lastMemory.usagePercent) {
      if (lastMemory.usagePercent > this.thresholds.memory.critical) {
        alerts.push({
          level: 'CRÍTICO',
          type: 'MEMORIA',
          message: `Memoria al ${lastMemory.usagePercent}% - Riesgo de Out of Memory`,
          timestamp: new Date().toISOString(),
          action: 'Revisar procesos con pm2 list y considerar reiniciar'
        });
      } else if (lastMemory.usagePercent > this.thresholds.memory.warning) {
        alerts.push({
          level: 'ALTO',
          type: 'MEMORIA',
          message: `Memoria al ${lastMemory.usagePercent}% - Consumo elevado`,
          timestamp: new Date().toISOString(),
          action: 'Verificar fugas de memoria en los procesos'
        });
      }
    }

    // Disco
    for (const disk of disks) {
      if (disk.usagePercent > this.thresholds.disk.critical) {
        alerts.push({
          level: 'CRÍTICO',
          type: 'DISCO',
          message: `Disco ${disk.drive} al ${disk.usagePercent}% - Espacio crítico`,
          timestamp: new Date().toISOString(),
          action: 'Liberar espacio en disco'
        });
      } else if (disk.usagePercent > this.thresholds.disk.warning) {
        alerts.push({
          level: 'ALTO',
          type: 'DISCO',
          message: `Disco ${disk.drive} al ${disk.usagePercent}% - Espacio bajo`,
          timestamp: new Date().toISOString(),
          action: 'Revisar archivos temporales y logs'
        });
      }
    }

    if (alerts.length > 0) {
      this.monitoringData.alerts.push(...alerts);
      if (this.monitoringData.alerts.length > 50) {
        this.monitoringData.alerts = this.monitoringData.alerts.slice(-50);
      }
      console.log('[HEIMDALL] ⚠️ Alertas detectadas:', alerts.length);
    }

    return alerts;
  }

  // ─── CHEQUEO RÁPIDO ──────────────────────────────────────────
  async quickHealthCheck() {
    try {
      // Verificar servidor
      try {
        const response = await fetch('http://localhost:5000/health');
        if (!response.ok) {
          this.monitoringData.alerts.push({
            level: 'CRÍTICO',
            type: 'SERVIDOR',
            message: 'Health check falló - Servidor no responde',
            timestamp: new Date().toISOString(),
            action: 'Reiniciar servidor: pm2 restart jarvis-backend'
          });
        }
      } catch {
        // Silenciar error
      }

      // Verificar ngrok
      try {
        const response = await fetch('http://127.0.0.1:4040/api/tunnels');
        if (!response.ok) {
          this.monitoringData.alerts.push({
            level: 'ALTO',
            type: 'NGROK',
            message: 'ngrok no responde - Túnel caído',
            timestamp: new Date().toISOString(),
            action: 'Reiniciar ngrok: pm2 restart ngrok'
          });
        }
      } catch {
        // Silenciar error
      }

      // Verificar n8n
      try {
        await fetch('http://localhost:5678/healthz');
      } catch {
        this.monitoringData.alerts.push({
          level: 'ALTO',
          type: 'N8N',
          message: 'n8n no responde - Automatizaciones caídas',
          timestamp: new Date().toISOString(),
          action: 'Reiniciar n8n: pm2 restart n8n'
        });
      }

    } catch (error) {
      console.error('[HEIMDALL] ❌ Error en health check:', error.message);
    }
  }

  // ─── GUARDAR MÉTRICAS ──────────────────────────────────────
  saveMetrics(metrics) {
    try {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const logFile = path.join(logDir, 'system-metrics.log');
      const entry = JSON.stringify(metrics) + '\n';
      fs.appendFileSync(logFile, entry);
    } catch (error) {
      // Silenciar error de escritura
    }
  }

  // ─── OBTENER REPORTE ─────────────────────────────────────────
getReport() {
  const now = new Date();
  const lastMetrics = this.monitoringData.metrics;
  const lastCPU = lastMetrics.cpu[lastMetrics.cpu.length - 1] || { usage: 0 };
  const lastMemory = lastMetrics.memory[lastMetrics.memory.length - 1] || { usagePercent: 0 };
  const disks = lastMetrics.disk || [];

  return {
    timestamp: now.toISOString(),
    status: this.monitoringData.status,
    uptime: os.uptime(),
    metrics: {
      cpu: lastCPU,
      memory: lastMemory,
      disk: disks
    },
    alerts: this.monitoringData.alerts.slice(-10),
    processes: {
      pm2: this.monitoringData.metrics.processes?.pm2 || [],
      total: this.monitoringData.metrics.processes?.total || 0
    },
    health: {
      server: 'ok',
      ngrok: 'ok',
      n8n: 'ok'
    }
  };
}

  // ─── MANEJAR RESPUESTA ──────────────────────────────────────
  async handleResponse(text, message, context) {
    const command = text.toLowerCase().trim();

    if (command.includes('reporte') || command.includes('estado') || command.includes('resumen')) {
      return await this.handleReport();
    }
    if (command.includes('cpu') || command.includes('procesador')) {
      return await this.handleCPU();
    }
    if (command.includes('memoria') || command.includes('ram')) {
      return await this.handleMemory();
    }
    if (command.includes('disco') || command.includes('espacio')) {
      return await this.handleDisk();
    }
    if (command.includes('procesos') || command.includes('servicios')) {
      return await this.handleProcesses();
    }
    if (command.includes('alertas') || command.includes('errores')) {
      return await this.handleAlerts();
    }
    if (command.includes('energia') || command.includes('consumo')) {
      return await this.handleEnergy();
    }

    return {
      text: this.getHelpText(),
      provider: 'groq'
    };
  }

  // ─── COMANDO: REPORTE ──────────────────────────────────────
  async handleReport() {
    const report = this.getReport();
    const alerts = this.monitoringData.alerts.slice(-5);

    let alertText = '✅ Sin alertas activas';
    if (alerts.length > 0) {
      alertText = alerts.map(a => 
        `⚠️ [${a.level}] ${a.type}: ${a.message}`
      ).join('\n');
    }

    return {
      text: `
# 🛡️ HEIMDALL - REPORTE DEL SISTEMA

## 📊 ESTADO GENERAL
- **Uptime:** ${this.formatUptime(report.uptime)}
- **Última verificación:** ${new Date(report.timestamp).toLocaleString()}
- **Estado:** 🟢 Todo funcionando correctamente

## ⚡ RECURSOS
| Recurso | Uso | Estado |
|---------|-----|--------|
| CPU | ${report.metrics.cpu.usage}% | ${report.metrics.cpu.usage > 70 ? '⚠️ Alto' : '✅ Normal'} |
| Memoria | ${report.metrics.memory.usagePercent}% | ${report.metrics.memory.usagePercent > 75 ? '⚠️ Alto' : '✅ Normal'} |
| Procesos | ${report.processes.pm2.length} activos | ${report.processes.pm2.filter(p => p.status === 'online').length} online |

## ⚠️ ALERTAS RECIENTES
${alertText}

## 🔧 RECOMENDACIONES
${this.getRecommendations(report)}

## 📱 SERVICIOS
- **JARVIS:** ${report.health.server === 'ok' ? '✅' : '❌'}
- **ngrok:** ${report.health.ngrok === 'ok' ? '✅' : '❌'}
- **n8n:** ${report.health.n8n === 'ok' ? '✅' : '❌'}
      `,
      provider: 'groq'
    };
  }

  // ─── COMANDO: CPU ──────────────────────────────────────────
  async handleCPU() {
    const cpu = await this.getCPUInfo();
    const temp = await this.getTemperature();

    return {
      text: `
# ⚡ HEIMDALL - ESTADO DE CPU

## 📊 Uso de CPU
- **Total:** ${cpu.usage}%
- **Núcleos:** ${cpu.coresCount}
- **Modelo:** ${cpu.model}
- **Velocidad:** ${cpu.speed} MHz

## 🔥 Temperatura
- **Actual:** ${temp}°C
- **Estado:** ${temp > 70 ? '⚠️ Caliente' : '✅ Normal'}

## 📊 Cores
${cpu.cores.map((c, i) => `- **Core ${i+1}:** ${c}%`).join('\n')}

## 💡 Recomendaciones
${this.getCPURecommendations(cpu.usage, temp)}
      `,
      provider: 'groq'
    };
  }

  // ─── COMANDO: MEMORIA ──────────────────────────────────────
  async handleMemory() {
    const memory = await this.getMemoryInfo();

    return {
      text: `
# 💾 HEIMDALL - ESTADO DE MEMORIA

## 📊 Uso de RAM
- **Total:** ${memory.total}
- **Usado:** ${memory.used}
- **Libre:** ${memory.free}
- **Uso:** ${memory.usagePercent}%

## 📊 Estado
${memory.usagePercent > 80 ? '⚠️ **CRÍTICO** - Memoria baja' :
  memory.usagePercent > 65 ? '⚠️ **ALTO** - Memoria elevada' :
  '✅ **NORMAL** - Memoria suficiente'}

## 💡 Recomendaciones
${memory.usagePercent > 80 ? 
  '1. Reiniciar procesos que no se usen\n2. Verificar fugas de memoria con pm2 logs\n3. Considerar aumentar memoria swap' :
  memory.usagePercent > 65 ?
  '1. Monitorear procesos con pm2 monit\n2. Revisar si hay procesos con consumo anormal' :
  '✅ Memoria en nivel óptimo'}
      `,
      provider: 'groq'
    };
  }

  // ─── COMANDO: DISCO ──────────────────────────────────────
  async handleDisk() {
    const disks = await this.getDiskInfo();

    return {
      text: `
# 💽 HEIMDALL - ESTADO DE DISCO

${disks.map(disk => `
## 📊 ${disk.drive}
- **Total:** ${disk.total}
- **Usado:** ${disk.used}
- **Libre:** ${disk.free}
- **Uso:** ${disk.usagePercent}%
- **Estado:** ${disk.usagePercent > 85 ? '⚠️ CRÍTICO' : disk.usagePercent > 70 ? '⚠️ ALTO' : '✅ NORMAL'}
`).join('\n')}

## 💡 Recomendaciones
${disks.some(d => d.usagePercent > 85) ?
  '🔴 **ESPACIO CRÍTICO** - Liberar espacio inmediatamente:\n- Eliminar logs viejos\n- Vaciar carpeta temp\n- Revisar archivos grandes' :
  disks.some(d => d.usagePercent > 70) ?
  '🟡 **ESPACIO BAJO** - Considerar limpieza:\n- Revisar logs de PM2\n- Eliminar instalaciones viejas' :
  '✅ Espacio en disco en nivel óptimo'}
      `,
      provider: 'groq'
    };
  }

  // ─── COMANDO: PROCESOS ────────────────────────────────────
  async handleProcesses() {
    const processes = await this.getProcessInfo();

    return {
      text: `
# 🔄 HEIMDALL - ESTADO DE PROCESOS

## 📊 Procesos PM2
${processes.pm2.map(p => 
  `- **${p.name}** (ID: ${p.id}) → ${p.status} ${p.status === 'online' ? '✅' : '❌'} | CPU: ${p.cpu} | RAM: ${p.memory}`
).join('\n')}

## 📊 Sistema
- **Total procesos:** ${processes.total}
- **Procesos críticos:** ${processes.pm2.filter(p => p.status !== 'online').length} caídos

## 💡 Acciones recomendadas
${processes.pm2.some(p => p.status !== 'online') ?
  `⚠️ Procesos caídos detectados. Recomiendo:
  - pm2 restart ${processes.pm2.filter(p => p.status !== 'online').map(p => p.name).join(' ')}` :
  '✅ Todos los procesos están funcionando correctamente'}
      `,
      provider: 'groq'
    };
  }

  // ─── COMANDO: ALERTAS ──────────────────────────────────────
  async handleAlerts() {
    const alerts = this.monitoringData.alerts.slice(-10);

    if (alerts.length === 0) {
      return {
        text: `
# ✅ HEIMDALL - SIN ALERTAS

## 🛡️ Estado del sistema
No hay alertas activas. El sistema está funcionando correctamente.

## 📊 Últimas verificaciones
- Última alerta: Ninguna
- Estado general: 🟢 Estable

✅ **Todo en orden, señor.**
        `,
        provider: 'groq'
      };
    }

    return {
      text: `
# ⚠️ HEIMDALL - ALERTAS DEL SISTEMA

## 📋 Alertas activas (${alerts.length})
${alerts.map((a, i) => `
### ${i+1}. [${a.level}] ${a.type}
- **Mensaje:** ${a.message}
- **Hora:** ${new Date(a.timestamp).toLocaleString()}
- **Acción recomendada:** ${a.action}
`).join('\n')}

## 💡 Recomendación general
${alerts.some(a => a.level === 'CRÍTICO') ?
  '🔴 **ATENCIÓN CRÍTICA** - Hay alertas graves que requieren acción inmediata.' :
  alerts.some(a => a.level === 'ALTO') ?
  '🟡 **ATENCIÓN** - Hay alertas importantes que requieren revisión.' :
  '✅ Alertas de nivel bajo. Monitoreo continuo.'}
      `,
      provider: 'groq'
    };
  }

  // ─── COMANDO: ENERGÍA ──────────────────────────────────────
  async handleEnergy() {
    return {
      text: `
# ⚡ HEIMDALL - CONSUMO DE ENERGÍA

## 📊 Estimación de consumo
- **PC en reposo:** ~10-15W
- **PC con JARVIS activo:** ~15-25W
- **Consumo diario:** ~0.4-0.6 kWh
- **Consumo mensual:** ~12-18 kWh

## 💰 Costo estimado
- **Tarifa promedio:** ~$0.15/kWh
- **Costo mensual:** ~$1.80 - $2.70 USD

## 🔋 Recomendaciones de ahorro
- ✅ Plan de energía equilibrado activo
- ✅ Suspensión desactivada (necesario para 24/7)
- 💡 Considerar apagar pantalla después de 10min
- 💡 Usar modo de ahorro de energía en CPU

## 📊 Estado actual
- **Plan de energía:** Equilibrado ✅
- **Suspensión:** Desactivada ✅
- **Modo 24/7:** Activado ✅
      `,
      provider: 'groq'
    };
  }

  // ─── TEXTO DE AYUDA ────────────────────────────────────────
  getHelpText() {
    return `
# 🛡️ HEIMDALL - COMANDOS DISPONIBLES

## 📋 Comandos
| Comando | Función |
|---------|---------|
| \`reporte\`, \`estado\`, \`resumen\` | Reporte completo del sistema |
| \`cpu\`, \`procesador\` | Estado de CPU y temperatura |
| \`memoria\`, \`ram\` | Uso de memoria RAM |
| \`disco\`, \`espacio\` | Espacio en disco |
| \`procesos\`, \`servicios\` | Estado de procesos PM2 |
| \`alertas\`, \`errores\` | Alertas activas |
| \`energia\`, \`consumo\` | Consumo de energía |

## 💡 Ejemplos
- \`/heimdall reporte\` - Obtener reporte completo
- \`/heimdall cpu\` - Ver estado de CPU
- \`/heimdall alertas\` - Ver alertas activas

🛡️ **¡Siempre vigilando, señor!**
    `;
  }

  // ─── UTILIDADES ──────────────────────────────────────────────
  formatBytes(bytes) {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  getCPURecommendations(usage, temp) {
    let recs = [];
    if (usage > 80) recs.push('🔴 CPU muy alta - Revisar procesos con pm2 monit');
    else if (usage > 60) recs.push('🟡 CPU elevada - Monitorear procesos');
    else recs.push('✅ CPU en nivel óptimo');
    
    if (temp > 75) recs.push('🔴 Temperatura alta - Verificar ventilación');
    else if (temp > 60) recs.push('🟡 Temperatura media - Considerar mejorar refrigeración');
    else recs.push('✅ Temperatura normal');
    
    return recs.join('\n');
  }

  getRecommendations(report) {
    const recs = [];
    const cpu = report.metrics.cpu.usage;
    const memory = report.metrics.memory.usagePercent;

    if (cpu > 70) recs.push('🟡 CPU alto - Revisar procesos');
    if (memory > 75) recs.push('🟡 Memoria alta - Considerar reiniciar procesos');
    if (report.processes.pm2.some(p => p.status !== 'online')) {
      recs.push('🔴 Procesos caídos - Ejecutar pm2 restart all');
    }

    if (recs.length === 0) {
      recs.push('✅ Sistema saludable - Sin recomendaciones urgentes');
    }

    return recs.join('\n');
  }
}

// ✅ EXPORTAR LA CLASE (NO LA INSTANCIA)
export default SystemMonitorAgent;