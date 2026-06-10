"""
api/wikilinks.py

Utility functions for parsing and managing [[wikilinks]] in note content.
"""

import re

# Matches [[Note Title]] or \[\[Note Title\]\]
# MDXEditor escapes brackets since they are markdown link characters
WIKILINK_PATTERN = re.compile(r'\\?\[\\?\[([^\[\]]+?)\\?\]\\?\]')


def extract_wikilinks(content: str) -> list[str]:
    """
    Parse note content and return a list of unique wikilink titles.
    
    Example:
        >>> extract_wikilinks("Check out [[My Note]] and [[Another Note]]")
        ['My Note', 'Another Note']
    """
    if not content:
        return []
    titles = WIKILINK_PATTERN.findall(content)
    # Deduplicate while preserving order
    seen = set()
    unique = []
    for title in titles:
        stripped = title.strip()
        if stripped and stripped.lower() not in seen:
            seen.add(stripped.lower())
            unique.append(stripped)
    return unique


def sync_note_links(note) -> None:
    """
    Synchronise the NoteLink table for a given note.
    
    1. Parse all [[wikilinks]] from the note's content.
    2. Resolve each title to an existing note owned by the same user.
    3. Delete stale links and create new ones.
    """
    from .models import Note, NoteLink  # avoid circular import

    titles = extract_wikilinks(note.content)
    
    if not titles:
        # No wikilinks — remove all outgoing links
        NoteLink.objects.filter(source=note).delete()
        return

    # Find target notes owned by the same user (case-insensitive title match)
    target_notes = Note.objects.filter(
        owner=note.owner,
        is_trashed=False,
        title__in=titles,
    ).exclude(pk=note.pk)  # Prevent self-links

    # Also try case-insensitive matching for titles that didn't match exactly
    matched_ids = set(target_notes.values_list('pk', flat=True))
    matched_titles_lower = {t.lower() for t in target_notes.values_list('title', flat=True)}
    remaining_titles = [
        t for t in titles 
        if t.lower() not in matched_titles_lower
    ]
    if remaining_titles:
        from django.db.models import Q
        q_objects = Q()
        for title in remaining_titles:
            q_objects |= Q(title__iexact=title)
            
        ci_matches = Note.objects.filter(
            q_objects,
            owner=note.owner,
            is_trashed=False
        ).exclude(pk=note.pk)
        
        for ci_match in ci_matches:
            if ci_match.pk not in matched_ids:
                matched_ids.add(ci_match.pk)

    # Get the final set of target notes
    all_targets = Note.objects.filter(pk__in=matched_ids)
    target_ids = set(all_targets.values_list('pk', flat=True))

    # Current outgoing links
    existing_links = NoteLink.objects.filter(source=note)
    existing_target_ids = set(existing_links.values_list('target_id', flat=True))

    # Delete stale links (targets that are no longer referenced)
    stale_ids = existing_target_ids - target_ids
    if stale_ids:
        NoteLink.objects.filter(source=note, target_id__in=stale_ids).delete()

    # Create new links (targets that don't have a link yet)
    new_ids = target_ids - existing_target_ids
    if new_ids:
        NoteLink.objects.bulk_create(
            [NoteLink(source=note, target_id=tid) for tid in new_ids],
            ignore_conflicts=True,
        )
