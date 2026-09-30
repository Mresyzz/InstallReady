/**
 * 严格 XML 实体转义。防止在 SVG 徽章中注入恶意标签或 XSS。
 */
export function escapeXml(unsafe: string): string {
  if (typeof unsafe !== "string") {
    return "";
  }
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface BadgeOptions {
  label: string;
  value: string;
  color: string;
  labelColor?: string;
}

export type BadgeState =
  | { type: "not_checked" }
  | { type: "static_checked"; issueCount?: number }
  | { type: "runtime_verified"; passed: number; total: number };

/**
 * 纯矢量 SVG 徽章生成器。全字段转义，零依赖。
 */
export function renderSvgBadge(options: BadgeOptions): string {
  const safeLabel = escapeXml(options.label);
  const safeValue = escapeXml(options.value);
  const safeColor = escapeXml(options.color);
  const safeLabelColor = escapeXml(options.labelColor || "#555555");

  // 估算文字宽度（基于平均字符宽度）
  const charWidth = 7.2;
  const labelWidth = Math.round(options.label.length * charWidth + 14);
  const valueWidth = Math.round(options.value.length * charWidth + 14);
  const totalWidth = labelWidth + valueWidth;

  const labelCenter = Math.round(labelWidth / 2);
  const valueCenter = Math.round(labelWidth + valueWidth / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${safeLabel}: ${safeValue}">
  <title>${safeLabel}: ${safeValue}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="${safeLabelColor}"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${safeColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelCenter * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(labelWidth - 10) * 10}">${safeLabel}</text>
    <text x="${labelCenter * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(labelWidth - 10) * 10}">${safeLabel}</text>
    <text aria-hidden="true" x="${valueCenter * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)" textLength="${(valueWidth - 10) * 10}">${safeValue}</text>
    <text x="${valueCenter * 10}" y="140" transform="scale(.1)" fill="#fff" textLength="${(valueWidth - 10) * 10}">${safeValue}</text>
  </g>
</svg>`;
}

/**
 * 根据确定性状态生成标准徽章
 */
export function generateInstallReadyBadge(state: BadgeState): string {
  switch (state.type) {
    case "not_checked":
      return renderSvgBadge({
        label: "InstallReady",
        value: "not checked",
        color: "#6e7681", // 中性灰
      });

    case "static_checked":
      return renderSvgBadge({
        label: "InstallReady",
        value: "static checked",
        color: "#0969da", // 稳健蓝
      });

    case "runtime_verified": {
      const isAllPassing = state.passed === state.total && state.total > 0;
      return renderSvgBadge({
        label: "Linux install",
        value: `${state.passed}/${state.total} passing`,
        color: isAllPassing ? "#2da44e" : "#cf222e", // 仅全量运行时通过才出绿色
      });
    }
  }
}
