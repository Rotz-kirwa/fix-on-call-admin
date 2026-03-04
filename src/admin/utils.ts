export const exportToCsv = (filename: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const value = row[h] == null ? "" : String(row[h]);
          return `"${value.replaceAll("\"", "\"\"")}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const maskEmail = (email: string) => {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
};

export const maskPhone = (phone: string) => {
  if (phone.length < 6) return "***";
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
};
