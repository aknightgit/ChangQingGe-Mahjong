const BEIJING_TIME_ZONE = "Asia/Shanghai";
function formatBeijingTime(value = Date.now(), options = {
  hour: "2-digit",
  minute: "2-digit"
}) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: BEIJING_TIME_ZONE,
    ...options
  }).format(date);
}
function formatBeijingDateTime(value = Date.now()) {
  return formatBeijingTime(value, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

export { formatBeijingDateTime as a, formatBeijingTime as f };
//# sourceMappingURL=beijingTime-Dq_bzXix.mjs.map
