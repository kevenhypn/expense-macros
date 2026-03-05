export function formatMoney0(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return `${sign}$${abs.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
