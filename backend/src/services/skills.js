function calcularDescuento(monto) {
  const porcentajeDescuento = 0.05; // 5% de descuento
  const descuento = monto * porcentajeDescuento;
  const montoConDescuento = monto - descuento;
  return montoConDescuento;
}

// Ejemplo de uso:
const montoOriginal = 1000;
const montoConDescuento = calcularDescuento(montoOriginal);
console.log(`El monto con descuento es: ${montoConDescuento}`);