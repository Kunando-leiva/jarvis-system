// frontend/js/utils/formatters.js
// 🎯 Funciones de formato de texto

export function formatText(text) {
  if (!text) return '';
  
  let formatted = text;
  
  // Negritas
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Cursivas
  formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Títulos
  formatted = formatted.replace(/^# (.*)$/gm, '<h3>$1</h3>');
  formatted = formatted.replace(/^## (.*)$/gm, '<h3>$1</h3>');
  formatted = formatted.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  
  // Separadores
  formatted = formatted.replace(/^---$/gm, '<span class="separator"></span>');
  
  // Listas
  formatted = formatted.replace(/^-\s(.*)$/gm, '• $1');
  formatted = formatted.replace(/^\*\s(.*)$/gm, '• $1');
  formatted = formatted.replace(/^(\d+)\.\s(.*)$/gm, '<span style="color:var(--accent);font-weight:bold;">$1.</span> $2');
  
  // Código inline
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bloques de código
  formatted = formatted.replace(/```([\s\S]*?)```/g, function(match, code) {
    return '<pre><code>' + code.trim() + '</code></pre>';
  });
  
  // Saltos de línea
  formatted = formatted.replace(/\n/g, '<br>');
  
  return formatted;
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString();
}

export function truncateText(text, maxLength = 100) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

export function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}