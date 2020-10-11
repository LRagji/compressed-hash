const bigInt = require("big-integer");

module.exports = class CompressedHash {

    #min;
    #radix;
    #uniqueValuesMap;
    #streamAlpha;
    #indexer;

    constructor(min, max) {
        this.streamCompress = this.streamCompress.bind(this);
        this.flushStreamCompressed = this.flushStreamCompressed.bind(this);

        if (Number.isNaN(min) || min < 0 || min > 255) throw new Error("Parameter min has to be a finite number between 0 to 255.");
        if (Number.isNaN(max) || max < 0 || max > 255) throw new Error("Parameter max has to be a finite number between 0 to 255.");
        if (min > max) throw new Error("Parameter min has to be a less than max parameter.");
        if (min === max) throw new Error("Parameter min be equal to max parameter.");

        this.flushStreamCompressed();
        this.#min = min;
        this.#radix = (max - min) + 1;
    }

    streamCompress(byte) {
        if (Number.isNaN(byte) || byte > 255 || byte < 0) throw new Error("Parameter byte has to be a finite number between 0 to 255.");
        const isUnique = !this.#uniqueValuesMap.has(byte);

        if (byte < this.#min || (isUnique && this.#uniqueValuesMap.size + 1 > this.#radix)) {
            const results = this.flushStreamCompressed();
            if ((isUnique && this.#uniqueValuesMap.size + 1 > this.#radix)) this.#radix = this.#radix + 1;
            if (byte < this.#min) this.#min = byte;
            this.streamEncode(byte);
            return results;
        }

        if (isUnique) {
            this.#uniqueValuesMap.set(byte, 1);
        }
        else {
            this.#uniqueValuesMap.set(byte, (this.#uniqueValuesMap.get(byte) + 1));
        }

        this.#streamAlpha = this.#streamAlpha.add(bigInt(this.#radix).pow(this.#indexer).multiply(byte - this.#min));
        this.#indexer++;
    }

    flushStreamCompressed() {
        let returnBytes;
        if (this.#streamAlpha != undefined) {
            returnBytes = new Uint8ClampedArray(2 + Math.ceil((this.#streamAlpha.bitLength() / 8)));
            returnBytes[0] = this.#radix;
            returnBytes[1] = this.#min;
            CompressedHash.toLittleEndian(this.#streamAlpha, returnBytes, 2);
        }
        this.#min = Number.MAX_SAFE_INTEGER;
        this.#radix = 0;
        this.#streamAlpha = new bigInt(0);
        this.#uniqueValuesMap = new Map();
        this.#indexer = 0;
        return returnBytes;
    }

    static decompress(compressedBytesArray) {
        if (!Array.isArray(compressedBytesArray)) throw new Error("Parameter compressedBytesArray is malformed should be an array.");
        const results = [];
        while (compressedBytesArray.length) {
            const compressedBytes = compressedBytesArray.pop();
            if (compressedBytes == undefined || compressedBytes.constructor !== Uint8ClampedArray || compressedBytes.length < 3) throw new Error("Parameter compressedBytes is malformed.");

            const radix = compressedBytes[0];
            const min = compressedBytes[1];
            let alpha = CompressedHash.fromLittleEndian(compressedBytes, 2, compressedBytes.length);

            do {
                let result = alpha.divmod(radix)
                alpha = result.quotient;
                results.push(result.remainder.add(min).toJSNumber());
            }
            while (alpha.greater(0));
        }
        return new Uint8ClampedArray(results);
    }

    static fromLittleEndian(buff, offset, end) {
        let result = bigInt.zero;
        let base = bigInt.one;
        let n256 = bigInt(256);
        for (let index = offset; index < end; index++) {
            const byte = buff[index];
            result = result.add(base.multiply(bigInt(byte)));
            base = base.multiply(n256);
        }
        return result;
    }

    static toLittleEndian(bigNumber, buff, offset) {
        let n256 = bigInt(256);
        let i = 0;
        while (bigNumber.greater(bigInt.zero)) {
            buff[offset + i] = bigNumber.mod(n256);
            bigNumber = bigNumber.divide(n256);
            i += 1;
        }
    }
}

// module.exports = class CompressedHash {

//     #min;
//     #max;
//     #count;
//     #tolerance;
//     #adjustTolerance = true;
//     #hash = 0;
//     #radix = 0;
//     #maxPacketCount;
//     #allHashes = [];

//     constructor(tolerance = 2, maxPacketCount = 255) {
//         if (Number.isNaN(tolerance) || tolerance > 10 || tolerance < 0) throw new Error("Parameter tolerance has to be a finite float between 0 to 10.");
//         if (Number.isNaN(maxPacketCount) || maxPacketCount > 1000 || maxPacketCount < 0) throw new Error("Parameter maxPacketCount has to be a finite float between 0 to 1000.");

//         this.encodeByte = this.encodeByte.bind(this);
//         this.flushEncoded = this.flushEncoded.bind(this);

//         this.flushEncoded();
//         this.#tolerance = tolerance;
//         this.#maxPacketCount = maxPacketCount;
//     }

//     encodeByte(byte) {
//         if (Number.isNaN(byte) || byte > 255 || byte < 0) throw new Error("Parameter byte has to be a finite number between 0 to 255.");

//         if (this.#adjustTolerance === true) {
//             this.#max = Math.ceil(byte * this.#tolerance) + byte;
//             this.#min = byte - Math.floor(byte * this.#tolerance);
//             if (this.#min < 0) this.#min = 0;
//             if (this.#max > 255) this.#max = 255;
//             this.#adjustTolerance = false;
//             this.#radix = (this.#max - this.#min) + 1;
//             this.#hash = 0;
//         }

//         if (byte > this.#max || byte < this.#min || this.#count >= this.#maxPacketCount) {
//             const results = this.flushEncoded();
//             this.encodeByte(byte);
//             return results;
//         }

//         let alpha = (byte * Math.pow(this.#radix, this.#count));

//         if (!Number.isSafeInteger(this.#hash + alpha)) {
//             this.#allHashes.push(this.#hash);
//             this.#hash = 0;
//             // const results = this.flushEncoded();
//             // this.encodeByte(byte);
//             // return results;
//         }

//         this.#hash += alpha
//         this.#count++;
//     }

//     flushEncoded() {
//         let returnBytes = [];
//         this.#allHashes.push(this.#hash);
//         returnBytes.push(this.#max);
//         returnBytes.push(this.#min);
//         returnBytes.push(this.#allHashes);
//         returnBytes.push(this.#count);
//         this.#adjustTolerance = true;
//         this.#min = Number.MAX_SAFE_INTEGER;
//         this.#max = Number.MIN_SAFE_INTEGER;
//         this.#count = 0;
//         this.#radix = 0;
//         this.#hash = 0;
//         this.#allHashes = [];
//         return returnBytes;
//     }

//     decode(encodedArray) {
//         if (!Array.isArray(encodedArray) || encodedArray.length < 4) throw new Error("Parameter encodedArray is malformed.");
//         if (Number.isNaN(encodedArray[0]) || encodedArray[0] > 255 || encodedArray[0] < 0) throw new Error("Parameter encodedArray element 0 should to be a finite number between 0 to 255.");
//         if (Number.isNaN(encodedArray[1]) || encodedArray[1] > 255 || encodedArray[1] < 0) throw new Error("Parameter encodedArray element 1 should to be a finite number between 0 to 255.");
//         if (Number.isNaN(encodedArray[3]) || encodedArray[3] > 255 || encodedArray[3] < 0) throw new Error("Parameter encodedArray element 3 should to be a finite number between 0 to 255.");
//         if (Number.isNaN(encodedArray[2]) || !Number.isSafeInteger(encodedArray[2])) throw new Error("Parameter encodedArray element 2 should to be a safe number.");

//         const max = encodedArray[0];
//         const min = encodedArray[1];
//         let hash = encodedArray[2];
//         const count = encodedArray[3];
//         const radix = (max - min) + 1;
//         const results = [];

//         if (min === max) { //Means its a straight Line
//             for (let fillCounter = 0; fillCounter < count; fillCounter++) results.push(min);
//         } else {
//             for (let fillCounter = 0; fillCounter < count; fillCounter++) {
//                 let byte = hash % radix;
//                 if (byte > max || byte < min) throw new Error("Algorithm Failure! An element was computed which is out of possibilities range.");
//                 hash = Math.floor(hash / radix);
//                 results.push(byte);
//             };
//         }
//         return results;
//     }
// }