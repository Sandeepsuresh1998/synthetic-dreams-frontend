export default function normalize(text) {
    // Normalize the text i.e. remove any spaces, all lower case
    var normalized_text = text.trim()
    normalized_text = normalized_text.toLowerCase()
    normalized_text = normalized_text.replace(/\s+/g, '');
    return normalized_text
}