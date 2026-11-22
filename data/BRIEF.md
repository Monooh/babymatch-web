# Baby-name dataset brief

You are writing one slice of a large multilingual baby-name database. Other
writers cover other cultures in parallel, so stay inside the slice you were given.

## Output

Plain UTF-8 text files, ONE NAME PER LINE, no header, no numbering, no blank
lines, no commentary. Write about 100 lines per file, to:

    /Users/brunovelazquez/Desktop/Proyectos Claude/babymatch/babymatch-web/data/raw/<PREFIX>-01.txt
    /Users/brunovelazquez/Desktop/Proyectos Claude/babymatch/babymatch-web/data/raw/<PREFIX>-02.txt
    ...

Use the Write tool, one file per call (do not try to write everything in one call).
Work through the alphabet A→Z so you do not repeat yourself, and keep going until
you reach your target count. Never repeat a name inside your slice.

## Line format (12 pipe-separated fields)

    Name|gender|root|cultures|pop|tags|es|en|fr|de|it|pt

Examples:

    Lucía|f|latin|spanish|5|saint,light,classic|Luz|Light|Lumière|Licht|Luce|Luz
    Noah|m|hebrew|english,german,french,intl|5|biblical,trendy|Descanso, consuelo|Rest, comfort|Repos, réconfort|Ruhe, Trost|Riposo, conforto|Descanso, conforto
    Aitana|f|basque|spanish,basque|4|place,modern|Montaña de gloria|Mountain of glory|Montagne de gloire|Berg des Ruhms|Montagna di gloria|Montanha de glória

Fields:

1. **Name** — spelled exactly as parents in that culture write it, with its
   diacritics (Lucía for Spanish, Lucia for Italian, Zoë/Zoé where appropriate).
   Latin script only (romanise other scripts). A few traditional compound names
   are fine where they are a real convention (María José, Jean-Luc, Anna-Lena).
2. **gender** — `f`, `m` or `u` (truly unisex in real usage).
3. **root** — etymological root, exactly one of:
   `latin greek hebrew germanic celtic norse slavic arabic persian turkish sanskrit japanese chinese korean african polynesian basque native other`
   (Old English/Old German/Frankish = germanic; Irish/Scottish/Welsh/Breton = celtic; Aramaic = hebrew.)
4. **cultures** — comma-separated, the cultures where THIS SPELLING is naturally
   in use, the main one first. One or more of:
   `spanish basque catalan galician portuguese french italian german english irish scottish welsh scandinavian dutch russian polish greek hebrew arabic turkish persian indian japanese chinese korean african hawaiian intl`
   Add `intl` only for names used almost everywhere in the same spelling (Emma, Noah, Anna, David, Mia…).
5. **pop** — 1 to 5. 5 = top-chart name today in its main culture, 4 = common,
   3 = familiar, 2 = uncommon, 1 = rare. Be honest: most names are 2–3.
6. **tags** — 1 to 4, comma-separated, only from this list:
   `biblical saint mythology nature flower celestial sea royal literary classic vintage modern trendy strong sweet virtue gem animal place warrior light love music`
   (vintage = old-fashioned name that is coming back; classic = timeless; modern = recent coinage or recent fashion.)
7–12. **meaning** in Spanish, English, French, German, Italian, Portuguese (in
   that order). A short noun phrase of 1–7 words, natural in each language,
   capitalised first letter, no final full stop, never a pipe character.
   Translate the meaning — do not leave English in the other columns.

## Quality rules

- Real given names only, in real use. Nothing invented, no surnames-as-jokes, no brand names.
- The meaning must be the accepted etymology. If you are not confident about a
  name's meaning, skip the name rather than guess.
- Balance genders roughly as your slice asks. Include the famous classics, the
  current top-100 names AND plenty of the rarer, distinctive ones — the rarer
  names are what makes the database valuable.
- Do not pad with trivial spelling variants (max one alternative spelling per name).
- Exactly 12 fields per line. Check before writing each file.

When you are done, reply with only: the number of lines you wrote and the files you created.
