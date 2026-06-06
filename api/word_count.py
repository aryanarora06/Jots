import re


def count_note_words(content: str = "") -> int:
    text = content or ""
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"`[^`]*`", " ", text)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"[#>*_\[\]()~\-|!]+", " ", text)
    words = [word for word in text.split() if word.strip()]
    return len(words)
