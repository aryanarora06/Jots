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
 * Custom ReactMarkdown components that make links open in a new tab.
 */
export const markdownLinkComponents = {
    a: ({ children, href, ...props }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            {...props}
        >
            {children}
        </a>
    ),
};
