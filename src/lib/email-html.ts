/**
 * Heuristic: does this HTML string represent something TipTap-flavoured
 * editors can't faithfully represent in their node tree?
 *
 * TipTap (and therefore Maily, which is TipTap-based) parses HTML through a
 * fixed schema and silently drops anything that doesn't map — `<style>`
 * blocks, full-document wrappers, Outlook-specific MSO conditional comments,
 * and `<table>`-based email layouts all degrade to plain text when forced
 * through the parser.
 *
 * The legacy rich-text-editor handles complex HTML via an editable iframe
 * that preserves the source exactly. So when we detect complex HTML at any
 * input boundary (loading a template, editing an existing campaign), we
 * route to the legacy editor instead of trying to coerce the content into
 * the Maily TipTap schema.
 */
export function isComplexHtml(htmlStr: string): boolean {
    const v = (htmlStr || "").trim().toLowerCase();
    // Full document wrapper — TipTap can't represent <html>/<head>/<body>
    if (v.startsWith("<!doctype") || v.startsWith("<html") || v.includes("<body")) return true;
    // <style> blocks — TipTap strips these, so render in iframe to preserve CSS classes
    if (/<style[\s>]/i.test(htmlStr)) return true;
    // MSO conditional comments — Outlook-specific markup TipTap would lose
    if (/<!--\s*\[if\s+(mso|gte mso|lte mso|!mso)/i.test(htmlStr)) return true;
    return false;
}
