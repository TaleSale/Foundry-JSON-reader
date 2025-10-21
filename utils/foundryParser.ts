
/**
 * Processes a string containing Foundry VTT's special syntax and transforms it into formatted HTML.
 * @param {string | undefined} content The raw HTML string from the journal page.
 * @param {string[]} pageIds A list of valid page IDs within the current journal context.
 * @returns {string} The processed HTML string.
 */
export const processFoundryTags = (content: string | undefined, pageIds: string[]): string => {
    if (!content) return '';

    let result = content;
    const pageIdSet = new Set(pageIds);

    // Rule for internal journal page links: @UUID[JournalEntry...JournalEntryPage:pageId]{Link Text} -> clickable link
    result = result.replace(/@UUID\[JournalEntry\..*?\.JournalEntryPage\.(.*?)\]\{(.*?)\}/g, (match, pageId, linkText) => {
        if (pageIdSet.has(pageId)) {
            return `<a href="#" class="internal-journal-link" data-page-id="${pageId}">${linkText}</a>`;
        }
        return `<strong>${linkText}</strong>`; // Fallback if page ID is not in the current journal
    });
    
    // Rule for internal actor links: @UUID[Actor...]{Link Text} -> clickable link
    result = result.replace(/@UUID\[Actor\..*?\]\{(.*?)\}/g, (match, linkText) => {
        return `<a href="#" class="internal-journal-link" data-actor-name="${linkText}">${linkText}</a>`;
    });
    
    // Rule for internal item links: @UUID[...Item...]{Link Text} -> clickable link
    result = result.replace(/@UUID\[.*?\.Item\..*?\]\{(.*?)\}/g, (match, linkText) => {
        return `<a href="#" class="internal-journal-link" data-item-name="${linkText}">${linkText}</a>`;
    });


    // Rule for other UUIDs: @UUID[...]{...} -> <strong>{...}</strong>
    result = result.replace(/@UUID\[.*?\]\{(.*?)\}/g, '<strong>$1</strong>');
    
    // Rule for Traits: @Trait[...]{...} or @Traits[...]{...} -> {...}
    result = result.replace(/@Traits?\[.*?\]\{(.*?)\}/g, '$1');

    // Rule for Conditions: @Condition[...]{...} -> <em>{...}</em>
    result = result.replace(/@Condition\[.*?\]\{(.*?)\}/g, '<em>$1</em>');

    // Helper function for tags that might have nested brackets
    const parseAndReplace = (text: string, tag: string, transformer: (content: string) => string): string => {
        const tagPrefix = `@${tag}[`;
        let output = "";
        let lastIndex = 0;
        let currentIndex = text.indexOf(tagPrefix);

        while (currentIndex !== -1) {
            output += text.substring(lastIndex, currentIndex);

            let bracketLevel = 1;
            let contentEndIndex = -1;
            const contentStartIndex = currentIndex + tagPrefix.length;

            for (let i = contentStartIndex; i < text.length; i++) {
                if (text[i] === '[') bracketLevel++;
                else if (text[i] === ']') {
                    bracketLevel--;
                    if (bracketLevel === 0) {
                        contentEndIndex = i;
                        break;
                    }
                }
            }

            if (contentEndIndex !== -1) {
                const content = text.substring(contentStartIndex, contentEndIndex);
                output += transformer(content);
                lastIndex = contentEndIndex + 1;
            } else {
                output += text.substring(currentIndex);
                lastIndex = text.length;
                break;
            }
            currentIndex = text.indexOf(tagPrefix, lastIndex);
        }
        if (lastIndex < text.length) output += text.substring(lastIndex);
        return output;
    };

    // Rule for Damage: @Damage[...] -> <strong>...</strong>
    result = parseAndReplace(result, 'Damage', (c) => `<strong>${c}</strong>`);

    // Rule for Checks: @Check[...] -> <strong>Type DC X</strong>
    result = parseAndReplace(result, 'Check', (c) => {
        const parts = c.split('|');
        const checkValues: {[key: string]: string} = {};
        parts.forEach(part => {
           if (part.includes(':')) {
               const [key, val] = part.split(':');
               checkValues[key.trim()] = val.trim();
           } else {
                if(!checkValues.type) checkValues.type = part.trim();
                else if(!checkValues.dc) checkValues.dc = part.trim();
           }
        });

        let output = "<strong>";
        if (checkValues.basic) output += "Basic ";
        if (checkValues.type) output += `${checkValues.type.charAt(0).toUpperCase() + checkValues.type.slice(1)} `;
        if (checkValues.dc) output += `DC ${checkValues.dc}`;
        output += "</strong>";
        
        return output.trim() === "<strong></strong>" ? `<strong>${c}</strong>` : output;
    });

    return result;
};
