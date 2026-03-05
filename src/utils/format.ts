export const parseMoneyInput = (input: string): string => {
  const cleaned = input.replace(/[^\d.]/g, "");

  if (!cleaned) return "";

  const firstDot = cleaned.indexOf(".");
  if (firstDot === -1) {
    return cleaned.replace(/^0+(\d)/, "$1");
  }

  const integerPart = cleaned.slice(0, firstDot).replace(/^0+(\d)/, "$1") || "0";
  const decimalPart = cleaned
    .slice(firstDot + 1)
    .replace(/\./g, "")
    .slice(0, 2);

  return decimalPart.length > 0
    ? `${integerPart}.${decimalPart}`
    : `${integerPart}.`;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
};
