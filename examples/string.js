const hasherType = require("../compressed-hash");
const hasher = new hasherType(32, 226);

const cleaText = `€Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.`;
const utf8Encoder = new TextEncoder()
const byteArray = utf8Encoder.encode(cleaText)

const compressed = byteArray.reduce((c, b) => {
    let cData = hasher.streamCompress(b);
    if (cData !== undefined) {
        c.push(cData);
    }
    return c;
}, []);
compressed.push(hasher.flushStreamCompressed());
let compressedBytesSize = compressed.reduce((acc, e) => acc + e.length, 0);

let decompressed = hasherType.decompress(compressed);
let utf8decoder = new TextDecoder();
const actualClearText = utf8decoder.decode(decompressed);
console.log(`Passed: ${cleaText === actualClearText} 
Savings: ${((1 - (compressedBytesSize / byteArray.length)) * 100).toFixed(2)}% (${byteArray.length-compressedBytesSize}B) of original size.

Expected (${byteArray.length}bytes): ${cleaText} 

Actual (${compressedBytesSize}bytes): ${actualClearText}
`);