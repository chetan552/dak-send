/**
 * Converts a block-based email layout (JSON) to Outlook-safe table HTML.
 * Each block type maps to a fixed HTML structure designed for maximum email
 * client compatibility.
 */

export type BlockType =
    | "text"
    | "heading"
    | "image"
    | "button"
    | "divider"
    | "spacer"
    | "columns"
    | "html";

export interface TextBlock {
    type: "text";
    props: {
        content: string; // raw HTML (from simple inline editing)
        align?: "left" | "center" | "right";
        color?: string;
        fontSize?: number;
        lineHeight?: number;
        padding?: string; // e.g. "16px 24px"
    };
}

export interface HeadingBlock {
    type: "heading";
    props: {
        content: string;
        level?: 1 | 2 | 3;
        align?: "left" | "center" | "right";
        color?: string;
        padding?: string;
    };
}

export interface ImageBlock {
    type: "image";
    props: {
        src: string;
        alt?: string;
        href?: string; // wrap in <a> if set
        align?: "left" | "center" | "right";
        width?: number; // px
        padding?: string;
        rounded?: boolean;
    };
}

export interface ButtonBlock {
    type: "button";
    props: {
        text: string;
        href: string;
        align?: "left" | "center" | "right";
        bgColor?: string;
        textColor?: string;
        borderRadius?: number;
        padding?: string; // button inner padding
        blockPadding?: string; // outer row padding
        fontSize?: number;
        bold?: boolean;
    };
}

export interface DividerBlock {
    type: "divider";
    props: {
        color?: string;
        thickness?: number;
        padding?: string;
    };
}

export interface SpacerBlock {
    type: "spacer";
    props: {
        height?: number; // px
    };
}

export interface ColumnsBlock {
    type: "columns";
    props: {
        columns: ColumnContent[];
        gap?: number;
        padding?: string;
    };
}

export interface ColumnContent {
    width?: number; // percent, defaults to equal split
    blocks: EmailBlock[];
}

export interface HtmlBlock {
    type: "html";
    props: {
        html: string;
        padding?: string;
    };
}

export type EmailBlock =
    | TextBlock
    | HeadingBlock
    | ImageBlock
    | ButtonBlock
    | DividerBlock
    | SpacerBlock
    | ColumnsBlock
    | HtmlBlock;

export interface BlockEmailDocument {
    blocks: (EmailBlock & { id: string })[];
    settings?: {
        backgroundColor?: string;
        contentBackground?: string;
        contentWidth?: number; // px, default 600
        fontFamily?: string;
        textColor?: string;
    };
}

// ---------------------------------------------------------------------------
// Per-block compilers
// ---------------------------------------------------------------------------

function compileText(block: TextBlock): string {
    const p = block.props;
    const align = p.align || "left";
    const color = p.color || "#333333";
    const fontSize = p.fontSize || 16;
    const lineHeight = p.lineHeight || 1.6;
    const padding = p.padding || "8px 24px";
    return `<tr>
  <td align="${align}" style="padding:${padding};font-family:Arial,sans-serif;font-size:${fontSize}px;line-height:${lineHeight};color:${color};">
    ${p.content}
  </td>
</tr>`;
}

function compileHeading(block: HeadingBlock): string {
    const p = block.props;
    const level = p.level || 2;
    const align = p.align || "left";
    const color = p.color || "#111111";
    const padding = p.padding || "16px 24px 8px";
    const sizes: Record<number, number> = { 1: 32, 2: 24, 3: 20 };
    const sz = sizes[level] || 24;
    // Headings are plain text — escape to prevent HTML injection
    return `<tr>
  <td align="${align}" style="padding:${padding};font-family:Arial,sans-serif;font-size:${sz}px;font-weight:bold;line-height:1.2;color:${color};">
    ${escapeHtml(p.content)}
  </td>
</tr>`;
}

function compileImage(block: ImageBlock): string {
    const p = block.props;
    const align = p.align || "center";
    const padding = p.padding || "16px 24px";
    const width = p.width ? ` width="${p.width}"` : ' style="max-width:100%;height:auto;"';
    const radius = p.rounded ? ' style="border-radius:8px;"' : "";
    const img = `<img src="${escapeAttr(p.src)}" alt="${escapeAttr(p.alt || "")}"${width}${radius} border="0" />`;
    const content = p.href && safeHref(p.href)
        ? `<a href="${safeHref(p.href)}" style="display:inline-block;">${img}</a>`
        : img;
    return `<tr>
  <td align="${align}" style="padding:${padding};">
    ${content}
  </td>
</tr>`;
}

function compileButton(block: ButtonBlock): string {
    const p = block.props;
    const align = p.align || "center";
    const bgColor = p.bgColor || "#4f46e5";
    const textColor = p.textColor || "#ffffff";
    const radius = p.borderRadius ?? 6;
    const innerPadding = p.padding || "14px 28px";
    const blockPadding = p.blockPadding || "16px 24px";
    const fontSize = p.fontSize || 16;
    const fontWeight = p.bold !== false ? "bold" : "normal";
    return `<tr>
  <td align="${align}" style="padding:${blockPadding};">
    <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${safeHref(p.href)}" style="height:50px;v-text-anchor:middle;width:200px;" arcsize="10%" fillcolor="${bgColor}" strokecolor="${bgColor}"><w:anchorlock/><center style="color:${textColor};font-family:Arial,sans-serif;font-size:${fontSize}px;font-weight:${fontWeight};">${escapeHtml(p.text)}</center></v:roundrect><![endif]-->
    <!--[if !mso]><!--><a href="${safeHref(p.href)}" style="background-color:${bgColor};border-radius:${radius}px;color:${textColor};display:inline-block;font-family:Arial,sans-serif;font-size:${fontSize}px;font-weight:${fontWeight};line-height:1;padding:${innerPadding};text-align:center;text-decoration:none;-webkit-text-size-adjust:none;mso-hide:all;">${escapeHtml(p.text)}</a><!--<![endif]-->
  </td>
</tr>`;
}

