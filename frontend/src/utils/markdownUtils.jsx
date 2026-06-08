/**
 * Preprocesses markdown text to convert bare domain URLs (e.g. google.com)
 * into full URLs (https://google.com) so that remark-gfm can autolink them.
 * 
 * remark-gfm only autolinks URLs starting with http://, https://, or www.
 * This handles the rest.
 */
export const preprocessLinks = (text) => {
    if (!text) return '';

    // Common TLDs to match bare domains against
    const tlds = 'com|org|net|io|dev|co|edu|gov|info|me|app|xyz|tech|ai|uk|in|de|fr|jp|ru|br|au|ca|eu|us|it|es|nl|se|no|fi|dk|pl|cz|be|at|ch|ie|pt|kr|cn|tw|hk|sg|nz|za|mx|ar|cl|pe|ph|th|id|my|vn|tr|il|ae|sa';

    // Match bare domains like google.com or docs.google.com/some/path
    // Negative lookbehind ensures we don't match things already prefixed with ://, www., @, or inside markdown link syntax
    const regex = new RegExp(
        `(?<![\\w:/.@\\]])\\b([a-zA-Z0-9][-a-zA-Z0-9]*(?:\\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\\.(?:${tlds})\\b(?:\\/[^\\s)\\]>]*)?)`,
        'gi'
    );

    return text.replace(regex, (match, url, offset, str) => {
        // Don't touch if already prefixed with protocol or www
        const before = str.substring(Math.max(0, offset - 8), offset);
        if (/(?:https?:\/\/|www\.)$/i.test(before)) return match;

        // Don't touch email-like patterns (user@domain.com)
        if (offset > 0 && str[offset - 1] === '@') return match;

        // Don't touch if inside markdown link parentheses like [text](url)
        if (offset > 0 && str[offset - 1] === '(') return match;

        return `https://${match}`;
    });
};

/**
 * Converts [[Note Title]] wikilink syntax into special markdown links.
 * These links use a special `wikilink://` protocol that the custom
 * markdown component intercepts to handle in-app navigation.
 */
export const preprocessWikilinks = (text) => {
    if (!text) return '';
    // Match [[Note Title]] or \[\[Note Title\]\] and convert to a clickable markdown link
    return text.replace(/\\?\[\\?\[([^\[\]]+?)\\?\]\\?\]/g, (match, title) => {
        const trimmed = title.replace(/\\/g, '').trim();
        return `[${trimmed}](#wikilink:${encodeURIComponent(trimmed)})`;
    });
};

/**
 * Full preprocessing pipeline: wikilinks first, then bare URL linking.
 */
export const preprocessContent = (text) => {
    return preprocessLinks(preprocessWikilinks(text));
};

/**
 * Custom ReactMarkdown components that:
 * 1. Handle wikilink:// protocol links as in-app navigation
 * 2. Make regular links open in a new tab
 * 
 * @param {Function} onWikilinkClick - Callback when a [[wikilink]] is clicked. Receives the note title.
 */
export const createMarkdownComponents = (onWikilinkClick) => ({
    a: (props) => {
        const { node, children, href, ...restProps } = props;
        // Handle wikilinks
        if (href && href.startsWith('#wikilink:')) {
            const title = decodeURIComponent(href.replace('#wikilink:', ''));
            return (
                <a
                    href="#"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onWikilinkClick) onWikilinkClick(title);
                    }}
                    className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 font-medium no-underline hover:underline decoration-black/30 dark:decoration-white/30 underline-offset-2 cursor-pointer"
                    title={`Open note: ${title}`}
                    {...restProps}
                >
                    {children}
                </a>
            );
        }

        // Regular external links
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...restProps}
            >
                {children}
            </a>
        );
    },
});

/**
 * Legacy: Custom ReactMarkdown components that make links open in a new tab.
 * Use createMarkdownComponents() instead for wikilink support.
 */
export const markdownLinkComponents = {
    a: (props) => {
        const { node, children, href, ...restProps } = props;
        return (
            <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                {...restProps}
            >
                {children}
            </a>
        );
    },
};
