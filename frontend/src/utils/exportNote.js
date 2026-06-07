/**
 * Export utilities for notes.
 * Supports Markdown (.md), HTML (.html), and PDF (via browser print).
 */
import JSZip from 'jszip';

const sanitizeFilename = (title) => {
    return (title || 'untitled')
        .replace(/[^a-zA-Z0-9\s-_]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 80);
};

const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Minimal markdown-to-HTML converter for export.
 * Handles headings, bold, italic, code blocks, inline code, links, lists, blockquotes, horizontal rules, and line breaks.
 */
const markdownToHtml = (md) => {
    if (!md) return '';

    let html = md;

    // Fenced code blocks (```...```)
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const escaped = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return `<pre style="background:#1a1a2e;color:#e0e0e0;padding:16px;overflow-x:auto;font-size:14px;line-height:1.5;"><code>${escaped}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:0.9em;">$1</code>');

    // Headings
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Horizontal rules
    html = html.replace(/^---+$/gm, '<hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">');

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote style="border-left:4px solid #e53e3e;padding:8px 16px;margin:12px 0;color:#555;background:#fafafa;">$1</blockquote>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#e53e3e;">$1</a>');

    // Unordered lists
    html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul style="padding-left:24px;margin:8px 0;">$1</ul>');

    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

    // Paragraphs — wrap remaining plain lines
    html = html.replace(/^(?!<[a-z/])(.+)$/gm, '<p>$1</p>');

    // Line breaks
    html = html.replace(/\n/g, '');

    return html;
};

const buildHtmlDocument = (title, content, tagsHtml = '') => {
    const bodyHtml = markdownToHtml(content);
    const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title || 'Untitled Note'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #1a1a1a;
    max-width: 720px;
    margin: 0 auto;
    padding: 48px 24px;
    line-height: 1.7;
    font-size: 16px;
  }
  h1 { font-size: 2em; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.02em; }
  h2 { font-size: 1.5em; font-weight: 700; margin: 28px 0 12px; }
  h3 { font-size: 1.25em; font-weight: 700; margin: 24px 0 8px; }
  h4, h5, h6 { font-size: 1.1em; font-weight: 600; margin: 20px 0 8px; }
  p { margin: 8px 0; }
  ul, ol { padding-left: 24px; margin: 8px 0; }
  li { margin: 4px 0; }
  strong { font-weight: 700; }
  a { color: #dc2626; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
  pre { background: #1a1a2e; color: #e0e0e0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 16px 0; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #dc2626; padding: 8px 16px; margin: 12px 0; color: #555; background: #fafafa; border-radius: 0 8px 8px 0; }
  hr { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
  .meta { color: #737373; font-size: 0.85em; margin-bottom: 24px; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .tag { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.75em; font-weight: 600; background: #fee2e2; color: #dc2626; }
  .divider { border: none; border-top: 2px solid #dc2626; margin: 16px 0 32px; width: 48px; }
  @media print {
    body { padding: 0; max-width: 100%; }
  }
</style>
</head>
<body>
<h1>${title || 'Untitled Note'}</h1>
<p class="meta">Exported from Jots &middot; ${date}</p>
${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
<hr class="divider">
${bodyHtml}
</body>
</html>`;
};

/**
 * Export note as Markdown (.md)
 */
export const exportAsMarkdown = (note) => {
    const header = `# ${note.title || 'Untitled'}\n\n`;
    const tagsLine = note.tags?.length
        ? `> Tags: ${note.tags.map(t => t.name).join(', ')}\n\n---\n\n`
        : '';
    const md = header + tagsLine + (note.content || '');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFilename(note.title)}.md`);
};

/**
 * Export note as HTML (.html)
 */
export const exportAsHtml = (note) => {
    const tagsHtml = note.tags?.length
        ? note.tags.map(t => `<span class="tag">${t.name}</span>`).join('')
        : '';
    const htmlDoc = buildHtmlDocument(note.title, note.content, tagsHtml);
    const blob = new Blob([htmlDoc], { type: 'text/html;charset=utf-8' });
    downloadBlob(blob, `${sanitizeFilename(note.title)}.html`);
};

/**
 * Export note as PDF (opens browser print dialog)
 */
export const exportAsPdf = (note) => {
    const tagsHtml = note.tags?.length
        ? note.tags.map(t => `<span class="tag">${t.name}</span>`).join('')
        : '';
    const htmlDoc = buildHtmlDocument(note.title, note.content, tagsHtml);

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
        alert('Please allow pop-ups to export as PDF.');
        return;
    }
    printWindow.document.write(htmlDoc);
    printWindow.document.close();

    // Wait for fonts to load, then trigger print
    printWindow.onload = () => {
        setTimeout(() => {
            printWindow.print();
        }, 400);
    };
};

/**
 * Export all notes as a single ZIP file containing folders for My Notes and Shared With Me
 */
export const exportAllAsZip = async (myNotes, sharedNotes) => {
    const zip = new JSZip();

    // Create main folder
    const rootFolder = zip.folder("Jots Export");
    const myNotesFolder = rootFolder.folder("My Notes");
    const sharedNotesFolder = rootFolder.folder("Shared With Me");

    const getNoteContent = (note) => {
        const header = `# ${note.title || 'Untitled'}\n\n`;
        const tagsLine = note.tags?.length
            ? `> Tags: ${note.tags.map(t => t.name).join(', ')}\n\n---\n\n`
            : '';
        return header + tagsLine + (note.content || '');
    };

    // Add My Notes
    (myNotes || []).forEach((note, index) => {
        const content = getNoteContent(note);
        let filename = sanitizeFilename(note.title);
        if (!filename) filename = `Untitled_${index}`;
        myNotesFolder.file(`${filename}.md`, content);
    });

    // Add Shared Notes
    (sharedNotes || []).forEach((shared, index) => {
        const note = shared.note || shared; // fallback just in case
        const content = getNoteContent(note);
        let filename = sanitizeFilename(note.title);
        if (!filename) filename = `Untitled_Shared_${index}`;
        sharedNotesFolder.file(`${filename}.md`, content);
    });

    const content = await zip.generateAsync({ type: "blob" });
    downloadBlob(content, "Jots_Export.zip");
};
