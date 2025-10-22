/**
 * Resolves a dot-separated path string on a nested object.
 * @param {any} object The object to resolve the path on.
 * @param {string} path The dot-separated path.
 * @returns {string | undefined} The resolved value, or undefined if not found.
 */
function resolvePath(object: any, path: string): string | undefined {
    if (!object || typeof path !== 'string') {
        return undefined;
    }
    let current = object;
    const parts = path.split('.');
    for (const part of parts) {
        // Use a robust check to ensure the property exists and current is an object
        if (current === null || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
            return undefined;
        }
        current = current[part];
    }

    if (typeof current === 'string') {
        return current;
    }
    if (typeof current === 'number') {
        return String(current);
    }
    return undefined;
}


/**
 * Processes a string containing Foundry VTT's special syntax and transforms it into formatted HTML.
 * @param {string | undefined} content The raw HTML string from the journal page.
 * @param {string[]} pageIds A list of valid page IDs within the current journal context.
 * @param {Record<string, any> | null} localizationData The localization data object.
 * @returns {string} The processed HTML string.
 */
export const processFoundryTags = (content: string | undefined, pageIds: string[], localizationData: Record<string, any> | null): string => {
    if (!content) return '';

    let result = content;

    // Handle @Localize tags first, recursively.
    if (localizationData) {
        // Using a non-greedy match (.*?) which is generally more robust.
        result = result.replace(/@Localize\[(.*?)\]/g, (match, key) => {
            const trimmedKey = key.trim(); // Trim whitespace from the key
            const translation = resolvePath(localizationData, trimmedKey);
            if (translation) {
                // Recursively process the translated content to handle nested tags like @UUID.
                return processFoundryTags(translation, pageIds, localizationData);
            }
            return `<strong>${trimmedKey}</strong>`; // Fallback if key not found
        });
    }

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

    // Helper function for tags that might have nested brackets and an optional label
    const parseAndReplace = (text: string, tag: string, transformer: (content: string, label: string | null) => string): string => {
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
                let label: string | null = null;
                let finalEndIndex = contentEndIndex + 1;

                // Check for and parse optional '{...}' label
                if (text.substring(finalEndIndex).trim().startsWith('{')) {
                    const labelStartIndexWithBrace = text.indexOf('{', finalEndIndex);
                    const labelStartIndex = labelStartIndexWithBrace + 1;
                    let braceLevel = 1;
                    let labelEndIndex = -1;
                    for (let i = labelStartIndex; i < text.length; i++) {
                        if (text[i] === '{') braceLevel++;
                        else if (text[i] === '}') {
                            braceLevel--;
                            if (braceLevel === 0) {
                                labelEndIndex = i;
                                break;
                            }
                        }
                    }
                    if (labelEndIndex !== -1) {
                        label = text.substring(labelStartIndex, labelEndIndex);
                        finalEndIndex = labelEndIndex + 1;
                    }
                }

                output += transformer(content, label);
                lastIndex = finalEndIndex;
            } else {
                // Malformed tag (no closing bracket), append the tag prefix and continue scanning after it
                output += text.substring(currentIndex, contentStartIndex);
                lastIndex = contentStartIndex;
            }
            currentIndex = text.indexOf(tagPrefix, lastIndex);
        }
        if (lastIndex < text.length) output += text.substring(lastIndex);
        return output;
    };

    // Rule for Damage: @Damage[...] -> <strong>...</strong>
    result = parseAndReplace(result, 'Damage', (c) => `<strong>${c}</strong>`);

    // Rule for Checks: @Check[...] -> special format for saves, <strong> for others
    result = parseAndReplace(result, 'Check', (c, label) => {
        const parts = c.split('|');
        const checkValues: {[key: string]: string} = {};
        parts.forEach(part => {
           if (part.includes(':')) {
               const [key, val] = part.split(':', 2);
               checkValues[key.trim()] = val.trim();
           } else {
                const trimmedPart = part.trim().toLowerCase();
                if (['reflex', 'fortitude', 'will'].includes(trimmedPart) && !checkValues.type) {
                    checkValues.type = trimmedPart;
                } else if (!isNaN(parseInt(trimmedPart)) && !checkValues.dc) {
                    checkValues.dc = trimmedPart;
                }
           }
        });

        const saveTypes = ['reflex', 'fortitude', 'will'];
        const type = checkValues.type?.toLowerCase();

        if (type && saveTypes.includes(type) && checkValues.dc) {
            let output = "";
            if (checkValues.basic === 'true') {
                output += 'Basic_';
            }
            const saveType = checkValues.type.charAt(0).toUpperCase() + checkValues.type.slice(1);
            output += `${saveType}_DC${checkValues.dc}`;
            return output;
        }
        
        // Revised default behavior for other checks.
        let fallbackText = "";
        if (checkValues.basic === 'true') fallbackText += "Basic ";
        if (checkValues.type) fallbackText += `${checkValues.type.charAt(0).toUpperCase() + checkValues.type.slice(1)} `;
        if (checkValues.dc) fallbackText += `DC ${checkValues.dc}`;
        
        fallbackText = fallbackText.trim();
        if (fallbackText) {
            return `<strong>${fallbackText}</strong>`;
        }

        // Ultimate fallback for unparsable content
        return `<strong>${label || c}</strong>`;
    });

    return result;
};