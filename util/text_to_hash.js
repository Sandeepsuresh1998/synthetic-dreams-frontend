import hash from "./hash"
import normalize from "./normalize"

export default function text_to_hash(text) {
    let result = normalize(text)
    return hash(result)
}