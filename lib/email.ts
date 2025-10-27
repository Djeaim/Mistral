export function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.toLowerCase());
}

export function injectTrackingPixel(html: string, trackingToken: string): string {
  const pixel = `<img src="/api/t.gif?m=${trackingToken}" alt="" width="1" height="1" style="display:none" />`;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixel}</body>`);
  }
  return html + pixel;
}

export function renderTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v !== undefined && v !== null ? String(v) : '';
  });
}


