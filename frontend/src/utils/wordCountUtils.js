export function stripMarkdown(text = '') {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
        .replace(/\[([^\]]*)]\([^)]*\)/g, '$1')
        .replace(/[#>*_[\]()~\-|!]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function countNoteWords(content = '') {
    const text = stripMarkdown(content).trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
}

export function formatWordCount(count) {
    return count === 1 ? '1 word' : `${count.toLocaleString()} words`;
}

export function getNoteWordCount(note) {
    if (note?.word_count != null) return note.word_count;
    return countNoteWords(note?.content ?? note?.preview);
}