function compileDivider(block: DividerBlock): string {
    const p = block.props;
    const color = p.color || "#e5e7eb";
    const thickness = p.thickness || 1;
    const padding = p.padding || "8px 24px";
    return `<tr>
  <td style="padding:${padding};">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="border-top:${thickness}px solid ${color};font-size:0;line-height:0;">&nbsp;</td></tr>
    </table>
  </td>
</tr>`;
}

function compileSpacer(block: SpacerBlock): string {
    const height = block.props.height ?? 24;
    return `<tr>
  <td style="font-size:0;line-height:0;height:${height}px;" height="${height}">&nbsp;</td>
</tr>`;
}

function compileColumns(block: ColumnsBlock): string {
    const p = block.props;
    const padding = p.padding || "8px 24px";
    const cols = p.columns || [];
    if (cols.length === 0) return "";

    const totalWidth = 600; // standard email width
    const gap = p.gap || 0;
    const colWidth = Math.floor((totalWidth - gap * (cols.length - 1)) / cols.length);

    const tdParts = cols.map((col, i) => {
        const innerHtml = col.blocks.map(b => compileBlock(b as EmailBlock & { id: string })).join("\n");
        const isLast = i === cols.length - 1;
        const tdStyle = `vertical-align:top;width:${colWidth}px;${!isLast && gap ? `padding-right:${gap}px;` : ""}`;
        return `<td valign="top" style="${tdStyle}">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${innerHtml}
      </table>
    </td>`;
    }).join("\n    ");

    return `<tr>
  <td style="padding:${padding};">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        ${tdParts}
      </tr>
    </table>
  </td>
</tr>`;
}

function compileHtml(block: HtmlBlock): string {
    const padding = block.props.padding || "0 24px";
    // Strip dangerous tags/attributes while preserving safe email HTML
    const safeHtml = block.props.html
        .replace(/<(script|iframe|object|embed|form|base|meta|link)[^>]*>[\s\S]*?<\/\1>/gi, "")
        .replace(/<(script|iframe|object|embed|form|base|meta|link)(\s[^>]*)?\/?>/gi, "")
        .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "")
        .replace(/\s+href\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, "");
    return `<tr>
  <td style="padding:${padding};">
    ${safeHtml}
  </td>
</tr>`;
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

function compileBlock(block: EmailBlock & { id: string }): string {
    switch (block.type) {
        case "text":     return compileText(block);
        case "heading":  return compileHeading(block);
        case "image":    return compileImage(block);
        case "button":   return compileButton(block);
        case "divider":  return compileDivider(block);
        case "spacer":   return compileSpacer(block);
        case "columns":  return compileColumns(block);
        case "html":     return compileHtml(block);
        default:         return "";
    }
}

// ---------------------------------------------------------------------------
// Document compiler
// ---------------------------------------------------------------------------

export function compileBlocksToHtml(doc: BlockEmailDocument): string {
    const settings = doc.settings || {};
    const bgColor = settings.backgroundColor || "#f4f4f5";
    const contentBg = settings.contentBackground || "#ffffff";
    const width = settings.contentWidth || 600;
    const fontFamily = settings.fontFamily || "Arial, sans-serif";
    const textColor = settings.textColor || "#333333";

    const rows = doc.blocks.map(b => compileBlock(b)).join("\n");

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Email</title>
<style type="text/css">
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: ${bgColor}; }
  table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
  @media only screen and (max-width: 620px) {
    .email-container { width: 100% !important; }
    .stack-column, .stack-column-center { display: block !important; width: 100% !important; padding-right: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${bgColor};">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${bgColor};">
  <tr>
    <td align="center" valign="top" style="padding:20px 0;">
      <table class="email-container" width="${width}" cellpadding="0" cellspacing="0" border="0" style="background-color:${contentBg};font-family:${fontFamily};color:${textColor};max-width:${width}px;">
        ${rows}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeAttr(s: string): string {
    return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Strip URLs that are not http/https to prevent javascript:/data: injection in href/src attributes. */
function safeHref(url: string | undefined | null): string {
    if (!url) return "";
    const trimmed = url.trim();
    try {
        const parsed = new URL(trimmed);
        return parsed.protocol === "http:" || parsed.protocol === "https:" ? escapeAttr(trimmed) : "";
    } catch {
        // Relative URLs (#anchor, /path) are fine; reject anything else
        return trimmed.startsWith("/") || trimmed.startsWith("#") ? escapeAttr(trimmed) : "";
    }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Starter template
// ---------------------------------------------------------------------------

export function createDefaultDocument(): BlockEmailDocument {
    return {
        blocks: [
            {
                id: crypto.randomUUID(),
                type: "heading",
                props: { content: "Your Headline Here", level: 1, align: "center" },
            },
            {
                id: crypto.randomUUID(),
                type: "text",
                props: {
                    content: "<p>Write your email content here. You can use <strong>bold</strong>, <em>italic</em>, and <a href=\"#\">links</a>.</p>",
                    align: "left",
                },
            },
            {
                id: crypto.randomUUID(),
                type: "button",
                props: { text: "Click Here", href: "https://example.com", align: "center" },
            },
            {
                id: crypto.randomUUID(),
                type: "divider",
                props: {},
            },
        ],
        settings: {},
    };
}
