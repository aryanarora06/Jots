import React from 'react';
import { countNoteWords, formatWordCount, getNoteWordCount } from '../utils/wordCountUtils';

const WordCount = ({ note, content, className = '' }) => {
    const count = content !== undefined
        ? countNoteWords(content)
        : getNoteWordCount(note);

    return (
        <span className={`text-xs font-medium text-gray-500 ${className}`}>
            {formatWordCount(count)}
        </span>
    );
};

export default WordCount;
