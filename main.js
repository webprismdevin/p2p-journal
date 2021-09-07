(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":6}],3:[function(require,module,exports){
/*!
 * froala_editor v4.0.4 (https://www.froala.com/wysiwyg-editor)
 * License https://froala.com/wysiwyg-editor/terms/
 * Copyright 2014-2021 Froala Labs
 */

!function(e,t){"object"==typeof exports&&"undefined"!=typeof module?module.exports=t():"function"==typeof define&&define.amd?define(t):e.FroalaEditor=t()}(this,function(){"use strict";function N(e){return(N="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(e){return typeof e}:function(e){return e&&"function"==typeof Symbol&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e})(e)}Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector),Element.prototype.closest||(Element.prototype.closest=function(e){var t=this;if(!document.documentElement.contains(t))return null;do{if(t.matches(e))return t;t=t.parentElement||t.parentNode}while(null!==t&&1===t.nodeType);return null}),Element.prototype.matches||(Element.prototype.matches=Element.prototype.matchesSelector||Element.prototype.mozMatchesSelector||Element.prototype.msMatchesSelector||Element.prototype.oMatchesSelector||Element.prototype.webkitMatchesSelector||function(e){for(var t=(this.document||this.ownerDocument).querySelectorAll(e),n=t.length;0<=--n&&t.item(n)!==this;);return-1<n}),Array.isArray||(Array.isArray=function(e){return"[object Array]"===Object.prototype.toString.call(e)}),"function"!=typeof Object.assign&&Object.defineProperty(Object,"assign",{value:function(e,t){if(null==e)throw new TypeError("Cannot convert undefined or null to object");for(var n=Object(e),r=1;r<arguments.length;r++){var o=arguments[r];if(null!=o)for(var i in o)Object.prototype.hasOwnProperty.call(o,i)&&(n[i]=o[i])}return n},writable:!0,configurable:!0}),function(){var a=/^\s*:scope/gi,s=/,\s*:scope/gi,l=document.createElement("div");function e(e,t){var i=e[t];e[t]=function(e){var t,n=!1,r=!1;if(!e||Array.isArray(e)||!e.match(a)&&!e.match(s))return i.call(this,e);this.parentNode||(l.appendChild(this),r=!0);var o=this.parentNode;return this.id||(this.id="rootedQuerySelector_id_".concat((new Date).getTime()),n=!0),t=i.call(o,e.replace(a,"#".concat(this.id)).replace(s,",#".concat(this.id))),n&&(this.id=""),r&&l.removeChild(this),t}}try{var t=l.querySelectorAll(":scope *");if(!t||Array.isArray(t))throw"error"}catch(n){e(Element.prototype,"querySelector"),e(Element.prototype,"querySelectorAll"),e(HTMLElement.prototype,"querySelector"),e(HTMLElement.prototype,"querySelectorAll")}}(),"document"in self&&("classList"in document.createElement("_")&&(!document.createElementNS||"classList"in document.createElementNS("http://www.w3.org/2000/svg","g"))||function(e){if("Element"in e){var t="classList",n="prototype",r=e.Element[n],o=Object,i=String[n].trim||function(){return this.replace(/^\s+|\s+$/g,"")},a=Array[n].indexOf||function(e){for(var t=0,n=this.length;t<n;t++)if(t in this&&this[t]===e)return t;return-1},s=function s(e,t){this.name=e,this.code=DOMException[e],this.message=t},l=function l(e,t){if(""===t)throw new s("SYNTAX_ERR","The token must not be empty.");if(/\s/.test(t))throw new s("INVALID_CHARACTER_ERR","The token must not contain space characters.");return a.call(e,t)},c=function c(e){for(var t=i.call(e.getAttribute("class")||""),n=t?t.split(/\s+/):[],r=0,o=n.length;r<o;r++)this.push(n[r]);this._updateClassName=function(){e.setAttribute("class",this.toString())}},d=c[n]=[],f=function f(){return new c(this)};if(s[n]=Error[n],d.item=function(e){return this[e]||null},d.contains=function(e){return~l(this,e+"")},d.add=function(){for(var e,t=arguments,n=0,r=t.length,o=!1;e=t[n]+"",~l(this,e)||(this.push(e),o=!0),++n<r;);o&&this._updateClassName()},d.remove=function(){var e,t,n=arguments,r=0,o=n.length,i=!1;do{for(e=n[r]+"",t=l(this,e);~t;)this.splice(t,1),i=!0,t=l(this,e)}while(++r<o);i&&this._updateClassName()},d.toggle=function(e,t){var n=this.contains(e),r=n?!0!==t&&"remove":!1!==t&&"add";return r&&this[r](e),!0===t||!1===t?t:!n},d.replace=function(e,t){var n=l(e+"");~n&&(this.splice(n,1,t),this._updateClassName())},d.toString=function(){return this.join(" ")},o.defineProperty){var p={get:f,enumerable:!0,configurable:!0};try{o.defineProperty(r,t,p)}catch(h){void 0!==h.number&&-2146823252!==h.number||(p.enumerable=!1,o.defineProperty(r,t,p))}}else o[n].__defineGetter__&&r.__defineGetter__(t,f)}}(self),function(){var e=document.createElement("_");if(e.classList.add("c1","c2"),!e.classList.contains("c2")){var t=function yc(e){var yc=DOMTokenList.prototype[e];DOMTokenList.prototype[e]=function(e){var t,n=arguments.length;for(t=0;t<n;t++)e=arguments[t],yc.call(this,e)}};t("add"),t("remove")}if(e.classList.toggle("c3",!1),e.classList.contains("c3")){var n=DOMTokenList.prototype.toggle;DOMTokenList.prototype.toggle=function(e,t){return 1 in arguments&&!this.contains(e)==!t?t:n.call(this,e)}}"replace"in document.createElement("_").classList||(DOMTokenList.prototype.replace=function(e,t){var n=this.toString().split(" "),r=n.indexOf(e+"");~r&&(n=n.slice(r),this.remove.apply(this,n),this.add(t),this.add.apply(this,n.slice(1)))}),e=null}());function V(e,t,n){if("string"!=typeof e)return new V.Bootstrap(e,t,n);var r=document.querySelectorAll(e);t&&t.iframe_document&&(r=t.iframe_document.querySelectorAll(e));for(var o=[],i=0;i<r.length;i++){var a=r[i]["data-froala.editor"];a?o.push(a):o.push(new V.Bootstrap(r[i],t,n))}return 1==o.length?o[0]:o}V.RegisterPlugins=function(e){for(var t=0;t<e.length;t++)e[t].call(V)},Object.assign(V,{DEFAULTS:{initOnClick:!1,pluginsEnabled:null},MODULES:{},PLUGINS:{},VERSION:"4.0.4",INSTANCES:[],OPTS_MAPPING:{},SHARED:{},ID:0}),V.MODULES.node=function(a){var n=a.$;function s(e){return e&&"IFRAME"!==e.tagName?Array.prototype.slice.call(e.childNodes||[]):[]}function l(e){return!!e&&(e.nodeType===Node.ELEMENT_NODE&&0<=V.BLOCK_TAGS.indexOf(e.tagName.toLowerCase()))}function c(e){var t={},n=e.attributes;if(n)for(var r=0;r<n.length;r++){var o=n[r];t[o.nodeName]=o.value}return t}function t(e){for(var t="",n=c(e),r=Object.keys(n).sort(),o=0;o<r.length;o++){var i=r[o],a=n[i];a.indexOf("'")<0&&0<=a.indexOf('"')?t+=" ".concat(i,"='").concat(a,"'"):(0<=a.indexOf('"')&&0<=a.indexOf("'")&&(a=a.replace(/"/g,"&quot;")),t+=" ".concat(i,'="').concat(a,'"'))}return t}function r(e){return e===a.el}return{isBlock:l,isEmpty:function d(e,t){if(!e)return!0;if(e.querySelector("table"))return!1;var n=s(e);1===n.length&&l(n[0])&&(n=s(n[0]));for(var r=!1,o=0;o<n.length;o++){var i=n[o];if(!(t&&a.node.hasClass(i,"fr-marker")||i.nodeType===Node.TEXT_NODE&&0===i.textContent.length)){if("BR"!==i.tagName&&0<(i.textContent||"").replace(/\u200B/gi,"").replace(/\n/g,"").length)return!1;if(r)return!1;"BR"===i.tagName&&(r=!0)}}return!(e.querySelectorAll(V.VOID_ELEMENTS.join(",")).length-e.querySelectorAll("br").length||e.querySelector("".concat(a.opts.htmlAllowedEmptyTags.join(":not(.fr-marker),"),":not(.fr-marker)"))||1<e.querySelectorAll(V.BLOCK_TAGS.join(",")).length||e.querySelector("".concat(a.opts.htmlDoNotWrapTags.join(":not(.fr-marker),"),":not(.fr-marker)")))},blockParent:function o(e){for(;e&&e.parentNode!==a.el&&(!e.parentNode||!a.node.hasClass(e.parentNode,"fr-inner"));)if(l(e=e.parentNode))return e;return null},deepestParent:function i(e,t,n){if(void 0===t&&(t=[]),void 0===n&&(n=!0),t.push(a.el),0<=t.indexOf(e.parentNode)||e.parentNode&&a.node.hasClass(e.parentNode,"fr-inner")||e.parentNode&&0<=V.SIMPLE_ENTER_TAGS.indexOf(e.parentNode.tagName)&&n)return null;for(;t.indexOf(e.parentNode)<0&&e.parentNode&&!a.node.hasClass(e.parentNode,"fr-inner")&&(V.SIMPLE_ENTER_TAGS.indexOf(e.parentNode.tagName)<0||!n)&&(!l(e)||l(e.parentNode))&&(!l(e)||!l(e.parentNode)||!n);)e=e.parentNode;return e},rawAttributes:c,attributes:t,clearAttributes:function f(e){for(var t=e.attributes,n=t.length-1;0<=n;n--){var r=t[n];e.removeAttribute(r.nodeName)}},openTagString:function p(e){return"<".concat(e.tagName.toLowerCase()).concat(t(e),">")},closeTagString:function h(e){return"</".concat(e.tagName.toLowerCase(),">")},isFirstSibling:function u(e,t){void 0===t&&(t=!0);for(var n=e.previousSibling;n&&t&&a.node.hasClass(n,"fr-marker");)n=n.previousSibling;return!n||n.nodeType===Node.TEXT_NODE&&""===n.textContent&&u(n)},isLastSibling:function C(e,t){void 0===t&&(t=!0);for(var n=e.nextSibling;n&&t&&a.node.hasClass(n,"fr-marker");)n=n.nextSibling;return!n||n.nodeType===Node.TEXT_NODE&&""===n.textContent&&C(n)},isList:function g(e){return!!e&&0<=["UL","OL"].indexOf(e.tagName)},isLink:function m(e){return!!e&&e.nodeType===Node.ELEMENT_NODE&&"a"===e.tagName.toLowerCase()},isElement:r,contents:s,isVoid:function v(e){return e&&e.nodeType===Node.ELEMENT_NODE&&0<=V.VOID_ELEMENTS.indexOf((e.tagName||"").toLowerCase())},hasFocus:function b(e){return e===a.doc.activeElement&&(!a.doc.hasFocus||a.doc.hasFocus())&&Boolean(r(e)||e.type||e.href||~e.tabIndex)},isEditable:function L(e){return(!e.getAttribute||"false"!==e.getAttribute("contenteditable"))&&["STYLE","SCRIPT"].indexOf(e.tagName)<0},isDeletable:function E(e){return e&&e.nodeType===Node.ELEMENT_NODE&&e.getAttribute("class")&&0<=(e.getAttribute("class")||"").indexOf("fr-deletable")},hasClass:function y(e,t){return e instanceof n&&(e=e.get(0)),e&&e.classList&&e.classList.contains(t)},filter:function S(e){return a.browser.msie?e:{acceptNode:e}}}},Object.assign(V.DEFAULTS,{DOMPurify:window.DOMPurify,htmlAllowedTags:["a","abbr","address","area","article","aside","audio","b","base","bdi","bdo","blockquote","br","button","canvas","caption","cite","code","col","colgroup","datalist","dd","del","details","dfn","dialog","div","dl","dt","em","embed","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","i","iframe","img","input","ins","kbd","keygen","label","legend","li","link","main","map","mark","menu","menuitem","meter","nav","noscript","object","ol","optgroup","option","output","p","param","pre","progress","queue","rp","rt","ruby","s","samp","script","style","section","select","small","source","span","strike","strong","sub","summary","sup","table","tbody","td","textarea","tfoot","th","thead","time","tr","track","u","ul","var","video","wbr"],htmlRemoveTags:["script","style"],htmlAllowedAttrs:["accept","accept-charset","accesskey","action","align","allowfullscreen","allowtransparency","alt","async","autocomplete","autofocus","autoplay","autosave","background","bgcolor","border","charset","cellpadding","cellspacing","checked","cite","class","color","cols","colspan","content","contenteditable","contextmenu","controls","coords","data","data-.*","datetime","default","defer","dir","dirname","disabled","download","draggable","dropzone","enctype","for","form","formaction","frameborder","headers","height","hidden","high","href","hreflang","http-equiv","icon","id","ismap","itemprop","keytype","kind","label","lang","language","list","loop","low","max","maxlength","media","method","min","mozallowfullscreen","multiple","muted","name","novalidate","open","optimum","pattern","ping","placeholder","playsinline","poster","preload","pubdate","radiogroup","readonly","rel","required","reversed","rows","rowspan","sandbox","scope","scoped","scrolling","seamless","selected","shape","size","sizes","span","src","srcdoc","srclang","srcset","start","step","summary","spellcheck","style","tabindex","target","title","type","translate","usemap","value","valign","webkitallowfullscreen","width","wrap"],htmlAllowedStyleProps:[".*"],htmlAllowComments:!0,htmlUntouched:!1,fullPage:!1}),V.HTML5Map={B:"STRONG",I:"EM",STRIKE:"S"},V.MODULES.clean=function(f){var d,p,h,u,C=f.$;function o(e){if(e.nodeType===Node.ELEMENT_NODE&&e.getAttribute("class")&&0<=e.getAttribute("class").indexOf("fr-marker"))return!1;var t,n=f.node.contents(e),r=[];for(t=0;t<n.length;t++)n[t].nodeType!==Node.ELEMENT_NODE||f.node.isVoid(n[t])?n[t].nodeType===Node.TEXT_NODE&&(n[t].textContent=n[t].textContent.replace(/\u200b/g,"")):n[t].textContent.replace(/\u200b/g,"").length!==n[t].textContent.length&&o(n[t]);if(e.nodeType===Node.ELEMENT_NODE&&!f.node.isVoid(e)&&(e.normalize(),n=f.node.contents(e),r=e.querySelectorAll(".fr-marker"),n.length-r.length==0)){for(t=0;t<n.length;t++)if(n[t].nodeType===Node.ELEMENT_NODE&&(n[t].getAttribute("class")||"").indexOf("fr-marker")<0)return!1;for(t=0;t<r.length;t++)e.parentNode.insertBefore(r[t].cloneNode(!0),e);return e.parentNode.removeChild(e),!1}}function s(e,t){if(e.nodeType===Node.COMMENT_NODE)return"\x3c!--".concat(e.nodeValue,"--\x3e");if(e.nodeType===Node.TEXT_NODE)return t?e.textContent.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"):e.textContent.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\u00A0/g,"&nbsp;").replace(/\u0009/g,"");if(e.nodeType!==Node.ELEMENT_NODE)return e.outerHTML;if(e.nodeType===Node.ELEMENT_NODE&&0<=["STYLE","SCRIPT","NOSCRIPT"].indexOf(e.tagName))return e.outerHTML;if(e.nodeType===Node.ELEMENT_NODE&&"svg"===e.tagName){var n=document.createElement("div"),r=e.cloneNode(!0);return n.appendChild(r),n.innerHTML}if("IFRAME"===e.tagName)return e.outerHTML.replace(/&lt;/g,"<").replace(/&gt;/g,">");var o=e.childNodes;if(0===o.length)return e.outerHTML;for(var i="",a=0;a<o.length;a++)"PRE"===e.tagName&&(t=!0),i+=s(o[a],t);return f.node.openTagString(e)+i+f.node.closeTagString(e)}var l=[];function g(e){var t=e.replace(/;;/gi,";");return";"!==(t=t.replace(/^;/gi,"")).charAt(t.length)&&(t+=";"),t}function c(e){var t;for(t in e)if(Object.prototype.hasOwnProperty.call(e,t)){var n=t.match(h),r=null;"style"===t&&f.opts.htmlAllowedStyleProps.length&&(r=e[t].match(u)),n&&r?e[t]=g(r.join(";")):n&&("style"!==t||r)||delete e[t]}for(var o="",i=Object.keys(e).sort(),a=0;a<i.length;a++)e[t=i[a]].indexOf('"')<0?o+=" ".concat(t,'="').concat(e[t],'"'):o+=" ".concat(t,"='").concat(e[t],"'");return o}function m(e,t){var n,r=document.implementation.createHTMLDocument("Froala DOC").createElement("DIV");C(r).append(e);var o="";if(r){var i=f.node.contents(r);for(n=0;n<i.length;n++)t(i[n]);for(i=f.node.contents(r),n=0;n<i.length;n++)o+=s(i[n])}return o}function v(e,t,n){var r=e=function i(e){return l=[],e=(e=(e=(e=e.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,function(e){return l.push(e),"[FROALA.EDITOR.SCRIPT ".concat(l.length-1,"]")})).replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi,function(e){return l.push(e),"[FROALA.EDITOR.NOSCRIPT ".concat(l.length-1,"]")})).replace(/<meta((?:[\w\W]*?)) http-equiv="/g,'<meta$1 data-fr-http-equiv="')).replace(/<img((?:[\w\W]*?)) src="/g,'<img$1 data-fr-src="')}(e),o=null;return f.opts.fullPage&&(r=f.html.extractNode(e,"body")||(0<=e.indexOf("<body")?"":e),n&&(o=f.html.extractNode(e,"head")||"")),r=m(r,t),o&&(o=m(o,t)),function a(e){return e=(e=(e=e.replace(/\[FROALA\.EDITOR\.SCRIPT ([\d]*)\]/gi,function(e,t){return 0<=f.opts.htmlRemoveTags.indexOf("script")?"":l[parseInt(t,10)]})).replace(/\[FROALA\.EDITOR\.NOSCRIPT ([\d]*)\]/gi,function(e,t){if(0<=f.opts.htmlRemoveTags.indexOf("noscript"))return"";var n=l[parseInt(t,10)].replace(/&lt;/g,"<").replace(/&gt;/g,">"),r=C(n);if(r&&r.length){var o=m(r.html(),L);r.html(o),n=r.get(0).outerHTML}return n})).replace(/<img((?:[\w\W]*?)) data-fr-src="/g,'<img$1 src="')}(function s(e,t,n){if(f.opts.fullPage){var r=f.html.extractDoctype(n),o=c(f.html.extractNodeAttrs(n,"html"));t=null===t?f.html.extractNode(n,"head")||"<title></title>":t;var i=c(f.html.extractNodeAttrs(n,"head")),a=c(f.html.extractNodeAttrs(n,"body"));return"".concat(r,"<html").concat(o,"><head").concat(i,">").concat(t,"</head><body").concat(a,">").concat(e,"</body></html>")}return e}(r,o,e))}function b(e){var t=f.doc.createElement("DIV");return t.innerText=e,t.textContent}function L(e){for(var t=f.node.contents(e),n=0;n<t.length;n++)t[n].nodeType!==Node.TEXT_NODE&&L(t[n]);!function c(a){if("SPAN"===a.tagName&&0<=(a.getAttribute("class")||"").indexOf("fr-marker"))return!1;if("PRE"===a.tagName&&function l(e){var t=e.innerHTML;0<=t.indexOf("\n")&&(e.innerHTML=t.replace(/\n/g,"<br>"))}(a),a.nodeType===Node.ELEMENT_NODE&&(a.getAttribute("data-fr-src")&&0!==a.getAttribute("data-fr-src").indexOf("blob:")&&a.setAttribute("data-fr-src",f.helpers.sanitizeURL(b(a.getAttribute("data-fr-src")))),a.getAttribute("href")&&a.setAttribute("href",f.helpers.sanitizeURL(b(a.getAttribute("href")))),a.getAttribute("src")&&a.setAttribute("src",f.helpers.sanitizeURL(b(a.getAttribute("src")))),a.getAttribute("srcdoc")&&a.setAttribute("srcdoc",f.clean.html(a.getAttribute("srcdoc"))),0<=["TABLE","TBODY","TFOOT","TR"].indexOf(a.tagName)&&(a.innerHTML=a.innerHTML.trim())),!f.opts.pasteAllowLocalImages&&a.nodeType===Node.ELEMENT_NODE&&"IMG"===a.tagName&&a.getAttribute("data-fr-src")&&0===a.getAttribute("data-fr-src").indexOf("file://"))return a.parentNode.removeChild(a),!1;if(a.nodeType===Node.ELEMENT_NODE&&V.HTML5Map[a.tagName]&&""===f.node.attributes(a)){var e=V.HTML5Map[a.tagName],t="<".concat(e,">").concat(a.innerHTML,"</").concat(e,">");a.insertAdjacentHTML("beforebegin",t),(a=a.previousSibling).parentNode.removeChild(a.nextSibling)}if(f.opts.htmlAllowComments||a.nodeType!==Node.COMMENT_NODE)if(a.tagName&&a.tagName.match(p))"STYLE"==a.tagName&&f.helpers.isMac()&&function(){var e,n=a.innerHTML.trim(),r=[],t=/{([^}]+)}/g;for(n=n.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*|<!--[\s\S]*?-->$/,"");e=t.exec(n);)r.push(e[1]);for(var o=function o(t){var e=n.substring(0,n.indexOf("{")).trim();0==!/^[a-z_-][a-z\d_-]*$/i.test(e)&&a.parentNode.querySelectorAll(e).forEach(function(e){e.removeAttribute("class"),e.setAttribute("style",r[t])}),n=n.substring(n.indexOf("}")+1)},i=0;-1!=n.indexOf("{");i++)o(i)}(),a.parentNode.removeChild(a);else if(a.tagName&&!a.tagName.match(d))"svg"===a.tagName?a.parentNode.removeChild(a):f.browser.safari&&"path"===a.tagName&&a.parentNode&&"svg"===a.parentNode.tagName||(a.outerHTML=a.innerHTML);else{var n=a.attributes;if(n)for(var r=n.length-1;0<=r;r--){var o=n[r],i=o.nodeName.match(h),s=null;"style"===o.nodeName&&f.opts.htmlAllowedStyleProps.length&&(s=o.value.match(u)),i&&s?o.value=g(s.join(";")):i&&("style"!==o.nodeName||s)||a.removeAttribute(o.nodeName)}}else 0!==a.data.indexOf("[FROALA.EDITOR")&&a.parentNode.removeChild(a)}(e)}return{_init:function e(){f.opts.fullPage&&C.merge(f.opts.htmlAllowedTags,["head","title","style","link","base","body","html","meta"])},html:function E(e,t,n,r){void 0===t&&(t=[]),void 0===n&&(n=[]),void 0===r&&(r=!1);var o,i=C.merge([],f.opts.htmlAllowedTags);for(o=0;o<t.length;o++)0<=i.indexOf(t[o])&&i.splice(i.indexOf(t[o]),1);var a=C.merge([],f.opts.htmlAllowedAttrs);for(o=0;o<n.length;o++)0<=a.indexOf(n[o])&&a.splice(a.indexOf(n[o]),1);return a.push("data-fr-.*"),a.push("fr-.*"),d=new RegExp("^".concat(i.join("$|^"),"$"),"gi"),h=new RegExp("^".concat(a.join("$|^"),"$"),"gi"),p=new RegExp("^".concat(f.opts.htmlRemoveTags.join("$|^"),"$"),"gi"),u=f.opts.htmlAllowedStyleProps.length?new RegExp("((^|;|\\s)".concat(f.opts.htmlAllowedStyleProps.join(":.+?(?=;|$))|((^|;|\\s)"),":.+?(?=(;)|$))"),"gi"):null,e=v(e,L,!0),"undefined"!=typeof f.opts.DOMPurify&&(e=f.opts.DOMPurify.sanitize(e)),e},toHTML5:function r(){var e=f.el.querySelectorAll(Object.keys(V.HTML5Map).join(","));if(e.length){var t=!1;f.el.querySelector(".fr-marker")||(f.selection.save(),t=!0);for(var n=0;n<e.length;n++)""===f.node.attributes(e[n])&&C(e[n]).replaceWith("<".concat(V.HTML5Map[e[n].tagName],">").concat(e[n].innerHTML,"</").concat(V.HTML5Map[e[n].tagName],">"));t&&f.selection.restore()}},tables:function t(){!function s(){for(var e=f.el.querySelectorAll("tr"),t=0;t<e.length;t++){for(var n=e[t].children,r=!0,o=0;o<n.length;o++)if("TH"!==n[o].tagName){r=!1;break}if(!1!==r&&0!==n.length){for(var i=e[t];i&&"TABLE"!==i.tagName&&"THEAD"!==i.tagName;)i=i.parentNode;var a=i;"THEAD"!==a.tagName&&(a=f.doc.createElement("THEAD"),i.insertBefore(a,i.firstChild)),a.appendChild(e[t])}}}()},lists:function y(){!function s(){var e,t=[];do{if(t.length){var n=t[0],r=f.doc.createElement("ul");n.parentNode.insertBefore(r,n);do{var o=n;n=n.nextSibling,r.appendChild(o)}while(n&&"LI"===n.tagName)}t=[];for(var i=f.el.querySelectorAll("li"),a=0;a<i.length;a++)e=i[a],f.node.isList(e.parentNode)||t.push(i[a])}while(0<t.length)}(),function i(){for(var e=f.el.querySelectorAll("ol + ol, ul + ul"),t=0;t<e.length;t++){var n=e[t];if(f.node.isList(n.previousSibling)&&f.node.openTagString(n)===f.node.openTagString(n.previousSibling)){for(var r=f.node.contents(n),o=0;o<r.length;o++)n.previousSibling.appendChild(r[o]);n.parentNode.removeChild(n)}}}(),function a(){for(var e=f.el.querySelectorAll("ul, ol"),t=0;t<e.length;t++)for(var n=f.node.contents(e[t]),r=null,o=n.length-1;0<=o;o--)!n[o].tagName&&f.opts.htmlUntouched||"LI"===n[o].tagName||"UL"==n[o].tagName||"OL"==n[o].tagName?r=null:(r||(r=C(f.doc.createElement("LI"))).insertBefore(n[o]),r.prepend(n[o]))}(),function l(){var e,t,n;do{t=!1;var r=f.el.querySelectorAll("li:empty");for(e=0;e<r.length;e++)r[e].parentNode.removeChild(r[e]);var o=f.el.querySelectorAll("ul, ol");for(e=0;e<o.length;e++)(n=o[e]).querySelector("LI")||(t=!0,n.parentNode.removeChild(n))}while(!0===t)}(),function o(){for(var e=f.el.querySelectorAll("ul > ul, ol > ol, ul > ol, ol > ul"),t=0;t<e.length;t++){var n=e[t],r=n.previousSibling;r&&("LI"===r.tagName?r.appendChild(n):C(n).wrap("<li></li>"))}}(),function c(){for(var e=f.el.querySelectorAll("li > ul, li > ol"),t=0;t<e.length;t++){var n=e[t];if(n.nextSibling)for(var r=n.nextSibling;0<r.childNodes.length;)n.append(r.childNodes[0])}}(),function d(){for(var e=f.el.querySelectorAll("li > ul, li > ol"),t=0;t<e.length;t++){var n=e[t];if(f.node.isFirstSibling(n)&&"none"!=n.parentNode.style.listStyleType)C(n).before("<br/>");else if(n.previousSibling&&"BR"===n.previousSibling.tagName){for(var r=n.previousSibling.previousSibling;r&&f.node.hasClass(r,"fr-marker");)r=r.previousSibling;r&&"BR"!==r.tagName&&C(n.previousSibling).remove()}}}(),function n(){for(var e=f.el.querySelectorAll("li:empty"),t=0;t<e.length;t++)C(e[t]).remove()}()},invisibleSpaces:function n(e){return e.replace(/\u200b/g,"").length===e.length?e:f.clean.exec(e,o)},exec:v}},V.XS=0,V.SM=1,V.MD=2,V.LG=3;V.LinkRegExCommon="[".concat("a-z\\u0080-\\u009f\\u00a1-\\uffff0-9-_\\.","]{1,}"),V.LinkRegExEnd="((:[0-9]{1,5})|)(((\\/|\\?|#)[a-z\\u00a1-\\uffff0-9@?\\|!^=%&amp;\\/~+#-\\'*-_{}]*)|())",V.LinkRegExTLD="((".concat(V.LinkRegExCommon,")(\\.(com|net|org|edu|mil|gov|co|biz|info|me|dev)))"),V.LinkRegExHTTP="((ftp|http|https):\\/\\/".concat(V.LinkRegExCommon,")"),V.LinkRegExAuth="((ftp|http|https):\\/\\/[\\u0021-\\uffff]{1,}@".concat(V.LinkRegExCommon,")"),V.LinkRegExWWW="(www\\.".concat(V.LinkRegExCommon,"\\.[a-z0-9-]{2,24})"),V.LinkRegEx="(".concat(V.LinkRegExTLD,"|").concat(V.LinkRegExHTTP,"|").concat(V.LinkRegExWWW,"|").concat(V.LinkRegExAuth,")").concat(V.LinkRegExEnd),V.LinkProtocols=["mailto","tel","sms","notes","data"],V.MAIL_REGEX=/.+@.+\..+/i,V.MODULES.helpers=function(i){var a,s=i.$;function e(){var e={},t=function i(){var e,t=-1;return"Microsoft Internet Explorer"===navigator.appName?(e=navigator.userAgent,null!==new RegExp("MSIE ([0-9]{1,}[\\.0-9]{0,})").exec(e)&&(t=parseFloat(RegExp.$1))):"Netscape"===navigator.appName&&(e=navigator.userAgent,null!==new RegExp("Trident/.*rv:([0-9]{1,}[\\.0-9]{0,})").exec(e)&&(t=parseFloat(RegExp.$1))),t}();if(0<t)e.msie=!0;else{var n=navigator.userAgent.toLowerCase(),r=/(edge)[ /]([\w.]+)/.exec(n)||/(chrome)[ /]([\w.]+)/.exec(n)||/(webkit)[ /]([\w.]+)/.exec(n)||/(opera)(?:.*version|)[ /]([\w.]+)/.exec(n)||/(msie) ([\w.]+)/.exec(n)||n.indexOf("compatible")<0&&/(mozilla)(?:.*? rv:([\w.]+)|)/.exec(n)||[],o=r[1]||"";r[2];r[1]&&(e[o]=!0),e.chrome?e.webkit=!0:e.webkit&&(e.safari=!0)}return e.msie&&(e.version=t),e}function t(){return/(iPad|iPhone|iPod)/g.test(navigator.userAgent)&&!o()}function n(){return/(Android)/g.test(navigator.userAgent)&&!o()}function r(){return/(Blackberry)/g.test(navigator.userAgent)}function o(){return/(Windows Phone)/gi.test(navigator.userAgent)}var l=null;return{_init:function c(){i.browser=e()},isIOS:t,isMac:function d(){return null===l&&(l=0<=navigator.platform.toUpperCase().indexOf("MAC")),l},isAndroid:n,isBlackberry:r,isWindowsPhone:o,isMobile:function f(){return n()||t()||r()},isEmail:function p(e){return!/^(https?:|ftps?:|)\/\//i.test(e)&&V.MAIL_REGEX.test(e)},requestAnimationFrame:function h(){return window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||function(e){window.setTimeout(e,1e3/60)}},getPX:function u(e){return parseInt(e,10)||0},screenSize:function C(e){try{var t=0;if((t=e?i.$box.width():i.$sc.width())<768)return V.XS;if(768<=t&&t<992)return V.SM;if(992<=t&&t<1200)return V.MD;if(1200<=t)return V.LG}catch(n){return V.LG}},isTouch:function g(){return"ontouchstart"in window||window.DocumentTouch&&document instanceof window.DocumentTouch},sanitizeURL:function m(e){return/^(https?:|ftps?:|)\/\//i.test(e)?e:/^([A-Za-z]:(\\){1,2}|[A-Za-z]:((\\){1,2}[^\\]+)+)(\\)?$/i.test(e)?e:new RegExp("^(".concat(V.LinkProtocols.join("|"),"):"),"i").test(e)?e:e=encodeURIComponent(e).replace(/%23/g,"#").replace(/%2F/g,"/").replace(/%25/g,"%").replace(/mailto%3A/gi,"mailto:").replace(/file%3A/gi,"file:").replace(/sms%3A/gi,"sms:").replace(/tel%3A/gi,"tel:").replace(/notes%3A/gi,"notes:").replace(/data%3Aimage/gi,"data:image").replace(/blob%3A/gi,"blob:").replace(/%3A(\d)/gi,":$1").replace(/webkit-fake-url%3A/gi,"webkit-fake-url:").replace(/%3F/g,"?").replace(/%3D/g,"=").replace(/%26/g,"&").replace(/&amp;/g,"&").replace(/%2C/g,",").replace(/%3B/g,";").replace(/%2B/g,"+").replace(/%40/g,"@").replace(/%5B/g,"[").replace(/%5D/g,"]").replace(/%7B/g,"{").replace(/%7D/g,"}")},isArray:function v(e){return e&&!Object.prototype.propertyIsEnumerable.call(e,"length")&&"object"===N(e)&&"number"==typeof e.length},RGBToHex:function b(e){function t(e){return"0".concat(parseInt(e,10).toString(16)).slice(-2)}try{return e&&"transparent"!==e?/^#[0-9A-F]{6}$/i.test(e)?e:(e=e.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/),"#".concat(t(e[1])).concat(t(e[2])).concat(t(e[3])).toUpperCase()):""}catch(n){return null}},HEXtoRGB:function L(e){e=e.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i,function(e,t,n,r){return t+t+n+n+r+r});var t=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(e);return t?"rgb(".concat(parseInt(t[1],16),", ").concat(parseInt(t[2],16),", ").concat(parseInt(t[3],16),")"):""},isURL:function E(e){return!!/^(https?:|ftps?:|)\/\//i.test(e)&&(e=String(e).replace(/</g,"%3C").replace(/>/g,"%3E").replace(/"/g,"%22").replace(/ /g,"%20"),new RegExp("^".concat(V.LinkRegExHTTP).concat(V.LinkRegExEnd,"$"),"gi").test(e))},getAlignment:function y(e){e.css||(e=s(e));var t=(e.css("text-align")||"").replace(/-(.*)-/g,"");if(["left","right","justify","center"].indexOf(t)<0){if(!a){var n=s('<div dir="'.concat("rtl"===i.opts.direction?"rtl":"auto",'" style="text-align: ').concat(i.$el.css("text-align"),'; position: fixed; left: -3000px;"><span id="s1">.</span><span id="s2">.</span></div>'));s("body").first().append(n);var r=n.find("#s1").get(0).getBoundingClientRect().left,o=n.find("#s2").get(0).getBoundingClientRect().left;n.remove(),a=r<o?"left":"right"}t=a}return t},scrollTop:function S(){return i.o_win.pageYOffset?i.o_win.pageYOffset:i.o_doc.documentElement&&i.o_doc.documentElement.scrollTop?i.o_doc.documentElement.scrollTop:i.o_doc.body.scrollTop?i.o_doc.body.scrollTop:0},scrollLeft:function M(){return i.o_win.pageXOffset?i.o_win.pageXOffset:i.o_doc.documentElement&&i.o_doc.documentElement.scrollLeft?i.o_doc.documentElement.scrollLeft:i.o_doc.body.scrollLeft?i.o_doc.body.scrollLeft:0},isInViewPort:function T(e){var t=e.getBoundingClientRect();return 0<=(t={top:Math.round(t.top),bottom:Math.round(t.bottom)}).top&&t.bottom<=(window.innerHeight||document.documentElement.clientHeight)||t.top<=0&&t.bottom>=(window.innerHeight||document.documentElement.clientHeight)}}},V.MODULES.events=function(l){var e,i=l.$,a={};function s(e,t,n){g(e,t,n)}function c(e){if(void 0===e&&(e=!0),!l.$wp)return!1;if(l.helpers.isIOS()&&l.$win.get(0).focus(),l.core.hasFocus())return!1;if(l.selection.isCollapsed()&&!l.selection.get().anchorNode){var t=l.$el.find(l.html.blockTagsQuery()).get(0);t&&(i(t).prepend(V.MARKERS),l.selection.restore())}if(!l.core.hasFocus()&&e){var n=l.$win.scrollTop();if(l.browser.msie&&l.$box&&l.$box.css("position","fixed"),l.browser.msie&&l.$wp&&l.$wp.css("overflow","visible"),l.browser.msie&&l.$sc&&l.$sc.css("position","fixed"),l.browser.msie||(p(),l.el.focus(),l.events.trigger("focus"),f()),l.browser.msie&&l.$sc&&l.$sc.css("position",""),l.browser.msie&&l.$box&&l.$box.css("position",""),l.browser.msie&&l.$wp&&l.$wp.css("overflow","auto"),n!==l.$win.scrollTop()&&l.$win.scrollTop(n),!l.selection.info(l.el).atStart)return!1}if(!l.core.hasFocus()||0<l.$el.find(".fr-marker").length)return!1;if(l.selection.info(l.el).atStart&&l.selection.isCollapsed()&&null!==l.html.defaultTag()){var r=l.markers.insert();if(r&&!l.node.blockParent(r)){i(r).remove();var o=l.$el.find(l.html.blockTagsQuery()).get(0);o&&(i(o).prepend(V.MARKERS),l.selection.restore())}else r&&i(r).remove()}}var d=!1;function f(){e=!0}function p(){e=!1}function h(){return e}function u(e,t,n){var r,o=e.split(" ");if(1<o.length){for(var i=0;i<o.length;i++)u(o[i],t,n);return!0}void 0===n&&(n=!1),r=0!==e.indexOf("shared.")?(a[e]=a[e]||[],a[e]):(l.shared._events[e]=l.shared._events[e]||[],l.shared._events[e]),n?r.unshift(t):r.push(t)}var C=[];function g(e,t,n,r,o){"function"==typeof n&&(o=r,r=n,n=!1);var i=o?l.shared.$_events:C,a=o?l.sid:l.id,s="".concat(t.trim().split(" ").join(".ed".concat(a," ")),".ed").concat(a);n?e.on(s,n,r):e.on(s,r),i.push([e,s])}function t(e){for(var t=0;t<e.length;t++)e[t][0].off(e[t][1])}function m(e,t,n){if(!l.edit.isDisabled()||n){var r,o;if(0!==e.indexOf("shared."))r=a[e];else{if(0<l.shared.count)return!1;r=l.shared._events[e]}if(r)for(var i=0;i<r.length;i++)if(!1===(o=r[i].apply(l,t)))return!1;return(!l.opts.events||!l.opts.events[e]||!1!==(o=l.opts.events[e].apply(l,t)))&&o}}function v(){for(var e in a)Object.prototype.hasOwnProperty.call(a,e)&&delete a[e]}function b(){for(var e in l.shared._events)Object.prototype.hasOwnProperty.call(l.shared._events,e)&&delete l.shared._events[e]}return{_init:function L(){l.shared.$_events=l.shared.$_events||[],l.shared._events={},function e(){l.helpers.isMobile()?(l._mousedown="touchstart",l._mouseup="touchend",l._move="touchmove",l._mousemove="touchmove"):(l._mousedown="mousedown",l._mouseup="mouseup",l._move="",l._mousemove="mousemove")}(),function t(){s(l.$el,"click mouseup mousemove mousedown touchstart touchend dragenter dragover dragleave dragend drop dragstart",function(e){m(e.type,[e])}),u("mousedown",function(){for(var e=0;e<V.INSTANCES.length;e++)V.INSTANCES[e]!==l&&V.INSTANCES[e].popups&&V.INSTANCES[e].popups.areVisible()&&V.INSTANCES[e].$el.find(".fr-marker").remove()})}(),function n(){s(l.$win,l._mousedown,function(e){m("window.mousedown",[e]),f()}),s(l.$win,l._mouseup,function(e){m("window.mouseup",[e])}),s(l.$win,"beforeinput cut copy keydown keyup touchmove touchend",function(e){m("window.".concat(e.type),[e])})}(),function r(){s(l.$doc,"dragend drop",function(e){m("document.".concat(e.type),[e])})}(),function o(){s(l.$el,"beforeinput keydown keypress keyup input",function(e){m(e.type,[e])})}(),function i(){s(l.$el,"focus",function(e){h()&&(c(!1),!1===d&&(m(e.type,[e]),l.helpers.isMobile()&&p()))}),s(l.$el,"blur",function(e){h()&&!0===d&&(m(e.type,[e]),l.helpers.isMobile()&&l.opts.toolbarContainer&&(l.shared.selected_editor=l.id),f())}),g(l.$el,"mousedown",'[contenteditable="true"]',function(){p(),l.$el.blur()}),u("focus",function(){d=!0}),u("blur",function(){d=!1})}(),f(),function a(){s(l.$el,"cut copy paste beforepaste",function(e){m(e.type,[e])})}(),u("destroy",v),u("shared.destroy",b)},on:u,trigger:m,bindClick:function r(e,t,n){g(e,l._mousedown,t,function(e){l.edit.isDisabled()||function n(e){var t=i(e.currentTarget);return l.edit.isDisabled()||l.node.hasClass(t.get(0),"fr-disabled")?(e.preventDefault(),!1):"mousedown"===e.type&&1!==e.which||(l.helpers.isMobile()||e.preventDefault(),(l.helpers.isAndroid()||l.helpers.isWindowsPhone())&&0===t.parents(".fr-dropdown-menu").length&&(e.preventDefault(),e.stopPropagation()),t.addClass("fr-selected"),void l.events.trigger("commands.mousedown",[t]))}(e)},!0),g(e,"".concat(l._mouseup," ").concat(l._move),t,function(e){l.edit.isDisabled()||function o(e,t){var n=i(e.currentTarget);if(l.edit.isDisabled()||l.node.hasClass(n.get(0),"fr-disabled"))return e.preventDefault(),!1;if("mouseup"===e.type&&1!==e.which)return!0;if(l.button.getButtons(".fr-selected",!0).get(0)==n.get(0)&&!l.node.hasClass(n.get(0),"fr-selected"))return!0;if("touchmove"!==e.type){if(e.stopPropagation(),e.stopImmediatePropagation(),e.preventDefault(),!l.node.hasClass(n.get(0),"fr-selected"))return l.button.getButtons(".fr-selected",!0).removeClass("fr-selected"),!1;if(l.button.getButtons(".fr-selected",!0).removeClass("fr-selected"),n.data("dragging")||n.attr("disabled"))return n.removeData("dragging"),!1;var r=n.data("timeout");r&&(clearTimeout(r),n.removeData("timeout")),t.apply(l,[e])}else n.data("timeout")||n.data("timeout",setTimeout(function(){n.data("dragging",!0)},100))}(e,n)},!0),g(e,"mousedown click mouseup",t,function(e){l.edit.isDisabled()||e.stopPropagation()},!0),u("window.mouseup",function(){l.edit.isDisabled()||(e.find(t).removeClass("fr-selected"),f())}),g(e,"mouseover",t,function(){i(this).hasClass("fr-options")&&i(this).prev(".fr-btn").addClass("fr-btn-hover"),i(this).next(".fr-btn").hasClass("fr-options")&&i(this).next(".fr-btn").addClass("fr-btn-hover")}),g(e,"mouseout",t,function(){i(this).hasClass("fr-options")&&i(this).prev(".fr-btn").removeClass("fr-btn-hover"),i(this).next(".fr-btn").hasClass("fr-options")&&i(this).next(".fr-btn").removeClass("fr-btn-hover")})},disableBlur:p,enableBlur:f,blurActive:h,focus:c,chainTrigger:function E(e,t,n){if(!l.edit.isDisabled()||n){var r,o;if(0!==e.indexOf("shared."))r=a[e];else{if(0<l.shared.count)return!1;r=l.shared._events[e]}if(r)for(var i=0;i<r.length;i++)void 0!==(o=r[i].apply(l,[t]))&&(t=o);return l.opts.events&&l.opts.events[e]&&void 0!==(o=l.opts.events[e].apply(l,[t]))&&(t=o),t}},$on:g,$off:function n(){t(C),C=[],0===l.shared.count&&(t(l.shared.$_events),l.shared.$_events=[])}}},Object.assign(V.DEFAULTS,{indentMargin:20}),V.COMMANDS={bold:{title:"Bold",toggle:!0,refresh:function(e){var t=this.format.is("strong");e.toggleClass("fr-active",t).attr("aria-pressed",t)}},italic:{title:"Italic",toggle:!0,refresh:function(e){var t=this.format.is("em");e.toggleClass("fr-active",t).attr("aria-pressed",t)}},underline:{title:"Underline",toggle:!0,refresh:function(e){var t=this.format.is("u");e.toggleClass("fr-active",t).attr("aria-pressed",t)}},strikeThrough:{title:"Strikethrough",toggle:!0,refresh:function(e){var t=this.format.is("s");e.toggleClass("fr-active",t).attr("aria-pressed",t)}},subscript:{title:"Subscript",toggle:!0,refresh:function(e){var t=this.format.is("sub");e.toggleClass("fr-active",t).attr("aria-pressed",t)}},superscript:{title:"Superscript",toggle:!0,refresh:function(e){var t=this.format.is("sup");e.toggleClass("fr-active",t).attr("aria-pressed",t)}},outdent:{title:"Decrease Indent"},indent:{title:"Increase Indent"},undo:{title:"Undo",undo:!1,forcedRefresh:!0,disabled:!0},redo:{title:"Redo",undo:!1,forcedRefresh:!0,disabled:!0},insertHR:{title:"Insert Horizontal Line"},clearFormatting:{title:"Clear Formatting"},selectAll:{title:"Select All",undo:!1},moreText:{title:"More Text",undo:!1},moreParagraph:{title:"More Paragraph",undo:!1},moreRich:{title:"More Rich",undo:!1},moreMisc:{title:"More Misc",undo:!1}},V.RegisterCommand=function(e,t){V.COMMANDS[e]=t},V.MODULES.commands=function(a){var s=a.$;function l(e){return a.html.defaultTag()&&(e="<".concat(a.html.defaultTag(),">").concat(e,"</").concat(a.html.defaultTag(),">")),e}var i={bold:function(){e("bold","strong")},subscript:function(){a.format.is("sup")&&a.format.remove("sup"),e("subscript","sub")},superscript:function(){a.format.is("sub")&&a.format.remove("sub"),e("superscript","sup")},italic:function(){e("italic","em")},strikeThrough:function(){e("strikeThrough","s")},underline:function(){e("underline","u")},undo:function(){a.undo.run()},redo:function(){a.undo.redo()},indent:function(){r(1)},outdent:function(){r(-1)},show:function(){a.opts.toolbarInline&&a.toolbar.showInline(null,!0)},insertHR:function(){a.selection.remove();var e="";a.core.isEmpty()&&(e=l(e="<br>"));var t='<hr id="fr-just" class="fr-just">'.concat(e);a.opts.trackChangesEnabled&&(t=a.track_changes.wrapInTracking(s(t),"hrWrapper").get(0).outerHTML);a.html.insert(t);var n,r=a.$el.find("hr#fr-just").length?a.$el.find("hr#fr-just"):a.$el.find(".fr-just");r.removeAttr("id"),r.removeAttr("class");var o=a.opts.trackChangesEnabled&&"SPAN"===r[0].parentNode.tagName&&"P"===r[0].parentNode.parentNode.tagName;if(0===r.next().length){var i=a.html.defaultTag();i&&!o?r.after(s(a.doc.createElement(i)).append("<br>").get(0)):o?r[0].parentNode.after(s(a.doc.createElement(i)).append("<br>").get(0)):r.after("<br>")}r.prev().is("hr")?n=a.selection.setAfter(r.get(0),!1):r.next().is("hr")?n=a.selection.setBefore(r.get(0),!1):o||a.selection.setAfter(r.get(0),!1)?a.selection.setAfter(r[0].parentNode,!1):a.selection.setBefore(r.get(0),!1),n||void 0===n||(e=l(e="".concat(V.MARKERS,"<br>")),r.after(e)),a.selection.restore()},clearFormatting:function(){a.format.remove()},selectAll:function(){a.doc.execCommand("selectAll",!1,!1)},moreText:function(e){t(e)},moreParagraph:function(e){t(e)},moreRich:function(e){t(e)},moreMisc:function(e){t(e)},moreTrackChanges:function(){t("trackChanges")}};function t(e){var t=a.$tb.find("[data-cmd=".concat(e,"]")),n=a.$tb.find("[data-cmd=html]");a.opts.trackChangesEnabled?n&&n.addClass("fr-disabled"):n&&n.removeClass("fr-disabled"),function r(n){a.helpers.isMobile()&&a.opts.toolbarInline&&a.events.disableBlur();var e=a.$tb.find('.fr-more-toolbar[data-name="'.concat(n.attr("data-group-name"),'"]'));"trackChanges"===n.data("cmd")&&(e=a.$tb.find('.fr-more-toolbar[data-name="trackChanges-'.concat(a.id,'"]')));if(a.$tb.find(".fr-open").not(n).not('[data-cmd="trackChanges"]').removeClass("fr-open"),n.toggleClass("fr-open"),a.$tb.find(".fr-more-toolbar").removeClass("fr-overflow-visible"),a.$tb.find(".fr-expanded").not(e).length){var t=a.$tb.find(".fr-expanded").not(e);t.each(function(e,t){0!=s(t).data("name").indexOf("trackChanges-")&&0!=s(t).data("name").indexOf("moreRich-")?s(t).toggleClass("fr-expanded"):n.parents('[data-name^="moreRich-"]').length||0==s(t).data("name").indexOf("trackChanges-")||s(t).find('[id^="trackChanges-"]').length&&a.opts.trackChangesEnabled||s(t).toggleClass("fr-expanded")}),e.toggleClass("fr-expanded")}else e.toggleClass("fr-expanded"),a.$box.toggleClass("fr-toolbar-open"),a.$tb.toggleClass("fr-toolbar-open")}(t),a.toolbar.setMoreToolbarsHeight()}function n(e,t){if(!(a.markdown&&a.markdown.isEnabled()&&("bold"===e||"italic"===e||"underline"===e)||a.opts.trackChangesEnabled&&"markdown"===e)&&!1!==a.events.trigger("commands.before",s.merge([e],t||[]))){var n=V.COMMANDS[e]&&V.COMMANDS[e].callback||i[e],r=!0,o=!1;V.COMMANDS[e]&&("undefined"!=typeof V.COMMANDS[e].focus&&(r=V.COMMANDS[e].focus),"undefined"!=typeof V.COMMANDS[e].accessibilityFocus&&(o=V.COMMANDS[e].accessibilityFocus)),(!a.core.hasFocus()&&r&&!a.popups.areVisible()||!a.core.hasFocus()&&o&&a.accessibility.hasFocus())&&a.events.focus(!0),V.COMMANDS[e]&&!1!==V.COMMANDS[e].undo&&(a.$el.find(".fr-marker").length&&(a.events.disableBlur(),a.selection.restore()),a.undo.saveStep()),n&&n.apply(a,s.merge([e],t||[])),a.events.trigger("commands.after",s.merge([e],t||[])),V.COMMANDS[e]&&!1!==V.COMMANDS[e].undo&&a.undo.saveStep()}}function e(e,t){a.format.toggle(t)}function r(e){a.selection.save(),a.html.wrap(!0,!0,!0,!0),a.selection.restore();for(var t=a.selection.blocks(),n=0;n<t.length;n++)if("LI"!==t[n].tagName||"LI"!==t[n].parentNode.tagName){var r=s(t[n]);"LI"!=t[n].tagName&&"LI"==t[n].parentNode.tagName&&(r=s(t[n].parentNode));var o="rtl"===a.opts.direction||"rtl"===r.css("direction")?"margin-right":"margin-left",i=a.helpers.getPX(r.css(o));if(r.width()<2*a.opts.indentMargin&&0<e)continue;"UL"!=t[n].parentNode.tagName&&"OL"!=t[n].parentNode.tagName&&"LI"!=t[n].parentNode.tagName&&r.css(o,Math.max(i+e*a.opts.indentMargin,0)||""),r.removeClass("fr-temp-div")}a.selection.save(),a.html.unwrap(),a.selection.restore()}function o(e){return function(){n(e)}}var c={};for(var d in i)Object.prototype.hasOwnProperty.call(i,d)&&(c[d]=o(d));return Object.assign(c,{exec:n,_init:function f(){a.events.on("keydown",function(e){var t=a.selection.element();if(t&&"HR"===t.tagName&&!a.keys.isArrow(e.which))return e.preventDefault(),!1}),a.events.on("keyup",function(e){var t=a.selection.element();if(t&&"HR"===t.tagName)if(e.which===V.KEYCODE.ARROW_LEFT||e.which===V.KEYCODE.ARROW_UP){if(t.previousSibling)return a.node.isBlock(t.previousSibling)?a.selection.setAtEnd(t.previousSibling):s(t).before(V.MARKERS),a.selection.restore(),!1}else if((e.which===V.KEYCODE.ARROW_RIGHT||e.which===V.KEYCODE.ARROW_DOWN)&&t.nextSibling)return a.node.isBlock(t.nextSibling)?a.selection.setAtStart(t.nextSibling):s(t).after(V.MARKERS),a.selection.restore(),!1}),a.events.on("mousedown",function(e){if(e.target&&"HR"===e.target.tagName)return e.preventDefault(),e.stopPropagation(),!1}),a.events.on("mouseup",function(){var e=a.selection.element();e===a.selection.endElement()&&e&&"HR"===e.tagName&&(e.nextSibling&&(a.node.isBlock(e.nextSibling)?a.selection.setAtStart(e.nextSibling):s(e).after(V.MARKERS)),a.selection.restore())})}})},V.MODULES.cursorLists=function(C){var g=C.$;function m(e){for(var t=e;"LI"!==t.tagName;)t=t.parentNode;return t}function v(e){for(var t=e;!C.node.isList(t);)t=t.parentNode;return t}return{_startEnter:function b(e){var t,n=m(e),r=n.nextSibling,o=n.previousSibling,i=C.html.defaultTag();if(C.node.isEmpty(n,!0)&&r){for(var a="",s="",l=e.parentNode;!C.node.isList(l)&&l.parentNode&&("LI"!==l.parentNode.tagName||l.parentNode===n);)a=C.node.openTagString(l)+a,s+=C.node.closeTagString(l),l=l.parentNode;a=C.node.openTagString(l)+a,s+=C.node.closeTagString(l);var c="";for(c=l.parentNode&&"LI"===l.parentNode.tagName?"".concat(s,"<li>").concat(V.MARKERS,"<br>").concat(a):i?"".concat(s,"<").concat(i,">").concat(V.MARKERS,"<br></").concat(i,">").concat(a):"".concat(s+V.MARKERS,"<br>").concat(a);["UL","OL"].indexOf(l.tagName)<0||l.parentNode&&"LI"===l.parentNode.tagName;)l=l.parentNode;g(n).replaceWith('<span id="fr-break"></span>');var d=C.node.openTagString(l)+g(l).html()+C.node.closeTagString(l);d=d.replace(/<span id="fr-break"><\/span>/g,c),g(l).replaceWith(d),C.$el.find("li:empty").remove()}else if(o&&r||!C.node.isEmpty(n,!0)){for(var f="<br>",p=e.parentNode;p&&"LI"!==p.tagName;)f=C.node.openTagString(p)+f+C.node.closeTagString(p),p=p.parentNode;g(n).before("<li>".concat(f,"</li>")),g(e).remove()}else if(o){t=v(n);for(var h="".concat(V.MARKERS,"<br>"),u=e.parentNode;u&&"LI"!==u.tagName;)h=C.node.openTagString(u)+h+C.node.closeTagString(u),u=u.parentNode;t.parentNode&&"LI"===t.parentNode.tagName?g(t.parentNode).after("<li>".concat(h,"</li>")):i?g(t).after("<".concat(i,">").concat(h,"</").concat(i,">")):g(t).after(h),g(n).remove()}else(t=v(n)).parentNode&&"LI"===t.parentNode.tagName?r?g(t.parentNode).before("".concat(C.node.openTagString(n)+V.MARKERS,"<br></li>")):g(t.parentNode).after("".concat(C.node.openTagString(n)+V.MARKERS,"<br></li>")):i?g(t).before("<".concat(i,">").concat(V.MARKERS,"<br></").concat(i,">")):g(t).before("".concat(V.MARKERS,"<br>")),g(n).remove()},_middleEnter:function c(e){for(var t=m(e),n="",r=e,o="",i="",a=!1;r!==t;){var s="A"===(r=r.parentNode).tagName&&C.cursor.isAtEnd(e,r)?"fr-to-remove":"";a||r==t||C.node.isBlock(r)||(a=!0,o+=V.INVISIBLE_SPACE),o=C.node.openTagString(g(r).clone().addClass(s).get(0))+o,C.opts.trackChangesEnabled?i+=C.node.closeTagString(r):i=C.node.closeTagString(r)+i}n=i+n+o+V.MARKERS+(C.opts.keepFormatOnDelete?V.INVISIBLE_SPACE:""),g(e).replaceWith('<span id="fr-break"></span>');var l=C.node.openTagString(t)+g(t).html()+C.node.closeTagString(t);l=l.replace(/<span id="fr-break"><\/span>/g,n),g(t).replaceWith(l)},_endEnter:function l(e){for(var t=m(e),n=V.MARKERS,r="",o=e,i=!1;o!==t;)if(!(o=o.parentNode).classList.contains("fr-img-space-wrap")&&!o.classList.contains("fr-img-space-wrap2")){var a="A"===o.tagName&&C.cursor.isAtEnd(e,o)?"fr-to-remove":"";i||o===t||C.node.isBlock(o)||(i=!0,r+=V.INVISIBLE_SPACE),r=C.node.openTagString(g(o).clone().addClass(a).get(0))+r,n+=C.node.closeTagString(o)}var s=r+n;g(e).remove(),g(t).after(s)},_backspace:function d(e){var t=m(e),n=t.previousSibling;if(n){n=g(n).find(C.html.blockTagsQuery()).get(-1)||n,g(e).replaceWith(V.MARKERS);var r=C.node.contents(n);r.length&&"BR"===r[r.length-1].tagName&&g(r[r.length-1]).remove(),g(t).find(C.html.blockTagsQuery()).not("ol, ul, table").each(function(){this.parentNode===t&&g(this).replaceWith(g(this).html()+(C.node.isEmpty(this)?"":"<br>"))});for(var o,i=C.node.contents(t)[0];i&&!C.node.isList(i);)o=i.nextSibling,g(n).append(i),i=o;for(n=t.previousSibling;i;)o=i.nextSibling,g(n).append(i),i=o;1<(r=C.node.contents(n)).length&&"BR"===r[r.length-1].tagName&&g(r[r.length-1]).remove(),g(t).remove()}else{var a=v(t);if(g(e).replaceWith(V.MARKERS),a.parentNode&&"LI"===a.parentNode.tagName){var s=a.previousSibling;C.node.isBlock(s)?(g(t).find(C.html.blockTagsQuery()).not("ol, ul, table").each(function(){this.parentNode===t&&g(this).replaceWith(g(this).html()+(C.node.isEmpty(this)?"":"<br>"))}),g(s).append(g(t).html())):g(a).before(g(t).html())}else{var l=C.html.defaultTag();l&&0===g(t).find(C.html.blockTagsQuery()).length?g(a).before("<".concat(l,">").concat(g(t).html(),"</").concat(l,">")):g(a).before(g(t).html())}g(t).remove(),C.html.wrap(),0===g(a).find("li").length&&g(a).remove()}},_del:function f(e){var t,n=m(e),r=n.nextSibling;if(r){(t=C.node.contents(r)).length&&"BR"===t[0].tagName&&g(t[0]).remove(),g(r).find(C.html.blockTagsQuery()).not("ol, ul, table").each(function(){this.parentNode===r&&g(this).replaceWith(g(this).html()+(C.node.isEmpty(this)?"":"<br>"))});for(var o,i=e,a=C.node.contents(r)[0];a&&!C.node.isList(a);)o=a.nextSibling,g(i).after(a),i=a,a=o;for(;a;)o=a.nextSibling,g(n).append(a),a=o;g(e).replaceWith(V.MARKERS),g(r).remove()}else{for(var s=n;!s.nextSibling&&s!==C.el;)s=s.parentNode;if(s===C.el)return!1;if(s=s.nextSibling,C.node.isBlock(s))V.NO_DELETE_TAGS.indexOf(s.tagName)<0&&(g(e).replaceWith(V.MARKERS),(t=C.node.contents(n)).length&&"BR"===t[t.length-1].tagName&&g(t[t.length-1]).remove(),g(n).append(g(s).html()),g(s).remove());else{for((t=C.node.contents(n)).length&&"BR"===t[t.length-1].tagName&&g(t[t.length-1]).remove(),g(e).replaceWith(V.MARKERS);s&&!C.node.isBlock(s)&&"BR"!==s.tagName;)g(n).append(g(s)),s=s.nextSibling;g(s).remove()}}}}},V.NO_DELETE_TAGS=["TH","TD","TR","TABLE","FORM"],V.SIMPLE_ENTER_TAGS=["TH","TD","LI","DL","DT","FORM"],V.MODULES.cursor=function(C){var g=C.$;function p(e){return!!e&&(!!C.node.isBlock(e)||(e.nextSibling&&e.nextSibling.nodeType===Node.TEXT_NODE&&0===e.nextSibling.textContent.replace(/\u200b/g,"").length?p(e.nextSibling):!(e.nextSibling&&(!e.previousSibling||"BR"!==e.nextSibling.tagName||e.nextSibling.nextSibling))&&p(e.parentNode)))}function h(e){return!!e&&(!!C.node.isBlock(e)||(e.previousSibling&&e.previousSibling.nodeType===Node.TEXT_NODE&&0===e.previousSibling.textContent.replace(/\u200b/g,"").length?h(e.previousSibling):!e.previousSibling&&(!(e.previousSibling||!C.node.hasClass(e.parentNode,"fr-inner"))||h(e.parentNode))))}function u(e,t){return!!e&&(e!==C.$wp.get(0)&&(e.previousSibling&&e.previousSibling.nodeType===Node.TEXT_NODE&&0===e.previousSibling.textContent.replace(/\u200b/g,"").length?u(e.previousSibling,t):!e.previousSibling&&(e.parentNode===t||u(e.parentNode,t))))}function m(e,t){return!!e&&(e!==C.$wp.get(0)&&(e.nextSibling&&e.nextSibling.nodeType===Node.TEXT_NODE&&0===e.nextSibling.textContent.replace(/\u200b/g,"").length?m(e.nextSibling,t):!(e.nextSibling&&(!e.previousSibling||"BR"!==e.nextSibling.tagName||e.nextSibling.nextSibling))&&(e.parentNode===t||m(e.parentNode,t))))}function v(e){return 0<g(e).parentsUntil(C.$el,"LI").length&&0===g(e).parentsUntil("LI","TABLE").length}function b(e,t){var n=new RegExp("".concat(t?"^":"","(([\\uD83C-\\uDBFF\\uDC00-\\uDFFF]+\\u200D)*[\\uD83C-\\uDBFF\\uDC00-\\uDFFF]{2})").concat(t?"":"$"),"i"),r=e.match(n);return r?r[0].length:1}function L(e){for(var t,n=e;!n.previousSibling;)if(n=n.parentNode,C.node.isElement(n))return!1;n=n.previousSibling;var r=C.opts.htmlAllowedEmptyTags,o=n.tagName&&n.tagName.toLowerCase();if((!C.node.isBlock(n)||n.lastChild&&o&&0<=r.indexOf(o))&&C.node.isEditable(n)){for(t=C.node.contents(n);n.nodeType!==Node.TEXT_NODE&&!C.node.isDeletable(n)&&t.length&&C.node.isEditable(n);)n=t[t.length-1],t=C.node.contents(n);if(n.nodeType===Node.TEXT_NODE){var i=n.textContent,a=i.length;if(i.length&&"\n"===i[i.length-1])return n.textContent=i.substring(0,a-2),0===n.textContent.length&&n.parentNode.removeChild(n),L(e);if(C.opts.tabSpaces&&i.length>=C.opts.tabSpaces)0===i.substr(i.length-C.opts.tabSpaces,i.length-1).replace(/ /g,"").replace(new RegExp(V.UNICODE_NBSP,"g"),"").length&&(a=i.length-C.opts.tabSpaces+1);n.textContent=i.substring(0,a-b(i));var s=n.textContent;(C.opts.enter===V.ENTER_BR&&0<s.length&&" "===s.charAt(s.length-1)||0===s.length&&e.previousSibling&&3===e.previousSibling.nodeType&&"TD"!==e.parentNode.tagName&&"LI"!==e.parentNode.tagName&&i!==String.fromCharCode(8203))&&(e.insertAdjacentHTML("beforebegin",V.INVISIBLE_SPACE),n=n.nextSibling),C.opts.trackChangesEnabled&&0===n.textContent.length&&g(n.parentElement).data("tracking")&&0===g(n.parentElement).find("[data-tracking-deleted=true]").length&&(g(e).insertBefore(n.parentElement),g(n.parentElement).remove(),n=g(e)[0].previousSibling),C.opts.htmlUntouched&&!e.nextSibling&&n.textContent.length&&" "===n.textContent[n.textContent.length-1]&&(n.textContent=n.textContent.substring(0,n.textContent.length-1)+V.UNICODE_NBSP);var l=i.length!==n.textContent.length;if(0===n.textContent.length&&n.previousSibling&&"BR"===n.previousSibling.tagName&&n.previousSibling.remove(),0===n.textContent.length)if(l&&C.opts.keepFormatOnDelete)g(n).after(V.INVISIBLE_SPACE+V.MARKERS);else if(0!==i.length&&C.node.isBlock(n.parentNode))g(n).after(V.MARKERS);else if((2!=n.parentNode.childNodes.length||n.parentNode!=e.parentNode)&&1!=n.parentNode.childNodes.length||C.node.isBlock(n.parentNode)||C.node.isElement(n.parentNode)||!C.node.isDeletable(n.parentNode)){for(var c,d=n;!C.node.isElement(n.parentNode)&&C.node.isEmpty(n.parentNode)&&V.NO_DELETE_TAGS.indexOf(n.parentNode.tagName)<0;)if("A"===(n=n.parentNode).tagName){var f=n.childNodes[0];for(g(n).before(f),c=!0;0<f.childNodes.length;)f=f.childNodes[0];n.parentNode.removeChild(n),n=f;break}c||(n=d),g(n).after(V.MARKERS),C.node.isElement(n.parentNode)&&!e.nextSibling&&n.previousSibling&&"BR"===n.previousSibling.tagName&&g(e).after("<br>");var p=n.parentNode;n.parentNode.removeChild(n),C.node.isEmpty(p)&&g(p).html(V.INVISIBLE_SPACE+V.MARKERS)}else g(n.parentNode).after(V.MARKERS),g(n.parentNode).remove();else g(n).after(V.MARKERS)}else C.node.isDeletable(n)?(g(n).after(V.MARKERS),g(n).remove()):e.nextSibling&&"BR"===e.nextSibling.tagName&&C.node.isVoid(n)&&"BR"!==n.tagName?(g(e.nextSibling).remove(),g(e).replaceWith(V.MARKERS)):!1!==C.events.trigger("node.remove",[g(n)])&&(g(n).after(V.MARKERS),g(n).remove())}else if(V.NO_DELETE_TAGS.indexOf(n.tagName)<0&&(C.node.isEditable(n)||C.node.isDeletable(n)))if(C.node.isDeletable(n))g(e).replaceWith(V.MARKERS),g(n).remove();else if(C.node.isEmpty(n)&&!C.node.isList(n))g(n).remove(),g(e).replaceWith(V.MARKERS);else{for(C.node.isList(n)&&(n=g(n).find("li").last().get(0)),(t=C.node.contents(n))&&"BR"===t[t.length-1].tagName&&g(t[t.length-1]).remove(),t=C.node.contents(n);t&&C.node.isBlock(t[t.length-1]);)n=t[t.length-1],t=C.node.contents(n);g(n).append(V.MARKERS);for(var h=e;!h.previousSibling;)h=h.parentNode;for(;h&&"BR"!==h.tagName&&!C.node.isBlock(h);){var u=h;h=h.nextSibling,g(n).append(u)}h&&"BR"===h.tagName&&g(h).remove(),g(e).remove()}else e.nextSibling&&"BR"===e.nextSibling.tagName&&g(e.nextSibling).remove();return!0}function i(e){var t=0<g(e).parentsUntil(C.$el,"BLOCKQUOTE").length,n=C.node.deepestParent(e,[],!t);if(n&&"BLOCKQUOTE"===n.tagName){var r=C.node.deepestParent(e,[g(e).parentsUntil(C.$el,"BLOCKQUOTE").get(0)]);r&&r.nextSibling&&(n=r)}if(null!==n){var o,i=n.nextSibling;if(C.node.isBlock(n)&&(C.node.isEditable(n)||C.node.isDeletable(n))&&i&&V.NO_DELETE_TAGS.indexOf(i.tagName)<0)if(C.node.isDeletable(i))g(i).remove(),g(e).replaceWith(V.MARKERS);else if(C.node.isBlock(i)&&C.node.isEditable(i))if(C.node.isList(i))if(C.node.isEmpty(n,!0))g(n).remove(),g(i).find("li").first().prepend(V.MARKERS);else{var a=g(i).find("li").first();"BLOCKQUOTE"===n.tagName&&(o=C.node.contents(n)).length&&C.node.isBlock(o[o.length-1])&&(n=o[o.length-1]),0===a.find("ul, ol").length&&(g(e).replaceWith(V.MARKERS),a.find(C.html.blockTagsQuery()).not("ol, ul, table").each(function(){this.parentNode===a.get(0)&&g(this).replaceWith(g(this).html()+(C.node.isEmpty(this)?"":"<br>"))}),g(n).append(C.node.contents(a.get(0))),a.remove(),0===g(i).find("li").length&&g(i).remove())}else{if((o=C.node.contents(i)).length&&"BR"===o[0].tagName&&g(o[0]).remove(),"BLOCKQUOTE"!==i.tagName&&"BLOCKQUOTE"===n.tagName)for(o=C.node.contents(n);o.length&&C.node.isBlock(o[o.length-1]);)n=o[o.length-1],o=C.node.contents(n);else if("BLOCKQUOTE"===i.tagName&&"BLOCKQUOTE"!==n.tagName)for(o=C.node.contents(i);o.length&&C.node.isBlock(o[0]);)i=o[0],o=C.node.contents(i);g(e).replaceWith(V.MARKERS),g(n).append(i.innerHTML),g(i).remove()}else{for(g(e).replaceWith(V.MARKERS);i&&"BR"!==i.tagName&&!C.node.isBlock(i)&&C.node.isEditable(i);){var s=i;i=i.nextSibling,g(n).append(s)}i&&"BR"===i.tagName&&C.node.isEditable(i)&&g(i).remove()}}}function n(e){for(var t,n=e;!n.nextSibling;)if(n=n.parentNode,C.node.isElement(n))return!1;if("BR"===(n=n.nextSibling).tagName&&C.node.isEditable(n))if(n.nextSibling){if(C.node.isBlock(n.nextSibling)&&C.node.isEditable(n.nextSibling)){if(!(V.NO_DELETE_TAGS.indexOf(n.nextSibling.tagName)<0))return void g(n).remove();n=n.nextSibling,g(n.previousSibling).remove()}}else if(p(n)){if(v(e))C.cursorLists._del(e);else C.node.deepestParent(n)&&((!C.node.isEmpty(C.node.blockParent(n))||(C.node.blockParent(n).nextSibling&&V.NO_DELETE_TAGS.indexOf(C.node.blockParent(n).nextSibling.tagName))<0)&&g(n).remove(),i(e));return}if(!C.node.isBlock(n)&&C.node.isEditable(n)){for(t=C.node.contents(n);n.nodeType!==Node.TEXT_NODE&&t.length&&!C.node.isDeletable(n)&&C.node.isEditable(n);)n=t[0],t=C.node.contents(n);n.nodeType===Node.TEXT_NODE?(g(n).before(V.MARKERS),n.textContent.length&&(n.textContent=n.textContent.substring(b(n.textContent,!0),n.textContent.length))):C.node.isDeletable(n)?(g(n).before(V.MARKERS),g(n).remove()):!1!==C.events.trigger("node.remove",[g(n)])&&(g(n).before(V.MARKERS),g(n).remove()),g(e).remove()}else if(V.NO_DELETE_TAGS.indexOf(n.tagName)<0&&(C.node.isEditable(n)||C.node.isDeletable(n)))if(C.node.isDeletable(n))g(e).replaceWith(V.MARKERS),g(n).remove();else if(C.node.isList(n))e.previousSibling?(g(n).find("li").first().prepend(e),C.cursorLists._backspace(e)):(g(n).find("li").first().prepend(V.MARKERS),g(e).remove());else if((t=C.node.contents(n))&&"BR"===t[0].tagName&&g(t[0]).remove(),t&&"BLOCKQUOTE"===n.tagName){var r=t[0];for(g(e).before(V.MARKERS);r&&"BR"!==r.tagName;){var o=r;r=r.nextSibling,g(e).before(o)}r&&"BR"===r.tagName&&g(r).remove()}else g(e).after(g(n).html()).after(V.MARKERS),g(n).remove()}function a(){for(var e=C.el.querySelectorAll("blockquote:empty"),t=0;t<e.length;t++)e[t].parentNode.removeChild(e[t])}function E(e,t,n){var r,o=C.node.deepestParent(e,[],!n);if(o&&"BLOCKQUOTE"===o.tagName)return m(e,o)?(r=C.html.defaultTag(),t?g(e).replaceWith("<br>"+V.MARKERS):r?g(o).after("<".concat(r,">").concat(V.MARKERS,"<br></").concat(r,">")):g(o).after("".concat(V.MARKERS,"<br>")),g(e).remove()):y(e,t,n),!1;if(null===o)(r=C.html.defaultTag())&&C.node.isElement(e.parentNode)?g(e).replaceWith("<".concat(r,">").concat(V.MARKERS,"<br></").concat(r,">")):!e.previousSibling||g(e.previousSibling).is("br")||e.nextSibling?g(e).replaceWith("<br>".concat(V.MARKERS)):g(e).replaceWith("<br>".concat(V.MARKERS,"<br>"));else{var i=e,a="";"PRE"!=o.tagName||e.nextSibling||(t=!0),C.node.isBlock(o)&&!t||(a="<br/>");var s,l="",c="",d="",f="";(r=C.html.defaultTag())&&C.node.isBlock(o)&&(d="<".concat(r,">"),f="</".concat(r,">"),o.tagName===r.toUpperCase()&&(d=C.node.openTagString(g(o).clone().removeAttr("id").get(0))));do{if(i=i.parentNode,!t||i!==o||t&&!C.node.isBlock(o))if(l+=C.node.closeTagString(i),i===o&&C.node.isBlock(o))c=d+c;else{var p=("A"===i.tagName||C.node.hasClass(i,"fa"))&&m(e,i)?"fr-to-remove":"";c="isPasted"===i.getAttribute("id")?C.node.openTagString(g(i).clone().attr("style","").addClass(p).get(0))+c:C.node.openTagString(g(i).clone().addClass(p).get(0))+c}}while(i!==o);a=l+a+c+(e.parentNode===o&&C.node.isBlock(o)?"":V.INVISIBLE_SPACE)+V.MARKERS,C.node.isBlock(o)&&!g(o).find("*").last().is("br")&&g(o).append("<br/>"),g(e).after('<span id="fr-break"></span>'),g(e).remove(),o.nextSibling&&!C.node.isBlock(o.nextSibling)||C.node.isBlock(o)||g(o).after("<br>"),s=(s=!t&&C.node.isBlock(o)?C.node.openTagString(o)+g(o).html()+f:C.node.openTagString(o)+g(o).html()+C.node.closeTagString(o)).replace(/<span id="fr-break"><\/span>/g,a),g(o).replaceWith(s)}}function y(e,t,n){var r=C.node.deepestParent(e,[],!n);if(null===r)C.html.defaultTag()&&e.parentNode===C.el?g(e).replaceWith("<".concat(C.html.defaultTag(),">").concat(V.MARKERS,"<br></").concat(C.html.defaultTag(),">")):(e.nextSibling&&!C.node.isBlock(e.nextSibling)||g(e).after("<br>"),g(e).replaceWith("<br>".concat(V.MARKERS)));else if(e.previousSibling&&"IMG"==e.previousSibling.tagName||e.nextSibling&&"IMG"==e.nextSibling.tagName)g(e).replaceWith("<"+C.html.defaultTag()+">"+V.MARKERS+"<br></"+C.html.defaultTag()+">");else{var o=e,i="";"PRE"===r.tagName&&(t=!0),C.node.isBlock(r)&&!t||(i="<br>");var a="",s="";do{var l=o;if(o=o.parentNode,"BLOCKQUOTE"===r.tagName&&C.node.isEmpty(l)&&!C.node.hasClass(l,"fr-marker")&&g(l).contains(e)&&g(l).after(e),"BLOCKQUOTE"!==r.tagName||!m(e,o)&&!u(e,o))if(!t||o!==r||t&&!C.node.isBlock(r)){a+=C.node.closeTagString(o);var c="A"==o.tagName&&m(e,o)||C.node.hasClass(o,"fa")?"fr-to-remove":"";s=C.node.openTagString(g(o).clone().addClass(c).removeAttr("id").get(0))+s,o===r&&"DIV"===r.tagName&&(a="<br>",s="")}else"BLOCKQUOTE"==r.tagName&&t&&(s=a="")}while(o!==r);var d=r===e.parentNode&&C.node.isBlock(r)||e.nextSibling;if("BLOCKQUOTE"===r.tagName)if(e.previousSibling&&C.node.isBlock(e.previousSibling)&&e.nextSibling&&"BR"===e.nextSibling.tagName&&(g(e.nextSibling).after(e),e.nextSibling&&"BR"===e.nextSibling.tagName&&g(e.nextSibling).remove()),t)i=a+i+V.MARKERS+s;else{var f=C.html.defaultTag();i="".concat(a+i+(f?"<".concat(f,">"):"")+V.MARKERS,"<br>").concat(f?"</".concat(f,">"):"").concat(s)}else i=a+i+s+(d?"":V.INVISIBLE_SPACE)+V.MARKERS;g(e).replaceWith('<span id="fr-break"></span>');var p=C.node.openTagString(r)+g(r).html()+C.node.closeTagString(r);p=p.replace(/<span id="fr-break"><\/span>/g,i),g(r).replaceWith(p)}}return{enter:function S(e){var t=C.markers.insert();if(!t)return!0;for(var n=t.parentNode;n&&!C.node.isElement(n);){if("false"===n.getAttribute("contenteditable"))return g(t).replaceWith(V.MARKERS),C.selection.restore(),!1;if("true"===n.getAttribute("contenteditable"))break;n=n.parentNode}C.el.normalize();var r=!1;0<g(t).parentsUntil(C.$el,"BLOCKQUOTE").length&&(r=!0),g(t).parentsUntil(C.$el,"TD, TH").length&&(r=!1),p(t)?!v(t)||e||r?E(t,e,r):C.cursorLists._endEnter(t):h(t)?!v(t)||e||r?function l(e,t,n){var r,o=C.node.deepestParent(e,[],!n);if(o&&"TABLE"===o.tagName)return g(o).find("td, th").first().prepend(e),l(e,t,n);if(o&&"BLOCKQUOTE"===o.tagName)if(u(e,o)){if(!t)return(r=C.html.defaultTag())?g(o).before("<".concat(r,">").concat(V.MARKERS,"<br></").concat(r,">")):g(o).before("".concat(V.MARKERS,"<br>")),g(e).remove(),!1}else m(e,o)?E(e,t,!0):y(e,t,!0);if(null===o)(r=C.html.defaultTag())&&C.node.isElement(e.parentNode)?g(e).replaceWith("<".concat(r,">").concat(V.MARKERS,"<br></").concat(r,">")):g(e).replaceWith("<br>".concat(V.MARKERS));else{if(r=C.html.defaultTag(),C.node.isBlock(o))if("PRE"===o.tagName&&(t=!0),t)g(e).remove(),g(o).prepend("<br>".concat(V.MARKERS));else if(e.nextSibling&&"IMG"==e.nextSibling.tagName||e.nextSibling&&e.nextSibling.nextElementSibling&&"IMG"==e.nextSibling.nextElementSibling)g(e).replaceWith("<"+C.html.defaultTag()+">"+V.MARKERS+"<br></"+C.html.defaultTag()+">");else{if(C.node.isEmpty(o,!0))return E(e,t,n);if(C.opts.keepFormatOnDelete||"DIV"===o.tagName||"div"===C.html.defaultTag())if(!C.opts.keepFormatOnDelete&&"DIV"===o.tagName||"div"===C.html.defaultTag())g(o).before("<"+C.html.defaultTag()+"><br></"+C.html.defaultTag()+">");else{for(var i=e,a=V.INVISIBLE_SPACE;i!==o&&!C.node.isElement(i);)i=i.parentNode,a=C.node.openTagString(i)+a+C.node.closeTagString(i);g(o).before(a)}else g(o).before("".concat(C.node.openTagString(g(o).clone().removeAttr("id").get(0)),"<br>").concat(C.node.closeTagString(o)))}else g(o).before("<br>");g(e).remove()}}(t,e,r):C.cursorLists._startEnter(t):!v(t)||e||r?y(t,e,r):C.cursorLists._middleEnter(t),function c(){C.$el.find(".fr-to-remove").each(function(){for(var e=C.node.contents(this),t=0;t<e.length;t++)e[t].nodeType===Node.TEXT_NODE&&(e[t].textContent=e[t].textContent.replace(/\u200B/g,""));g(this).replaceWith(this.innerHTML)})}(),C.html.fillEmptyBlocks(!0),C.opts.htmlUntouched||(C.html.cleanEmptyTags(),C.clean.lists(),C.spaces.normalizeAroundCursor()),C.selection.restore();var o=C.o_win.innerHeight;if(C.$oel[0].offsetHeight>o){var i=function d(){var e=C.selection.get(),t=null;if(C.selection.inEditor()&&e.rangeCount)for(var n=C.selection.ranges(),r=0;r<n.length;r++){var o=n[r];t=C.selection.rangeElement(o.startContainer,o.startOffset);break}return t}();if(i){var a=function f(e){var t=e.getBoundingClientRect(),n=window.pageXOffset||document.documentElement.scrollLeft,r=window.pageYOffset||document.documentElement.scrollTop;return{top:t.top+r,left:t.left+n}}(i),s=i.getBoundingClientRect().top;i.parentNode&&"TD"===i.parentNode.tagName&&o<s?C.o_win.scroll(0,s-50):s<0?C.o_win.scroll(0,a.top-80):o<s+20&&C.o_win.scroll(0,a.top-o+50)}}},backspace:function s(){var e=!1,t=C.markers.insert();if(!t)return!0;for(var n=t.parentNode;n&&!C.node.isElement(n);){if("false"===n.getAttribute("contenteditable"))return g(t).replaceWith(V.MARKERS),C.selection.restore(),!1;if(n.innerText.length&&"true"===n.getAttribute("contenteditable"))break;n=n.parentNode}C.el.normalize();var r=t.previousSibling;if(r){var o=r.textContent;o&&o.length&&8203===o.charCodeAt(o.length-1)&&1!==o.length&&(r.textContent=r.textContent.substr(0,o.length-b(o)))}return p(t)?v(t)&&u(t,g(t).parents("li").first().get(0))?C.cursorLists._backspace(t):e=L(t):h(t)?v(t)&&u(t,g(t).parents("li").first().get(0))?C.cursorLists._backspace(t):function c(e){for(var t=0<g(e).parentsUntil(C.$el,"BLOCKQUOTE").length,n=C.node.deepestParent(e,[],!t),r=n;n&&!n.previousSibling&&"BLOCKQUOTE"!==n.tagName&&n.parentElement!==C.el&&!C.node.hasClass(n.parentElement,"fr-inner")&&V.SIMPLE_ENTER_TAGS.indexOf(n.parentElement.tagName)<0;)n=n.parentElement;if(n&&"BLOCKQUOTE"===n.tagName){var o=C.node.deepestParent(e,[g(e).parentsUntil(C.$el,"BLOCKQUOTE").get(0)]);o&&o.previousSibling&&(r=n=o)}if(null!==n){var i,a=n.previousSibling;if(C.node.isBlock(n)&&C.node.isEditable(n))if(a&&V.NO_DELETE_TAGS.indexOf(a.tagName)<0){if(C.node.isDeletable(a))g(a).remove(),g(e).replaceWith(V.MARKERS);else if(C.node.isEditable(a))if(C.node.isBlock(a))if(C.node.isEmpty(a)&&!C.node.isList(a))g(a).remove(),g(e).after(C.opts.keepFormatOnDelete?V.INVISIBLE_SPACE:"");else{if(C.node.isList(a)&&(a=g(a).find("li").last().get(0)),(i=C.node.contents(a)).length&&"BR"===i[i.length-1].tagName&&g(i[i.length-1]).remove(),"BLOCKQUOTE"===a.tagName&&"BLOCKQUOTE"!==n.tagName)for(i=C.node.contents(a);i.length&&C.node.isBlock(i[i.length-1]);)a=i[i.length-1],i=C.node.contents(a);else if("BLOCKQUOTE"!==a.tagName&&"BLOCKQUOTE"===r.tagName)for(i=C.node.contents(r);i.length&&C.node.isBlock(i[0]);)r=i[0],i=C.node.contents(r);if(C.node.isEmpty(n))g(e).remove(),C.selection.setAtEnd(a,!0);else{g(e).replaceWith(V.MARKERS);var s=a.childNodes;C.node.isBlock(s[s.length-1])?g(s[s.length-1]).append(r.innerHTML):g(a).append(r.innerHTML)}g(r).remove(),C.node.isEmpty(n)&&g(n).remove()}else g(e).replaceWith(V.MARKERS),"BLOCKQUOTE"===n.tagName&&a.nodeType===Node.ELEMENT_NODE?g(a).remove():(g(a).after(C.node.isEmpty(n)?"":g(n).html()),g(n).remove(),"BR"===a.tagName&&g(a).remove())}else if(!a)if(n&&"BLOCKQUOTE"===n.tagName&&0===g(n).text().replace(/\u200B/g,"").length)g(n).remove();else{var l=n.nextSibling;C.node.isEmpty(n)&&n.parentNode&&C.node.isEditable(n.parentNode)&&!l&&(n.parentNode!=C.el&&"TD"!==n.parentNode.tagName?g(n.parentNode).remove():n.parentNode!=C.el&&"TD"===n.parentNode.tagName&&g(n).remove())}}}(t):e=L(t),g(t).remove(),a(),C.html.fillEmptyBlocks(!0),C.opts.htmlUntouched||(C.html.cleanEmptyTags(),C.clean.lists(),C.spaces.normalizeAroundCursor()),C.selection.restore(),e},del:function r(){var e=C.markers.insert();if(!e)return!1;if(C.el.normalize(),p(e))if(v(e))if(0===g(e).parents("li").first().find("ul, ol").length)C.cursorLists._del(e);else{var t=g(e).parents("li").first().find("ul, ol").first().find("li").first();(t=t.find(C.html.blockTagsQuery()).get(-1)||t).prepend(e),C.cursorLists._backspace(e)}else i(e);else h(e),n(e);g(e).remove(),a(),C.html.fillEmptyBlocks(!0),C.opts.htmlUntouched||(C.html.cleanEmptyTags(),C.clean.lists()),C.spaces.normalizeAroundCursor(),C.selection.restore()},isAtEnd:m,isAtStart:u}},V.MODULES.data=function(f){function p(e){return e}function c(e){for(var t=e.toString(),n=0,r=0;r<t.length;r++)n+=parseInt(t.charAt(r),10);return 10<n?n%9+1:n}function d(e,t,n){for(var r=Math.abs(n);0<r--;)e-=t;return n<0&&(e+=123),e}function h(e){return e&&"block"!==e.css("display")?(e.remove(),!0):e&&0===f.helpers.getPX(e.css("height"))?(e.remove(),!0):!(!e||"absolute"!==e.css("position")&&"fixed"!==e.css("position")||(e.remove(),0))}function u(e){return e&&0===f.$box.find(e).length}function C(){if(10<e&&(f[p(N("0ppecjvc=="))](),setTimeout(function(){L.FE=null},10)),!f.$box)return!1;f.$wp.prepend(N(p(N(M)))),v=f.$wp.find("> div").first(),b=v.find("> a"),"rtl"===f.opts.direction&&v.css("left","auto").css("right",0).attr("direction","rtl"),e++}function g(e){for(var t=[N("9qqG-7amjlwq=="),N("KA3B3C2A6D1D5H5H1A3=="),N("3B9B3B5F3C4G3E3=="),N("QzbzvxyB2yA-9m=="),N("ji1kacwmgG5bc=="),N("nmA-13aogi1A3c1jd=="),N("BA9ggq=="),N("emznbjbH3fij=="),N("tkC-22d1qC-13sD1wzF-7=="),N("tA3jjf=="),N("1D1brkm==")],n=0;n<t.length;n++)if(String.prototype.endsWith||(String.prototype.endsWith=function(e,t){return(void 0===t||t>this.length)&&(t=this.length),this.substring(t-e.length,t)===e}),e.endsWith(t[n]))return!0;return!1}function m(){var e=N(p(n)),t=N(p("tzgatD-13eD1dtdrvmF3c1nrC-7saQcdav==")).split(".");try{return window.parent.document.querySelector(e)&&window[t[1]][t[2]]}catch(e){return!1}}var v,b,L=f.$,E="sC-7OB2fwhVC4vsG-7ohPA4ZD4D-8f1J3stzB-11bFE2FC1A3NB2IF1HE1TH4WB8eB-11zVG2F3I3yYB5ZG4CB2DA15CC5AD3F1A1KG1oLA10B1A6wQF1H3vgale2C4F4XA2qc2A5D5B3pepmriKB3OE1HD1fUC10pjD-11E-11TB4YJ3bC-16zE-11yc1B2CE2BC3jhjKC1pdA-21OA6C1D5B-8vF4QA11pD6sqf1C3lldA-16BD4A2H3qoEA7bB-16rmNH5H1F1vSB7RE2A3TH4YC5A5b1A4d1B3whepyAC3AA2zknC3mbgf1SC4WH4PD8TC5ZB2C3H3jb2A5ZA2EF2aoFC5qqHC4B1H1zeGA7UA5RF4TA29TA6ZC4d1C3hyWA10A3rBB2E3decorationRD3QC10UD3E6E6ZD2F3F3fme2E5uxxrEC9C3E4fB-11azhHB1LD7D6VF4VVTPC6b1C4TYG3qzDD6B3B3AH4I2H2kxbHE1JD1yihfd1QD6WB1D4mhrc1B5rvFG3A14A7cDA2OC1AA1JB5zC-16KA6WB4C-8wvlTB5A5lkZB2C2C7zynBD2D2bI-7C-21d1HE2cubyvPC8A6VB3aroxxZE4C4F4e1I2BE1WjdifH1H4A14NA1GB1YG-10tWA3A14A9sVA2C5XH2A29b2A6gsleGG2jaED2D-13fhE1OA8NjwytyTD4e1sc1D-16ZC3B5C-9e1C2FB6EFF5B2C2JH4E1C2tdLE5A3UG4G-7b2D3B4fA-9oh1G3kqvB4AG3ibnjcAC6D2B1cDA9KC2QA6bRC4VA30RB8hYB2A4A-8h1A21A2B2==",y="7D4YH4fkhHB3pqDC3H2E1fkMD1IB1NF1D3QD9wB5rxqlh1A8c2B4ZA3FD2AA6FB5EB3jJG4D2J-7aC-21GB6PC5RE4TC11QD6XC4XE3XH3mlvnqjbaOA2OC2BE6A1fmI-7ujwbc1G5f1F3e1C11mXF4owBG3E1yD1E4F1D2D-8B-8C-7yC-22HD1MF5UE4cWA3D8D6a1B2C3H3a3I3sZA4B3A2akfwEB3xHD5D1F1wIC11pA-16xdxtVI2C9A6YC4a1A2F3B2GA6B4C3lsjyJB1eMA1D-11MF5PE4ja1D3D7byrf1C3e1C7D-16lwqAF3H2A1B-21wNE1MA1OG1HB2A-16tSE5UD4RB3icRA4F-10wtwzBB3E1C3CC2DA8LA2LA1EB1kdH-8uVB7decorg1J2B7B6qjrqGI2J1C6ijehIB1hkemC-13hqkrH4H-7QD6XF5XF3HLNAC3CB2aD2CD2KB10B4ycg1A-8KA4H4B11jVB5TC4yqpB-21pd1E4pedzGB6MD5B3ncB-7MA4LD2JB6PD5uH-8TB9C7YD5XD2E3I3jmiDB3zeimhLD8E2F2JC1H-9ivkPC5lG-10SB1D3H3A-21rc1A3d1E3fsdqwfGA2KA1OrC-22LA6D1B4afUB16SC7AitC-8qYA11fsxcajGA15avjNE2A-9h1hDB16B9tPC1C5F5UC1G3B8d2A5d1D4RnHJ3C3JB5D3ucMG1yzD-17hafjC-8VD3yWC6e1YD2H3ZE2C8C5oBA3H3D2vFA4WzJC4C2i1A-65fNB8afWA1H4A26mvkC-13ZB3E3h1A21BC4eFB2GD2AA5ghqND2A2B2==",n="MekC-11nB-8tIzpD7pewxvzC6mD-16xerg1==",S="lC4B3A3B2B5A1C2E4G1A2==",M="sC-7OB2fwhVC4vsG-7ohPA4ZD4D-8f1J3stzB-11bFE2EE1MA2ND1KD1IE4cA-21pSD2D5ve1G3h1A8b1E5ZC3CD2FA16mC5OC5E1hpnG1NA10B1D7hkUD4I-7b2C3C5nXD2E3F3whidEC2EH3GI2mJE2E2bxci1WA10VC7pllSG2F3A7xd1A4ZC3DB2aaeGA2DE4H2E1j1ywD-13FD1A3VE4WA3D8C6wuc1A2hf1B5B7vnrrjA1B9ic1mpbD1oMB1iSB7rWC4RI4G-7upB6jd1A2F3H2EA4FD3kDF4A2moc1anJD1TD4VI4b2C7oeQF4c1E3XC7ZA3C3G3uDB2wGB6D1JC4D1JD4C1hTE6QC5pH4pD3C-22D7c1A3textAA4gdlB2mpozkmhNC1mrxA3yWA5edhg1I2H3B7ozgmvAI3I2B5GD1LD2RSNH1KA1XA5SB4PA3sA9tlmC-9tnf1G3nd1coBH4I2I2JC3C-16LE6A1tnUA3vbwQB1G3f1A20a3A8a1C6pxAB2eniuE1F3kH2lnjB2hB-16XA5PF1G4zwtYA5B-11mzTG2B9pHB3BE2hGH3B3B2cMD5C1F1wzPA8E7VG5H5vD3H-7C8tyvsVF2I1G2A5fE3bg1mgajoyxMA4fhuzSD8aQB2B4g1A20ukb1A4B3F3GG2CujjanIC1ObiB11SD1C5pWC1D4YB8YE5FE-11jXE2F-7jB4CC2G-10uLH4E1C2tA-13yjUH5d1H1A7sWD5E4hmjF-7pykafoGA16hDD4joyD-8OA33B3C2tC7cRE4SA31a1B8d1e2A4F4g1A2A22CC5zwlAC2C1A12==",T=function(){for(var e=0,t=document.domain,n=t.split("."),r="_gd".concat((new Date).getTime());e<n.length-1&&-1===document.cookie.indexOf("".concat(r,"=").concat(r));)t=n.slice(-1-++e).join("."),document.cookie="".concat(r,"=").concat(r,";domain=").concat(t,";");return document.cookie="".concat(r,"=;expires=Thu, 01 Jan 1970 00:00:01 GMT;domain=").concat(t,";"),(t||"").replace(/(^\.*)|(\.*$)/g,"")}(),N=p(function A(e){if(!e)return e;for(var t="",n=p("charCodeAt"),r=p("fromCharCode"),o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".indexOf(e[0]),i=1;i<e.length-2;i++){for(var a=c(++o),s=e[n](i),l="";/[0-9-]/.test(e[i+1]);)l+=e[++i];s=d(s,a,l=parseInt(l,10)||0),s^=o-1&31,t+=String[r](s)}return t}),e=0;return{_init:function x(){var e=f.opts.key||[""],t=N(p("ziRA1E3B9pA5B-11D-11xg1A3ZB5D1D4B-11ED2EG2pdeoC1clIH4wB-22yQD5uF4YE3E3A9=="));"string"==typeof e&&(e=[e]);for(var n,r,o,i=!(f.ul=!0),a=0,s=0;s<e.length;s++){var l=(r=e[s],4===(o=(N(r)||"").split("|")).length&&"V3"===o[0]?[o[1],o[3],o[2]]:[null,null,""]),c=l[2];if(c===N(p(N("LGnD1KNZf1CPBYCAZB-8F3UDSLLSG1VFf1A3C2==")))||0<=c.indexOf(T,c.length-T.length)||g(T)||m()){if(null!==(n=l[1])&&!(0==n.indexOf("TRIAL")?(n=new Date(n.replace(/TRIAL/,"")),new Date(n)<new Date&&(E=y,1)):new Date(n)<new Date(N(S)))||!(0<(T||"").length)||g(T)||m()){f.ul=!1;break}i=!0,M=E,a=l[0]||-1}}var d=new Image;!0===f.ul&&(C(),d.src=i?"".concat(p(N(t)),"e=").concat(a):"".concat(p(N(t)),"u")),!0===f.ul&&(f.events.on("contentChanged",function(){(function e(){return h(v)||h(b)||u(v)||u(b)})()&&C()}),f.events.on("html.get",function(e){return e+N("qD2H-9G3ioD-17qA1tE1B-8qI3A4hA-13C-11E2C1njfldD1E6pg1C-8sC3hfbkcD2G3stC-22gqgB3G2B-7vtoA4nweeD1A31A15B9uC-16A1F5dkykdc1B8dE-11bA3F2D3A9gd1E7F2tlI-8H-7vtxB2A5B2C3B2F2B5A6ldbyC4iqC-22D-17E-13mA3D2dywiB3oxlvfC1H4C2TjqbzlnI3ntB4E3qA2zaqsC6D3pmnkoE3C6D5wvuE3bwifdhB6hch1E4xibD-17dmrC1rG-7pntnF6nB-8F1D2A11C8plrkmF2F3MC-16bocqA2WwA-21ayeA1C4d1isC-22rD-13D6DfjpjtC2E6hB2G2G4A-7D2==")})),f.events.on("html.set",function(){var e=f.el.querySelector('[data-f-id="pbf"]');e&&L(e).remove()}),f.events.on("destroy",function(){v&&v.length&&v.remove()},!0)}}},V.MODULES.edit=function(t){function e(){if(t.browser.mozilla)try{t.doc.execCommand("enableObjectResizing",!1,"false"),t.doc.execCommand("enableInlineTableEditing",!1,"false")}catch(e){}if(t.browser.msie)try{t.doc.body.addEventListener("mscontrolselect",function(e){return e.srcElement.focus(),!1})}catch(e){}}var n=!1;function r(){return n}return{_init:function o(){t.events.on("focus",function(){r()?t.edit.off():t.edit.on()})},on:function i(){t.$wp?(t.$el.attr("contenteditable",!0),t.$el.removeClass("fr-disabled").attr("aria-disabled",!1),e()):t.$el.is("a")&&t.$el.attr("contenteditable",!0),t.events.trigger("edit.on",[],!0),n=!1},off:function a(){t.events.disableBlur(),t.$wp?(t.$el.attr("contenteditable",!1),t.$el.addClass("fr-disabled").attr("aria-disabled",!0)):t.$el.is("a")&&t.$el.attr("contenteditable",!1),t.events.trigger("edit.off"),t.events.enableBlur(),n=!0},disableDesign:e,isDisabled:r}},V.MODULES.format=function(M){var T=M.$;function g(e,t){var n="<".concat(e);for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n+=" ".concat(r,'="').concat(t[r],'"'));return n+=">"}function N(e,t){var n=e;for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(n+="id"===r?"#".concat(t[r]):"class"===r?".".concat(t[r]):"[".concat(r,'="').concat(t[r],'"]'));return n}function A(e,t){return!(!e||e.nodeType!==Node.ELEMENT_NODE)&&(e.matches||e.matchesSelector||e.msMatchesSelector||e.mozMatchesSelector||e.webkitMatchesSelector||e.oMatchesSelector).call(e,t)}function v(e,t,n){var r,o,i,a={strong:{prop:"font-weight",val:"bold"},em:{prop:"font-style",val:"italic"}};if(e){if(M.node.isBlock(e)&&e.hasAttribute("contenteditable")&&"false"===e.getAttribute("contenteditable")||e.parentNode&&e.parentNode.hasAttribute("contenteditable")&&"false"===e.parentNode.getAttribute("contenteditable")){if(e.nextSibling&&T(e.nextSibling).hasClass("fr-marker"))return;if(e.nextSibling)return void v(e.nextSibling,t,n);if(e.parentNode)return void v(e.parentNode,t,n)}for(;e.nodeType===Node.COMMENT_NODE;)e=e.nextSibling;if(e){if(M.node.isBlock(e)&&"HR"!==e.tagName)return M.node.hasClass(e.firstChild,"fr-marker")?v(e.firstChild.nextSibling,t,n):v(e.firstChild,t,n),!1;var s=T(M.doc.createElement(t));s.attr(n),s.insertBefore(e),(r=b(e))&&(0<=["strong","em"].indexOf(t)||"span"===t&&n.hasOwnProperty("style"))&&(i="span"===t?(o=(a=n.style.replace(/;$/,"").split(":"))[0].trim(),a[1].trim()):(o=a[t].prop,a[t].val),"background-color"!==o&&(T(r).css(o,i),function C(e,t){var n,r=e.childNodes;for(n=0;n<r.length;n++)0<=["UL","OL","LI"].indexOf(r[n].tagName)&&""===r[n].style[t]&&T(r[n]).css(t,"initial")}(r,o)));for(var l=e;l&&!T(l).hasClass("fr-marker")&&0===T(l).find(".fr-marker").length&&"UL"!==l.tagName&&"OL"!==l.tagName;){var c=l;if("SPAN"===l.tagName&&T(l).hasClass("fr-tracking-deleted"))l=l.nextSibling;else{if(M.node.isBlock(l)&&"HR"!==e.tagName)return v(l.firstChild,t,n),!1;if("SPAN"===l.tagName)return v(l.firstChild,t,n),!1;if(l.tagName&&l.hasAttribute("contenteditable")&&"false"===l.getAttribute("contenteditable"))return void v(l.nextSibling,t,n);l=l.nextSibling,s.append(c)}}if(l){if(T(l).find(".fr-marker").length||"UL"===l.tagName||"OL"===l.tagName)v(l.firstChild,t,n);else if(M.browser.mozilla&&M.node.hasClass(l,"fr-marker")){var d,f=M.selection.blocks(),p=f.length;for(d=0;d<p;d++)f[d]!=l.parentNode&&f[d].childNodes.length&&f[d].childNodes[0]!=l.parentNode&&(l=f[d].childNodes[1]||f[d].childNodes[0],(s=T(g(t,n)).insertBefore(l)).append(l))}}else{for(var h=s.get(0).parentNode;h&&!h.nextSibling&&!M.node.isElement(h);)h=h.parentNode;if(h){var u=h.nextSibling;u&&(M.node.isBlock(u)?"HR"===u.tagName?v(u.nextSibling,t,n):v(u.firstChild,t,n):v(u,t,n))}}s.is(":empty")&&s.remove()}}}function n(e,t){var n;if(void 0===t&&(t={}),t.style&&delete t.style,M.selection.isCollapsed()){M.markers.insert(),M.$el.find(".fr-marker").replaceWith(g(e,t)+V.INVISIBLE_SPACE+V.MARKERS+function a(e){return"</".concat(e,">")}(e)),M.selection.restore()}else{var r;M.selection.save(),v(M.$el.find('.fr-marker[data-type="true"]').length&&M.$el.find('.fr-marker[data-type="true"]').get(0).nextSibling,e,t);do{for(r=M.$el.find("".concat(N(e,t)," > ").concat(N(e,t))),n=0;n<r.length;n++)r[n].outerHTML=r[n].innerHTML}while(r.length);M.el.normalize();var o=M.el.querySelectorAll(".fr-marker");for(n=0;n<o.length;n++){var i=T(o[n]);!0===i.data("type")?A(i.get(0).nextSibling,N(e,t))&&i.next().prepend(i):A(i.get(0).previousSibling,N(e,t))&&i.prev().append(i)}M.selection.restore()}}function x(e,t,n,r){if(!r){var o=!1;if(!0===e.data("type"))for(;M.node.isFirstSibling(e.get(0))&&!e.parent().is(M.$el)&&!e.parent().is("ol")&&!e.parent().is("ul");)e.parent().before(e),o=!0;else if(!1===e.data("type"))for(;M.node.isLastSibling(e.get(0))&&!e.parent().is(M.$el)&&!e.parent().is("ol")&&!e.parent().is("ul");)e.parent().after(e),o=!0;if(o)return!0}if(e.parents(t).length||void 0===t){var i,a="",s="",l=e.parent();if(l.is(M.$el)||M.node.isBlock(l.get(0)))return!1;for(;!(M.node.isBlock(l.parent().get(0))||void 0!==t&&A(l.get(0),N(t,n)));)a+=M.node.closeTagString(l.get(0)),s=M.node.openTagString(l.get(0))+s,l=l.parent();var c=e.get(0).outerHTML;return e.replaceWith('<span id="mark"></span>'),i=l.html().replace(/<span id="mark"><\/span>/,a+M.node.closeTagString(l.get(0))+s+c+a+M.node.openTagString(l.get(0))+s),l.replaceWith(M.node.openTagString(l.get(0))+i+M.node.closeTagString(l.get(0))),!0}return!1}function r(e,t){void 0===t&&(t={}),t.style&&delete t.style;var n=M.selection.isCollapsed();M.selection.save();for(var r=!0;r;){r=!1;for(var o=M.$el.find(".fr-marker"),i=0;i<o.length;i++){var a=T(o[i]),s=null;if(a.attr("data-cloned")||n||(s=a.clone().removeClass("fr-marker").addClass("fr-clone"),a.data("type")&&"true"===a.data("type").toString()?a.attr("data-cloned",!0).after(s):a.attr("data-cloned",!0).before(s)),x(a,e,t,n)){r=!0;break}}}!function y(e,t,n,r){for(var o,i={strong:{prop:"font-weight",val:"bold"},em:{prop:"font-style",val:"italic"}},a=M.node.contents(e.get(0)),s=0;s<a.length;s++){var l=a[s];if(l.innerHTML&&8203==l.innerHTML.charCodeAt()&&l.tagName.toLocaleLowerCase()==n&&l.childNodes.length<2&&(l.outerHTML=l.innerHTML),M.node.hasClass(l,"fr-marker"))t=(t+1)%2;else if(t)if(0<T(l).find(".fr-marker").length)t=y(T(l),t,n,r);else{(o="LI"===l.tagName?l:T(l).parentsUntil(M.$el,"li").get(0))&&(void 0===n||0<=["strong","em"].indexOf(n))&&(n?T(o).css(i[n].prop,""):o.style=""),(o=l.parentNode!==M.el?l.parentNode:null)&&1===o.nodeType&&"a"!==n&&o.hasAttribute("style")?o.style="":l&&1===l.nodeType&&"a"!==n&&l.hasAttribute("style")&&(l.style="");for(var c=T(l).find(n||"*:not(br)"),d=c.length-1;0<=d;d--){var f=c[d];(o="LI"===f.tagName?f:T(f).parentsUntil(M.$el,"li").get(0))&&(!n||0<=["strong","em"].indexOf(n))&&(n?T(o).css(i[n].prop,""):o.style=""),M.node.isBlock(f)||M.node.isVoid(f)||void 0!==n&&!A(f,N(n,r))?M.node.isBlock(f)&&void 0===n&&"TABLE"!==l.tagName&&M.node.clearAttributes(f):M.node.hasClass(f,"fr-clone")||M.node.hasClass(f,"fr-tracking-deleted")||T(f).data("tracking")||(f.outerHTML=f.innerHTML)}void 0===n&&l.nodeType===Node.ELEMENT_NODE&&!M.node.isVoid(l)||A(l,N(n,r))?M.node.isBlock(l)||(M.node.hasClass(l,"fr-clone")||M.opts.trackChangesEnabled?!M.node.hasClass(l,"fr-clone")&&M.opts.trackChangesEnabled&&l.parentNode&&(l.outerHTML=l.innerHTML):l.outerHTML=l.innerHTML):void 0===n&&l.nodeType===Node.ELEMENT_NODE&&M.node.isBlock(l)&&"TABLE"!==l.tagName&&M.node.clearAttributes(l)}else 0<T(l).find(".fr-marker").length&&(t=y(T(l),t,n,r))}return t}(M.$el,0,e,t),n||(M.$el.find(".fr-marker").remove(),M.$el.find(".fr-clone").removeClass("fr-clone").addClass("fr-marker")),n&&M.$el.find(".fr-marker").before(V.INVISIBLE_SPACE).after(V.INVISIBLE_SPACE),M.html.cleanEmptyTags(),M.el.normalize(),M.selection.restore();var l=M.win.getSelection()&&M.win.getSelection().anchorNode;if(l){var c=M.node.blockParent(l),d=!!l.textContent.replace(/\u200B/g,"").length,f=M.win.getSelection().getRangeAt(0),p=f.startOffset,h=f.endOffset;M.selection.text().replace(/\u200B/g,"").length||function S(e,t){if(e&&t){if(e.isSameNode(t)?e.textContent=e.textContent.replace(/\u200B(?=.*\u200B)/g,""):e.nodeType===Node.TEXT_NODE&&(e.textContent=e.textContent.replace(/\u200B/g,"")),!e.childNodes.length)return!1;Array.isArray(e.childNodes)&&e.childNodes.forEach(function(e){S(e,t)})}}(c,l);var u=M.win.getSelection().getRangeAt(0);if(l.nodeType===Node.TEXT_NODE){if(!d||!M.selection.text().length&&p===h){var C=l.textContent.search(/\u200B/g)+1;if(M.browser.msie){var g=M.doc.createRange();M.selection.get().removeAllRanges(),g.setStart(l,C),g.setEnd(l,C),M.selection.get().addRange(g)}else u.setStart(l,C),u.setEnd(l,C)}}else{var m,v,b=0,L=T(l).contents();if(M.browser.msie){for(;v=L[b];)v.nodeType===Node.TEXT_NODE&&0<=v.textContent.search(/\u200B/g)&&(m=v),b++;m=T(m)}else m=L.filter(function(e){return e.nodeType===Node.TEXT_NODE&&0<=e.textContent.search(/\u200B/g)});if(m.length&&!M.opts.trackChangesEnabled){var E=m.text().search(/\u200B/g)+1;u.setStart(m.get(0),E),u.setEnd(m.get(0),E)}}}}function t(e,t){var n,r,o,i,a,s,l,c=null;if(M.selection.isCollapsed()){M.markers.insert();var d=(r=M.$el.find(".fr-marker")).parent();if(M.node.openTagString(d.get(0))==='<span style="'.concat(e,": ").concat(d.css(e),';">')){if(M.node.isEmpty(d.get(0)))c=T(M.doc.createElement("span")).attr("style","".concat(e,": ").concat(t,";")).html("".concat(V.INVISIBLE_SPACE).concat(V.MARKERS)),d.replaceWith(c);else{var f={};f["style*"]="".concat(e,":"),x(r,"span",f,!0),r=M.$el.find(".fr-marker"),t?(c=T(M.doc.createElement("span")).attr("style","".concat(e,": ").concat(t,";")).html("".concat(V.INVISIBLE_SPACE).concat(V.MARKERS)),r.replaceWith(c)):r.replaceWith(V.INVISIBLE_SPACE+V.MARKERS)}M.html.cleanEmptyTags()}else M.node.isEmpty(d.get(0))&&d.is("span")?(r.replaceWith(V.MARKERS),d.css(e,t)):(c=T('<span style="'.concat(e,": ").concat(t,';">').concat(V.INVISIBLE_SPACE).concat(V.MARKERS,"</span>")),r.replaceWith(c));c&&L(c,e,t)}else{if(M.selection.save(),null===t||"color"===e&&0<M.$el.find(".fr-marker").parents("u, a").length){var p=M.$el.find(".fr-marker");for(n=0;n<p.length;n++)if(!0===(r=T(p[n])).data("type")||"true"===r.data("type"))for(;M.node.isFirstSibling(r.get(0))&&!r.parent().is(M.$el)&&!M.node.isElement(r.parent().get(0))&&!M.node.isBlock(r.parent().get(0));)r.parent().before(r);else for(;M.node.isLastSibling(r.get(0))&&!r.parent().is(M.$el)&&!M.node.isElement(r.parent().get(0))&&!M.node.isBlock(r.parent().get(0));)r.parent().after(r)}for(var h=M.$el.find('.fr-marker[data-type="true"]').get(0).nextSibling;h.firstChild;)h=h.firstChild;var u={"class":"fr-unprocessed"};for(t&&(u.style="".concat(e,": ").concat(t,";")),v(h,"span",u),M.$el.find(".fr-marker + .fr-unprocessed").each(function(){T(this).prepend(T(this).prev())}),M.$el.find(".fr-unprocessed + .fr-marker").each(function(){T(this).prev().append(T(this))}),(t||"").match(/\dem$/)&&M.$el.find("span.fr-unprocessed").removeClass("fr-unprocessed");0<M.$el.find("span.fr-unprocessed").length;){if(o=b(c=M.$el.find("span.fr-unprocessed").first().removeClass("fr-unprocessed")),c.parent().get(0).normalize(),c.parent().is("span")&&1===c.parent().get(0).childNodes.length){var C=t;M.browser.msie&&!t&&(C=""),c.parent().css(e,C);var g=c;c=c.parent(),g.replaceWith(g.html())}for(i=c.find("span"),o&&"background-color"!==e&&(o.normalize(),i=T(o).find("span:not(.fr-unprocessed)")),n=i.length-1;0<=n;n--)a=i[n],s=e,l=void 0,(l=T(a)).css(s,""),""===l.attr("style")&&l.replaceWith(l.html());L(c,e,t)}}!function m(){var e;for(;0<M.$el.find(".fr-split:empty").length;)M.$el.find(".fr-split:empty").remove();M.$el.find(".fr-split").removeClass("fr-split"),M.$el.find('[style=""]').removeAttr("style"),M.$el.find('[class=""]').removeAttr("class"),M.html.cleanEmptyTags();for(var t=M.$el.find("span"),n=t.length-1;0<=n;n--){var r=t[n];r.attributes&&0!==r.attributes.length||T(r).replaceWith(r.innerHTML)}M.el.normalize();var o=M.$el.find("span[style] + span[style]");for(e=0;e<o.length;e++){var i=T(o[e]),a=T(o[e]).prev();i.get(0).previousSibling===a.get(0)&&M.node.openTagString(i.get(0))===M.node.openTagString(a.get(0))&&(i.prepend(a.html()),a.remove())}M.$el.find("span[style] span[style]").each(function(){if(0<=T(this).attr("style").indexOf("font-size")){var e=T(this).parents("span[style]");e.attr("style")&&0<=e.attr("style").indexOf("background-color")&&(T(this).attr("style","".concat(T(this).attr("style"),";").concat(e.attr("style"))),x(T(this),"span[style]",{},!1))}}),M.el.normalize(),M.selection.restore()}()}function b(e){var t,n,r,o,i,a;if(t="LI"===e.tagName?e:T(e).parentsUntil(M.$el,"li").get(0)){if((a=M.selection.info(t)).atStart&&a.atEnd)return t;if(a.atStart&&!a.atEnd&&(n=T(t).find(".fr-marker[data-type=false]").get(0),r=T(n).parentsUntil(M.$el,"li").get(0),o=T(n).parent().get(0),(i=n.nextSibling)&&0<=["UL","OL"].indexOf(i.tagName)||!r.isSameNode(t)||!i&&("LI"===o.tagName||!o.nextSibling||0<=["UL","OL"].indexOf(o.nextSibling.tagName)||M.node.isVoid(o.nextSibling))))return t}}function L(e,t,n){var r,o,i,a=e.parentsUntil(M.$el,"span[style]"),s=[];for(r=a.length-1;0<=r;r--)o=a[r],i=t,0===T(o).attr("style").indexOf("".concat(i,":"))||0<=T(o).attr("style").indexOf(";".concat(i,":"))||0<=T(o).attr("style").indexOf("; ".concat(i,":"))||s.push(a[r]);if((a=a.not(s)).length){for(var l="",c="",d="",f="",p=e.get(0);p=p.parentNode,T(p).addClass("fr-split"),l+=M.node.closeTagString(p),c=M.node.openTagString(T(p).clone().addClass("fr-split").get(0))+c,a.get(0)!==p&&(d+=M.node.closeTagString(p),f=M.node.openTagString(T(p).clone().addClass("fr-split").get(0))+f),a.get(0)!==p;);var h="".concat(l+M.node.openTagString(T(a.get(0)).clone().css(t,n||"").get(0))+f+e.css(t,"").get(0).outerHTML+d,"</span>").concat(c);e.replaceWith('<span id="fr-break"></span>');var u=a.get(0).outerHTML;T(a.get(0)).replaceWith(u.replace(/<span id="fr-break"><\/span>/g,function(){return h}))}}function o(e,t){void 0===t&&(t={}),t.style&&delete t.style;var n=M.selection.ranges(0),r=n.startContainer;if(r.nodeType===Node.ELEMENT_NODE&&0<r.childNodes.length&&r.childNodes[n.startOffset]&&(r=r.childNodes[n.startOffset]),!n.collapsed&&r.nodeType===Node.TEXT_NODE&&n.startOffset===(r.textContent||"").length){for(;!M.node.isBlock(r.parentNode)&&!r.nextSibling;)r=r.parentNode;r.nextSibling&&(r=r.nextSibling)}for(var o=r;o&&o.nodeType===Node.ELEMENT_NODE&&!A(o,N(e,t));)o=o.firstChild;if(o&&o.nodeType===Node.ELEMENT_NODE&&A(o,N(e,t)))return!0;var i=r;for(i&&i.nodeType!==Node.ELEMENT_NODE&&(i=i.parentNode);i&&i.nodeType===Node.ELEMENT_NODE&&i!==M.el&&!A(i,N(e,t));)i=i.parentNode;return!(!i||i.nodeType!==Node.ELEMENT_NODE||i===M.el||!A(i,N(e,t)))}return{is:o,toggle:function i(e,t){o(e,t)?r(e,t):n(e,t)},apply:n,remove:r,applyStyle:t,removeStyle:function a(e){t(e,null)}}},V.MODULES.spaces=function(c){function r(e,t){var n=e.previousSibling,r=e.nextSibling,o=e.textContent,i=e.parentNode,a=[V.ENTER_P,V.ENTER_DIV,V.ENTER_BR];if(!c.html.isPreformatted(i)){t&&(o=o.replace(/[\f\n\r\t\v ]{2,}/g," "),r&&"BR"!==r.tagName&&!c.node.isBlock(r)||!(c.node.isBlock(i)||c.node.isLink(i)&&!i.nextSibling||c.node.isElement(i))||(o=o.replace(/[\f\n\r\t\v ]{1,}$/g,"")),n&&"BR"!==n.tagName&&!c.node.isBlock(n)||!(c.node.isBlock(i)||c.node.isLink(i)&&!i.previousSibling||c.node.isElement(i))||(o=o.replace(/^[\f\n\r\t\v ]{1,}/g,"")),(c.node.isBlock(r)||c.node.isBlock(n))&&(!n||n&&"A"!==n.tagName)&&(o=o.replace(/^[\f\n\r\t\v ]{1,}/g,""))," "===o&&(n&&c.node.isVoid(n)||r&&c.node.isVoid(r))&&!(n&&r&&c.node.isVoid(n)||r&&n&&c.node.isVoid(r))&&(o="")),(!n&&c.node.isBlock(r)||!r&&c.node.isBlock(n))&&c.node.isBlock(i)&&i!==c.el&&(o=o.replace(/^[\f\n\r\t\v ]{1,}/g,"")),t||(o=o.replace(new RegExp(V.UNICODE_NBSP,"g")," "));for(var s="",l=0;l<o.length;l++)32!=o.charCodeAt(l)||0!==l&&32!=s.charCodeAt(l-1)||!((c.opts.enter===V.ENTER_BR||c.opts.enter===V.ENTER_DIV)&&(n&&"BR"===n.tagName||r&&"BR"===r.tagName)||n&&r&&n.tagName===r.tagName)&&(n&&r&&c.node.isVoid(n)||n&&r&&c.node.isVoid(r))?s+=o[l]:s+=V.UNICODE_NBSP;(!r||r&&c.node.isBlock(r)||r&&r.nodeType===Node.ELEMENT_NODE&&c.win.getComputedStyle(r)&&"block"===c.win.getComputedStyle(r).display)&&(!c.node.isVoid(n)||n&&-1!==["P","DIV","BR"].indexOf(n.tagName)&&-1!==a.indexOf(c.opts.enter))&&(s=s.replace(/ $/,V.UNICODE_NBSP)),!n||c.node.isVoid(n)||c.node.isBlock(n)||1!==(s=s.replace(/^\u00A0([^ $])/," $1")).length||160!==s.charCodeAt(0)||!r||c.node.isVoid(r)||c.node.isBlock(r)||c.node.hasClass(n,"fr-marker")&&c.node.hasClass(r,"fr-marker")||(s=" "),t||(s=s.replace(/([^ \u00A0])\u00A0([^ \u00A0])/g,"$1 $2")),e.textContent!==s&&(e.textContent=s)}}function l(e,t){if(void 0!==e&&e||(e=c.el),void 0===t&&(t=!1),!e.getAttribute||"false"!==e.getAttribute("contenteditable"))if(e.nodeType===Node.TEXT_NODE)r(e,t);else if(e.nodeType===Node.ELEMENT_NODE)for(var n=c.doc.createTreeWalker(e,NodeFilter.SHOW_TEXT,c.node.filter(function(e){for(var t=e.parentNode;t&&t!==c.el;){if("STYLE"===t.tagName||"IFRAME"===t.tagName)return!1;if("PRE"===t.tagName)return!1;t=t.parentNode}return null!==e.textContent.match(/([ \u00A0\f\n\r\t\v]{2,})|(^[ \u00A0\f\n\r\t\v]{1,})|([ \u00A0\f\n\r\t\v]{1,}$)/g)&&!c.node.hasClass(e.parentNode,"fr-marker")}),!1);n.nextNode();)r(n.currentNode,t)}return{normalize:l,normalizeAroundCursor:function d(){for(var e=[],t=c.el.querySelectorAll(".fr-marker"),n=0;n<t.length;n++){for(var r=null,o=c.node.blockParent(t[n]),i=(r=o||t[n]).nextSibling,a=r.previousSibling;i&&"BR"===i.tagName;)i=i.nextSibling;for(;a&&"BR"===a.tagName;)a=a.previousSibling;r&&e.indexOf(r)<0&&e.push(r),a&&e.indexOf(a)<0&&e.push(a),i&&e.indexOf(i)<0&&e.push(i)}for(var s=0;s<e.length;s++)l(e[s])}}},V.START_MARKER='<span class="fr-marker" data-id="0" data-type="true" style="display: none; line-height: 0;">'.concat(V.INVISIBLE_SPACE="&#8203;","</span>"),V.END_MARKER='<span class="fr-marker" data-id="0" data-type="false" style="display: none; line-height: 0;">'.concat(V.INVISIBLE_SPACE,"</span>"),V.MARKERS=V.START_MARKER+V.END_MARKER,V.MODULES.markers=function(d){var f=d.$;function l(){if(!d.$wp)return null;try{var e=d.selection.ranges(0),t=e.commonAncestorContainer;if(t!==d.el&&!d.$el.contains(t))return null;var n=e.cloneRange(),r=e.cloneRange();n.collapse(!0);var o=f(d.doc.createElement("SPAN")).addClass("fr-marker").attr("style","display: none; line-height: 0;").html(V.INVISIBLE_SPACE).get(0);if(n.insertNode(o),o=d.$el.find("span.fr-marker").get(0)){for(var i=o.nextSibling;i&&i.nodeType===Node.TEXT_NODE&&0===i.textContent.length;)f(i).remove(),i=d.$el.find("span.fr-marker").get(0).nextSibling;return d.selection.clear(),d.selection.get().addRange(r),o}return null}catch(a){}}function c(){d.$el.find(".fr-marker").remove()}return{place:function p(e,t,n){var r,o,i;try{var a=e.cloneRange();if(a.collapse(t),a.insertNode(function l(e,t){var n=f(d.doc.createElement("SPAN"));return n.addClass("fr-marker").attr("data-id",t).attr("data-type",e).attr("style","display: ".concat(d.browser.safari?"none":"inline-block","; line-height: 0;")).html(V.INVISIBLE_SPACE),n.get(0)}(t,n)),!0===t)for(i=(r=d.$el.find('span.fr-marker[data-type="true"][data-id="'.concat(n,'"]')).get(0)).nextSibling;i&&i.nodeType===Node.TEXT_NODE&&0===i.textContent.length;)f(i).remove(),i=r.nextSibling;if(!0===t&&!e.collapsed){for(;!d.node.isElement(r.parentNode)&&!i;)-1</\bfa\b/g.test(r.parentNode.className)&&"I"===r.parentNode.tagName?f(r.parentNode).before(r):f(r.parentNode).after(r),i=r.nextSibling;if(i&&i.nodeType===Node.ELEMENT_NODE&&d.node.isBlock(i)&&"HR"!==i.tagName){for(o=[i];i=o[0],(o=d.node.contents(i))[0]&&d.node.isBlock(o[0]););f(i).prepend(f(r))}}if(!1===t&&!e.collapsed){if((i=(r=d.$el.find('span.fr-marker[data-type="false"][data-id="'.concat(n,'"]')).get(0)).previousSibling)&&i.nodeType===Node.ELEMENT_NODE&&d.node.isBlock(i)&&"HR"!==i.tagName){for(o=[i];i=o[o.length-1],(o=d.node.contents(i))[o.length-1]&&d.node.isBlock(o[o.length-1]););f(i).append(f(r))}(r.parentNode&&0<=["TD","TH"].indexOf(r.parentNode.tagName)||!r.previousSibling&&d.node.isBlock(r.parentElement))&&(r.parentNode.previousSibling&&!r.previousSibling?f(r.parentNode.previousSibling).append(r):0<=["TD","TH"].indexOf(r.parentNode.tagName)&&r.parentNode.firstChild===r&&(r.parentNode.previousSibling?f(r.parentNode.previousSibling).append(r):r.parentNode.parentNode&&r.parentNode.parentNode.previousSibling&&f(r.parentNode.parentNode.previousSibling).append(r)))}var s=d.$el.find('span.fr-marker[data-type="'.concat(t,'"][data-id="').concat(n,'"]')).get(0);return s&&(s.style.display="none"),s}catch(c){return null}},insert:l,split:function a(){d.selection.isCollapsed()||d.selection.remove();var e=d.$el.find(".fr-marker").get(0);if(e||(e=l()),!e)return null;var t=d.node.deepestParent(e);if(t||(t=d.node.blockParent(e))&&"LI"!==t.tagName&&(t=null),t)if(d.node.isBlock(t)&&d.node.isEmpty(t))"LI"!==t.tagName||t.parentNode.firstElementChild!==t||d.node.isEmpty(t.parentNode)?f(t).replaceWith('<span class="fr-marker"></span>'):f(t).append('<span class="fr-marker"></span>');else if(d.cursor.isAtStart(e,t))f(t).before('<span class="fr-marker"></span>'),f(e).remove();else if(d.cursor.isAtEnd(e,t))f(t).after('<span class="fr-marker"></span>'),f(e).remove();else{for(var n=e,r="",o="";n=n.parentNode,r+=d.node.closeTagString(n),o=d.node.openTagString(n)+o,n!==t;);f(e).replaceWith('<span id="fr-break"></span>');var i=d.node.openTagString(t)+f(t).html()+d.node.closeTagString(t);i=i.replace(/<span id="fr-break"><\/span>/g,"".concat(r,'<span class="fr-marker"></span>').concat(o)),f(t).replaceWith(i)}return d.$el.find(".fr-marker").get(0)},insertAtPoint:function h(e){var t,n=e.clientX,r=e.clientY;c();var o=null;if("undefined"!=typeof d.doc.caretPositionFromPoint?(t=d.doc.caretPositionFromPoint(n,r),(o=d.doc.createRange()).setStart(t.offsetNode,t.offset),o.setEnd(t.offsetNode,t.offset)):"undefined"!=typeof d.doc.caretRangeFromPoint&&(t=d.doc.caretRangeFromPoint(n,r),(o=d.doc.createRange()).setStart(t.startContainer,t.startOffset),o.setEnd(t.startContainer,t.startOffset)),null!==o&&"undefined"!=typeof d.win.getSelection){var i=d.win.getSelection();i.removeAllRanges(),i.addRange(o)}else if("undefined"!=typeof d.doc.body.createTextRange)try{(o=d.doc.body.createTextRange()).moveToPoint(n,r);var a=o.duplicate();a.moveToPoint(n,r),o.setEndPoint("EndToEnd",a),o.select()}catch(s){return!1}l()},remove:c}},V.MODULES.selection=function(E){var y=E.$;function s(){var e="";return E.win.getSelection?e=E.win.getSelection():E.doc.getSelection?e=E.doc.getSelection():E.doc.selection&&(e=E.doc.selection.createRange().text),e.toString()}function L(){return E.win.getSelection?E.win.getSelection():E.doc.getSelection?E.doc.getSelection():E.doc.selection.createRange()}function f(e){var t=L(),n=[];if(t&&t.getRangeAt&&t.rangeCount){n=[];for(var r=0;r<t.rangeCount;r++)n.push(t.getRangeAt(r))}else n=E.doc.createRange?[E.doc.createRange()]:[];return void 0!==e?n[e]:n}function S(){var e=L();try{e.removeAllRanges?e.removeAllRanges():e.empty?e.empty():e.clear&&e.clear()}catch(t){}}function p(e,t){var n=e;return n.nodeType===Node.ELEMENT_NODE&&0<n.childNodes.length&&n.childNodes[t]&&(n=n.childNodes[t]),n.nodeType===Node.TEXT_NODE&&(n=n.parentNode),n}function M(){if(E.$wp){E.markers.remove();var e,t,n=f(),r=[];for(t=0;t<n.length;t++)if(n[t].startContainer!==E.doc||E.browser.msie){var o=(e=n[t]).collapsed,i=E.markers.place(e,!0,t),a=E.markers.place(e,!1,t);if(void 0!==i&&i||!o||(y(".fr-marker").remove(),E.selection.setAtEnd(E.el)),E.el.normalize(),E.browser.safari&&!o)try{(e=E.doc.createRange()).setStartAfter(i),e.setEndBefore(a),r.push(e)}catch(s){}}if(E.browser.safari&&r.length)for(E.selection.clear(),t=0;t<r.length;t++)E.selection.get().addRange(r[t])}}function T(){var e,t=E.el.querySelectorAll('.fr-marker[data-type="true"]');if(!E.$wp)return E.markers.remove(),!1;if(0===t.length)return!1;if(E.browser.msie||E.browser.edge)for(e=0;e<t.length;e++)t[e].style.display="inline-block";E.core.hasFocus()||E.browser.msie||E.browser.webkit||E.$el.focus(),S();var n=L();for(e=0;e<t.length;e++){var r=y(t[e]).data("id"),o=t[e],i=E.doc.createRange(),a=E.$el.find('.fr-marker[data-type="false"][data-id="'.concat(r,'"]'));(E.browser.msie||E.browser.edge)&&a.css("display","inline-block");var s=null;if(0<a.length){a=a[0];try{for(var l=!1,c=o.nextSibling,d=null;c&&c.nodeType===Node.TEXT_NODE&&0===c.textContent.length;)c=(d=c).nextSibling,y(d).remove();for(var f=a.nextSibling;f&&f.nodeType===Node.TEXT_NODE&&0===f.textContent.length;)f=(d=f).nextSibling,y(d).remove();if(o.nextSibling===a||a.nextSibling===o){for(var p=o.nextSibling===a?o:a,h=p===o?a:o,u=p.previousSibling;u&&u.nodeType===Node.TEXT_NODE&&0===u.length;)u=(d=u).previousSibling,y(d).remove();if(u&&u.nodeType===Node.TEXT_NODE)for(;u&&u.previousSibling&&u.previousSibling.nodeType===Node.TEXT_NODE;)u.previousSibling.textContent+=u.textContent,u=u.previousSibling,y(u.nextSibling).remove();for(var C=h.nextSibling;C&&C.nodeType===Node.TEXT_NODE&&0===C.length;)C=(d=C).nextSibling,y(d).remove();if(C&&C.nodeType===Node.TEXT_NODE)for(;C&&C.nextSibling&&C.nextSibling.nodeType===Node.TEXT_NODE;)C.nextSibling.textContent=C.textContent+C.nextSibling.textContent,C=C.nextSibling,y(C.previousSibling).remove();if(u&&(E.node.isVoid(u)||E.node.isBlock(u))&&(u=null),C&&(E.node.isVoid(C)||E.node.isBlock(C))&&(C=null),u&&C&&u.nodeType===Node.TEXT_NODE&&C.nodeType===Node.TEXT_NODE){y(o).remove(),y(a).remove();var g=u.textContent.length;u.textContent+=C.textContent,y(C).remove(),E.spaces.normalize(u),i.setStart(u,g),i.setEnd(u,g),l=!0}else!u&&C&&C.nodeType===Node.TEXT_NODE?(y(o).remove(),y(a).remove(),E.opts.htmlUntouched||E.spaces.normalize(C),s=y(E.doc.createTextNode("\u200b")).get(0),y(C).before(s),i.setStart(C,0),i.setEnd(C,0),l=!0):!C&&u&&u.nodeType===Node.TEXT_NODE&&(y(o).remove(),y(a).remove(),E.opts.htmlUntouched||E.spaces.normalize(u),s=y(E.doc.createTextNode("\u200b")).get(0),y(u).after(s),i.setStart(u,u.textContent.length),i.setEnd(u,u.textContent.length),l=!0)}if(!l){var m=void 0,v=void 0;v=(E.browser.chrome||E.browser.edge)&&o.nextSibling===a?(m=N(a,i,!0)||i.setStartAfter(a),N(o,i,!1)||i.setEndBefore(o)):(o.previousSibling===a&&(a=(o=a).nextSibling),a.nextSibling&&"BR"===a.nextSibling.tagName||!a.nextSibling&&E.node.isBlock(o.previousSibling)||o.previousSibling&&"BR"===o.previousSibling.tagName||(o.style.display="inline",a.style.display="inline",s=y(E.doc.createTextNode("\u200b")).get(0)),m=N(o,i,!0)||y(o).before(s)&&i.setStartBefore(o),N(a,i,!1)||y(a).after(s)&&i.setEndAfter(a)),"function"==typeof m&&m(),"function"==typeof v&&v()}}catch(b){}}s&&y(s).remove();try{n.addRange(i)}catch(b){}}E.markers.remove()}function N(e,t,n){var r,o=e.previousSibling,i=e.nextSibling;return o&&i&&o.nodeType===Node.TEXT_NODE&&i.nodeType===Node.TEXT_NODE?(r=o.textContent.length,n?(i.textContent=o.textContent+i.textContent,y(o).remove(),y(e).remove(),E.opts.htmlUntouched||E.spaces.normalize(i),function(){t.setStart(i,r)}):(o.textContent+=i.textContent,y(i).remove(),y(e).remove(),E.opts.htmlUntouched||E.spaces.normalize(o),function(){t.setEnd(o,r)})):o&&!i&&o.nodeType===Node.TEXT_NODE?(r=o.textContent.length,n?(E.opts.htmlUntouched||E.spaces.normalize(o),function(){t.setStart(o,r)}):(E.opts.htmlUntouched||E.spaces.normalize(o),function(){t.setEnd(o,r)})):!(!i||o||i.nodeType!==Node.TEXT_NODE)&&(n?(E.opts.htmlUntouched||E.spaces.normalize(i),function(){t.setStart(i,0)}):(E.opts.htmlUntouched||E.spaces.normalize(i),function(){t.setEnd(i,0)}))}function A(){for(var e=f(),t=0;t<e.length;t++)if(!e[t].collapsed)return!1;return!0}function o(e){var t,n,r=!1,o=!1;if(E.win.getSelection){var i=E.win.getSelection();i.rangeCount&&((n=(t=i.getRangeAt(0)).cloneRange()).selectNodeContents(e),n.setEnd(t.startContainer,t.startOffset),r=a(n),n.selectNodeContents(e),n.setStart(t.endContainer,t.endOffset),o=a(n))}else E.doc.selection&&"Control"!==E.doc.selection.type&&((n=(t=E.doc.selection.createRange()).duplicate()).moveToElementText(e),n.setEndPoint("EndToStart",t),r=a(n),n.moveToElementText(e),n.setEndPoint("StartToEnd",t),o=a(n));return{atStart:r,atEnd:o}}function a(e){return""===e.toString().replace(/[\u200B-\u200D\uFEFF]/g,"")}function x(e,t){void 0===t&&(t=!0);var n=y(e).html();n&&n.replace(/\u200b/g,"").length!==n.length&&y(e).html(n.replace(/\u200b/g,""));for(var r=E.node.contents(e),o=0;o<r.length;o++)r[o].nodeType!==Node.ELEMENT_NODE?y(r[o]).remove():(x(r[o],0===o),0===o&&(t=!1));if(e.nodeType===Node.TEXT_NODE){var i=y(document.createElement("span")).attr("data-first","true").attr("data-text","true");y(e)[0].replaceWith(i[0])}else t&&y(e).attr("data-first",!0)}function O(){return 0===y(this).find("fr-inner").length}function h(){try{if(!E.$wp)return!1;for(var e=f(0).commonAncestorContainer;e&&!E.node.isElement(e);)e=e.parentNode;return!!E.node.isElement(e)}catch(t){return!1}}function r(e,t){if(!e||0<e.getElementsByClassName("fr-marker").length)return!1;for(var n=e.firstChild;n&&(E.node.isBlock(n)||t&&!E.node.isVoid(n)&&n.nodeType===Node.ELEMENT_NODE);)n=(e=n).firstChild;e.innerHTML=V.MARKERS+e.innerHTML}function i(e,t){if(!e||0<e.getElementsByClassName("fr-marker").length)return!1;for(var n=e.lastChild;n&&(E.node.isBlock(n)||t&&!E.node.isVoid(n)&&n.nodeType===Node.ELEMENT_NODE);)n=(e=n).lastChild;var r=E.doc.createElement("SPAN");for(r.setAttribute("id","fr-sel-markers"),r.innerHTML=V.MARKERS;e.parentNode&&E.opts.htmlAllowedEmptyTags&&0<=E.opts.htmlAllowedEmptyTags.indexOf(e.tagName.toLowerCase());)e=e.parentNode;e.appendChild(r);var o=e.querySelector("#fr-sel-markers");o.outerHTML=o.innerHTML}return{text:s,get:L,ranges:f,clear:S,element:function l(){var e=L();try{if(e.rangeCount){var t,n=f(0),r=n.startContainer;if(E.node.isElement(r)&&0===n.startOffset&&r.childNodes.length)for(;r.childNodes.length&&r.childNodes[0].nodeType===Node.ELEMENT_NODE;)r=r.childNodes[0];if(r.nodeType===Node.TEXT_NODE&&n.startOffset===(r.textContent||"").length&&r.nextSibling&&(r=r.nextSibling),r.nodeType===Node.ELEMENT_NODE){var o=!1;if(0<r.childNodes.length&&r.childNodes[n.startOffset]){for(t=r.childNodes[n.startOffset];t&&t.nodeType===Node.TEXT_NODE&&0===t.textContent.length;)t=t.nextSibling;if(t&&t.textContent.replace(/\u200B/g,"")===s().replace(/\u200B/g,"")&&(r=t,o=!0),!o&&1<r.childNodes.length&&0<n.startOffset&&r.childNodes[n.startOffset-1]){for(t=r.childNodes[n.startOffset-1];t&&t.nodeType===Node.TEXT_NODE&&0===t.textContent.length;)t=t.nextSibling;t&&t.textContent.replace(/\u200B/g,"")===s().replace(/\u200B/g,"")&&(r=t,o=!0)}}else!n.collapsed&&r.nextSibling&&r.nextSibling.nodeType===Node.ELEMENT_NODE&&(t=r.nextSibling)&&t.textContent.replace(/\u200B/g,"")===s().replace(/\u200B/g,"")&&(r=t,o=!0);!o&&0<r.childNodes.length&&y(r.childNodes[0]).text().replace(/\u200B/g,"")===s().replace(/\u200B/g,"")&&["BR","IMG","HR"].indexOf(r.childNodes[0].tagName)<0&&(r=r.childNodes[0])}for(;r.nodeType!==Node.ELEMENT_NODE&&r.parentNode;)r=r.parentNode;for(var i=r;i&&"HTML"!==i.tagName;){if(i===E.el)return r;i=y(i).parent()[0]}}}catch(a){}return E.el},endElement:function c(){var e=L();try{if(e.rangeCount){var t,n=f(0),r=n.endContainer;if(r.nodeType===Node.ELEMENT_NODE){var o=!1;0<r.childNodes.length&&r.childNodes[n.endOffset]&&y(r.childNodes[n.endOffset]).text()===s()?(r=r.childNodes[n.endOffset],o=!0):!n.collapsed&&r.previousSibling&&r.previousSibling.nodeType===Node.ELEMENT_NODE?(t=r.previousSibling)&&t.textContent.replace(/\u200B/g,"")===s().replace(/\u200B/g,"")&&(r=t,o=!0):!n.collapsed&&0<r.childNodes.length&&r.childNodes[n.endOffset]&&(t=r.childNodes[n.endOffset].previousSibling).nodeType===Node.ELEMENT_NODE&&t&&t.textContent.replace(/\u200B/g,"")===s().replace(/\u200B/g,"")&&(r=t,o=!0),!o&&0<r.childNodes.length&&y(r.childNodes[r.childNodes.length-1]).text()===s()&&["BR","IMG","HR"].indexOf(r.childNodes[r.childNodes.length-1].tagName)<0&&(r=r.childNodes[r.childNodes.length-1])}for(r.nodeType===Node.TEXT_NODE&&0===n.endOffset&&r.previousSibling&&r.previousSibling.nodeType===Node.ELEMENT_NODE&&(r=r.previousSibling);r.nodeType!==Node.ELEMENT_NODE&&r.parentNode;)r=r.parentNode;for(var i=r;i&&"HTML"!==i.tagName;){if(i===E.el)return r;i=y(i).parent()[0]}}}catch(a){}return E.el},save:M,restore:T,isCollapsed:A,isFull:function d(){if(A())return!1;E.selection.save();var e,t=E.el.querySelectorAll("td, th, img, br");for(e=0;e<t.length;e++)(t[e].nextSibling||"IMG"===t[e].tagName)&&(t[e].innerHTML='<span class="fr-mk" style="display: none;">&nbsp;</span>'.concat(t[e].innerHTML));var n=!1,r=o(E.el);for(r.atStart&&r.atEnd&&(n=!0),t=E.el.querySelectorAll(".fr-mk"),e=0;e<t.length;e++)t[e].parentNode.removeChild(t[e]);return E.selection.restore(),n},inEditor:h,remove:function w(){if(A())return!0;var e;function t(e){for(var t=e.previousSibling;t&&t.nodeType===Node.TEXT_NODE&&0===t.textContent.length;){var n=t;t=t.previousSibling,y(n).remove()}return t}function n(e){for(var t=e.nextSibling;t&&t.nodeType===Node.TEXT_NODE&&0===t.textContent.length;){var n=t;t=t.nextSibling,y(n).remove()}return t}M();var r=E.$el.find('.fr-marker[data-type="true"]');for(e=0;e<r.length;e++)for(var o=r[e];!(t(o)||E.node.isBlock(o.parentNode)||E.$el.is(o.parentNode)||E.node.hasClass(o.parentNode,"fr-inner"));)y(o.parentNode).before(o);var i=E.$el.find('.fr-marker[data-type="false"]');for(e=0;e<i.length;e++){for(var a=i[e];!(n(a)||E.node.isBlock(a.parentNode)||E.$el.is(a.parentNode)||E.node.hasClass(a.parentNode,"fr-inner"));)y(a.parentNode).after(a);a.parentNode&&E.node.isBlock(a.parentNode)&&E.node.isEmpty(a.parentNode)&&!E.$el.is(a.parentNode)&&!E.node.hasClass(a.parentNode,"fr-inner")&&E.opts.keepFormatOnDelete&&y(a.parentNode).after(a)}if(function b(){for(var e=E.$el.find(".fr-marker"),t=0;t<e.length;t++)if(y(e[t]).parentsUntil('.fr-element, [contenteditable="true"]','[contenteditable="false"]').length)return!1;return!0}()){!function L(e,t){var n=E.node.contents(e.get(0));0<=["TD","TH"].indexOf(e.get(0).tagName)&&1===e.find(".fr-marker").length&&(E.node.hasClass(n[0],"fr-marker")||"BR"==n[0].tagName&&E.node.hasClass(n[0].nextElementSibling,"fr-marker"))&&e.attr("data-del-cell",!0);for(var r=0;r<n.length;r++){var o=n[r];E.node.hasClass(o,"fr-marker")?t=(t+1)%2:t?0<y(o).find(".fr-marker").length?t=L(y(o),t):["TD","TH"].indexOf(o.tagName)<0&&!E.node.hasClass(o,"fr-inner")?!E.opts.keepFormatOnDelete||0<E.$el.find("[data-first]").length||E.node.isVoid(o)?y(o).remove():x(o):E.node.hasClass(o,"fr-inner")?0===y(o).find(".fr-inner").length?y(o).html("<br>"):y(o).find(".fr-inner").filter(O).html("<br>"):(y(o).empty(),y(o).attr("data-del-cell",!0)):0<y(o).find(".fr-marker").length&&(t=L(y(o),t))}return t}(E.$el,0);var s=E.$el.find('[data-first="true"]');if(s.length)E.$el.find(".fr-marker").remove(),s.append(V.INVISIBLE_SPACE+V.MARKERS).removeAttr("data-first"),s.attr("data-text")&&s.replaceWith(s.html());else for(E.$el.find("table").filter(function(){return 0<y(this).find("[data-del-cell]").length&&y(this).find("[data-del-cell]").length===y(this).find("td, th").length}).remove(),E.$el.find("[data-del-cell]").removeAttr("data-del-cell"),r=E.$el.find('.fr-marker[data-type="true"]'),e=0;e<r.length;e++){var l=r[e],c=l.nextSibling,d=E.$el.find('.fr-marker[data-type="false"][data-id="'.concat(y(l).data("id"),'"]')).get(0);if(d){if(l&&(!c||c!==d)){var f=E.node.blockParent(l),p=E.node.blockParent(d),h=!1,u=!1;if(f&&0<=["UL","OL"].indexOf(f.tagName)&&(h=!(f=null)),p&&0<=["UL","OL"].indexOf(p.tagName)&&(u=!(p=null)),y(l).after(d),f!==p)if(null!==f||h)if(null!==p||u||0!==y(f).parentsUntil(E.$el,"table").length)f&&p&&0===y(f).parentsUntil(E.$el,"table").length&&0===y(p).parentsUntil(E.$el,"table").length&&!y(f).contains(p)&&!y(p).contains(f)&&(y(f).append(y(p).html()),y(p).remove());else{for(c=f;!c.nextSibling&&c.parentNode!==E.el;)c=c.parentNode;for(c=c.nextSibling;c&&"BR"!==c.tagName;){var C=c.nextSibling;y(f).append(c),c=C}c&&"BR"===c.tagName&&y(c).remove()}else{var g=E.node.deepestParent(l);g?(y(g).after(y(p).html()),y(p).remove()):0===y(p).parentsUntil(E.$el,"table").length&&(y(l).next().after(y(p).html()),y(p).remove())}}}else d=y(l).clone().attr("data-type",!1),y(l).after(d)}}E.$el.find("li:empty").remove(),E.opts.keepFormatOnDelete||E.html.fillEmptyBlocks(),E.html.cleanEmptyTags(!0),E.opts.htmlUntouched||(E.clean.lists(),E.$el.find("li:empty").append("<br>"),E.spaces.normalize());var m=E.$el.find(".fr-marker").last().get(0),v=E.$el.find(".fr-marker").first().get(0);void 0!==m&&void 0!==v&&!m.nextSibling&&v.previousSibling&&"BR"===v.previousSibling.tagName&&E.node.isElement(m.parentNode)&&E.node.isElement(v.parentNode)&&E.$el.append("<br>"),T()},blocks:function u(e){var t,n,r=[],o=L();if(h()&&o.rangeCount){var i=f();for(t=0;t<i.length;t++){var a=i[t],s=p(a.startContainer,a.startOffset),l=p(a.endContainer,a.endOffset);(E.node.isBlock(s)||E.node.hasClass(s,"fr-inner"))&&r.indexOf(s)<0&&r.push(s),(n=E.node.blockParent(s))&&r.indexOf(n)<0&&r.push(n);for(var c=[],d=s;d!==l&&d!==E.el;)c.indexOf(d)<0&&d.children&&d.children.length?(c.push(d),d=d.children[0]):d.nextSibling?d=d.nextSibling:d.parentNode&&(d=d.parentNode,c.push(d)),E.node.isBlock(d)&&c.indexOf(d)<0&&r.indexOf(d)<0&&(d!==l||0<a.endOffset)&&r.push(d);E.node.isBlock(l)&&r.indexOf(l)<0&&0<a.endOffset&&r.push(l),(n=E.node.blockParent(l))&&r.indexOf(n)<0&&r.push(n)}}for(t=r.length-1;0<t;t--)if(y(r[t]).find(r).length){if(e&&y(r[t]).find("ul, ol").length)continue;r.splice(t,1)}return r},info:o,setAtEnd:i,setAtStart:r,setBefore:function C(e,t){void 0===t&&(t=!0);for(var n=e.previousSibling;n&&n.nodeType===Node.TEXT_NODE&&0===n.textContent.length;)n=n.previousSibling;return n?(E.node.isBlock(n)?i(n):"BR"===n.tagName?y(n).before(V.MARKERS):y(n).after(V.MARKERS),!0):!!t&&(E.node.isBlock(e)?r(e):y(e).before(V.MARKERS),!0)},setAfter:function g(e,t){void 0===t&&(t=!0);for(var n=e.nextSibling;n&&n.nodeType===Node.TEXT_NODE&&0===n.textContent.length;)n=n.nextSibling;return n?(E.node.isBlock(n)?r(n):y(n).before(V.MARKERS),!0):!!t&&(E.node.isBlock(e)?i(e):y(e).after(V.MARKERS),!0)},rangeElement:p}},Object.assign(V.DEFAULTS,{language:null}),V.LANGUAGE={},V.MODULES.language=function(e){var t;return{_init:function n(){V.LANGUAGE&&(t=V.LANGUAGE[e.opts.language]),t&&t.direction&&(e.opts.direction=t.direction)},translate:function r(e){return t&&t.translation[e]&&t.translation[e].length?t.translation[e]:e}}},Object.assign(V.DEFAULTS,{placeholderText:"Type something"}),V.MODULES.placeholder=function(f){var p=f.$;function e(){f.$placeholder||function d(){f.$placeholder=p(f.doc.createElement("SPAN")).addClass("fr-placeholder"),f.$wp.append(f.$placeholder)}();var e=f.opts.iframe?f.$iframe.prev().outerHeight(!0):f.$el.prev().outerHeight(!0),t=0,n=0,r=0,o=0,i=0,a=0,s=f.node.contents(f.el),l=p(f.selection.element()).css("text-align");if(s.length&&s[0].nodeType===Node.ELEMENT_NODE){var c=p(s[0]);(0<f.$wp.prev().length||0<f.$el.prev().length)&&f.ready&&(t=f.helpers.getPX(c.css("margin-top")),o=f.helpers.getPX(c.css("padding-top")),n=f.helpers.getPX(c.css("margin-left")),r=f.helpers.getPX(c.css("margin-right")),i=f.helpers.getPX(c.css("padding-left")),a=f.helpers.getPX(c.css("padding-right"))),f.$placeholder.css("font-size",c.css("font-size")),f.$placeholder.css("line-height",c.css("line-height"))}else f.$placeholder.css("font-size",f.$el.css("font-size")),f.$placeholder.css("line-height",f.$el.css("line-height"));f.$wp.addClass("show-placeholder"),f.$placeholder.css({marginTop:Math.max(f.helpers.getPX(f.$el.css("margin-top")),t)+(e||0),paddingTop:Math.max(f.helpers.getPX(f.$el.css("padding-top")),o),paddingLeft:Math.max(f.helpers.getPX(f.$el.css("padding-left")),i),marginLeft:Math.max(f.helpers.getPX(f.$el.css("margin-left")),n),paddingRight:Math.max(f.helpers.getPX(f.$el.css("padding-right")),a),marginRight:Math.max(f.helpers.getPX(f.$el.css("margin-right")),r),textAlign:l}).text(f.language.translate(f.opts.placeholderText||f.$oel.attr("placeholder")||"")),f.$placeholder.html(f.$placeholder.text().replace(/\n/g,"<br>"))}function t(){f.$wp.removeClass("show-placeholder")}function n(){if(!f.$wp)return!1;f.core.isEmpty()?e():t()}return{_init:function r(){if(!f.$wp)return!1;f.events.on("init input keydown keyup contentChanged initialized",n)},show:e,hide:t,refresh:n,isVisible:function o(){return!f.$wp||f.node.hasClass(f.$wp.get(0),"show-placeholder")}}},V.UNICODE_NBSP=String.fromCharCode(160),V.VOID_ELEMENTS=["area","base","br","col","embed","hr","img","input","keygen","link","menuitem","meta","param","source","track","wbr"],V.BLOCK_TAGS=["address","article","aside","audio","blockquote","canvas","details","dd","div","dl","dt","fieldset","figcaption","figure","footer","form","h1","h2","h3","h4","h5","h6","header","hgroup","hr","li","main","nav","noscript","ol","output","p","pre","section","table","tbody","td","tfoot","th","thead","tr","ul","video"],Object.assign(V.DEFAULTS,{htmlAllowedEmptyTags:["textarea","a","iframe","object","video","style","script",".fa",".fr-emoticon",".fr-inner","path","line","hr"],htmlDoNotWrapTags:["script","style"],htmlSimpleAmpersand:!1,htmlIgnoreCSSProperties:[],htmlExecuteScripts:!0}),V.MODULES.html=function(O){var u=O.$;function d(){return O.opts.enter===V.ENTER_P?"p":O.opts.enter===V.ENTER_DIV?"div":O.opts.enter===V.ENTER_BR?null:void 0}function s(e,t){return!(!e||e===O.el)&&(t?-1!=["PRE","SCRIPT","STYLE"].indexOf(e.tagName)||s(e.parentNode,t):-1!==["PRE","SCRIPT","STYLE"].indexOf(e.tagName))}function i(e){var t,n=[],r=[];if(e){var o=O.el.querySelectorAll(".fr-marker");for(t=0;t<o.length;t++){var i=O.node.blockParent(o[t])||o[t];if(i){var a=i.nextSibling,s=i.previousSibling;i&&r.indexOf(i)<0&&O.node.isBlock(i)&&r.push(i),s&&O.node.isBlock(s)&&r.indexOf(s)<0&&r.push(s),a&&O.node.isBlock(a)&&r.indexOf(a)<0&&r.push(a)}}}else r=O.el.querySelectorAll(p());var l=p();for(l+=",".concat(V.VOID_ELEMENTS.join(",")),l+=", .fr-inner",l+=",".concat(O.opts.htmlAllowedEmptyTags.join(":not(.fr-marker),"),":not(.fr-marker)"),t=r.length-1;0<=t;t--)if(!(r[t].textContent&&0<r[t].textContent.replace(/\u200B|\n/g,"").length||0<r[t].querySelectorAll(l).length)){for(var c=O.node.contents(r[t]),d=!1,f=0;f<c.length;f++)if(c[f].nodeType!==Node.COMMENT_NODE&&c[f].textContent&&0<c[f].textContent.replace(/\u200B|\n/g,"").length){d=!0;break}d||n.push(r[t])}return n}function p(){return V.BLOCK_TAGS.join(", ")}function e(e){var t,n,r=u.merge([],V.VOID_ELEMENTS);r=u.merge(r,O.opts.htmlAllowedEmptyTags),r=void 0===e?u.merge(r,V.BLOCK_TAGS):u.merge(r,V.NO_DELETE_TAGS),t=O.el.querySelectorAll("*:empty:not(".concat(r.join("):not("),"):not(.fr-marker):not(template)"));do{n=!1;for(var o=0;o<t.length;o++)0!==t[o].attributes.length&&void 0===t[o].getAttribute("href")||(t[o].parentNode.removeChild(t[o]),n=!0);t=O.el.querySelectorAll("*:empty:not(".concat(r.join("):not("),"):not(.fr-marker):not(template)"))}while(t.length&&n)}function a(e,t){var n=d();if(t&&(n="div"),n){for(var r=O.doc.createDocumentFragment(),o=null,i=!1,a=e.firstChild,s=!1;a;){var l=a.nextSibling;if(a.nodeType===Node.ELEMENT_NODE&&(O.node.isBlock(a)||0<=O.opts.htmlDoNotWrapTags.indexOf(a.tagName.toLowerCase())&&!O.node.hasClass(a,"fr-marker")))o=null,r.appendChild(a.cloneNode(!0));else if(a.nodeType!==Node.ELEMENT_NODE&&a.nodeType!==Node.TEXT_NODE)o=null,r.appendChild(a.cloneNode(!0));else if("BR"===a.tagName)null===o?(o=O.doc.createElement(n),s=!0,t&&(o.setAttribute("class","fr-temp-div"),o.setAttribute("data-empty",!0)),o.appendChild(a.cloneNode(!0)),r.appendChild(o)):!1===i&&(o.appendChild(O.doc.createElement("br")),t&&(o.setAttribute("class","fr-temp-div"),o.setAttribute("data-empty",!0))),o=null;else{var c=a.textContent;a.nodeType!==Node.TEXT_NODE||0<c.replace(/\n/g,"").replace(/(^ *)|( *$)/g,"").length||c.replace(/(^ *)|( *$)/g,"").length&&c.indexOf("\n")<0?(null===o&&(o=O.doc.createElement(n),s=!0,t&&o.setAttribute("class","fr-temp-div"),r.appendChild(o),i=!1),o.appendChild(a.cloneNode(!0)),i||O.node.hasClass(a,"fr-marker")||a.nodeType===Node.TEXT_NODE&&0===c.replace(/ /g,"").length||(i=!0)):s=!0}a=l}s&&(e.innerHTML="",e.appendChild(r))}}function l(e,t){for(var n=e.length-1;0<=n;n--)a(e[n],t)}function t(e,t,n,r,o){if(!O.$wp)return!1;void 0===e&&(e=!1),void 0===t&&(t=!1),void 0===n&&(n=!1),void 0===r&&(r=!1),void 0===o&&(o=!1);var i=O.$wp.scrollTop();a(O.el,e),r&&l(O.el.querySelectorAll(".fr-inner"),e),t&&l(O.el.querySelectorAll("td, th"),e),n&&l(O.el.querySelectorAll("blockquote"),e),o&&l(O.el.querySelectorAll("li"),e),i!==O.$wp.scrollTop()&&O.$wp.scrollTop(i)}function n(e){if(void 0===e&&(e=O.el),e&&0<=["SCRIPT","STYLE","PRE"].indexOf(e.tagName))return!1;for(var t=O.doc.createTreeWalker(e,NodeFilter.SHOW_TEXT,O.node.filter(function(e){return null!==e.textContent.match(/([ \n]{2,})|(^[ \n]{1,})|([ \n]{1,}$)/g)}),!1);t.nextNode();){var n=t.currentNode;if(!s(n.parentNode,!0)){var r=O.node.isBlock(n.parentNode)||O.node.isElement(n.parentNode),o=n.textContent.replace(/(?!^)( ){2,}(?!$)/g," ").replace(/\n/g," ").replace(/^[ ]{2,}/g," ").replace(/[ ]{2,}$/g," ");if(r){var i=n.previousSibling,a=n.nextSibling;i&&a&&" "===o?o=O.node.isBlock(i)&&O.node.isBlock(a)?"":" ":(i||(o=o.replace(/^ */,"")),a||(o=o.replace(/ *$/,"")))}n.textContent=o}}}function r(e,t,n){var r=new RegExp(t,"gi").exec(e);return r?r[n]:null}function w(e){var t=e.doctype,n="<!DOCTYPE html>";return t&&(n="<!DOCTYPE ".concat(t.name).concat(t.publicId?' PUBLIC "'.concat(t.publicId,'"'):"").concat(!t.publicId&&t.systemId?" SYSTEM":"").concat(t.systemId?' "'.concat(t.systemId,'"'):"",">")),n}function c(e){var t=e.parentNode;if(t&&(O.node.isBlock(t)||O.node.isElement(t))&&["TD","TH"].indexOf(t.tagName)<0){for(var n=e.previousSibling,r=e.nextSibling;n&&(n.nodeType===Node.TEXT_NODE&&0===n.textContent.replace(/\n|\r/g,"").length||O.node.hasClass(n,"fr-tmp"));)n=n.previousSibling;if(r)return!1;n&&t&&"BR"!==n.tagName&&!O.node.isBlock(n)&&!r&&0<t.textContent.replace(/\u200B/g,"").length&&0<n.textContent.length&&!O.node.hasClass(n,"fr-marker")&&(O.el===t&&!r&&O.opts.enter===V.ENTER_BR&&O.browser.msie||e.parentNode.removeChild(e))}else!t||O.node.isBlock(t)||O.node.isElement(t)||e.previousSibling||e.nextSibling||!O.node.isDeletable(e.parentNode)||c(e.parentNode)}function C(){O.opts.htmlUntouched||(e(),t(),n(),O.spaces.normalize(null,!0),O.html.fillEmptyBlocks(),O.clean.lists(),O.clean.tables(),O.clean.toHTML5(),O.html.cleanBRs()),O.selection.restore(),o(),O.placeholder.refresh()}function o(){O.node.isEmpty(O.el)&&(null!==d()?O.el.querySelector(p())||O.el.querySelector("".concat(O.opts.htmlDoNotWrapTags.join(":not(.fr-marker),"),":not(.fr-marker)"))||(O.core.hasFocus()?(O.$el.html("<".concat(d(),">").concat(V.MARKERS,"<br/></").concat(d(),">")),O.selection.restore()):O.$el.html("<".concat(d(),"><br/></").concat(d(),">"))):O.el.querySelector("*:not(.fr-marker):not(br)")||(O.core.hasFocus()?(O.$el.html("".concat(V.MARKERS,"<br/>")),O.selection.restore()):O.$el.html("<br/>")))}function g(e,t){return r(e,"<".concat(t,"[^>]*?>([\\w\\W]*)</").concat(t,">"),1)}function m(e,t){var n=u("<div ".concat(r(e,"<".concat(t,"([^>]*?)>"),1)||"",">"));return O.node.rawAttributes(n.get(0))}function v(e){return(r(e,"<!DOCTYPE([^>]*?)>",0)||"<!DOCTYPE html>").replace(/\n/g," ").replace(/ {2,}/g," ")}function b(e,t){O.opts.htmlExecuteScripts?e.html(t):e.get(0).innerHTML=t}function k(e){var t;(t=/:not\(([^)]*)\)/g).test(e)&&(e=e.replace(t,"     $1 "));var n=100*(e.match(/(#[^\s+>~.[:]+)/g)||[]).length+10*(e.match(/(\[[^]]+\])/g)||[]).length+10*(e.match(/(\.[^\s+>~.[:]+)/g)||[]).length+10*(e.match(/(:[\w-]+\([^)]*\))/gi)||[]).length+10*(e.match(/(:[^\s+>~.[:]+)/g)||[]).length+(e.match(/(::[^\s+>~.[:]+|:first-line|:first-letter|:before|:after)/gi)||[]).length;return n+=((e=(e=e.replace(/[*\s+>~]/g," ")).replace(/[#.]/g," ")).match(/([^\s+>~.[:]+)/g)||[]).length}function $(e){if(O.events.trigger("html.processGet",[e]),e&&e.getAttribute&&""===e.getAttribute("class")&&e.removeAttribute("class"),e&&e.getAttribute&&""===e.getAttribute("style")&&e.removeAttribute("style"),e&&e.nodeType===Node.ELEMENT_NODE){var t,n=e.querySelectorAll('[class=""],[style=""]');for(t=0;t<n.length;t++){var r=n[t];""===r.getAttribute("class")&&r.removeAttribute("class"),""===r.getAttribute("style")&&r.removeAttribute("style")}if("BR"===e.tagName)c(e);else{var o=e.querySelectorAll("br");for(t=0;t<o.length;t++)c(o[t])}}}function H(e,t){return e[3]-t[3]}function D(){for(var e=O.el.querySelectorAll("input, textarea"),t=0;t<e.length;t++)"checkbox"!==e[t].type&&"radio"!==e[t].type||(e[t].checked?e[t].setAttribute("checked",e[t].checked):O.$(e[t]).removeAttr("checked")),e[t].getAttribute("value")&&e[t].setAttribute("value",e[t].value)}function f(e){var t=O.doc.createElement("div");return t.innerHTML=e,null!==t.querySelector(p())}function h(e){var t=null;if(void 0===e&&(t=O.selection.element()),O.opts.keepFormatOnDelete)return!1;var n,r,o=t?(t.textContent.match(/\u200B/g)||[]).length-t.querySelectorAll(".fr-marker").length:0;if((O.el.textContent.match(/\u200B/g)||[]).length-O.el.querySelectorAll(".fr-marker").length===o)return!1;do{r=!1,n=O.el.querySelectorAll("*:not(.fr-marker)");for(var i=0;i<n.length;i++){var a=n[i];if(t!==a){var s=a.textContent;0===a.children.length&&1===s.length&&8203===s.charCodeAt(0)&&"TD"!==a.tagName&&(u(a).remove(),r=!0)}}}while(r)}function L(){h(),O.placeholder&&setTimeout(O.placeholder.refresh,0)}return{defaultTag:d,isPreformatted:s,emptyBlocks:i,emptyBlockTagsQuery:function E(){return"".concat(V.BLOCK_TAGS.join(":empty, "),":empty")},blockTagsQuery:p,fillEmptyBlocks:function y(e){var t=i(e);O.node.isEmpty(O.el)&&O.opts.enter===V.ENTER_BR&&t.push(O.el);for(var n=0;n<t.length;n++){var r=t[n];"false"===r.getAttribute("contenteditable")||r.querySelector("".concat(O.opts.htmlAllowedEmptyTags.join(":not(.fr-marker),"),":not(.fr-marker)"))||O.node.isVoid(r)||"TABLE"!==r.tagName&&"TBODY"!==r.tagName&&"TR"!==r.tagName&&"UL"!==r.tagName&&"OL"!==r.tagName&&r.appendChild(O.doc.createElement("br"))}if(O.browser.msie&&O.opts.enter===V.ENTER_BR){var o=O.node.contents(O.el);o.length&&o[o.length-1].nodeType===Node.TEXT_NODE&&O.$el.append("<br>")}},cleanEmptyTags:e,cleanWhiteTags:h,cleanBlankSpaces:n,blocks:function S(){return O.$el.get(0).querySelectorAll(p())},getDoctype:w,set:function M(e){var t=O.clean.html((e||"").trim(),[],[],O.opts.fullPage),n=new RegExp("%3A//","g"),r=t.replace(n,"://");if(O.opts.fullPage){var o=g(r,"body")||(0<=r.indexOf("<body")?"":r),i=m(r,"body"),a=g(r,"head")||"<title></title>",s=m(r,"head"),l=u("<div>");l.append(a).contents().each(function(){(this.nodeType===Node.COMMENT_NODE||0<=["BASE","LINK","META","NOSCRIPT","SCRIPT","STYLE","TEMPLATE","TITLE"].indexOf(this.tagName))&&this.parentNode.removeChild(this)});var c=l.html().trim();a=u("<div>").append(a).contents().map(function(){return this.nodeType===Node.COMMENT_NODE?"\x3c!--".concat(this.nodeValue,"--\x3e"):0<=["BASE","LINK","META","NOSCRIPT","SCRIPT","STYLE","TEMPLATE","TITLE"].indexOf(this.tagName)?this.outerHTML:""}).toArray().join("");var d=v(r),f=m(r,"html");b(O.$el,"".concat(c,"\n").concat(o)),O.node.clearAttributes(O.el),O.$el.attr(i),O.$el.addClass("fr-view"),O.$el.attr("spellcheck",O.opts.spellcheck),O.$el.attr("dir",O.opts.direction),b(O.$head,a),O.node.clearAttributes(O.$head.get(0)),O.$head.attr(s),O.node.clearAttributes(O.$html.get(0)),O.$html.attr(f),O.iframe_document.doctype.parentNode.replaceChild(function h(e,t){var n=e.match(/<!DOCTYPE ?([^ ]*) ?([^ ]*) ?"?([^"]*)"? ?"?([^"]*)"?>/i);return n?t.implementation.createDocumentType(n[1],n[3],n[4]):t.implementation.createDocumentType("html")}(d,O.iframe_document),O.iframe_document.doctype)}else b(O.$el,r);var p=O.edit.isDisabled();O.edit.on(),O.core.injectStyle(O.opts.iframeDefaultStyle+O.opts.iframeStyle),C(),O.opts.useClasses||(O.$el.find("[fr-original-class]").each(function(){this.setAttribute("class",this.getAttribute("fr-original-class")),this.removeAttribute("fr-original-class")}),O.$el.find("[fr-original-style]").each(function(){this.setAttribute("style",this.getAttribute("fr-original-style")),this.removeAttribute("fr-original-style")})),p&&O.edit.off(),O.events.trigger("html.set"),O.events.trigger("charCounter.update")},syncInputs:D,get:function _(e,t){if(!O.$wp)return O.$oel.clone().removeClass("fr-view").removeAttr("contenteditable").get(0).outerHTML;var n="";O.events.trigger("html.beforeGet");var r,o,i=[],a={},s=[];if(D(),!O.opts.useClasses&&!t){var l=new RegExp("^".concat(O.opts.htmlIgnoreCSSProperties.join("$|^"),"$"),"gi");for(r=0;r<O.doc.styleSheets.length;r++){var c=void 0,d=0;try{c=O.doc.styleSheets[r].cssRules,O.doc.styleSheets[r].ownerNode&&"STYLE"===O.doc.styleSheets[r].ownerNode.nodeType&&(d=1)}catch(x){}if(c)for(var f=0,p=c.length;f<p;f++)if(c[f].selectorText&&0<c[f].style.cssText.length){var h=c[f].selectorText.replace(/body |\.fr-view /g,"").replace(/::/g,":"),u=void 0;try{u=O.el.querySelectorAll(h)}catch(x){u=[]}for(o=0;o<u.length;o++){!u[o].getAttribute("fr-original-style")&&u[o].getAttribute("style")?(u[o].setAttribute("fr-original-style",u[o].getAttribute("style")),i.push(u[o])):u[o].getAttribute("fr-original-style")||(u[o].setAttribute("fr-original-style",""),i.push(u[o])),a[u[o]]||(a[u[o]]={});for(var C=1e3*d+k(c[f].selectorText),g=c[f].style.cssText.split(";"),m=0;m<g.length;m++){var v=g[m].trim().split(":")[0];if(v&&!v.match(l)&&(a[u[o]][v]||(a[u[o]][v]=0)<=(u[o].getAttribute("fr-original-style")||"").indexOf("".concat(v,":"))&&(a[u[o]][v]=1e4),C>=a[u[o]][v]&&(a[u[o]][v]=C,g[m].trim().length))){var b=g[m].trim().split(":");b.splice(0,1),s.push([u[o],v.trim(),b.join(":").trim(),C])}}}}}for(s.sort(H),r=0;r<s.length;r++){var L=s[r];L[0].style[L[1]]=L[2]}for(r=0;r<i.length;r++)if(i[r].getAttribute("class")&&(i[r].setAttribute("fr-original-class",i[r].getAttribute("class")),i[r].removeAttribute("class")),0<(i[r].getAttribute("fr-original-style")||"").trim().length){var E=i[r].getAttribute("fr-original-style").split(";");for(o=0;o<E.length;o++)if(0<E[o].indexOf(":")){var y=E[o].split(":"),S=y[0];y.splice(0,1),i[r].style[S.trim()]=y.join(":").trim()}}}if(O.node.isEmpty(O.el))O.opts.fullPage&&(n=w(O.iframe_document),n+="<html".concat(O.node.attributes(O.$html.get(0)),">").concat(O.$html.find("head").get(0).outerHTML,"<body></body></html>"));else if(void 0===e&&(e=!1),O.opts.fullPage){n=w(O.iframe_document),O.$el.removeClass("fr-view");var M=O.opts.heightMin,T=O.opts.height,N=O.opts.heightMax;O.opts.heightMin=null,O.opts.height=null,O.opts.heightMax=null,O.size.refresh(),n+="<html".concat(O.node.attributes(O.$html.get(0)),">").concat(O.$html.html(),"</html>"),O.opts.heightMin=M,O.opts.height=T,O.opts.heightMax=N,O.size.refresh(),O.$el.addClass("fr-view")}else n=O.$el.html();if(!O.opts.useClasses&&!t)for(r=0;r<i.length;r++)i[r].getAttribute("fr-original-class")&&(i[r].setAttribute("class",i[r].getAttribute("fr-original-class")),i[r].removeAttribute("fr-original-class")),null!==i[r].getAttribute("fr-original-style")&&void 0!==i[r].getAttribute("fr-original-style")?(0!==i[r].getAttribute("fr-original-style").length?i[r].setAttribute("style",i[r].getAttribute("fr-original-style")):i[r].removeAttribute("style"),i[r].removeAttribute("fr-original-style")):i[r].removeAttribute("style");O.opts.fullPage&&(n=(n=(n=(n=(n=(n=(n=(n=n.replace(/<style data-fr-style="true">(?:[\w\W]*?)<\/style>/g,"")).replace(/<link([^>]*)data-fr-style="true"([^>]*)>/g,"")).replace(/<style(?:[\w\W]*?)class="firebugResetStyles"(?:[\w\W]*?)>(?:[\w\W]*?)<\/style>/g,"")).replace(/<body((?:[\w\W]*?)) spellcheck="true"((?:[\w\W]*?))>((?:[\w\W]*?))<\/body>/g,"<body$1$2>$3</body>")).replace(/<body((?:[\w\W]*?)) contenteditable="(true|false)"((?:[\w\W]*?))>((?:[\w\W]*?))<\/body>/g,"<body$1$3>$4</body>")).replace(/<body((?:[\w\W]*?)) dir="([\w]*)"((?:[\w\W]*?))>((?:[\w\W]*?))<\/body>/g,"<body$1$3>$4</body>")).replace(/<body((?:[\w\W]*?))class="([\w\W]*?)(fr-rtl|fr-ltr)([\w\W]*?)"((?:[\w\W]*?))>((?:[\w\W]*?))<\/body>/g,'<body$1class="$2$4"$5>$6</body>')).replace(/<body((?:[\w\W]*?)) class=""((?:[\w\W]*?))>((?:[\w\W]*?))<\/body>/g,"<body$1$2>$3</body>")),O.opts.htmlSimpleAmpersand&&(n=n.replace(/&amp;/gi,"&")),O.events.trigger("html.afterGet"),e||(n=n.replace(/<span[^>]*? class\s*=\s*["']?fr-marker["']?[^>]+>\u200b<\/span>/gi,"")),n=O.clean.invisibleSpaces(n),n=O.clean.exec(n,$);var A=O.events.chainTrigger("html.get",n);return"string"==typeof A&&(n=A),n=(n=n.replace(/<pre(?:[\w\W]*?)>(?:[\w\W]*?)<\/pre>/g,function(e){return e.replace(/<br>/g,"\n")})).replace(/<meta((?:[\w\W]*?)) data-fr-http-equiv="/g,'<meta$1 http-equiv="')},getSelected:function T(){function e(e,t){for(;t&&(t.nodeType===Node.TEXT_NODE||!O.node.isBlock(t))&&!O.node.isElement(t)&&!O.node.hasClass(t,"fr-inner");)t&&t.nodeType!==Node.TEXT_NODE&&u(e).wrapInner(O.node.openTagString(t)+O.node.closeTagString(t)),t=t.parentNode;t&&e.innerHTML===t.innerHTML?e.innerHTML=t.outerHTML:-1!=t.innerText.indexOf(e.innerHTML)&&(e.innerHTML=O.node.openTagString(t)+t.innerHTML+O.node.closeTagString(t))}var t,n,r="";if("undefined"!=typeof O.win.getSelection){O.browser.mozilla&&(O.selection.save(),1<O.$el.find('.fr-marker[data-type="false"]').length&&(O.$el.find('.fr-marker[data-type="false"][data-id="0"]').remove(),O.$el.find('.fr-marker[data-type="false"]:last').attr("data-id","0"),O.$el.find(".fr-marker").not('[data-id="0"]').remove()),O.selection.restore());for(var o=O.selection.ranges(),i=0;i<o.length;i++){var a=document.createElement("div");a.appendChild(o[i].cloneContents()),e(a,(n=t=void 0,n=null,O.win.getSelection?(t=O.win.getSelection())&&t.rangeCount&&(n=t.getRangeAt(0).commonAncestorContainer).nodeType!==Node.ELEMENT_NODE&&(n=n.parentNode):(t=O.doc.selection)&&"Control"!==t.type&&(n=t.createRange().parentElement()),null!==n&&(0<=u(n).parents().toArray().indexOf(O.el)||n===O.el)?n:null)),0<u(a).find(".fr-element").length&&(a=O.el),r+=a.innerHTML}}else"undefined"!=typeof O.doc.selection&&"Text"===O.doc.selection.type&&(r=O.doc.selection.createRange().htmlText);return r},insert:function N(e,t,n){var r;if(O.selection.isCollapsed()||O.selection.remove(),r=t?e:O.clean.html(e),0===e.indexOf('<i class="fa ')&&(r="<span>&nbsp;".concat(r,"</span>")),e.indexOf('class="fr-marker"')<0&&(r=function a(e){var t=O.doc.createElement("div");return t.innerHTML=e,O.selection.setAtEnd(t,!0),t.innerHTML}(r)),O.node.isEmpty(O.el)&&!O.opts.keepFormatOnDelete&&f(r))O.opts.trackChangesEnabled?O.track_changes.pasteInEmptyEdior(r):O.el.innerHTML=r;else{(function s(){var e=O.selection.ranges(0).commonAncestorContainer;return e!==O.el&&!O.$el.contains(e)})()&&O.selection.restore();var o=O.markers.insert();if(o)if(O.opts.trackChangesEnabled)O.track_changes.pasteInEdior(r);else{O.node.isLastSibling(o)&&u(o).parent().hasClass("fr-deletable")&&u(o).insertAfter(u(o).parent());var i=O.node.blockParent(o);if((f(r)||n)&&(O.node.deepestParent(o)||i&&"LI"===i.tagName)){if(i&&"LI"===i.tagName&&(r=function l(e){if(!O.html.defaultTag())return e;var t=O.doc.createElement("div");t.innerHTML=e;for(var n=t.querySelectorAll(":scope > ".concat(O.html.defaultTag())),r=n.length-1;0<=r;r--){var o=n[r];O.node.isBlock(o.previousSibling)||(o.previousSibling&&!O.node.isEmpty(o)&&u("<br>").insertAfter(o.previousSibling),o.outerHTML=o.innerHTML)}return t.innerHTML}(r)),!(o=O.markers.split()))return!1;o.outerHTML=r}else o.outerHTML=r}else O.el.innerHTML+=r}C(),O.keys.positionCaret(),O.events.trigger("html.inserted")},wrap:t,unwrap:function A(){O.$el.find("div.fr-temp-div").each(function(){this.previousSibling&&this.previousSibling.nodeType===Node.TEXT_NODE&&u(this).before("<br>"),u(this).attr("data-empty")||!this.nextSibling||O.node.isBlock(this.nextSibling)&&!u(this.nextSibling).hasClass("fr-temp-div")?u(this).replaceWith(u(this).html()):u(this).replaceWith("".concat(u(this).html(),"<br>"))}),O.$el.find(".fr-temp-div").removeClass("fr-temp-div").filter(function(){return""===u(this).attr("class")}).removeAttr("class")},escapeEntities:function x(e){return e.replace(/</gi,"&lt;").replace(/>/gi,"&gt;").replace(/"/gi,"&quot;").replace(/'/gi,"&#39;")},checkIfEmpty:o,extractNode:g,extractNodeAttrs:m,extractDoctype:v,cleanBRs:function B(){for(var e=O.el.getElementsByTagName("br"),t=0;t<e.length;t++)c(e[t])},_init:function R(){O.events.$on(O.$el,"mousemove","span.fr-word-select",function(e){var t=window.getSelection();t=window.getSelection();var n=document.createRange();n.selectNodeContents(e.target),t.removeAllRanges(),t.addRange(n)}),O.$wp&&(O.events.on("mouseup",L),O.events.on("keydown",L),O.events.on("contentChanged",o))},_setHtml:b}},V.ENTER_P=0,V.ENTER_DIV=1,V.ENTER_BR=2,V.KEYCODE={BACKSPACE:8,TAB:9,ENTER:13,SHIFT:16,CTRL:17,ALT:18,ESC:27,SPACE:32,ARROW_LEFT:37,ARROW_UP:38,ARROW_RIGHT:39,ARROW_DOWN:40,DELETE:46,ZERO:48,ONE:49,TWO:50,THREE:51,FOUR:52,FIVE:53,SIX:54,SEVEN:55,EIGHT:56,NINE:57,FF_SEMICOLON:59,FF_EQUALS:61,QUESTION_MARK:63,A:65,B:66,C:67,D:68,E:69,F:70,G:71,H:72,I:73,J:74,K:75,L:76,M:77,N:78,O:79,P:80,Q:81,R:82,S:83,T:84,U:85,V:86,W:87,X:88,Y:89,Z:90,META:91,NUM_ZERO:96,NUM_ONE:97,NUM_TWO:98,NUM_THREE:99,NUM_FOUR:100,NUM_FIVE:101,NUM_SIX:102,NUM_SEVEN:103,NUM_EIGHT:104,NUM_NINE:105,NUM_MULTIPLY:106,NUM_PLUS:107,NUM_MINUS:109,NUM_PERIOD:110,NUM_DIVISION:111,F1:112,F2:113,F3:114,F4:115,F5:116,F6:117,F7:118,F8:119,F9:120,F10:121,F11:122,F12:123,FF_HYPHEN:173,SEMICOLON:186,DASH:189,EQUALS:187,COMMA:188,HYPHEN:189,PERIOD:190,SLASH:191,APOSTROPHE:192,TILDE:192,SINGLE_QUOTE:222,OPEN_SQUARE_BRACKET:219,BACKSLASH:220,CLOSE_SQUARE_BRACKET:221,IME:229},Object.assign(V.DEFAULTS,{enter:V.ENTER_P,multiLine:!0,tabSpaces:0}),V.MODULES.keys=function(d){var f,n,r,o=d.$,p=!1;function h(e){if(d.selection.isCollapsed())if(["INPUT","BUTTON","TEXTAREA"].indexOf(e.target&&e.target.tagName)<0&&d.cursor.backspace(),d.helpers.isIOS()){var t=d.selection.ranges(0);t.deleteContents(),t.insertNode(document.createTextNode("\u200b")),d.selection.get().modify("move","forward","character")}else["INPUT","BUTTON","TEXTAREA"].indexOf(e.target&&e.target.tagName)<0&&e.preventDefault(),e.stopPropagation();else e.preventDefault(),e.stopPropagation(),d.selection.remove();d.placeholder.refresh()}function u(e){["INPUT","BUTTON","TEXTAREA"].indexOf(e.target&&e.target.tagName)<0&&e.preventDefault(),e.stopPropagation(),""!==d.selection.text()||d.selection.element().hasAttribute("contenteditable")&&"false"===d.selection.element().getAttribute("contenteditable")||!d.selection.isCollapsed()&&"IMG"==d.selection.element().tagName?d.selection.remove():d.cursor.del(),d.placeholder.refresh()}function e(){if(d.browser.mozilla&&d.selection.isCollapsed()&&!p){var e=d.selection.ranges(0),t=e.startContainer,n=e.startOffset;t&&t.nodeType===Node.TEXT_NODE&&n<=t.textContent.length&&0<n&&32===t.textContent.charCodeAt(n-1)&&(d.selection.save(),d.spaces.normalize(),d.selection.restore())}}function t(){d.selection.isFull()&&setTimeout(function(){var e=d.html.defaultTag();e?d.$el.html("<".concat(e,">").concat(V.MARKERS,"<br/></").concat(e,">")):d.$el.html("".concat(V.MARKERS,"<br/>")),d.selection.restore(),d.placeholder.refresh(),d.button.bulkRefresh(),d.undo.saveStep()},0)}function i(){p=!1}function a(){p=!1}function C(){var e=d.html.defaultTag();e?d.$el.html("<".concat(e,">").concat(V.MARKERS,"<br/></").concat(e,">")):d.$el.html("".concat(V.MARKERS,"<br/>")),d.selection.restore()}function g(e,t){if(e.parentElement&&(-1<e.innerHTML.indexOf("<span")||-1<e.parentElement.innerHTML.indexOf("<span")||-1<e.parentElement.parentElement.innerHTML.indexOf("<span"))&&(e.classList.contains("fr-img-space-wrap")||e.parentElement.classList.contains("fr-img-space-wrap")||e.parentElement.parentElement.classList.contains("fr-img-space-wrap"))){if(o(e.parentElement).is("p")){var n=e.parentElement.innerHTML;return(n=n.replace(/<br>/g,"")).length<1?e.parentElement.insertAdjacentHTML("afterbegin","&nbsp;"):"&nbsp;"!=n&&" "!=n&&"Backspace"==t.key?h(t):"&nbsp;"!=n&&" "!=n&&"Delete"==t.key&&u(t),!0}if(o(e).is("p")){var r=e.innerHTML.replace(/<br>/g,"");return r.length<1?e.insertAdjacentHTML("afterbegin","&nbsp;"):"&nbsp;"!=r&&" "!=r&&"Backspace"==t.key?h(t):"&nbsp;"!=r&&" "!=r&&"Delete"==t.key&&u(t),!0}}return!1}function s(e){var t=d.selection.element();if(t&&0<=["INPUT","TEXTAREA"].indexOf(t.tagName))return!0;if(e&&v(e.which))return!0;d.events.disableBlur();var n=e.which;if(16===n)return!0;if((f=n)===V.KEYCODE.IME)return p=!0;if(p=!1,m(e))return!0;var r=b(n)&&!m(e)&&!e.altKey,o=n===V.KEYCODE.BACKSPACE||n===V.KEYCODE.DELETE;if((d.selection.isFull()&&!d.opts.keepFormatOnDelete&&!d.placeholder.isVisible()||o&&d.placeholder.isVisible()&&d.opts.keepFormatOnDelete)&&(r||o)&&(C(),!b(n)))return e.preventDefault(),!0;if(n===V.KEYCODE.ENTER)!d.helpers.isIOS()&&e.shiftKey||t.classList.contains("fr-inner")||t.parentElement.classList.contains("fr-inner")?function i(e){e.preventDefault(),e.stopPropagation(),d.opts.multiLine&&(d.selection.isCollapsed()||d.selection.remove(),d.cursor.enter(!0))}(e):function a(e){d.opts.multiLine?(d.helpers.isIOS()||(e.preventDefault(),e.stopPropagation()),d.selection.isCollapsed()||d.selection.remove(),d.cursor.enter()):(e.preventDefault(),e.stopPropagation())}(e);else if(n===V.KEYCODE.BACKSPACE&&(e.metaKey||e.ctrlKey))!function s(){setTimeout(function(){d.events.disableBlur(),d.events.focus()},0)}();else if(n!==V.KEYCODE.BACKSPACE||m(e)||e.altKey)if(n!==V.KEYCODE.DELETE||m(e)||e.altKey||e.shiftKey)n===V.KEYCODE.SPACE?function l(e){var t=d.selection.element();if(!d.helpers.isMobile()&&t&&"A"===t.tagName){e.preventDefault(),e.stopPropagation(),d.selection.isCollapsed()||d.selection.remove();var n=d.markers.insert();if(n){var r=n.previousSibling;!n.nextSibling&&n.parentNode&&"A"===n.parentNode.tagName?(n.parentNode.insertAdjacentHTML("afterend","&nbsp;".concat(V.MARKERS)),n.parentNode.removeChild(n)):(r&&r.nodeType===Node.TEXT_NODE&&1===r.textContent.length&&160===r.textContent.charCodeAt(0)?r.textContent+=" ":n.insertAdjacentHTML("beforebegin","&nbsp;"),n.outerHTML=V.MARKERS),d.selection.restore()}}}(e):n===V.KEYCODE.TAB?function c(e){if(0<d.opts.tabSpaces)if(d.selection.isCollapsed()){d.undo.saveStep(),e.preventDefault(),e.stopPropagation();for(var t="",n=0;n<d.opts.tabSpaces;n++)t+="&nbsp;";d.html.insert(t),d.placeholder.refresh(),d.undo.saveStep()}else e.preventDefault(),e.stopPropagation(),e.shiftKey?d.commands.outdent():d.commands.indent()}(e):m(e)||!b(e.which)||d.selection.isCollapsed()||e.ctrlKey||e.altKey||d.selection.remove();else{if(g(t,e))return e.preventDefault(),void e.stopPropagation();d.placeholder.isVisible()?(d.opts.keepFormatOnDelete||C(),e.preventDefault(),e.stopPropagation()):u(e)}else{if(g(t,e))return e.preventDefault(),void e.stopPropagation();d.placeholder.isVisible()?(d.opts.keepFormatOnDelete||C(),e.preventDefault(),e.stopPropagation()):h(e)}d.events.enableBlur()}function l(){if(!d.$wp)return!0;var e;if(d.opts.height||d.opts.heightMax){e=d.position.getBoundingRect().top,(d.helpers.isIOS()||d.helpers.isAndroid())&&(e-=d.helpers.scrollTop()),d.opts.iframe&&(e+=d.$iframe.offset().top);var t=d.selection.blocks(),n=null;t&&0<t.length&&t[0].offsetTop&&(n=t[0].getBoundingClientRect().top),!d.opts.iframe&&e>d.$wp.offset().top-d.helpers.scrollTop()+d.$wp.height()-20?d.$wp.scrollTop(e+d.$wp.scrollTop()-(d.$wp.height()+d.$wp.offset().top)+d.helpers.scrollTop()+20):d.opts.iframe&&n>d.$wp.height()&&n&&d.$wp.scrollTop(n-d.$wp.height()+80)}else e=d.position.getBoundingRect().top,d.opts.toolbarBottom&&(e+=d.opts.toolbarStickyOffset),(d.helpers.isIOS()||d.helpers.isAndroid())&&(e-=d.helpers.scrollTop()),d.opts.iframe&&(e+=d.$iframe.offset().top,e-=d.helpers.scrollTop()),(e+=d.opts.toolbarStickyOffset)>d.o_win.innerHeight-20&&o(d.o_win).scrollTop(e+d.helpers.scrollTop()-d.o_win.innerHeight+20),e=d.position.getBoundingRect().top,d.opts.toolbarBottom||(e-=d.opts.toolbarStickyOffset),(d.helpers.isIOS()||d.helpers.isAndroid())&&(e-=d.helpers.scrollTop()),d.opts.iframe&&(e+=d.$iframe.offset().top,e-=d.helpers.scrollTop()),e<100&&o(d.o_win).scrollTop(e+d.helpers.scrollTop()-100)}function c(e){var t=d.selection.element();if(t&&0<=["INPUT","TEXTAREA"].indexOf(t.tagName))return!0;if(e&&0===e.which&&f&&(e.which=f),d.helpers.isAndroid()&&d.browser.mozilla)return!0;if(p)return!1;if(e&&d.helpers.isIOS()&&e.which===V.KEYCODE.ENTER&&d.doc.execCommand("undo"),!d.selection.isCollapsed())return!0;if(e&&(e.which===V.KEYCODE.META||e.which===V.KEYCODE.CTRL))return!0;if(e&&v(e.which))return!0;if(e&&!d.helpers.isIOS()&&(e.which===V.KEYCODE.ENTER||e.which===V.KEYCODE.BACKSPACE||37<=e.which&&e.which<=40&&!d.browser.msie))try{l()}catch(r){}var n=d.selection.element();(function o(e){if(!e)return!1;var t=e.innerHTML;return!!((t=t.replace(/<span[^>]*? class\s*=\s*["']?fr-marker["']?[^>]+>\u200b<\/span>/gi,""))&&/\u200B/.test(t)&&0<t.replace(/\u200B/gi,"").length)})(n)&&!d.node.hasClass(n,"fr-marker")&&"IFRAME"!==n.tagName&&function i(e){return!d.helpers.isIOS()||0===((e.textContent||"").match(/[\u3041-\u3096\u30A0-\u30FF\u4E00-\u9FFF\u3130-\u318F\uAC00-\uD7AF]/gi)||[]).length}(n)&&(d.selection.save(),function a(e){for(var t=d.doc.createTreeWalker(e,NodeFilter.SHOW_TEXT,d.node.filter(function(e){return/\u200B/gi.test(e.textContent)}),!1);t.nextNode();){var n=t.currentNode;n.textContent=n.textContent.replace(/\u200B/gi,"")}}(n),d.selection.restore())}function m(e){if(-1!==navigator.userAgent.indexOf("Mac OS X")){if(e.metaKey&&!e.altKey)return!0}else if(e.ctrlKey&&!e.altKey)return!0;return!1}function v(e){if(e>=V.KEYCODE.ARROW_LEFT&&e<=V.KEYCODE.ARROW_DOWN)return!0}function b(e){if(e>=V.KEYCODE.ZERO&&e<=V.KEYCODE.NINE)return!0;if(e>=V.KEYCODE.NUM_ZERO&&e<=V.KEYCODE.NUM_MULTIPLY)return!0;if(e>=V.KEYCODE.A&&e<=V.KEYCODE.Z)return!0;if(d.browser.webkit&&0===e)return!0;switch(e){case V.KEYCODE.SPACE:case V.KEYCODE.QUESTION_MARK:case V.KEYCODE.NUM_PLUS:case V.KEYCODE.NUM_MINUS:case V.KEYCODE.NUM_PERIOD:case V.KEYCODE.NUM_DIVISION:case V.KEYCODE.SEMICOLON:case V.KEYCODE.FF_SEMICOLON:case V.KEYCODE.DASH:case V.KEYCODE.EQUALS:case V.KEYCODE.FF_EQUALS:case V.KEYCODE.COMMA:case V.KEYCODE.PERIOD:case V.KEYCODE.SLASH:case V.KEYCODE.APOSTROPHE:case V.KEYCODE.SINGLE_QUOTE:case V.KEYCODE.OPEN_SQUARE_BRACKET:case V.KEYCODE.BACKSLASH:case V.KEYCODE.CLOSE_SQUARE_BRACKET:return!0;default:return!1}}function L(e){var t=e.which;if(m(e)||37<=t&&t<=40||!b(t)&&t!==V.KEYCODE.DELETE&&t!==V.KEYCODE.BACKSPACE&&t!==V.KEYCODE.ENTER&&t!==V.KEYCODE.IME)return!0;n||(r=d.snapshot.get(),d.undo.canDo()||d.undo.saveStep()),clearTimeout(n),n=setTimeout(function(){n=null,d.undo.saveStep()},Math.max(250,d.opts.typingTimer))}function E(e){var t=e.which;if(m(e)||37<=t&&t<=40)return!0;r&&n?(d.undo.saveStep(r),r=null):void 0!==t&&0!==t||r||n||d.undo.saveStep()}function y(e){if(e&&"BR"===e.tagName)return!1;try{return 0===(e.textContent||"").length&&e.querySelector&&!e.querySelector(":scope > br")||e.childNodes&&1===e.childNodes.length&&e.childNodes[0].getAttribute&&("false"===e.childNodes[0].getAttribute("contenteditable")||d.node.hasClass(e.childNodes[0],"fr-img-caption"))}catch(t){return!1}}function S(e){var t=d.el.childNodes,n=d.html.defaultTag(),r=d.node.blockParent(d.selection.blocks()[0]);return r&&"TR"==r.tagName&&r.getAttribute("contenteditable")==undefined&&(r=r.closest("table")),!d.node.isEditable(e.target)||r&&"false"===r.getAttribute("contenteditable")?d.toolbar.disable():d.toolbar.enable(),!(!e.target||e.target===d.el)||(0===t.length||void(t[0].offsetHeight+t[0].offsetTop<=e.offsetY?y(t[t.length-1])&&(n?d.$el.append("<".concat(n,">").concat(V.MARKERS,"<br></").concat(n,">")):d.$el.append("".concat(V.MARKERS,"<br>")),d.selection.restore(),l()):e.offsetY<=10&&y(t[0])&&(n?d.$el.prepend("<".concat(n,">").concat(V.MARKERS,"<br></").concat(n,">")):d.$el.prepend("".concat(V.MARKERS,"<br>")),d.selection.restore(),l())))}function M(){n&&clearTimeout(n)}return{_init:function T(){d.events.on("keydown",L),d.events.on("input",e),d.events.on("mousedown",a),d.events.on("keyup input",E),d.events.on("keypress",i),d.events.on("keydown",s),d.events.on("keyup",c),d.events.on("destroy",M),d.events.on("html.inserted",c),d.events.on("cut",t),d.opts.multiLine&&d.events.on("click",S)},ctrlKey:m,isCharacter:b,isArrow:v,forceUndo:function N(){n&&(clearTimeout(n),d.undo.saveStep(),r=null)},isIME:function A(){return p},isBrowserAction:function x(e){var t=e.which;return m(e)||t===V.KEYCODE.F5},positionCaret:l}},Object.assign(V.DEFAULTS,{pastePlain:!1,pasteDeniedTags:["colgroup","col","meta"],pasteDeniedAttrs:["class","id"],pasteAllowedStyleProps:[".*"],pasteAllowLocalImages:!1}),V.MODULES.paste=function(A){var a,s,x,i,O,w=A.$;function n(e,t){try{A.win.localStorage.setItem("fr-copied-html",e),A.win.localStorage.setItem("fr-copied-text",t)}catch(n){}}function e(e){var t=A.html.getSelected();n(t,w(A.doc.createElement("div")).html(t).text()),"cut"===e.type&&(A.undo.saveStep(),setTimeout(function(){A.selection.save(),A.html.wrap(),A.selection.restore(),A.events.focus(),A.undo.saveStep()},0))}var l=!1;function t(e){if("INPUT"===e.target.nodeName&&"text"===e.target.type)return!0;if(A.edit.isDisabled())return!1;if(c(e.target))return!1;if(l)return!1;if((e.originalEvent&&(e=e.originalEvent),e&&e.clipboardData&&e.clipboardData.getData)&&((e.clipboardData||window.clipboardData).getData("text/html")||"").match('content="Microsoft OneNote'))return!1;if(!1===A.events.trigger("paste.before",[e]))return e.preventDefault(),!1;if(e&&e.clipboardData&&e.clipboardData.getData){var t="",n=e.clipboardData.types;if(A.helpers.isArray(n))for(var r=0;r<n.length;r++)t+="".concat(n[r],";");else t=n;if(a="",/text\/rtf/.test(t)&&(s=e.clipboardData.getData("text/rtf")),/text\/html/.test(t)&&!A.browser.safari?a=e.clipboardData.getData("text/html"):/text\/rtf/.test(t)&&A.browser.safari?a=s:/public.rtf/.test(t)&&A.browser.safari&&(a=e.clipboardData.getData("text/rtf")),x=e.clipboardData.getData("text"),""!==a)return d(),e.preventDefault&&(e.stopPropagation(),e.preventDefault()),!1;a=null}return function o(){A.selection.save(),A.events.disableBlur(),a=null,i?(i.html(""),A.browser.edge&&A.opts.iframe&&A.$el.append(i)):(i=w('<div contenteditable="true" style="position: fixed; top: 0; left: -9999px; height: 100%; width: 0; word-break: break-all; overflow:hidden; z-index: 2147483647; line-height: 140%; -moz-user-select: text; -webkit-user-select: text; -ms-user-select: text; user-select: text;" tabIndex="-1"></div>'),A.browser.webkit||A.browser.mozilla?(i.css("top",A.$sc.scrollTop()),A.$el.after(i)):A.browser.edge&&A.opts.iframe?A.$el.append(i):A.$box.after(i),A.events.on("destroy",function(){i.remove()}));var e;A.helpers.isIOS()&&A.$sc&&(e=A.$sc.scrollTop());A.opts.iframe&&A.$el.attr("contenteditable","false");i.focus(),A.helpers.isIOS()&&A.$sc&&A.$sc.scrollTop(e);A.win.setTimeout(d,1)}(),!1}function c(e){return e&&"false"===e.contentEditable}function r(e){if(e.originalEvent&&(e=e.originalEvent),c(e.target))return!1;if(e&&e.dataTransfer&&e.dataTransfer.getData){var t="",n=e.dataTransfer.types;if(A.helpers.isArray(n))for(var r=0;r<n.length;r++)t+="".concat(n[r],";");else t=n;if(a="",/text\/rtf/.test(t)&&(s=e.dataTransfer.getData("text/rtf")),/text\/html/.test(t)?a=e.dataTransfer.getData("text/html"):/text\/rtf/.test(t)&&A.browser.safari?a=s:/text\/plain/.test(t)&&!this.browser.mozilla&&(a=A.html.escapeEntities(e.dataTransfer.getData("text/plain")).replace(/\n/g,"<br>")),""!==a){A.keys.forceUndo(),O=A.snapshot.get(),A.selection.save(),A.$el.find(".fr-marker").removeClass("fr-marker").addClass("fr-marker-helper");var o=A.markers.insertAtPoint(e);if(A.$el.find(".fr-marker").removeClass("fr-marker").addClass("fr-marker-placeholder"),A.$el.find(".fr-marker-helper").addClass("fr-marker").removeClass("fr-marker-helper"),A.selection.restore(),A.selection.remove(),A.$el.find(".fr-marker-placeholder").addClass("fr-marker").removeClass("fr-marker-placeholder"),!1!==o){var i=A.el.querySelector(".fr-marker");return w(i).replaceWith(V.MARKERS),A.selection.restore(),d(),e.preventDefault&&(e.stopPropagation(),e.preventDefault()),!1}}else a=null}}function d(){A.opts.iframe&&A.$el.attr("contenteditable","true"),A.browser.edge&&A.opts.iframe&&A.$box.after(i),O||(A.keys.forceUndo(),O=A.snapshot.get()),a||(a=i.get(0).innerHTML,x=i.text(),A.selection.restore(),A.events.enableBlur());var e=a.match(/(class="?Mso|class='?Mso|class="?Xl|class='?Xl|class=Xl|style="[^"]*\bmso-|style='[^']*\bmso-|w:WordDocument|LibreOffice)/gi),t=A.events.chainTrigger("paste.beforeCleanup",a);t&&"string"==typeof t&&(a=t),(!e||e&&!1!==A.events.trigger("paste.wordPaste",[a]))&&o(a,e)}function k(e){for(var t="",n=0;n++<e;)t+="&nbsp;";return t}function o(e,t,n){var r,o=null,i=null;if(0<=e.toLowerCase().indexOf("<body")){var a="";0<=e.indexOf("<style")&&(a=e.replace(/[.\s\S\w\W<>]*(<style[^>]*>[\s]*[.\s\S\w\W<>]*[\s]*<\/style>)[.\s\S\w\W<>]*/gi,"$1")),e=(e=(e=a+e.replace(/[.\s\S\w\W<>]*<body[^>]*>[\s]*([.\s\S\w\W<>]*)[\s]*<\/body>[.\s\S\w\W<>]*/gi,"$1")).replace(/<pre(?:[\w\W]*?)>(?:[\w\W]*?)<\/pre>/g,function(e){return e.replace(/\n/g,"<br />")})).replace(/ \n/g," ").replace(/\n /g," ").replace(/([^>])\n([^<])/g,"$1 $2")}var s=!1;0<=e.indexOf('id="docs-internal-guid')&&(e=e.replace(/^[\w\W\s\S]* id="docs-internal-guid[^>]*>([\w\W\s\S]*)<\/b>[\w\W\s\S]*$/g,"$1"),s=!0),0<=e.indexOf('content="Sheets"')&&(e=e.replace(/width:0px;/g,""));var l=!1;if(!t)if((l=function y(){var e=null;try{e=A.win.localStorage.getItem("fr-copied-text")}catch(t){}return!(!e||!x||x.replace(/\u00A0/gi," ").replace(/\r|\n/gi,"")!==e.replace(/\u00A0/gi," ").replace(/\r|\n/gi,"")&&x.replace(/\s/g,"")!==e.replace(/\s/g,""))}())&&(e=A.win.localStorage.getItem("fr-copied-html")),l)e=A.clean.html(e,A.opts.pasteDeniedTags,A.opts.pasteDeniedAttrs);else{var c=A.opts.htmlAllowedStyleProps;A.opts.htmlAllowedStyleProps=A.opts.pasteAllowedStyleProps,A.opts.htmlAllowComments=!1,e=(e=(e=e.replace(/<span class="Apple-tab-span">\s*<\/span>/g,k(A.opts.tabSpaces||4))).replace(/<span class="Apple-tab-span" style="white-space:pre">(\t*)<\/span>/g,function(e,t){return k(t.length*(A.opts.tabSpaces||4))})).replace(/\t/g,k(A.opts.tabSpaces||4)),e=A.clean.html(e,A.opts.pasteDeniedTags,A.opts.pasteDeniedAttrs),A.opts.htmlAllowedStyleProps=c,A.opts.htmlAllowComments=!0,e=(e=(e=$(e)).replace(/\r/g,"")).replace(/^ */g,"").replace(/ *$/g,"")}!t||A.wordPaste&&n||(0===(e=e.replace(/^\n*/g,"").replace(/^ /g,"")).indexOf("<colgroup>")&&(e="<table>".concat(e,"</table>")),e=$(e=function S(e){var t;e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=(e=e.replace(/<p(.*?)class="?'?MsoListParagraph"?'? ([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<ul><li>$3</li></ul>")).replace(/<p(.*?)class="?'?NumberedText"?'? ([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<ol><li>$3</li></ol>")).replace(/<p(.*?)class="?'?MsoListParagraphCxSpFirst"?'?([\s\S]*?)(level\d)?([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<ul><li$3>$5</li>")).replace(/<p(.*?)class="?'?NumberedTextCxSpFirst"?'?([\s\S]*?)(level\d)?([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<ol><li$3>$5</li>")).replace(/<p(.*?)class="?'?MsoListParagraphCxSpMiddle"?'?([\s\S]*?)(level\d)?([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<li$3>$5</li>")).replace(/<p(.*?)class="?'?NumberedTextCxSpMiddle"?'?([\s\S]*?)(level\d)?([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<li$3>$5</li>")).replace(/<p(.*?)class="?'?MsoListBullet"?'?([\s\S]*?)(level\d)?([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<li$3>$5</li>")).replace(/<p(.*?)class="?'?MsoListParagraphCxSpLast"?'?([\s\S]*?)(level\d)?([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<li$3>$5</li></ul>")).replace(/<p(.*?)class="?'?NumberedTextCxSpLast"?'?([\s\S]*?)(level\d)?([\s\S]*?)>([\s\S]*?)<\/p>/gi,"<li$3>$5</li></ol>")).replace(/<span([^<]*?)style="?'?mso-list:Ignore"?'?([\s\S]*?)>([\s\S]*?)<span/gi,"<span><span")).replace(/<!--\[if !supportLists\]-->([\s\S]*?)<!--\[endif\]-->/gi,"")).replace(/<!\[if !supportLists\]>([\s\S]*?)<!\[endif\]>/gi,"")).replace(/(\n|\r| class=(")?Mso[a-zA-Z0-9]+(")?)/gi," ")).replace(/<!--[\s\S]*?-->/gi,"")).replace(/<(\/)*(meta|link|span|\\?xml:|st1:|o:|font)(.*?)>/gi,"");var n,r=["style","script","applet","embed","noframes","noscript"];for(t=0;t<r.length;t++){var o=new RegExp("<".concat(r[t],".*?").concat(r[t],"(.*?)>"),"gi");e=e.replace(o,"")}for(e=(e=(e=e.replace(/&nbsp;/gi," ")).replace(/<td([^>]*)><\/td>/g,"<td$1><br></td>")).replace(/<th([^>]*)><\/th>/g,"<th$1><br></th>");(e=(n=e).replace(/<[^/>][^>]*><\/[^>]+>/gi,""))!==n;);e=(e=e.replace(/<lilevel([^1])([^>]*)>/gi,'<li data-indent="true"$2>')).replace(/<lilevel1([^>]*)>/gi,"<li$1>"),e=(e=(e=A.clean.html(e,A.opts.pasteDeniedTags,A.opts.pasteDeniedAttrs)).replace(/<a>(.[^<]+)<\/a>/gi,"$1")).replace(/<br> */g,"<br>");var i=A.o_doc.createElement("div");i.innerHTML=e;var a=i.querySelectorAll("li[data-indent]");for(t=0;t<a.length;t++){var s=a[t],l=s.previousElementSibling;if(l&&"LI"===l.tagName){var c=l.querySelector(":scope > ul, :scope > ol");c||(c=document.createElement("ul"),l.appendChild(c)),c.appendChild(s)}else s.removeAttribute("data-indent")}return A.html.cleanBlankSpaces(i),e=i.innerHTML}(e))),A.opts.pastePlain&&(e=function M(e){var t,n=null,r=A.doc.createElement("div");r.innerHTML=e;var o=r.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, pre, blockquote");for(t=0;t<o.length;t++)(n=o[t]).outerHTML="<".concat(A.html.defaultTag()||"DIV",">").concat(n.innerText,"</").concat(A.html.defaultTag()||"DIV",">");for(t=(o=r.querySelectorAll("*:not(".concat("p, div, h1, h2, h3, h4, h5, h6, pre, blockquote, ul, ol, li, table, tbody, thead, tr, td, br, img".split(",").join("):not("),")"))).length-1;0<=t;t--)(n=o[t]).outerHTML=n.innerHTML;return function i(e){for(var t=A.node.contents(e),n=0;n<t.length;n++)t[n].nodeType!==Node.TEXT_NODE&&t[n].nodeType!==Node.ELEMENT_NODE?t[n].parentNode.removeChild(t[n]):i(t[n])}(r),r.innerHTML}(e));var d=A.events.chainTrigger("paste.afterCleanup",e);if("string"==typeof d&&(e=d),""!==e){var f=A.o_doc.createElement("div");0<=(f.innerHTML=e).indexOf("<body>")?(A.html.cleanBlankSpaces(f),A.spaces.normalize(f,!0)):A.spaces.normalize(f);var p=f.getElementsByTagName("span");for(r=p.length-1;0<=r;r--){var h=p[r];0===h.attributes.length&&(h.outerHTML=h.innerHTML)}if(!0===A.opts.linkAlwaysBlank){var u=f.getElementsByTagName("a");for(r=u.length-1;0<=r;r--){var C=u[r];C.getAttribute("target")||C.setAttribute("target","_blank")}}var g=A.selection.element(),m=!1;if(g&&w(g).parentsUntil(A.el,"ul, ol").length&&(m=!0),m){var v=f.children;1===v.length&&0<=["OL","UL"].indexOf(v[0].tagName)&&(v[0].outerHTML=v[0].innerHTML)}if(!s){var b=f.getElementsByTagName("br");for(r=b.length-1;0<=r;r--){var L=b[r];A.node.isBlock(L.previousSibling)&&L.parentNode.removeChild(L)}}if(A.opts.enter===V.ENTER_BR)for(r=(o=f.querySelectorAll("p, div")).length-1;0<=r;r--)0===(i=o[r]).attributes.length&&(i.outerHTML=i.innerHTML+(i.nextSibling&&!A.node.isEmpty(i)?"<br>":""));else if(A.opts.enter===V.ENTER_DIV)for(r=(o=f.getElementsByTagName("p")).length-1;0<=r;r--)0===(i=o[r]).attributes.length&&(i.outerHTML="<div>".concat(i.innerHTML,"</div>"));else A.opts.enter===V.ENTER_P&&1===f.childNodes.length&&"P"===f.childNodes[0].tagName&&0===f.childNodes[0].attributes.length&&(f.childNodes[0].outerHTML=f.childNodes[0].innerHTML);if(f.children&&0<f.children.length)if(A.opts.trackChangesEnabled)for(var E=0;E<f.children.length;E++)f.children[E].setAttribute("id","isPasted");else f.children[0].setAttribute("id","isPasted");e=f.innerHTML,l&&(e=function T(e){var t,n=A.o_doc.createElement("div");n.innerHTML=e;var r=n.querySelectorAll("*:empty:not(td):not(th):not(tr):not(iframe):not(svg):not(".concat(V.VOID_ELEMENTS.join("):not("),"):not(").concat(A.opts.htmlAllowedEmptyTags.join("):not("),")"));for(;r.length;){for(t=0;t<r.length;t++)r[t].parentNode.removeChild(r[t]);r=n.querySelectorAll("*:empty:not(td):not(th):not(tr):not(iframe):not(svg):not(".concat(V.VOID_ELEMENTS.join("):not("),"):not(").concat(A.opts.htmlAllowedEmptyTags.join("):not("),")"))}return n.innerHTML}(e)),A.html.insert(e,!0)}!function N(){A.events.trigger("paste.after")}(),A.undo.saveStep(O),O=null,A.undo.saveStep()}function f(e){for(var t=e.length-1;0<=t;t--)e[t].attributes&&e[t].attributes.length&&e.splice(t,1);return e}function $(e){var t,n=A.o_doc.createElement("div");n.innerHTML=e;for(var r=f(Array.prototype.slice.call(n.querySelectorAll(":scope > div:not([style]), td > div:not([style]), th > div:not([style]), li > div:not([style])")));r.length;){var o=r[r.length-1];if(A.html.defaultTag()&&"div"!==A.html.defaultTag())o.querySelector(A.html.blockTagsQuery())?o.outerHTML=o.innerHTML:o.outerHTML="<".concat(A.html.defaultTag(),">").concat(o.innerHTML,"</").concat(A.html.defaultTag(),">");else{var i=o.querySelectorAll("*");!i.length||"BR"!==i[i.length-1].tagName&&0===o.innerText.length?o.outerHTML=o.innerHTML+(o.nextSibling?"<br>":""):!i.length||"BR"!==i[i.length-1].tagName||i[i.length-1].nextSibling?o.outerHTML=o.innerHTML+(o.nextSibling?"<br>":""):o.outerHTML=o.innerHTML}r=f(Array.prototype.slice.call(n.querySelectorAll(":scope > div:not([style]), td > div:not([style]), th > div:not([style]), li > div:not([style])")))}for(r=f(Array.prototype.slice.call(n.querySelectorAll("div:not([style])")));r.length;){for(t=0;t<r.length;t++){var a=r[t],s=a.innerHTML.replace(/\u0009/gi,"").trim();a.outerHTML=s}r=f(Array.prototype.slice.call(n.querySelectorAll("div:not([style])")))}return n.innerHTML}function p(){A.el.removeEventListener("copy",e),A.el.removeEventListener("cut",e),A.el.removeEventListener("paste",t)}return{_init:function h(){A.el.addEventListener("copy",e),A.el.addEventListener("cut",e),A.el.addEventListener("paste",t,{capture:!0}),A.events.on("drop",r),A.browser.msie&&A.browser.version<11&&(A.events.on("mouseup",function(e){2===e.button&&(setTimeout(function(){l=!1},50),l=!0)},!0),A.events.on("beforepaste",t)),A.events.on("destroy",p)},cleanEmptyTagsAndDivs:$,getRtfClipboard:function u(){return s},saveCopiedText:n,clean:o}},Object.assign(V.DEFAULTS,{shortcutsEnabled:[],shortcutsHint:!0}),V.SHORTCUTS_MAP={},V.RegisterShortcut=function(e,t,n,r,o,i){V.SHORTCUTS_MAP[(o?"^":"")+(i?"@":"")+e]={cmd:t,val:n,letter:r,shift:o,option:i},V.DEFAULTS.shortcutsEnabled.push(t)},V.RegisterShortcut(V.KEYCODE.E,"show",null,"E",!1,!1),V.RegisterShortcut(V.KEYCODE.B,"bold",null,"B",!1,!1),V.RegisterShortcut(V.KEYCODE.I,"italic",null,"I",!1,!1),V.RegisterShortcut(V.KEYCODE.U,"underline",null,"U",!1,!1),V.RegisterShortcut(V.KEYCODE.S,"strikeThrough",null,"S",!1,!1),V.RegisterShortcut(V.KEYCODE.CLOSE_SQUARE_BRACKET,"indent",null,"]",!1,!1),V.RegisterShortcut(V.KEYCODE.OPEN_SQUARE_BRACKET,"outdent",null,"[",!1,!1),V.RegisterShortcut(V.KEYCODE.Z,"undo",null,"Z",!1,!1),V.RegisterShortcut(V.KEYCODE.Z,"redo",null,"Z",!0,!1),V.RegisterShortcut(V.KEYCODE.Y,"redo",null,"Y",!1,!1),V.MODULES.shortcuts=function(s){var r=null;var l=!1;function e(e){if(!s.core.hasFocus())return!0;var t=e.which,n=-1!==navigator.userAgent.indexOf("Mac OS X")?e.metaKey:e.ctrlKey;if("keyup"===e.type&&l&&t!==V.KEYCODE.META)return l=!1;"keydown"===e.type&&(l=!1);var r=(e.shiftKey?"^":"")+(e.altKey?"@":"")+t,o=s.node.blockParent(s.selection.blocks()[0]);if(o&&"TR"==o.tagName&&o.getAttribute("contenteditable")==undefined&&(o=o.closest("table")),n&&V.SHORTCUTS_MAP[r]&&(!o||"false"!==o.getAttribute("contenteditable"))){var i=V.SHORTCUTS_MAP[r].cmd;if(i&&0<=s.opts.shortcutsEnabled.indexOf(i)){var a=V.SHORTCUTS_MAP[r].val;if(!1===s.events.trigger("shortcut",[e,i,a]))return!(l=!0);if(i&&(s.commands[i]||V.COMMANDS[i]&&V.COMMANDS[i].callback))return e.preventDefault(),e.stopPropagation(),"keydown"===e.type&&((s.commands[i]||V.COMMANDS[i].callback)(),l=!0),!1}}}return{_init:function t(){s.events.on("keydown",e,!0),s.events.on("keyup",e,!0)},get:function o(e){if(!s.opts.shortcutsHint)return null;if(!r)for(var t in r={},V.SHORTCUTS_MAP)Object.prototype.hasOwnProperty.call(V.SHORTCUTS_MAP,t)&&0<=s.opts.shortcutsEnabled.indexOf(V.SHORTCUTS_MAP[t].cmd)&&(r["".concat(V.SHORTCUTS_MAP[t].cmd,".").concat(V.SHORTCUTS_MAP[t].val||"")]={shift:V.SHORTCUTS_MAP[t].shift,option:V.SHORTCUTS_MAP[t].option,letter:V.SHORTCUTS_MAP[t].letter});var n=r[e];return n?(s.helpers.isMac()?String.fromCharCode(8984):"".concat(s.language.translate("Ctrl"),"+"))+(n.shift?s.helpers.isMac()?String.fromCharCode(8679):"".concat(s.language.translate("Shift"),"+"):"")+(n.option?s.helpers.isMac()?String.fromCharCode(8997):"".concat(s.language.translate("Alt"),"+"):"")+n.letter:null}}},V.MODULES.snapshot=function(l){function n(e){for(var t=e.parentNode.childNodes,n=0,r=null,o=0;o<t.length;o++){if(r){var i=t[o].nodeType===Node.TEXT_NODE&&""===t[o].textContent,a=r.nodeType===Node.TEXT_NODE&&t[o].nodeType===Node.TEXT_NODE,s=r.nodeType===Node.TEXT_NODE&&""===r.textContent;i||a||s||n++}if(t[o]===e)return n;r=t[o]}}function o(e){var t=[];if(!e.parentNode)return[];for(;!l.node.isElement(e);)t.push(n(e)),e=e.parentNode;return t.reverse()}function i(e,t){for(;e&&e.nodeType===Node.TEXT_NODE;){var n=e.previousSibling;n&&n.nodeType===Node.TEXT_NODE&&(t+=n.textContent.length),e=n}return t}function c(e){for(var t=l.el,n=0;n<e.length;n++)t=t.childNodes[e[n]];return t}function r(e,t){try{var n=c(t.scLoc),r=t.scOffset,o=c(t.ecLoc),i=t.ecOffset,a=l.doc.createRange();a.setStart(n,r),a.setEnd(o,i),e.addRange(a)}catch(s){}}return{get:function a(){var e,t={};if(l.events.trigger("snapshot.before"),t.html=(l.$wp?l.$el.html():l.$oel.get(0).outerHTML).replace(/ style=""/g,""),t.ranges=[],l.$wp&&l.selection.inEditor()&&l.core.hasFocus())for(var n=l.selection.ranges(),r=0;r<n.length;r++)t.ranges.push({scLoc:o((e=n[r]).startContainer),scOffset:i(e.startContainer,e.startOffset),ecLoc:o(e.endContainer),ecOffset:i(e.endContainer,e.endOffset)});return l.events.trigger("snapshot.after",[t]),t},restore:function s(e){l.$el.html()!==e.html&&(l.opts.htmlExecuteScripts?l.$el.html(e.html):l.el.innerHTML=e.html);var t=l.selection.get();l.selection.clear(),l.events.focus(!0);for(var n=0;n<e.ranges.length;n++)r(t,e.ranges[n])},equal:function d(e,t){return e.html===t.html&&(!l.core.hasFocus()||JSON.stringify(e.ranges)===JSON.stringify(t.ranges))}}},V.MODULES.undo=function(n){function e(e){var t=e.which;n.keys.ctrlKey(e)&&(t===V.KEYCODE.Z&&e.shiftKey&&e.preventDefault(),t===V.KEYCODE.Z&&e.preventDefault())}var t=null;function r(){if(n.undo_stack&&!n.undoing)for(;n.undo_stack.length>n.undo_index;)n.undo_stack.pop()}function o(){n.undo_index=0,n.undo_stack=[]}function i(){n.undo_stack=[]}return{_init:function a(){o(),n.events.on("initialized",function(){t=(n.$wp?n.$el.html():n.$oel.get(0).outerHTML).replace(/ style=""/g,"")}),n.events.on("blur",function(){n.el.querySelector(".fr-dragging")||n.undo.saveStep()}),n.events.on("keydown",e),n.events.on("destroy",i)},run:function s(){if(1<n.undo_index){n.undoing=!0;var e=n.undo_stack[--n.undo_index-1];clearTimeout(n._content_changed_timer),n.snapshot.restore(e),t=e.html,n.popups.hideAll(),n.toolbar.enable(),n.events.trigger("contentChanged"),n.events.trigger("commands.undo"),n.undoing=!1}},redo:function l(){if(n.undo_index<n.undo_stack.length){n.undoing=!0;var e=n.undo_stack[n.undo_index++];clearTimeout(n._content_changed_timer),n.snapshot.restore(e),t=e.html,n.popups.hideAll(),n.toolbar.enable(),n.events.trigger("contentChanged"),n.events.trigger("commands.redo"),n.undoing=!1}},canDo:function c(){return!(0===n.undo_stack.length||n.undo_index<=1)},canRedo:function d(){return n.undo_index!==n.undo_stack.length},dropRedo:r,reset:o,saveStep:function f(e){if(n.undo_stack&&!n.undoing&&!n.el.querySelector(".fr-marker"))if(void 0===e){if((e=n.snapshot.get())&&e.html&&n.undo_stack[n.undo_stack.length-1]&&e.html===n.undo_stack[n.undo_stack.length-1].html)return;n.undo_stack[n.undo_index-1]&&n.snapshot.equal(n.undo_stack[n.undo_index-1],e)||(r(),n.undo_stack.push(e),n.undo_index++,function o(e,t){var n=t.split("fr-selected-cell").join("");n=n.split(' class=""').join("");var r=e.split("fr-selected-cell").join("");return n===(r=r.split(' class=""').join(""))}(t,e.html)||(n.events.trigger("contentChanged"),t=e.html))}else r(),0<n.undo_index?n.undo_stack[n.undo_index-1]=e:(n.undo_stack.push(e),n.undo_index++)}}},Object.assign(V.DEFAULTS,{height:null,heightMax:null,heightMin:null,width:null}),V.MODULES.size=function(r){function e(){o(),r.opts.height&&r.$el.css("minHeight",r.opts.height-r.helpers.getPX(r.$el.css("padding-top"))-r.helpers.getPX(r.$el.css("padding-bottom")));var e=!1;if(r.opts.fullPage)for(var t=r.$el.find("span,p,div"),n=0;n<t.length;n++)if(t[n].style.height&&t[n].style.height.includes("vh")){e=!0;break}r.opts.fullPage&&e&&(r.opts.heightMin&&r.$iframe.css("minHeight",r.opts.heightMin),r.opts.heightMax&&r.$iframe.css("maxHeight",r.opts.heightMax),r.$el.css("overflow-y","auto")),r.$iframe.height(r.$el.outerHeight(!0))}function o(){r.opts.heightMin?r.$el.css("minHeight",r.opts.heightMin):r.$el.css("minHeight",""),r.opts.heightMax?(r.$wp.css("maxHeight",r.opts.heightMax),r.$wp.css("overflow","auto")):(r.$wp.css("maxHeight",""),r.$wp.css("overflow","")),r.opts.height?(r.$wp.css("height",r.opts.height),r.$wp.css("overflow","auto"),r.$el.css("minHeight",r.opts.height-r.helpers.getPX(r.$el.css("padding-top"))-r.helpers.getPX(r.$el.css("padding-bottom")))):(r.$wp.css("height",""),r.opts.heightMin||r.$el.css("minHeight",""),r.opts.heightMax||r.$wp.css("overflow","")),r.opts.width&&r.$box.width(r.opts.width)}return{_init:function t(){if(!r.$wp)return!1;o(),r.$iframe&&(r.events.on("keyup keydown",function(){setTimeout(e,0)},!0),r.events.on("commands.after html.set init initialized paste.after",e))},syncIframe:e,refresh:o}},Object.assign(V.DEFAULTS,{documentReady:!1,editorClass:null,typingTimer:500,iframe:!1,requestWithCORS:!0,requestWithCredentials:!1,requestHeaders:{},useClasses:!0,spellcheck:!0,iframeDefaultStyle:'html{margin:0px;height:auto;}body{height:auto;padding:20px;background:transparent;color:#000000;position:relative;z-index: 2;-webkit-user-select:auto;margin:0px;overflow:hidden;min-height:20px;}body:after{content:"";display:block;clear:both;}body::-moz-selection{background:#b5d6fd;color:#000;}body::selection{background:#b5d6fd;color:#000;}',iframeStyle:"",iframeStyleFiles:[],direction:"auto",zIndex:1,tabIndex:null,disableRightClick:!1,scrollableContainer:"body",keepFormatOnDelete:!1,theme:null}),V.MODULES.core=function(a){var r=a.$;function n(){if(a.$box.addClass("fr-box".concat(a.opts.editorClass?" ".concat(a.opts.editorClass):"")),a.$box.attr("role","application"),a.$wp.addClass("fr-wrapper"),a.opts.documentReady&&a.$box.addClass("fr-document"),function o(){a.opts.iframe||a.$el.addClass("fr-element fr-view")}(),a.opts.iframe){a.$iframe.addClass("fr-iframe"),a.$el.addClass("fr-view");for(var e=0;e<a.o_doc.styleSheets.length;e++){var t=void 0;try{t=a.o_doc.styleSheets[e].cssRules}catch(i){}if(t)for(var n=0,r=t.length;n<r;n++)!t[n].selectorText||0!==t[n].selectorText.indexOf(".fr-view")&&0!==t[n].selectorText.indexOf(".fr-element")||0<t[n].style.cssText.length&&(0===t[n].selectorText.indexOf(".fr-view")?a.opts.iframeStyle+="".concat(t[n].selectorText.replace(/\.fr-view/g,"body"),"{").concat(t[n].style.cssText,"}"):a.opts.iframeStyle+="".concat(t[n].selectorText.replace(/\.fr-element/g,"body"),"{").concat(t[n].style.cssText,"}"))}}"auto"!==a.opts.direction&&a.$box.removeClass("fr-ltr fr-rtl").addClass("fr-".concat(a.opts.direction)),a.$el.attr("dir",a.opts.direction),a.$wp.attr("dir",a.opts.direction),1<a.opts.zIndex&&a.$box.css("z-index",a.opts.zIndex),a.opts.theme&&a.$box.addClass("".concat(a.opts.theme,"-theme")),a.opts.tabIndex=a.opts.tabIndex||a.$oel.attr("tabIndex"),a.opts.tabIndex&&a.$el.attr("tabIndex",a.opts.tabIndex)}return{_init:function o(){if(V.INSTANCES.push(a),function e(){a.drag_support={filereader:"undefined"!=typeof FileReader,formdata:Boolean(a.win.FormData),progress:"upload"in new XMLHttpRequest}}(),a.$wp){n(),a.html.set(a._original_html),a.$el.attr("spellcheck",a.opts.spellcheck),a.helpers.isMobile()&&(a.$el.attr("autocomplete",a.opts.spellcheck?"on":"off"),a.$el.attr("autocorrect",a.opts.spellcheck?"on":"off"),a.$el.attr("autocapitalize",a.opts.spellcheck?"on":"off")),a.opts.disableRightClick&&a.events.$on(a.$el,"contextmenu",function(e){if(2===e.button)return e.preventDefault(),e.stopPropagation(),!1});try{a.doc.execCommand("styleWithCSS",!1,!1)}catch(t){}}"TEXTAREA"===a.$oel.get(0).tagName&&(a.events.on("contentChanged",function(){a.$oel.val(a.html.get())}),a.events.on("form.submit",function(){a.$oel.val(a.html.get())}),a.events.on("form.reset",function(){a.html.set(a._original_html)}),a.$oel.val(a.html.get())),a.helpers.isIOS()&&a.events.$on(a.$doc,"selectionchange",function(){a.$doc.get(0).hasFocus()||a.$win.get(0).focus()}),a.events.trigger("init"),a.opts.autofocus&&!a.opts.initOnClick&&a.$wp&&a.events.on("initialized",function(){a.events.focus(!0)})},destroy:function t(e){"TEXTAREA"===a.$oel.get(0).tagName&&a.$oel.val(e),a.$box&&a.$box.removeAttr("role"),a.$wp&&("TEXTAREA"===a.$oel.get(0).tagName?(a.$el.html(""),a.$wp.html(""),a.$box.replaceWith(a.$oel),a.$oel.show()):(a.$wp.replaceWith(e),a.$el.html(""),a.$box.removeClass("fr-view fr-ltr fr-box ".concat(a.opts.editorClass||"")),a.opts.theme&&a.$box.addClass("".concat(a.opts.theme,"-theme")))),this.$wp=null,this.$el=null,this.el=null,this.$box=null},isEmpty:function e(){return a.node.isEmpty(a.el)},getXHR:function i(e,t){var n=new XMLHttpRequest;for(var r in n.open(t,e,!0),a.opts.requestWithCredentials&&(n.withCredentials=!0),a.opts.requestHeaders)Object.prototype.hasOwnProperty.call(a.opts.requestHeaders,r)&&n.setRequestHeader(r,a.opts.requestHeaders[r]);return n},injectStyle:function s(e){if(a.opts.iframe){a.$head.find("style[data-fr-style], link[data-fr-style]").remove(),a.$head.append('<style data-fr-style="true">'.concat(e,"</style>"));for(var t=0;t<a.opts.iframeStyleFiles.length;t++){var n=r('<link data-fr-style="true" rel="stylesheet" href="'.concat(a.opts.iframeStyleFiles[t],'">'));n.get(0).addEventListener("load",a.size.syncIframe),a.$head.append(n)}}},hasFocus:function l(){return a.browser.mozilla&&a.helpers.isMobile()?a.selection.inEditor():a.node.hasFocus(a.el)||0<a.$el.find("*:focus").length},sameInstance:function c(e){if(!e)return!1;var t=e.data("instance");return!!t&&t.id===a.id}}},V.POPUP_TEMPLATES={"text.edit":"[_EDIT_]"},V.RegisterTemplate=function(e,t){V.POPUP_TEMPLATES[e]=t},V.MODULES.popups=function(h){var r,d=h.$;h.shared.popups||(h.shared.popups={});var u,C=h.shared.popups;function g(e,t){t.isVisible()||(t=h.$sc),t.is(C[e].data("container"))||(C[e].data("container",t),t.append(C[e]))}function o(e){var t;e.find(".fr-upload-progress").addClass("fr-height-set"),e.find(".fr-upload-progress").removeClass("fr-height-auto"),h.popups.get("filesManager.insert").removeClass("fr-height-auto"),e.find(".fr-files-upload-layer").hasClass("fr-active")&&(t=1),e.find(".fr-files-by-url-layer").hasClass("fr-active")&&(t=2),e.find(".fr-files-embed-layer").hasClass("fr-active")&&(t=3),e.find(".fr-upload-progress-layer").get(0).clientHeight+10<e.find(".fr-upload-progress").get(0).clientHeight&&e.find(".fr-upload-progress").addClass("fr-height-auto"),400<e[0].clientHeight&&(e[0].childNodes[4].style.height="".concat(e[0].clientHeight-(e[0].childNodes[0].clientHeight+e[0].childNodes[t].clientHeight)-80,"px"))}var i=2e3;function a(){d(this).toggleClass("fr-not-empty",!0)}function s(){var e=d(this);e.toggleClass("fr-not-empty",""!==e.val())}function m(e){return C[e]&&h.node.hasClass(C[e],"fr-active")&&h.core.sameInstance(C[e])||!1}function v(e){for(var t in C)if(Object.prototype.hasOwnProperty.call(C,t)&&m(t)&&(void 0===e||C[t].data("instance")===e))return C[t];return!1}function n(e){var t=null;if(t="string"!=typeof e?e:C[e],"filesManager.insert"===e&&h.filesManager!==undefined&&h.filesManager.isChildWindowOpen())return!1;if(t&&h.node.hasClass(t,"fr-active")&&(t.removeClass("fr-active fr-above"),h.events.trigger("popups.hide.".concat(e)),h.$tb&&(1<h.opts.zIndex?h.$tb.css("zIndex",h.opts.zIndex+1):h.$tb.css("zIndex","")),h.events.disableBlur(),t.find("input, textarea, button").each(function(){this===this.ownerDocument.activeElement&&this.blur()}),t.find("input, textarea").attr("disabled","disabled"),u))for(var n=0;n<u.length;n++)d(u[n]).removeClass("fr-btn-active-popup")}function b(e){for(var t in void 0===e&&(e=[]),C)Object.prototype.hasOwnProperty.call(C,t)&&e.indexOf(t)<0&&n(t)}function t(){h.shared.exit_flag=!0}function L(){h.shared.exit_flag=!1}function l(){return h.shared.exit_flag}function c(e,t){var n,r=function c(e,t){var n=V.POPUP_TEMPLATES[e];if(!n)return null;for(var r in"function"==typeof n&&(n=n.apply(h)),t)Object.prototype.hasOwnProperty.call(t,r)&&(n=n.replace("[_".concat(r.toUpperCase(),"_]"),t[r]));return n}(e,t),o=d(h.doc.createElement("DIV"));if(!r)return"filesManager.insert"===e?o.addClass("fr-popup fr-files-manager fr-empty"):o.addClass("fr-popup fr-empty"),(n=d("body").first()).append(o),o.data("container",n),C[e]=o;"filesManager.insert"===e?o.addClass("fr-popup fr-files-manager".concat(h.helpers.isMobile()?" fr-mobile":" fr-desktop").concat(h.opts.toolbarInline?" fr-inline":"")):o.addClass("fr-popup".concat(h.helpers.isMobile()?" fr-mobile":" fr-desktop").concat(h.opts.toolbarInline?" fr-inline":"")),o.html(r),h.opts.theme&&o.addClass("".concat(h.opts.theme,"-theme")),1<h.opts.zIndex&&(!h.opts.editInPopup&&h.$tb?h.$tb.css("z-index",h.opts.zIndex+2):o.css("z-index",h.opts.zIndex+2)),"auto"!==h.opts.direction&&o.removeClass("fr-ltr fr-rtl").addClass("fr-".concat(h.opts.direction)),o.find("input, textarea").attr("dir",h.opts.direction).attr("disabled","disabled"),(n=d("body").first()).append(o),o.data("container",n);var i=(C[e]=o).find(".fr-color-hex-layer");if(0<i.length){var a=h.helpers.getPX(o.find(".fr-color-set > span").css("width")),s=h.helpers.getPX(i.css("paddingLeft")),l=h.helpers.getPX(i.css("paddingRight"));i.css("width",a*h.opts.colorsStep+s+l)}return h.button.bindCommands(o,!1),o}function E(o){var i=C[o];return{_windowResize:function(){var e=i.data("instance")||h;!e.helpers.isMobile()&&i.isVisible()&&(e.events.disableBlur(),e.popups.hide(o),e.events.enableBlur())},_inputFocus:function(e){var t=i.data("instance")||h,n=d(e.currentTarget);if(n.is("input:file")&&n.closest(".fr-layer").addClass("fr-input-focus"),e.preventDefault(),e.stopPropagation(),setTimeout(function(){t.events.enableBlur()},100),t.helpers.isMobile()){var r=d(t.o_win).scrollTop();setTimeout(function(){d(t.o_win).scrollTop(r)},0)}},_inputBlur:function(e){var t=i.data("instance")||h,n=d(e.currentTarget);n.is("input:file")&&n.closest(".fr-layer").removeClass("fr-input-focus"),document.activeElement!==this&&d(this).isVisible()&&(t.events.blurActive()&&t.events.trigger("blur"),t.events.enableBlur())},_editorKeydown:function(e){var t=i.data("instance")||h;t.keys.ctrlKey(e)||e.which===V.KEYCODE.ALT||e.which===V.KEYCODE.ESC||(m(o)&&i.findVisible(".fr-back").length?t.button.exec(i.findVisible(".fr-back").first()):e.which!==V.KEYCODE.ALT&&t.popups.hide(o))},_preventFocus:function(e){var t=i.data("instance")||h,n=e.originalEvent?e.originalEvent.target||e.originalEvent.originalTarget:null;"mouseup"===e.type||d(n).is(":focus")||t.events.disableBlur(),"mouseup"!==e.type||d(n).hasClass("fr-command")||0<d(n).parents(".fr-command").length||d(n).hasClass("fr-dropdown-content")||h.button.hideActiveDropdowns(i),(h.browser.safari||h.browser.mozilla)&&"mousedown"===e.type&&d(n).is("input[type=file]")&&t.events.disableBlur();var r="input, textarea, button, select, label, .fr-command";if(n&&!d(n).is(r)&&0===d(n).parents(r).length)return e.stopPropagation(),!1;n&&d(n).is(r)&&e.stopPropagation(),L()},_editorMouseup:function(){i.isVisible()&&l()&&0<i.findVisible("input:focus, textarea:focus, button:focus, select:focus").length&&h.events.disableBlur()},_windowMouseup:function(e){if(!h.core.sameInstance(i))return!0;var t=i.data("instance")||h;i.isVisible()&&l()&&(e.stopPropagation(),t.markers.remove(),t.popups.hide(o),L())},_windowKeydown:function(e){if(!h.core.sameInstance(i))return!0;var t=i.data("instance")||h,n=e.which;if(V.KEYCODE.ESC===n){if(t.popups.isVisible(o)&&t.opts.toolbarInline)return e.stopPropagation(),t.popups.isVisible(o)&&(i.findVisible(".fr-back").length?(t.button.exec(i.findVisible(".fr-back").first()),t.accessibility.focusPopupButton(i)):i.findVisible(".fr-dismiss").length?t.button.exec(i.findVisible(".fr-dismiss").first()):(t.popups.hide(o),t.toolbar.showInline(null,!0),t.accessibility.focusPopupButton(i))),!1;if(t.popups.isVisible(o))return i.findVisible(".fr-back").length?(t.button.exec(i.findVisible(".fr-back").first),t.accessibility.focusPopupButton(i)):i.findVisible(".fr-dismiss").length?t.button.exec(i.findVisible(".fr-dismiss").first()):(t.popups.hide(o),t.accessibility.focusPopupButton(i)),!1}},_repositionPopup:function(){if(!h.opts.height&&!h.opts.heightMax||h.opts.toolbarInline)return!0;if(h.$wp&&m(o)&&i.parent().get(0)===h.$sc.get(0)){var e=i.offset().top-h.$wp.offset().top,t=h.$wp.outerHeight();h.node.hasClass(i.get(0),"fr-above")&&(e+=i.outerHeight());var n=h.image.getEl(),r=n&&n.get(0).getBoundingClientRect().top;(!h.opts.iframe&&n&&n.offset().top>t||t<e||e<0)&&(t+100<r||r<-90)?i.addClass("fr-hidden"):i.removeClass("fr-hidden")}},handleWindowClick:function(e){if(!h.core.sameInstance(i))return!0;var t=i.data("instance")||h;i.isVisible()&&e.target&&(0<d(e.target).find("body").length||"BODY"===d(e.target)[0].tagName)&&(e.stopPropagation(),t.popups.hide(o))}}}function f(e,t){h.events.on("mouseup",e._editorMouseup,!0),h.$wp&&h.events.on("keydown",e._editorKeydown),h.events.on("focus",function(){C[t].removeClass("focused")}),h.events.on("blur",function(){v()&&h.markers.remove(),h.helpers.isMobile()?C[t].hasClass("focused")?(b(),C[t].removeClass("focused")):C[t].addClass("focused"):C[t].find("iframe").length||b()}),h.$wp&&!h.helpers.isMobile()&&h.events.$on(h.$wp,"scroll.popup".concat(t),e._repositionPopup),h.events.on("window.mouseup",e._windowMouseup,!0),h.events.on("window.keydown",e._windowKeydown,!0),h.opts.iframe&&window.addEventListener("click",e.handleWindowClick),C[t].data("inst".concat(h.id),!0),h.events.on("destroy",function(){h.core.sameInstance(C[t])&&(d("body").first().append(C[t]),C[t].removeClass("fr-active"))},!0)}function p(){var e=d(this).prev().children().first();e.attr("checked",!e.attr("checked"))}function e(){for(var e in C)if(Object.prototype.hasOwnProperty.call(C,e)){var t=C[e];t&&(t.html("").removeData().remove(),C[e]=null)}C=[]}return h.shared.exit_flag=!1,{_init:function y(){r=window.innerHeight,h.events.on("shared.destroy",e,!0),h.events.on("window.mousedown",t),h.events.on("window.touchmove",L),h.events.$on(d(h.o_win),"scroll",L),h.events.on("mousedown",function(e){v()&&(e.stopPropagation(),h.$el.find(".fr-marker").remove(),t(),h.events.disableBlur())})},create:function S(e,t){var n=c(e,t),r=E(e);f(r,e),h.events.$on(n,"mousedown mouseup touchstart touchend touch","*",r._preventFocus,!0),h.events.$on(n,"focus","input, textarea, button, select",r._inputFocus,!0),h.events.$on(n,"blur","input, textarea, button, select",r._inputBlur,!0);var o=n.find("input, textarea");return function i(e){for(var t=0;t<e.length;t++){var n=e[t],r=d(n);0===r.next().length&&r.attr("placeholder")&&(r.after('<label for="'.concat(r.attr("id"),'">').concat(r.attr("placeholder"),"</label>")),r.attr("placeholder",""))}}(o),h.events.$on(o,"focus",a),h.events.$on(o,"blur change",s),h.events.$on(n,"click",".fr-checkbox + label",p),h.accessibility.registerPopup(e),h.helpers.isIOS()&&h.events.$on(n,"touchend","label",function(){d("#".concat(d(this).attr("for"))).prop("checked",function(e,t){return!t})},!0),h.events.$on(d(h.o_win),"resize",r._windowResize,!0),"filesManager.insert"===e&&C["filesManager.insert"].css("zIndex",2147483641),n},get:function M(e){var t=C[e];return t&&!t.data("inst".concat(h.id))&&f(E(e),e),t},show:function T(e,t,n,r,o){if(m(e)||(v()&&0<h.$el.find(".fr-marker").length?(h.events.disableBlur(),h.selection.restore()):v()||(h.events.disableBlur(),h.events.focus(),h.events.enableBlur())),b([e]),!C[e])return!1;var i=h.button.getButtons(".fr-dropdown.fr-active");i.removeClass("fr-active").attr("aria-expanded",!1).parents(".fr-toolbar").css("zIndex","").find("> .fr-dropdown-wrapper").css("height",""),i.next().attr("aria-hidden",!0).css("overflow","").find("> .fr-dropdown-wrapper").css("height",""),C[e].data("instance",h),h.$tb&&h.$tb.data("instance",h);var a=m(e);C[e].addClass("fr-active").removeClass("fr-hidden").find("input, textarea").removeAttr("disabled");var s=C[e].data("container");if(function p(e,t){t.isVisible()||(t=h.$sc),t.contains([C[e].get(0)])||t.append(C[e])}(e,s),h.opts.toolbarInline&&s&&h.$tb&&s.get(0)===h.$tb.get(0)&&(g(e,h.$sc),n=h.$tb.offset().top-h.helpers.getPX(h.$tb.css("margin-top")),t=h.$tb.offset().left+h.$tb.outerWidth()/2,h.node.hasClass(h.$tb.get(0),"fr-above")&&n&&(n+=h.$tb.outerHeight()),r=0),s=C[e].data("container"),h.opts.iframe&&!r&&!a){var l=h.helpers.getPX(h.$wp.find(".fr-iframe").css("padding-top")),c=h.helpers.getPX(h.$wp.find(".fr-iframe").css("padding-left"));t&&(t-=h.$iframe.offset().left+c),n&&(n-=h.$iframe.offset().top+l)}s.is(h.$tb)?h.$tb.css("zIndex",(h.opts.zIndex||1)+4):C[e].css("zIndex",(h.opts.zIndex||1)+3),h.opts.toolbarBottom&&s&&h.$tb&&s.get(0)===h.$tb.get(0)&&(C[e].addClass("fr-above"),n&&(n-=C[e].outerHeight())),o&&(t-=C[e].width()/2),t+C[e].outerWidth()>h.$sc.offset().left+h.$sc.width()&&(t-=t+C[e].outerWidth()-h.$sc.offset().left-h.$sc.width()),t<h.$sc.offset().left&&"rtl"===h.opts.direction&&(t=h.$sc.offset().left),C[e].removeClass("fr-active"),h.position.at(t,n,C[e],r||0);var d=h.node.blockParent(h.selection.blocks()[0]);if(d&&"false"===d.getAttribute("contenteditable"))C[e].removeClass("fr-active");else{var f=h.selection.element().parentElement.getAttribute("contenteditable");f&&"false"===f?C[e].removeClass("fr-active"):C[e].addClass("fr-active")}a||h.accessibility.focusPopup(C[e]),h.opts.toolbarInline&&h.toolbar.hide(),h.$tb&&(u=h.$tb.find(".fr-btn-active-popup")),h.events.trigger("popups.show.".concat(e)),E(e)._repositionPopup(),L()},hide:n,onHide:function N(e,t){h.events.on("popups.hide.".concat(e),t)},hideAll:b,setContainer:g,refresh:function A(e){C[e].data("instance",h),h.events.trigger("popups.refresh.".concat(e));for(var t=C[e].find(".fr-command"),n=0;n<t.length;n++){var r=d(t[n]);0===r.parents(".fr-dropdown-menu").length&&h.button.refresh(r)}},onRefresh:function x(e,t){h.events.on("popups.refresh.".concat(e),t)},onShow:function O(e,t){h.events.on("popups.show.".concat(e),t)},isVisible:m,setFileListHeight:o,areVisible:v,setPopupDimensions:function w(e,t){t&&e.find(".fr-upload-progress-layer").get(0).clientHeight<i&&(e.find(".fr-upload-progress").addClass("fr-height-auto"),h.popups.get("filesManager.insert").addClass("fr-height-auto"),e.find(".fr-upload-progress").removeClass("fr-height-set"),i=2e3),e.get(0).clientHeight>window.innerHeight/2&&(window.innerWidth<500?e.get(0).clientHeight>.6*r&&o(e):400<e.get(0).clientHeight&&o(e),i=e.find(".fr-upload-progress-layer").get(0).clientHeight);var n=window.innerWidth;switch(!0){case n<=320:e.width(200);break;case n<=420:e.width(250);break;case n<=520:e.width(300);break;case n<=720:e.width(400);break;case 720<n:e.width(530)}}}},V.MODULES.accessibility=function(f){var p=f.$,i=!0;function l(t){for(var e=f.$el.find('[contenteditable="true"]'),n=!1,r=0;e.get(r);)p(e.get(r)).is(":focus")&&(n=!0),r++;if(t&&t.length&&!n){t.data("blur-event-set")||t.parents(".fr-popup").length||(f.events.$on(t,"blur",function(){var e=t.parents(".fr-toolbar, .fr-popup").data("instance")||f;e.events.blurActive()&&!f.core.hasFocus()&&e.events.trigger("blur"),setTimeout(function(){e.events.enableBlur()},100)},!0),t.data("blur-event-set",!0));var o=t.parents(".fr-toolbar, .fr-popup").data("instance")||f;f.browser.safari&&(f.shared.safariSelection=f.selection.get().getRangeAt(0).cloneRange()),o.events.disableBlur(),t.get(0).focus(),f.shared.$f_el=t}}function h(e,t){var n=t?"last":"first",r=s(C(e))[n]();if(r.length)return l(r),!0}function a(e){return e.is("input, textarea, select")&&t(),f.events.disableBlur(),e.get(0).focus(),!0}function u(e,t){var n=e.find("input, textarea, button, select").filter(function(){return p(this).isVisible()}).not(":disabled");if((n=t?n.last():n.first()).length)return a(n);if(f.shared.with_kb){var r=e.findVisible(".fr-active-item").first();if(r.length)return a(r);var o=e.findVisible("[tabIndex]").first();if(o.length)return a(o)}}function t(){0===f.$el.find(".fr-marker").length&&f.core.hasFocus()&&f.selection.save()}function c(){var e=f.popups.areVisible();if(e){var t=e.find(".fr-buttons");return t.find("button:focus, .fr-group span:focus").length?!h(e.data("instance").$tb):!h(t)}return!h(f.$tb)}function d(){var e=null;return f.shared.$f_el.is(".fr-dropdown.fr-active")?e=f.shared.$f_el:f.shared.$f_el.closest(".fr-dropdown-menu").prev().is(".fr-dropdown.fr-active")&&(e=f.shared.$f_el.closest(".fr-dropdown-menu").prev()),e}function s(e){for(var t=-1,n=0;n<e.length;n++)p(e[n]).hasClass("fr-open")&&(t=n);var r=e.index(f.$tb.find(".fr-more-toolbar.fr-expanded > button.fr-command").first());if(0<r&&-1!==t){var o=e.slice(r,e.length),i=(e=e.slice(0,r)).slice(0,t+1),a=e.slice(t+1,e.length);e=i;for(var s=0;s<o.length;s++)e.push(o[s]);for(var l=0;l<a.length;l++)e.push(a[l])}return e}function C(e){return e.findVisible("button:not(.fr-disabled), .fr-group span.fr-command").filter(function(e){var t=p(e).parents(".fr-more-toolbar");return 0===t.length||0<t.length&&t.hasClass("fr-expanded")})}function n(e,t,n){if(f.shared.$f_el){var r=d();r&&(f.button.click(r),f.shared.$f_el=r);var o=s(C(e)),i=o.index(f.shared.$f_el);if(0===i&&!n||i===o.length-1&&n){var a;if(t){if(e.parent().is(".fr-popup"))a=!u(e.parent().children().not(".fr-buttons"),!n);!1===a&&(f.shared.$f_el=null)}t&&!1===a||h(e,!n)}else l(p(o.get(i+(n?1:-1))));return!1}}function g(e,t){return n(e,t,!0)}function m(e,t){return n(e,t)}function v(e){if(f.shared.$f_el){var t;if(f.shared.$f_el.is(".fr-dropdown.fr-active"))return l(t=e?f.shared.$f_el.next().find(".fr-command:not(.fr-disabled)").first():f.shared.$f_el.next().find(".fr-command:not(.fr-disabled)").last()),!1;if(f.shared.$f_el.is("a.fr-command"))return(t=e?f.shared.$f_el.closest("li").nextAllVisible().first().find(".fr-command:not(.fr-disabled)").first():f.shared.$f_el.closest("li").prevAllVisible().first().find(".fr-command:not(.fr-disabled)").first()).length||(t=e?f.shared.$f_el.closest(".fr-dropdown-menu").find(".fr-command:not(.fr-disabled)").first():f.shared.$f_el.closest(".fr-dropdown-menu").find(".fr-command:not(.fr-disabled)").last()),l(t),!1}}function b(){if(f.shared.$f_el){if(f.shared.$f_el.hasClass("fr-dropdown"))f.button.click(f.shared.$f_el);else if(f.shared.$f_el.is("button.fr-back")){f.opts.toolbarInline&&(f.events.disableBlur(),f.events.focus());var e=f.popups.areVisible(f);e&&(f.shared.with_kb=!1),f.button.click(f.shared.$f_el),E(e)}else{if(f.events.disableBlur(),f.button.click(f.shared.$f_el),f.shared.$f_el.attr("data-group-name")){var t=f.$tb.find('.fr-more-toolbar[data-name="'.concat(f.shared.$f_el.attr("data-group-name"),'"]')),n=f.shared.$f_el;t.hasClass("fr-expanded")&&(n=t.findVisible("button:not(.fr-disabled)").first()),n&&l(n)}else if(f.shared.$f_el.attr("data-popup")){var r=f.popups.areVisible(f);r&&r.data("popup-button",f.shared.$f_el)}else if(f.shared.$f_el.attr("data-modal")){var o=f.modals.areVisible(f);o&&o.data("modal-button",f.shared.$f_el)}f.shared.$f_el=null}return!1}}function L(){f.shared.$f_el&&(f.events.disableBlur(),f.shared.$f_el.blur(),f.shared.$f_el=null),!1!==f.events.trigger("toolbar.focusEditor")&&(f.events.disableBlur(),f.$el.get(0).focus(),f.events.focus())}function o(c){c&&c.length&&(f.events.$on(c,"keydown",function(e){if(!p(e.target).is("a.fr-command, button.fr-command, .fr-group span.fr-command"))return!0;var t=c.parents(".fr-popup").data("instance")||c.data("instance")||f;if(f.shared.with_kb=!0,f.browser.safari&&f.shared.safariSelection){var n=f.shared.safariSelection,r=n.startContainer,o=n.endContainer,i=n.startOffset,a=n.endOffset,s=f.doc.createRange();s.setStart(r,i),s.setEnd(o,a),f.selection.get().addRange(s)}var l=t.accessibility.exec(e,c);return f.shared.with_kb=!1,l},!0),f.events.$on(c,"mouseenter","[tabIndex]",function(e){var t=c.parents(".fr-popup").data("instance")||c.data("instance")||f;if(!i)return e.stopPropagation(),void e.preventDefault();var n=p(e.currentTarget);t.shared.$f_el&&t.shared.$f_el.not(n)&&t.accessibility.focusEditor()},!0),f.$tb&&f.events.$on(f.$tb,"transitionend",".fr-more-toolbar",function(){f.shared.$f_el=p(document.activeElement)}))}function E(e){var t=e.data("popup-button");t&&setTimeout(function(){l(t),e.data("popup-button",null)},0)}function y(e){var t=f.popups.areVisible(e);t&&t.data("popup-button",null)}function e(e){var t=-1!==navigator.userAgent.indexOf("Mac OS X")?e.metaKey:e.ctrlKey;if(e.which!==V.KEYCODE.F10||t||e.shiftKey||!e.altKey)return!0;f.shared.with_kb=!0;var n=f.popups.areVisible(f),r=!1;return n&&(r=u(n.children().not(".fr-buttons"))),r||c(),f.shared.with_kb=!1,e.preventDefault(),e.stopPropagation(),!1}return{_init:function r(){f.$wp?f.events.on("keydown",e,!0):f.events.$on(f.$win,"keydown",e,!0),f.events.on("mousedown",function(e){y(f),f.shared.$f_el&&f.el.isSameNode(f.shared.$f_el[0])&&(f.accessibility.restoreSelection(),e.stopPropagation(),f.events.disableBlur(),f.shared.$f_el=null)},!0),f.events.on("blur",function(){f.shared.$f_el=null,y(f)},!0)},registerPopup:function S(e){var t=f.popups.get(e),n=function r(c){var d=f.popups.get(c);return{_tiKeydown:function(e){var t=d.data("instance")||f;if(!1===t.events.trigger("popup.tab",[e]))return!1;var n=e.which,r=d.find(":focus").first();if(V.KEYCODE.TAB===n){e.preventDefault();var o=d.children().not(".fr-buttons"),i=o.findVisible("input, textarea, button, select").not(".fr-no-touch input, .fr-no-touch textarea, .fr-no-touch button, .fr-no-touch select, :disabled").toArray(),a=i.indexOf(this)+(e.shiftKey?-1:1);if(0<=a&&a<i.length)return t.events.disableBlur(),p(i[a]).focus(),e.stopPropagation(),!1;var s=d.find(".fr-buttons");if(s.length&&h(s,Boolean(e.shiftKey)))return e.stopPropagation(),!1;if(u(o))return e.stopPropagation(),!1}else{if(V.KEYCODE.ENTER!==n||!e.target||"TEXTAREA"===e.target.tagName)return V.KEYCODE.ESC===n?(e.preventDefault(),e.stopPropagation(),t.accessibility.restoreSelection(),t.popups.isVisible(c)&&d.findVisible(".fr-back").length?(t.opts.toolbarInline&&(t.events.disableBlur(),t.events.focus()),t.button.exec(d.findVisible(".fr-back").first()),E(d)):t.popups.isVisible(c)&&d.findVisible(".fr-dismiss").length?t.button.exec(d.findVisible(".fr-dismiss").first()):(t.popups.hide(c),t.opts.toolbarInline&&t.toolbar.showInline(null,!0),E(d)),!1):V.KEYCODE.SPACE===n&&(r.is(".fr-submit")||r.is(".fr-dismiss"))?(e.preventDefault(),e.stopPropagation(),t.events.disableBlur(),t.button.exec(r),!0):t.keys.isBrowserAction(e)?void e.stopPropagation():r.is("input[type=text], textarea")?void e.stopPropagation():V.KEYCODE.SPACE===n&&(r.is(".fr-link-attr")||r.is("input[type=file]"))?void e.stopPropagation():(e.stopPropagation(),e.preventDefault(),!1);var l=null;0<d.findVisible(".fr-submit").length?l=d.findVisible(".fr-submit").first():d.findVisible(".fr-dismiss").length&&(l=d.findVisible(".fr-dismiss").first()),l&&(e.preventDefault(),e.stopPropagation(),t.events.disableBlur(),t.button.exec(l))}},_tiMouseenter:function(){var e=d.data("instance")||f;y(e)}}}(e);o(t.find(".fr-buttons")),f.events.$on(t,"mouseenter","tabIndex",n._tiMouseenter,!0),f.events.$on(t.children().not(".fr-buttons"),"keydown","[tabIndex]",n._tiKeydown,!0),f.popups.onHide(e,function(){(t.data("instance")||f).accessibility.restoreSelection()}),f.popups.onShow(e,function(){i=!1,setTimeout(function(){i=!0},0)})},registerToolbar:o,focusToolbarElement:l,focusToolbar:h,focusContent:u,focusPopup:function M(r){var o=r.children().not(".fr-buttons");o.data("mouseenter-event-set")||(f.events.$on(o,"mouseenter","[tabIndex]",function(e){var t=r.data("instance")||f;if(!i)return e.stopPropagation(),void e.preventDefault();var n=o.find(":focus").first();n.length&&!n.is("input, button, textarea, select")&&(t.events.disableBlur(),n.blur(),t.events.disableBlur(),t.events.focus())}),o.data("mouseenter-event-set",!0)),!u(o)&&f.shared.with_kb&&h(r.find(".fr-buttons"))},focusModal:function T(e){f.core.hasFocus()||(f.events.disableBlur(),f.events.focus()),f.accessibility.saveSelection(),f.events.disableBlur(),f.el.blur(),f.selection.clear(),f.events.disableBlur(),f.shared.with_kb?e.find(".fr-command[tabIndex], [tabIndex]").first().focus():e.find("[tabIndex]").first().focus()},focusEditor:L,focusPopupButton:E,focusModalButton:function N(e){var t=e.data("modal-button");t&&setTimeout(function(){l(t),e.data("modal-button",null)},0)},hasFocus:function A(){return null!==f.shared.$f_el},exec:function x(e,t){var n=-1!==navigator.userAgent.indexOf("Mac OS X")?e.metaKey:e.ctrlKey,r=e.which,o=!1;return r!==V.KEYCODE.TAB||n||e.shiftKey||e.altKey?r!==V.KEYCODE.ARROW_RIGHT||n||e.shiftKey||e.altKey?r!==V.KEYCODE.TAB||n||!e.shiftKey||e.altKey?r!==V.KEYCODE.ARROW_LEFT||n||e.shiftKey||e.altKey?r!==V.KEYCODE.ARROW_UP||n||e.shiftKey||e.altKey?r!==V.KEYCODE.ARROW_DOWN||n||e.shiftKey||e.altKey?r!==V.KEYCODE.ENTER&&r!==V.KEYCODE.SPACE||n||e.shiftKey||e.altKey?r!==V.KEYCODE.ESC||n||e.shiftKey||e.altKey?r!==V.KEYCODE.F10||n||e.shiftKey||!e.altKey||(o=c()):o=function i(e){if(f.shared.$f_el){var t=d();return t?(f.button.click(t),l(t)):e.parent().findVisible(".fr-back").length?(f.shared.with_kb=!1,f.opts.toolbarInline&&(f.events.disableBlur(),f.events.focus()),f.button.exec(e.parent().findVisible(".fr-back")).first(),E(e.parent())):f.shared.$f_el.is("button, .fr-group span")&&(e.parent().is(".fr-popup")?(f.accessibility.restoreSelection(),f.shared.$f_el=null,!1!==f.events.trigger("toolbar.esc")&&(f.popups.hide(e.parent()),f.opts.toolbarInline&&f.toolbar.showInline(null,!0),E(e.parent()))):L()),!1}}(t):o=b():o=function a(){return f.shared.$f_el&&f.shared.$f_el.is(".fr-dropdown:not(.fr-active)")?b():v(!0)}():o=function s(){return v()}():o=m(t):o=m(t,!0):o=g(t):o=g(t,!0),f.shared.$f_el||void 0!==o||(o=!0),!o&&f.keys.isBrowserAction(e)&&(o=!0),!!o||(e.preventDefault(),e.stopPropagation(),!1)},saveSelection:t,restoreSelection:function O(){f.$el.find(".fr-marker").length&&(f.events.disableBlur(),f.selection.restore(),f.events.enableBlur())}}},Object.assign(V.DEFAULTS,{tooltips:!0}),V.MODULES.tooltip=function(s){var l=s.$;function r(){s.helpers.isMobile()||s.$tooltip&&s.$tooltip.removeClass("fr-visible").css("left","-3000px").css("position","fixed")}function o(e,t){if(!s.helpers.isMobile()){var n=e.attr("id")&&e.attr("id").split("-")[0],r=e.attr("title");if("trackChanges"===n)r=s.opts.trackChangesEnabled?"Disable Track Changes":"Enable Track Changes";else if("showChanges"===n)r=s.opts.showChangesEnabled?"Hide Changes":"Show Changes";else if(("applyAll"===n||"removeAll"===n||"applyLast"===n||"removeLast"===n)&&0===s.track_changes.getPendingChanges().length)return;if(e.data("title",r),e.data("title")){s.$tooltip||function a(){s.opts.tooltips&&!s.helpers.isMobile()&&(s.shared.$tooltip?s.$tooltip=s.shared.$tooltip:(s.shared.$tooltip=l(s.doc.createElement("DIV")).addClass("fr-tooltip"),s.$tooltip=s.shared.$tooltip,s.opts.theme&&s.$tooltip.addClass("".concat(s.opts.theme,"-theme")),l(s.o_doc).find("body").first().append(s.$tooltip)),s.events.on("shared.destroy",function(){s.$tooltip.html("").removeData().remove(),s.$tooltip=null},!0))}(),e.removeAttr("title"),s.$tooltip.text(s.language.translate(e.data("title"))),s.$tooltip.addClass("fr-visible");var o=e.offset().left+(e.outerWidth()-s.$tooltip.outerWidth())/2;o<0&&(o=0),o+s.$tooltip.outerWidth()>l(s.o_win).width()&&(o=l(s.o_win).width()-s.$tooltip.outerWidth()),void 0===t&&(t=s.opts.toolbarBottom),e.offset().top-l(window).scrollTop()+e.outerHeight()+10>=l(window).height()&&(t=!0);var i=t?e.offset().top-s.$tooltip.height():e.offset().top+e.outerHeight();s.$tooltip.css("position",""),s.$tooltip.css("left",o),s.$tooltip.css("top",Math.ceil(i)),"static"!==l(s.o_doc).find("body").first().css("position")?(s.$tooltip.css("margin-left",-l(s.o_doc).find("body").first().offset().left),s.$tooltip.css("margin-top",-l(s.o_doc).find("body").first().offset().top)):(s.$tooltip.css("margin-left",""),s.$tooltip.css("margin-top",""))}}}return{hide:r,to:o,bind:function i(e,t,n){s.opts.tooltips&&!s.helpers.isMobile()&&(s.events.$on(e,"mouseover",t,function(e){s.node.hasClass(e.currentTarget,"fr-disabled")||s.edit.isDisabled()||o(l(e.currentTarget),n)},!0),s.events.$on(e,"mouseout ".concat(s._mousedown," ").concat(s._mouseup),t,function(){r()},!0))}}},V.TOOLBAR_VISIBLE_BUTTONS=3,V.MODULES.button=function(C){var u=C.$,a=[];(C.opts.toolbarInline||C.opts.toolbarContainer)&&(C.shared.buttons||(C.shared.buttons=[]),a=C.shared.buttons);var s=[];function l(e,t,n){for(var r=u(),o=0;o<e.length;o++){var i=u(e[o]);if(i.is(t)&&(r=r.add(i)),n&&i.is(".fr-dropdown")){var a=i.next().find(t);r=r.add(a)}}return r}function g(e,t){var n,r=u();if(!e)return r;for(n in r=(r=r.add(l(a,e,t))).add(l(s,e,t)),C.shared.popups)if(Object.prototype.hasOwnProperty.call(C.shared.popups,n)){var o=C.shared.popups[n].children().find(e);r=r.add(o)}for(n in C.shared.modals)if(Object.prototype.hasOwnProperty.call(C.shared.modals,n)){var i=C.shared.modals[n].$modal.find(e);r=r.add(i)}return r}function o(e){var t=e.next(),n=C.node.hasClass(e.get(0),"fr-active"),r=g(".fr-dropdown.fr-active").not(e),o=e.parents(".fr-toolbar, .fr-popup").data("instance")||C;o.helpers.isIOS()&&!o.el.querySelector(".fr-marker")&&(o.selection.save(),o.selection.clear(),o.selection.restore()),t.parents(".fr-more-toolbar").addClass("fr-overflow-visible");var i=0,a=0,s=t.find("> .fr-dropdown-wrapper");if(!n){var l=e.data("cmd");t.find(".fr-command").removeClass("fr-active").attr("aria-selected",!1),V.COMMANDS[l]&&V.COMMANDS[l].refreshOnShow&&V.COMMANDS[l].refreshOnShow.apply(o,[e,t]),t.css("left",e.offset().left-e.parents(".fr-btn-wrap, .fr-toolbar, .fr-buttons").offset().left-("rtl"===C.opts.direction?t.width()-e.outerWidth():0)),t.addClass("test-height"),i=t.outerHeight(),a=C.helpers.getPX(s.css("max-height")),t.removeClass("test-height"),t.css("top","").css("bottom","");var c=e.outerHeight()/10;if(!C.opts.toolbarBottom&&t.offset().top+e.outerHeight()+i<u(C.o_doc).height())t.css("top",e.position().top+e.outerHeight()-c);else{var d=0,f=e.parents(".fr-more-toolbar");0<f.length&&(d=f.first().height()),t.css("bottom",e.parents(".fr-popup, .fr-toolbar").first().height()-d-e.position().top)}}(e.addClass("fr-blink").toggleClass("fr-active"),e.hasClass("fr-options"))&&e.prev().toggleClass("fr-expanded");e.hasClass("fr-active")?(t.attr("aria-hidden",!1),e.attr("aria-expanded",!0),function h(e,t,n){n<=t&&(e.parent().css("overflow","auto"),e.parent().css("overflow-x","hidden")),e.css("height",Math.min(t,n))}(s,i,a)):(t.attr("aria-hidden",!0).css("overflow",""),e.attr("aria-expanded",!1),s.css("height","")),setTimeout(function(){e.removeClass("fr-blink")},300),t.css("margin-left",""),t.offset().left+t.outerWidth()>C.$sc.offset().left+C.$sc.width()&&t.css("margin-left",-(t.offset().left+t.outerWidth()-C.$sc.offset().left-C.$sc.width())),t.offset().left<C.$sc.offset().left&&"rtl"===C.opts.direction&&t.css("margin-left",C.$sc.offset().left),r.removeClass("fr-active").attr("aria-expanded",!1).next().attr("aria-hidden",!0).css("overflow","").find("> .fr-dropdown-wrapper").css("height",""),r.prev(".fr-expanded").removeClass("fr-expanded"),r.parents(".fr-toolbar:not(.fr-inline)").css("zIndex",""),0!==e.parents(".fr-popup").length||C.opts.toolbarInline||(C.node.hasClass(e.get(0),"fr-active")?C.$tb.css("zIndex",(C.opts.zIndex||1)+4):C.$tb.css("zIndex",""));var p=t.find("a.fr-command.fr-active").first();C.helpers.isMobile()||(p.length?(C.accessibility.focusToolbarElement(p),s.scrollTop(Math.abs(p.parents(".fr-dropdown-content").offset().top-p.offset().top)-p.offset().top)):(C.accessibility.focusToolbarElement(e),s.scrollTop(0)))}function i(e){e.addClass("fr-blink"),setTimeout(function(){e.removeClass("fr-blink")},500);for(var t=e.data("cmd"),n=[];void 0!==e.data("param".concat(n.length+1));)n.push(e.data("param".concat(n.length+1)));var r=g(".fr-dropdown.fr-active");r.length&&(r.removeClass("fr-active").attr("aria-expanded",!1).next().attr("aria-hidden",!0).css("overflow","").find("> .fr-dropdown-wrapper").css("height",""),r.prev(".fr-expanded").removeClass("fr-expanded"),r.parents(".fr-toolbar:not(.fr-inline)").css("zIndex","")),e.parents(".fr-popup, .fr-toolbar").data("instance").commands.exec(t,n)}function t(e){var t=e.parents(".fr-popup, .fr-toolbar").data("instance");if(0===e.parents(".fr-popup").length&&e.data("popup")&&!e.hasClass("fr-btn-active-popup")&&e.addClass("fr-btn-active-popup"),0!==e.parents(".fr-popup").length||e.data("popup")||t.popups.hideAll(),t.popups.areVisible()&&!t.popups.areVisible(t)){for(var n=0;n<V.INSTANCES.length;n++)V.INSTANCES[n]!==t&&V.INSTANCES[n].popups&&V.INSTANCES[n].popups.areVisible()&&V.INSTANCES[n].$el.find(".fr-marker").remove();t.popups.hideAll()}C.node.hasClass(e.get(0),"fr-dropdown")?o(e):(!function r(e){i(e)}(e),V.COMMANDS[e.data("cmd")]&&!1!==V.COMMANDS[e.data("cmd")].refreshAfterCallback&&t.button.bulkRefresh())}function c(e){t(u(e.currentTarget))}function d(e){var t=e.find(".fr-dropdown.fr-active");t.length&&(t.removeClass("fr-active").attr("aria-expanded",!1).next().attr("aria-hidden",!0).css("overflow","").find("> .fr-dropdown-wrapper").css("height",""),t.parents(".fr-toolbar:not(.fr-inline)").css("zIndex",""),t.prev().removeClass("fr-expanded"))}function f(e){e.preventDefault(),e.stopPropagation()}function p(e){if(e.stopPropagation(),!C.helpers.isMobile())return!1}function m(e){var t=1<arguments.length&&arguments[1]!==undefined?arguments[1]:{},n=2<arguments.length?arguments[2]:undefined;if(C.helpers.isMobile()&&!1===t.showOnMobile)return"";var r=t.displaySelection;"function"==typeof r&&(r=r(C));var o="";if("options"!==t.type)if(r){var i="function"==typeof t.defaultSelection?t.defaultSelection(C):t.defaultSelection;o='<span style="width:'.concat(t.displaySelectionWidth||100,'px">').concat(C.language.translate(i||t.title),"</span>")}else o=C.icon.create(t.icon||e),o+='<span class="fr-sr-only">'.concat(C.language.translate(t.title)||"","</span>");var a=t.popup?' data-popup="true"':"",s=t.modal?' data-modal="true"':"",l=C.shortcuts.get("".concat(e,"."));l=l?" (".concat(l,")"):"";var c="".concat(e,"-").concat(C.id),d="dropdown-menu-".concat(c),f='<button id="'.concat(c,'"').concat(t.more_btn?' data-group-name="'.concat(c,'" '):"",'type="button" tabIndex="-1" role="button"').concat(t.toggle?' aria-pressed="false"':"").concat("dropdown"===t.type||"options"===t.type?' aria-controls="'.concat(d,'" aria-expanded="false" aria-haspopup="true"'):"").concat(t.disabled?' aria-disabled="true"':"",' title="').concat(C.language.translate(t.title)||"").concat(l,'" class="fr-command fr-btn').concat("dropdown"===t.type||"options"==t.type?" fr-dropdown":"").concat("options"==t.type?" fr-options":"").concat("more"==t.type?" fr-more":"").concat(t.displaySelection?" fr-selection":"").concat(t.back?" fr-back":"").concat(t.disabled?" fr-disabled":"").concat(n?"":" fr-hidden",'" data-cmd="').concat(e,'"').concat(a).concat(s,">").concat(o,"</button>");if("dropdown"===t.type||"options"===t.type){var p='<div id="'.concat(d,'" class="fr-dropdown-menu" role="listbox" aria-labelledby="').concat(c,'" aria-hidden="true"><div class="fr-dropdown-wrapper" role="presentation"><div class="fr-dropdown-content" role="presentation">');p+=function h(e,t){var n="";if(t.html)"function"==typeof t.html?n+=t.html.call(C):n+=t.html;else{var r=t.options;for(var o in"function"==typeof r&&(r=r()),n+='<ul class="fr-dropdown-list" role="presentation">',r)if(Object.prototype.hasOwnProperty.call(r,o)){var i=C.shortcuts.get("".concat(e,".").concat(o));i=i?'<span class="fr-shortcut">'.concat(i,"</span>"):"",n+='<li role="presentation"><a class="fr-command" tabIndex="-1" role="option" data-cmd="'.concat("options"===t.type?e.replace(/Options/g,""):e,'" data-param1="').concat(o,'" title="').concat(r[o],'">').concat(C.language.translate(r[o]),"</a></li>")}n+="</ul>"}return n}(e,t),f+=p+="</div></div></div>"}return t.hasOptions&&t.hasOptions.apply(C)&&(f='<div class="fr-btn-wrap">'.concat(f," ").concat(m(e+"Options",Object.assign({},t,{type:"options",hasOptions:!1}),n),"  </div>")),f}function e(o){var i=C.$tb&&C.$tb.data("instance")||C;if(!1===C.events.trigger("buttons.refresh"))return!0;setTimeout(function(){for(var e=i.selection.inEditor()&&i.core.hasFocus(),t=0;t<o.length;t++){var n=u(o[t]),r=n.data("cmd");0===n.parents(".fr-popup").length?e||V.COMMANDS[r]&&V.COMMANDS[r].forcedRefresh?i.button.refresh(n):C.node.hasClass(n.get(0),"fr-dropdown")||(n.removeClass("fr-active"),n.attr("aria-pressed")&&n.attr("aria-pressed",!1)):n.parents(".fr-popup").isVisible()&&i.button.refresh(n)}},0)}function n(){e(a),e(s)}function r(){a=[],s=[]}C.shared.popup_buttons||(C.shared.popup_buttons=[]),s=C.shared.popup_buttons;var h=null;function v(){clearTimeout(h),h=setTimeout(n,50)}return{_init:function b(){C.opts.toolbarInline?C.events.on("toolbar.show",n):(C.events.on("mouseup",v),C.events.on("keyup",v),C.events.on("blur",v),C.events.on("focus",v),C.events.on("contentChanged",v),C.helpers.isMobile()&&C.events.$on(C.$doc,"selectionchange",n)),C.events.on("shared.destroy",r)},build:m,buildList:function L(e,t){for(var n="",r=0;r<e.length;r++){var o=e[r],i=V.COMMANDS[o];i&&"undefined"!=typeof i.plugin&&C.opts.pluginsEnabled.indexOf(i.plugin)<0||(i?n+=m(o,i,void 0===t||0<=t.indexOf(o)):"|"===o?n+='<div class="fr-separator fr-vs" role="separator" aria-orientation="vertical"></div>':"-"===o&&(n+='<div class="fr-separator fr-hs" role="separator" aria-orientation="horizontal"></div>'))}return n},buildGroup:function E(e){var t="",n="";for(var r in e){var o=e[r];if(o.buttons){for(var i="",a="",s=0,l="left",c=V.TOOLBAR_VISIBLE_BUTTONS,d=0;d<o.buttons.length;d++){var f=o.buttons[d],p=V.COMMANDS[f];p||("|"==f?i+='<div class="fr-separator fr-vs" role="separator" aria-orientation="vertical"></div>':"-"==f&&(i+='<div class="fr-separator fr-hs" role="separator" aria-orientation="horizontal"></div>')),!p||p&&"undefined"!=typeof p.plugin&&C.opts.pluginsEnabled.indexOf(p.plugin)<0||(e[r].align!==undefined&&(l=e[r].align),e[r].buttonsVisible!==undefined&&(c=e[r].buttonsVisible),e.showMoreButtons&&c<=s?a+=m(f,p,!0):i+=m(f,p,!0),s++)}if(e.showMoreButtons&&c<s){var h=r,u=V.COMMANDS[h];u.more_btn=!0,i+=m(h,u,!0)}"trackChanges"!==r&&(t+='<div class="fr-btn-grp fr-float-'.concat(l,'">').concat(i,"</div>")),e.showMoreButtons&&0<a.length&&(n+='<div class="fr-more-toolbar" data-name="'.concat(r+"-"+C.id,'">').concat(a,"</div>"))}}return C.opts.toolbarBottom?C.helpers.isMobile()?'<div class="fr-bottom-extended">'.concat(n,"</div><div>").concat(t,"</div>"):"".concat(n,'<div class="fr-newline"></div>').concat(t):"".concat(t,'<div class="fr-newline"></div>').concat(n)},bindCommands:function y(t,e){C.events.bindClick(t,".fr-command:not(.fr-disabled)",c),C.events.$on(t,"".concat(C._mousedown," ").concat(C._mouseup," ").concat(C._move),".fr-dropdown-menu",f,!0),C.events.$on(t,"".concat(C._mousedown," ").concat(C._mouseup," ").concat(C._move),".fr-dropdown-menu .fr-dropdown-wrapper",p,!0);var n=t.get(0).ownerDocument,r="defaultView"in n?n.defaultView:n.parentWindow;function o(e){(!e||e.type===C._mouseup&&e.target!==u("html").get(0)||"keydown"===e.type&&(C.keys.isCharacter(e.which)&&!C.keys.ctrlKey(e)||e.which===V.KEYCODE.ESC))&&(d(t),C.opts.iframe&&function r(e){var t=e.find(".fr-popup.fr-active");if(t.length){t.removeClass("fr-active").attr("aria-expanded",!1).next().attr("aria-hidden",!0).css("overflow","").find("> .fr-dropdown-wrapper").css("height",""),t.parents(".fr-toolbar:not(.fr-inline)").css("zIndex",""),t.prev().removeClass("fr-expanded");var n=C.$tb.find(".fr-btn-active-popup");u(n[0]).removeClass("fr-btn-active-popup")}}(t))}C.events.$on(u(r),"".concat(C._mouseup," resize keydown"),o,!0),C.opts.iframe&&C.events.$on(C.$win,C._mouseup,o,!0),C.node.hasClass(t.get(0),"fr-popup")?u.merge(s,t.find(".fr-btn").toArray()):u.merge(a,t.find(".fr-btn").toArray()),C.tooltip.bind(t,".fr-btn, .fr-title",e)},refresh:function S(e){var t,n=e.parents(".fr-popup, .fr-toolbar").data("instance")||C,r=e.data("cmd");C.node.hasClass(e.get(0),"fr-dropdown")?t=e.next():(e.removeClass("fr-active"),e.attr("aria-pressed")&&e.attr("aria-pressed",!1)),V.COMMANDS[r]&&V.COMMANDS[r].refresh?V.COMMANDS[r].refresh.apply(n,[e,t]):C.refresh[r]&&n.refresh[r](e,t)},bulkRefresh:n,exec:i,click:t,hideActiveDropdowns:d,addButtons:function M(e){for(var t=0;t<e.length;t++)a.push(e[t])},getButtons:g,getPosition:function T(e){var t=e.offset().left,n=C.opts.toolbarBottom?10:e.outerHeight()-10;return{left:t,top:e.offset().top+n}}}},V.ICON_TEMPLATES={font_awesome:'<i class="fa fa-[NAME]" aria-hidden="true"></i>',font_awesome_5:'<i class="fas fa-[FA5NAME]" aria-hidden="true"></i>',font_awesome_5r:'<i class="far fa-[FA5NAME]" aria-hidden="true"></i>',font_awesome_5l:'<i class="fal fa-[FA5NAME]" aria-hidden="true"></i>',font_awesome_5b:'<i class="fab fa-[FA5NAME]" aria-hidden="true"></i>',text:'<span style="text-align: center;">[NAME]</span>',image:"<img src=[SRC] alt=[ALT] />",svg:'<svg class="fr-svg" focusable="false" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="[PATH]"/></svg>',empty:" "},V.ICONS={bold:{NAME:"bold",SVG_KEY:"bold"},italic:{NAME:"italic",SVG_KEY:"italic"},underline:{NAME:"underline",SVG_KEY:"underline"},strikeThrough:{NAME:"strikethrough",SVG_KEY:"strikeThrough"},subscript:{NAME:"subscript",SVG_KEY:"subscript"},superscript:{NAME:"superscript",SVG_KEY:"superscript"},cancel:{NAME:"cancel",SVG_KEY:"cancel"},color:{NAME:"tint",SVG_KEY:"textColor"},outdent:{NAME:"outdent",SVG_KEY:"outdent"},indent:{NAME:"indent",SVG_KEY:"indent"},undo:{NAME:"rotate-left",FA5NAME:"undo",SVG_KEY:"undo"},redo:{NAME:"rotate-right",FA5NAME:"redo",SVG_KEY:"redo"},insert:{NAME:"insert",SVG_KEY:"insert"},insertAll:{NAME:"insertAll",SVG_KEY:"insertAll"},insertHR:{NAME:"minus",SVG_KEY:"horizontalLine"},clearFormatting:{NAME:"eraser",SVG_KEY:"clearFormatting"},selectAll:{NAME:"mouse-pointer",SVG_KEY:"selectAll"},minimize:{NAME:"minimize",SVG_KEY:"minimize"},moreText:{NAME:"ellipsis-v",SVG_KEY:"textMore"},moreParagraph:{NAME:"ellipsis-v",SVG_KEY:"paragraphMore"},moreRich:{NAME:"ellipsis-v",SVG_KEY:"insertMore"},moreMisc:{NAME:"ellipsis-v",SVG_KEY:"more"}},V.DefineIconTemplate=function(e,t){V.ICON_TEMPLATES[e]=t},V.DefineIcon=function(e,t){V.ICONS[e]=t},Object.assign(V.DEFAULTS,{iconsTemplate:"svg"}),V.MODULES.icon=function(o){return{create:function i(n){var e=null,r=V.ICONS[n];if(void 0!==r){var t=r.template||V.ICON_DEFAULT_TEMPLATE||o.opts.iconsTemplate;t&&t.apply&&(t=t.apply(o)),r.FA5NAME||(r.FA5NAME=r.NAME),"svg"!==t||r.PATH||(r.PATH=V.SVG[r.SVG_KEY]||""),t&&(t=V.ICON_TEMPLATES[t])&&(e=t.replace(/\[([a-zA-Z0-9]*)\]/g,function(e,t){return"NAME"===t?r[t]||n:r[t]}))}return e||n},getTemplate:function r(e){var t=V.ICONS[e],n=o.opts.iconsTemplate;return void 0!==t?n=t.template||V.ICON_DEFAULT_TEMPLATE||o.opts.iconsTemplate:n},getFileIcon:function n(e){var t=V.FILEICONS[e];return void 0!==t?t:e}}},V.SVG={add:"M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6V13z",advancedImageEditor:"M3,17v2h6v-2H3z M3,5v2h10V5H3z M13,21v-2h8v-2h-8v-2h-2v6H13z M7,9v2H3v2h4v2h2V9H7z M21,13v-2H11v2H21z M15,9h2V7h4V5h-4  V3h-2V9z",alignCenter:"M9,18h6v-2H9V18z M6,11v2h12v-2H6z M3,6v2h18V6H3z",alignJustify:"M3,18h18v-2H3V18z M3,11v2h18v-2H3z M3,6v2h18V6H3z",alignLeft:"M3,18h6v-2H3V18z M3,11v2h12v-2H3z M3,6v2h18V6H3z",alignRight:"M15,18h6v-2h-6V18z M9,11v2h12v-2H9z M3,6v2h18V6H3z",anchors:"M16,4h-4H8C6.9,4,6,4.9,6,6v4v10l6-2.6l6,2.6V10V6C18,4.9,17.1,4,16,4z M16,17l-4-1.8L8,17v-7V6h4h4v4V17z",autoplay:"M 7.570312 0.292969 C 7.542969 0.292969 7.515625 0.292969 7.488281 0.296875 C 7.203125 0.324219 6.984375 0.539062 6.980469 0.792969 L 6.925781 3.535156 C 2.796875 3.808594 -0.0078125 6.425781 -0.0859375 10.09375 C -0.121094 11.96875 0.710938 13.6875 2.265625 14.921875 C 3.769531 16.117188 5.839844 16.796875 8.097656 16.828125 C 8.140625 16.828125 12.835938 16.898438 13.035156 16.886719 C 15.171875 16.796875 17.136719 16.128906 18.558594 15.003906 C 20.066406 13.816406 20.882812 12.226562 20.917969 10.40625 C 20.960938 8.410156 20.023438 6.605469 18.289062 5.335938 C 18.214844 5.277344 18.128906 5.230469 18.035156 5.203125 C 17.636719 5.074219 17.222656 5.199219 17 5.476562 L 15.546875 7.308594 C 15.304688 7.609375 15.363281 8.007812 15.664062 8.265625 C 16.351562 8.851562 16.707031 9.625 16.6875 10.5 C 16.652344 12.25 15.070312 13.390625 12.757812 13.535156 C 12.59375 13.539062 8.527344 13.472656 8.164062 13.464844 C 5.703125 13.429688 4.101562 12.191406 4.140625 10.3125 C 4.175781 8.570312 5.132812 7.46875 6.847656 7.199219 L 6.796875 9.738281 C 6.792969 9.992188 7 10.214844 7.285156 10.253906 C 7.3125 10.257812 7.339844 10.257812 7.367188 10.257812 C 7.503906 10.261719 7.632812 10.222656 7.738281 10.148438 L 14.039062 5.785156 C 14.171875 5.691406 14.253906 5.558594 14.253906 5.410156 C 14.257812 5.261719 14.1875 5.125 14.058594 5.027344 L 7.941406 0.414062 C 7.835938 0.335938 7.707031 0.292969 7.570312 0.292969 ",back:"M20 11L7.83 11 11.425 7.405 10.01 5.991 5.416 10.586 5.414 10.584 4 11.998 4.002 12 4 12.002 5.414 13.416 5.416 13.414 10.01 18.009 11.425 16.595 7.83 13 20 13 20 13 20 11 20 11Z",backgroundColor:"M9.91752,12.24082l7.74791-5.39017,1.17942,1.29591-6.094,7.20747L9.91752,12.24082M7.58741,12.652l4.53533,4.98327a.93412.93412,0,0,0,1.39531-.0909L20.96943,8.7314A.90827.90827,0,0,0,20.99075,7.533l-2.513-2.76116a.90827.90827,0,0,0-1.19509-.09132L7.809,11.27135A.93412.93412,0,0,0,7.58741,12.652ZM2.7939,18.52772,8.41126,19.5l1.47913-1.34617-3.02889-3.328Z",blockquote:"M10.31788,5l.93817,1.3226A12.88271,12.88271,0,0,0,8.1653,9.40125a5.54242,5.54242,0,0,0-.998,3.07866v.33733q.36089-.04773.66067-.084a4.75723,4.75723,0,0,1,.56519-.03691,2.87044,2.87044,0,0,1,2.11693.8427,2.8416,2.8416,0,0,1,.8427,2.09274,3.37183,3.37183,0,0,1-.8898,2.453A3.143,3.143,0,0,1,8.10547,19,3.40532,3.40532,0,0,1,5.375,17.7245,4.91156,4.91156,0,0,1,4.30442,14.453,9.3672,9.3672,0,0,1,5.82051,9.32933,14.75716,14.75716,0,0,1,10.31788,5Zm8.39243,0,.9369,1.3226a12.88289,12.88289,0,0,0-3.09075,3.07865,5.54241,5.54241,0,0,0-.998,3.07866v.33733q.33606-.04773.63775-.084a4.91773,4.91773,0,0,1,.58938-.03691,2.8043,2.8043,0,0,1,2.1042.83,2.89952,2.89952,0,0,1,.80578,2.10547,3.42336,3.42336,0,0,1-.86561,2.453A3.06291,3.06291,0,0,1,16.49664,19,3.47924,3.47924,0,0,1,13.742,17.7245,4.846,4.846,0,0,1,12.64721,14.453,9.25867,9.25867,0,0,1,14.17476,9.3898,15.26076,15.26076,0,0,1,18.71031,5Z",bold:"M15.25,11.8h0A3.68,3.68,0,0,0,17,9a3.93,3.93,0,0,0-3.86-4H6.65V19h7a3.74,3.74,0,0,0,3.7-3.78V15.1A3.64,3.64,0,0,0,15.25,11.8ZM8.65,7h4.2a2.09,2.09,0,0,1,2,1.3,2.09,2.09,0,0,1-1.37,2.61,2.23,2.23,0,0,1-.63.09H8.65Zm4.6,10H8.65V13h4.6a2.09,2.09,0,0,1,2,1.3,2.09,2.09,0,0,1-1.37,2.61A2.23,2.23,0,0,1,13.25,17Z",cancel:"M13.4,12l5.6,5.6L17.6,19L12,13.4L6.4,19L5,17.6l5.6-5.6L5,6.4L6.4,5l5.6,5.6L17.6,5L19,6.4L13.4,12z",cellBackground:"M16.6,12.4L7.6,3.5L6.2,4.9l2.4,2.4l-5.2,5.2c-0.6,0.6-0.6,1.5,0,2.1l5.5,5.5c0.3,0.3,0.7,0.4,1.1,0.4s0.8-0.1,1.1-0.4  l5.5-5.5C17.2,14,17.2,13,16.6,12.4z M5.2,13.5L10,8.7l4.8,4.8H5.2z M19,15c0,0-2,2.2-2,3.5c0,1.1,0.9,2,2,2s2-0.9,2-2  C21,17.2,19,15,19,15z",cellBorderColor:"M22,22H2v2h20V22z",cellOptions:"M20,5H4C2.9,5,2,5.9,2,7v10c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V7C22,5.9,21.1,5,20,5z M9.5,6.5h5V9h-5V6.5z M8,17.5H4  c-0.3,0-0.5-0.2-0.5-0.4c0,0,0,0,0,0V17v-2H8V17.5z M8,13.5H3.5v-3H8V13.5z M8,9H3.5V7c0-0.3,0.2-0.5,0.4-0.5c0,0,0,0,0,0H8V9z   M14.5,17.5h-5V15h5V17.5z M20.5,17c0,0.3-0.2,0.5-0.4,0.5c0,0,0,0,0,0H16V15h4.5V17z M20.5,13.5H16v-3h4.5V13.5z M20.5,9H16V6.5h4  c0.3,0,0.5,0.2,0.5,0.4c0,0,0,0,0,0V9z",cellStyle:"M20,19.9l0.9,3.6l-3.2-1.9l-3.3,1.9l0.8-3.6L12.3,17h3.8l1.7-3.5l1.4,3.5H23L20,19.9z M20,5H4C2.9,5,2,5.9,2,7v10  c0,1.1,0.9,2,2,2h7.5l-0.6-0.6L10,17.5H9.5V15h5.4l1.1-2.3v-2.2h4.5v3H20l0.6,1.5H22V7C22,5.9,21.1,5,20,5z M3.5,7  c0-0.3,0.2-0.5,0.4-0.5c0,0,0,0,0.1,0h4V9H3.5V7z M3.5,10.5H8v3H3.5V10.5z M4,17.5c-0.3,0-0.5-0.2-0.5-0.4c0,0,0,0,0-0.1v-2H8v2.5H4  z M14.5,9h-5V6.5h5V9z M20.5,9H16V6.5h4c0.3,0,0.5,0.2,0.5,0.4c0,0,0,0,0,0.1V9z",clearFormatting:"M11.48,10.09l-1.2-1.21L8.8,7.41,6.43,5,5.37,6.1,8.25,9,4.66,19h2l1.43-4h5.14l1.43,4h2l-.89-2.51L18.27,19l1.07-1.06L14.59,13.2ZM8.8,13l.92-2.56L12.27,13Zm.56-7.15L9.66,5h2l1.75,4.9Z",close:"M13.4,12l5.6,5.6L17.6,19L12,13.4L6.4,19L5,17.6l5.6-5.6L5,6.4L6.4,5l5.6,5.6L17.6,5L19,6.4L13.4,12z",codeView:"M9.4,16.6,4.8,12,9.4,7.4,8,6,2,12l6,6Zm5.2,0L19.2,12,14.6,7.4,16,6l6,6-6,6Z",cogs:"M18.877 12.907a6.459 6.459 0 0 0 0 -1.814l1.952 -1.526a0.468 0.468 0 0 0 0.111 -0.593l-1.851 -3.2a0.461 0.461 0 0 0 -0.407 -0.231 0.421 0.421 0 0 0 -0.157 0.028l-2.3 0.925a6.755 6.755 0 0 0 -1.563 -0.907l-0.352 -2.452a0.451 0.451 0 0 0 -0.453 -0.388h-3.7a0.451 0.451 0 0 0 -0.454 0.388L9.347 5.588A7.077 7.077 0 0 0 7.783 6.5l-2.3 -0.925a0.508 0.508 0 0 0 -0.166 -0.028 0.457 0.457 0 0 0 -0.4 0.231l-1.851 3.2a0.457 0.457 0 0 0 0.111 0.593l1.952 1.526A7.348 7.348 0 0 0 5.063 12a7.348 7.348 0 0 0 0.064 0.907L3.175 14.433a0.468 0.468 0 0 0 -0.111 0.593l1.851 3.2a0.461 0.461 0 0 0 0.407 0.231 0.421 0.421 0 0 0 0.157 -0.028l2.3 -0.925a6.74 6.74 0 0 0 1.564 0.907L9.7 20.864a0.451 0.451 0 0 0 0.454 0.388h3.7a0.451 0.451 0 0 0 0.453 -0.388l0.352 -2.452a7.093 7.093 0 0 0 1.563 -0.907l2.3 0.925a0.513 0.513 0 0 0 0.167 0.028 0.457 0.457 0 0 0 0.4 -0.231l1.851 -3.2a0.468 0.468 0 0 0 -0.111 -0.593Zm-0.09 2.029l-0.854 1.476 -2.117 -0.852 -0.673 0.508a5.426 5.426 0 0 1 -1.164 0.679l-0.795 0.323 -0.33 2.269h-1.7l-0.32 -2.269 -0.793 -0.322a5.3 5.3 0 0 1 -1.147 -0.662L8.2 15.56l-2.133 0.86 -0.854 -1.475 1.806 -1.411 -0.1 -0.847c-0.028 -0.292 -0.046 -0.5 -0.046 -0.687s0.018 -0.4 0.045 -0.672l0.106 -0.854L5.217 9.064l0.854 -1.475 2.117 0.851 0.673 -0.508a5.426 5.426 0 0 1 1.164 -0.679l0.8 -0.323 0.331 -2.269h1.7l0.321 2.269 0.792 0.322a5.3 5.3 0 0 1 1.148 0.661l0.684 0.526 2.133 -0.859 0.853 1.473 -1.8 1.421 0.1 0.847a5 5 0 0 1 0.046 0.679c0 0.193 -0.018 0.4 -0.045 0.672l-0.106 0.853ZM12 14.544A2.544 2.544 0 1 1 14.546 12 2.552 2.552 0 0 1 12 14.544Z",columns:"M20,5H4C2.9,5,2,5.9,2,7v10c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V7C22,5.9,21.1,5,20,5z M8,17.5H4c-0.3,0-0.5-0.2-0.5-0.4  c0,0,0,0,0,0V17v-2H8V17.5z M8,13.5H3.5v-3H8V13.5z M8,9H3.5V7c0-0.3,0.2-0.5,0.4-0.5c0,0,0,0,0,0H8V9z M20.5,17  c0,0.3-0.2,0.5-0.4,0.5c0,0,0,0,0,0H16V15h4.5V17z M20.5,13.5H16v-3h4.5V13.5z M20.5,9H16V6.5h4c0.3,0,0.5,0.2,0.5,0.4c0,0,0,0,0,0  V9z",edit:"M17,11.2L12.8,7L5,14.8V19h4.2L17,11.2z M7,16.8v-1.5l5.6-5.6l1.4,1.5l-5.6,5.6H7z M13.5,6.3l0.7-0.7c0.8-0.8,2.1-0.8,2.8,0  c0,0,0,0,0,0L18.4,7c0.8,0.8,0.8,2,0,2.8l-0.7,0.7L13.5,6.3z",exitFullscreen:"M5,16H8v3h2V14H5ZM8,8H5v2h5V5H8Zm6,11h2V16h3V14H14ZM16,8V5H14v5h5V8Z",fileInsert:"M 8.09375 12.75 L 5.90625 12.75 C 5.542969 12.75 5.25 12.394531 5.25 11.953125 L 5.25 6.375 L 2.851562 6.375 C 2.367188 6.375 2.121094 5.660156 2.464844 5.242188 L 6.625 0.1875 C 6.832031 -0.0585938 7.167969 -0.0585938 7.371094 0.1875 L 11.535156 5.242188 C 11.878906 5.660156 11.632812 6.375 11.148438 6.375 L 8.75 6.375 L 8.75 11.953125 C 8.75 12.394531 8.457031 12.75 8.09375 12.75 Z M 14 12.484375 L 14 16.203125 C 14 16.644531 13.707031 17 13.34375 17 L 0.65625 17 C 0.292969 17 0 16.644531 0 16.203125 L 0 12.484375 C 0 12.042969 0.292969 11.6875 0.65625 11.6875 L 4.375 11.6875 L 4.375 11.953125 C 4.375 12.980469 5.0625 13.8125 5.90625 13.8125 L 8.09375 13.8125 C 8.9375 13.8125 9.625 12.980469 9.625 11.953125 L 9.625 11.6875 L 13.34375 11.6875 C 13.707031 11.6875 14 12.042969 14 12.484375 Z M 10.609375 15.40625 C 10.609375 15.039062 10.363281 14.742188 10.0625 14.742188 C 9.761719 14.742188 9.515625 15.039062 9.515625 15.40625 C 9.515625 15.773438 9.761719 16.070312 10.0625 16.070312 C 10.363281 16.070312 10.609375 15.773438 10.609375 15.40625 Z M 12.359375 15.40625 C 12.359375 15.039062 12.113281 14.742188 11.8125 14.742188 C 11.511719 14.742188 11.265625 15.039062 11.265625 15.40625 C 11.265625 15.773438 11.511719 16.070312 11.8125 16.070312 C 12.113281 16.070312 12.359375 15.773438 12.359375 15.40625 Z M 12.359375 15.40625 ",fileManager:"M 0 5.625 L 20.996094 5.625 L 21 15.75 C 21 16.371094 20.410156 16.875 19.6875 16.875 L 1.3125 16.875 C 0.585938 16.875 0 16.371094 0 15.75 Z M 0 5.625 M 21 4.5 L 0 4.5 L 0 2.25 C 0 1.628906 0.585938 1.125 1.3125 1.125 L 6.921875 1.125 C 7.480469 1.125 8.015625 1.316406 8.40625 1.652344 L 9.800781 2.847656 C 10.195312 3.183594 10.730469 3.375 11.289062 3.375 L 19.6875 3.375 C 20.414062 3.375 21 3.878906 21 4.5 Z M 21 4.5",markdown:"M5.55006 17.75V7.35L8.96006 16.89H10.7101L14.2301 7.37V14.0729C14.3951 14.1551 14.5499 14.265 14.6875 14.4026L14.7001 14.4151V11.64C14.7001 10.8583 15.2127 10.1963 15.9201 9.97171V5H13.6801L10.0401 14.86L6.51006 5H4.00006V17.75H5.55006ZM17.2001 11.64C17.2001 11.2258 16.8643 10.89 16.4501 10.89C16.0359 10.89 15.7001 11.2258 15.7001 11.64V16.8294L13.9804 15.1097C13.6875 14.8168 13.2126 14.8168 12.9197 15.1097C12.6269 15.4026 12.6269 15.8775 12.9197 16.1703L15.9197 19.1703C16.2126 19.4632 16.6875 19.4632 16.9804 19.1703L19.9804 16.1703C20.2733 15.8775 20.2733 15.4026 19.9804 15.1097C19.6875 14.8168 19.2126 14.8168 18.9197 15.1097L17.2001 16.8294V11.64Z",fontAwesome:"M18.99018,13.98212V7.52679c-.08038-1.21875-1.33929-.683-1.33929-.683-2.933,1.39282-4.36274.61938-5.85938.15625a6.23272,6.23272,0,0,0-2.79376-.20062l-.00946.004A1.98777,1.98777,0,0,0,7.62189,5.106a.984.984,0,0,0-.17517-.05432c-.02447-.0055-.04882-.01032-.0736-.0149A.9565.9565,0,0,0,7.1908,5H6.82539a.9565.9565,0,0,0-.18232.0368c-.02472.00458-.04907.0094-.07348.01484a.985.985,0,0,0-.17523.05438,1.98585,1.98585,0,0,0-.573,3.49585v9.394A1.004,1.004,0,0,0,6.82539,19H7.1908a1.00406,1.00406,0,0,0,1.00409-1.00409V15.52234c3.64221-1.09827,5.19709.64282,7.09888.57587a5.57291,5.57291,0,0,0,3.25446-1.05805A1.2458,1.2458,0,0,0,18.99018,13.98212Z",fontFamily:"M16,19h2L13,5H11L6,19H8l1.43-4h5.14Zm-5.86-6L12,7.8,13.86,13Z",fontSize:"M20.75,19h1.5l-3-10h-1.5l-3,10h1.5L17,16.5h3Zm-3.3-4,1.05-3.5L19.55,15Zm-5.7,4h2l-5-14h-2l-5,14h2l1.43-4h5.14ZM5.89,13,7.75,7.8,9.61,13Z",fullscreen:"M7,14H5v5h5V17H7ZM5,10H7V7h3V5H5Zm12,7H14v2h5V14H17ZM14,5V7h3v3h2V5Z",help:"M11,17h2v2h-2V17z M12,5C9.8,5,8,6.8,8,9h2c0-1.1,0.9-2,2-2s2,0.9,2,2c0,2-3,1.7-3,5v1h2v-1c0-2.2,3-2.5,3-5  C16,6.8,14.2,5,12,5z",horizontalLine:"M5,12h14 M19,11H5v2h14V11z",imageAltText:"M19,7h-6v12h-2V7H5V5h6h2h6V7z",imageCaption:"M14.2,11l3.8,5H6l3-3.9l2.1,2.7L14,11H14.2z M8.5,11c0.8,0,1.5-0.7,1.5-1.5S9.3,8,8.5,8S7,8.7,7,9.5C7,10.3,7.7,11,8.5,11z   M22,6v12c0,1.1-0.9,2-2,2H4c-1.1,0-2-0.9-2-2V6c0-1.1,0.9-2,2-2h16C21.1,4,22,4.9,22,6z M20,8.8V6H4v12h16V8.8z M22,22H2v2h20V22z",imageClass:"M9.5,13.4l-2.9-2.9h3.8L12.2,7l1.4,3.5h3.8l-3,2.9l0.9,3.6L12,15.1L8.8,17L9.5,13.4z M22,6v12c0,1.1-0.9,2-2,2H4  c-1.1,0-2-0.9-2-2V6c0-1.1,0.9-2,2-2h16C21.1,4,22,4.9,22,6z M20,6H4v12h16V8.8V6z",imageDisplay:"M3,5h18v2H3V5z M13,9h8v2h-8V9z M13,13h8v2h-8V13z M3,17h18v2H3V17z M3,9h8v6H3V9z",imageManager:"M20,6h-7l-2-2H4C2.9,4,2,4.9,2,6v12c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V8C22,6.9,21.1,6,20,6z M20,18H4V6h6.2l2,2H20V18z   M18,16l-3.8-5H14l-2.9,3.8L9,12.1L6,16H18z M10,9.5C10,8.7,9.3,8,8.5,8S7,8.7,7,9.5S7.7,11,8.5,11S10,10.3,10,9.5z",imageSize:"M16.9,4c-0.3,0-0.5,0.2-0.8,0.3L3.3,13c-0.9,0.6-1.1,1.9-0.5,2.8l2.2,3.3c0.4,0.7,1.2,1,2,0.8c0.3,0,0.5-0.2,0.8-0.3  L20.7,11c0.9-0.6,1.1-1.9,0.5-2.8l-2.2-3.3C18.5,4.2,17.7,3.9,16.9,4L16.9,4z M16.9,9.9L18.1,9l-2-2.9L17,5.6c0.1,0,0.1-0.1,0.2-0.1  c0.2,0,0.4,0,0.5,0.2L19.9,9c0.2,0.2,0.1,0.5-0.1,0.7L7,18.4c-0.1,0-0.1,0.1-0.2,0.1c-0.2,0-0.4,0-0.5-0.2L4.1,15  c-0.2-0.2-0.1-0.5,0.1-0.7L5,13.7l2,2.9l1.2-0.8l-2-2.9L7.5,12l1.1,1.7l1.2-0.8l-1.1-1.7l1.2-0.8l2,2.9l1.2-0.8l-2-2.9l1.2-0.8  l1.1,1.7l1.2-0.8l-1.1-1.7L14.9,7L16.9,9.9z",indent:"M3,9v6l3-3L3,9z M3,19h18v-2H3V19z M3,7h18V5H3V7z M9,11h12V9H9V11z M9,15h12v-2H9V15z",inlineClass:"M9.9,13.313A1.2,1.2,0,0,1,9.968,13H6.277l1.86-5.2,1.841,5.148A1.291,1.291,0,0,1,11.212,12h.426l-2.5-7h-2l-5,14h2l1.43-4H9.9Zm2.651,6.727a2.884,2.884,0,0,1-.655-2.018v-2.71A1.309,1.309,0,0,1,13.208,14h3.113a3.039,3.039,0,0,1,2,1.092s1.728,1.818,2.964,2.928a1.383,1.383,0,0,1,.318,1.931,1.44,1.44,0,0,1-.19.215l-3.347,3.31a1.309,1.309,0,0,1-1.832.258h0a1.282,1.282,0,0,1-.258-.257l-1.71-1.728Zm2.48-3.96a.773.773,0,1,0,.008,0Z",inlineStyle:"M11.88,15h.7l.7-1.7-3-8.3h-2l-5,14h2l1.4-4Zm-4.4-2,1.9-5.2,1.9,5.2ZM15.4,21.545l3.246,1.949-.909-3.637L20.72,17H16.954l-1.429-3.506L13.837,17H10.071l2.857,2.857-.779,3.637Z",insert:"M13.889,11.611c-0.17,0.17-0.443,0.17-0.612,0l-3.189-3.187l-3.363,3.36c-0.171,0.171-0.441,0.171-0.612,0c-0.172-0.169-0.172-0.443,0-0.611l3.667-3.669c0.17-0.17,0.445-0.172,0.614,0l3.496,3.493C14.058,11.167,14.061,11.443,13.889,11.611 M18.25,10c0,4.558-3.693,8.25-8.25,8.25c-4.557,0-8.25-3.692-8.25-8.25c0-4.557,3.693-8.25,8.25-8.25C14.557,1.75,18.25,5.443,18.25,10 M17.383,10c0-4.07-3.312-7.382-7.383-7.382S2.618,5.93,2.618,10S5.93,17.381,10,17.381S17.383,14.07,17.383,10",insertEmbed:"M20.73889,15.45929a3.4768,3.4768,0,0,0-5.45965-.28662L9.5661,12.50861a3.49811,3.49811,0,0,0-.00873-1.01331l5.72174-2.66809a3.55783,3.55783,0,1,0-.84527-1.81262L8.70966,9.6839a3.50851,3.50851,0,1,0,.0111,4.63727l5.7132,2.66412a3.49763,3.49763,0,1,0,6.30493-1.526ZM18.00745,5.01056A1.49993,1.49993,0,1,1,16.39551,6.3894,1.49994,1.49994,0,0,1,18.00745,5.01056ZM5.99237,13.49536a1.49989,1.49989,0,1,1,1.61194-1.37878A1.49982,1.49982,0,0,1,5.99237,13.49536Zm11.78211,5.494a1.49993,1.49993,0,1,1,1.61193-1.37885A1.49987,1.49987,0,0,1,17.77448,18.98932Z",insertFile:"M7,3C5.9,3,5,3.9,5,5v14c0,1.1,0.9,2,2,2h10c1.1,0,2-0.9,2-2V7.6L14.4,3H7z M17,19H7V5h6v4h4V19z",insertImage:"M14.2,11l3.8,5H6l3-3.9l2.1,2.7L14,11H14.2z M8.5,11c0.8,0,1.5-0.7,1.5-1.5S9.3,8,8.5,8S7,8.7,7,9.5C7,10.3,7.7,11,8.5,11z   M22,6v12c0,1.1-0.9,2-2,2H4c-1.1,0-2-0.9-2-2V6c0-1.1,0.9-2,2-2h16C21.1,4,22,4.9,22,6z M20,8.8V6H4v12h16V8.8z",insertLink:"M11,17H7A5,5,0,0,1,7,7h4V9H7a3,3,0,0,0,0,6h4ZM17,7H13V9h4a3,3,0,0,1,0,6H13v2h4A5,5,0,0,0,17,7Zm-1,4H8v2h8Z",insertMore:"M16.5,13h-6v6h-2V13h-6V11h6V5h2v6h6Zm5,4.5A1.5,1.5,0,1,1,20,16,1.5,1.5,0,0,1,21.5,17.5Zm0-4A1.5,1.5,0,1,1,20,12,1.5,1.5,0,0,1,21.5,13.5Zm0-4A1.5,1.5,0,1,1,20,8,1.5,1.5,0,0,1,21.5,9.5Z",insertTable:"M20,5H4C2.9,5,2,5.9,2,7v2v1.5v3V15v2c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2v-2v-1.5v-3V9V7C22,5.9,21.1,5,20,5z M9.5,13.5v-3  h5v3H9.5z M14.5,15v2.5h-5V15H14.5z M9.5,9V6.5h5V9H9.5z M3.5,7c0-0.3,0.2-0.5,0.5-0.5h4V9H3.5V7z M3.5,10.5H8v3H3.5V10.5z M3.5,17  v-2H8v2.5H4C3.7,17.5,3.5,17.3,3.5,17z M20.5,17c0,0.3-0.2,0.5-0.5,0.5h-4V15h4.5V17z M20.5,13.5H16v-3h4.5V13.5z M16,9V6.5h4  c0.3,0,0.5,0.2,0.5,0.5v2H16z",insertVideo:"M15,8v8H5V8H15m2,2.5V7a1,1,0,0,0-1-1H4A1,1,0,0,0,3,7V17a1,1,0,0,0,1,1H16a1,1,0,0,0,1-1V13.5l2.29,2.29A1,1,0,0,0,21,15.08V8.91a1,1,0,0,0-1.71-.71Z",upload:"M12 6.66667a4.87654 4.87654 0 0 1 4.77525 3.92342l0.29618 1.50268 1.52794 0.10578a2.57021 2.57021 0 0 1 -0.1827 5.13478H6.5a3.49774 3.49774 0 0 1 -0.3844 -6.97454l1.06682 -0.11341L7.678 9.29387A4.86024 4.86024 0 0 1 12 6.66667m0 -2A6.871 6.871 0 0 0 5.90417 8.37 5.49773 5.49773 0 0 0 6.5 19.33333H18.41667a4.57019 4.57019 0 0 0 0.32083 -9.13A6.86567 6.86567 0 0 0 12 4.66667Zm0.99976 7.2469h1.91406L11.99976 9 9.08618 11.91357h1.91358v3H11V16h2V14h-0.00024Z",uploadFiles:"M12 6.66667a4.87654 4.87654 0 0 1 4.77525 3.92342l0.29618 1.50268 1.52794 0.10578a2.57021 2.57021 0 0 1 -0.1827 5.13478H6.5a3.49774 3.49774 0 0 1 -0.3844 -6.97454l1.06682 -0.11341L7.678 9.29387A4.86024 4.86024 0 0 1 12 6.66667m0 -2A6.871 6.871 0 0 0 5.90417 8.37 5.49773 5.49773 0 0 0 6.5 19.33333H18.41667a4.57019 4.57019 0 0 0 0.32083 -9.13A6.86567 6.86567 0 0 0 12 4.66667Zm0.99976 7.2469h1.91406L11.99976 9 9.08618 11.91357h1.91358v3H11V16h2V14h-0.00024Z",italic:"M11.76,9h2l-2.2,10h-2Zm1.68-4a1,1,0,1,0,1,1,1,1,0,0,0-1-1Z",search:"M15.5 14h-0.79l-0.28 -0.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09 -0.59 4.23 -1.57l0.27 0.28v0.79l5 4.99L20.49 19l-4.99 -5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z",lineHeight:"M6.25,7h2.5L5.25,3.5,1.75,7h2.5V17H1.75l3.5,3.5L8.75,17H6.25Zm4-2V7h12V5Zm0,14h12V17h-12Zm0-6h12V11h-12Z",linkStyles:"M19,17.9l0.9,3.6l-3.2-1.9l-3.3,1.9l0.8-3.6L11.3,15h3.8l1.7-3.5l1.4,3.5H22L19,17.9z M20,12c0,0.3-0.1,0.7-0.2,1h2.1  c0.1-0.3,0.1-0.6,0.1-1c0-2.8-2.2-5-5-5h-4v2h4C18.7,9,20,10.3,20,12z M14.8,11H8v2h3.3h2.5L14.8,11z M9.9,16.4L8.5,15H7  c-1.7,0-3-1.3-3-3s1.3-3,3-3h4V7H7c-2.8,0-5,2.2-5,5s2.2,5,5,5h3.5L9.9,16.4z",mention:"M12.4,5c-4.1,0-7.5,3.4-7.5,7.5S8.3,20,12.4,20h3.8v-1.5h-3.8c-3.3,0-6-2.7-6-6s2.7-6,6-6s6,2.7,6,6v1.1  c0,0.6-0.5,1.2-1.1,1.2s-1.1-0.6-1.1-1.2v-1.1c0-2.1-1.7-3.8-3.8-3.8s-3.7,1.7-3.7,3.8s1.7,3.8,3.8,3.8c1,0,2-0.4,2.7-1.1  c0.5,0.7,1.3,1.1,2.2,1.1c1.5,0,2.6-1.2,2.6-2.7v-1.1C19.9,8.4,16.6,5,12.4,5z M12.4,14.7c-1.2,0-2.3-1-2.3-2.2s1-2.3,2.3-2.3  s2.3,1,2.3,2.3S13.6,14.7,12.4,14.7z",minimize:"M5,12h14 M19,11H5v2h14V11z",more:"M13.5,17c0,0.8-0.7,1.5-1.5,1.5s-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5S13.5,16.2,13.5,17z M13.5,12c0,0.8-0.7,1.5-1.5,1.5 s-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5S13.5,11.2,13.5,12z M13.5,7c0,0.8-0.7,1.5-1.5,1.5S10.5,7.8,10.5,7s0.7-1.5,1.5-1.5 S13.5,6.2,13.5,7z",openLink:"M17,17H7V7h3V5H7C6,5,5,6,5,7v10c0,1,1,2,2,2h10c1,0,2-1,2-2v-3h-2V17z M14,5v2h1.6l-5.8,5.8l1.4,1.4L17,8.4V10h2V5H14z",orderedList:"M2.5,16h2v.5h-1v1h1V18h-2v1h3V15h-3Zm1-7h1V5h-2V6h1Zm-1,2H4.3L2.5,13.1V14h3V13H3.7l1.8-2.1V10h-3Zm5-5V8h14V6Zm0,12h14V16H7.5Zm0-5h14V11H7.5Z",outdent:"M3,12l3,3V9L3,12z M3,19h18v-2H3V19z M3,7h18V5H3V7z M9,11h12V9H9V11z M9,15h12v-2H9V15z",pageBreaker:"M3,9v6l3-3L3,9z M21,9H8V4h2v3h9V4h2V9z M21,20h-2v-3h-9v3H8v-5h13V20z M11,13H8v-2h3V13z M16,13h-3v-2h3V13z M21,13h-3v-2  h3V13z",paragraphFormat:"M10.15,5A4.11,4.11,0,0,0,6.08,8.18,4,4,0,0,0,10,13v6h2V7h2V19h2V7h2V5ZM8,9a2,2,0,0,1,2-2v4A2,2,0,0,1,8,9Z",paragraphMore:"M7.682,5a4.11,4.11,0,0,0-4.07,3.18,4,4,0,0,0,3.11,4.725h0l.027.005a3.766,3.766,0,0,0,.82.09v6h2V7h2V19h2V7h2V5ZM5.532,9a2,2,0,0,1,2-2v4A2,2,0,0,1,5.532,9Zm14.94,8.491a1.5,1.5,0,1,1-1.5-1.5A1.5,1.5,0,0,1,20.472,17.491Zm0-4a1.5,1.5,0,1,1-1.5-1.5A1.5,1.5,0,0,1,20.472,13.491Zm0-4a1.5,1.5,0,1,1-1.5-1.5A1.5,1.5,0,0,1,20.472,9.491Z",paragraphStyle:"M4,9c0-1.1,0.9-2,2-2v4C4.9,11,4,10.1,4,9z M16.7,20.5l3.2,1.9L19,18.8l3-2.9h-3.7l-1.4-3.5L15.3,16h-3.8l2.9,2.9l-0.9,3.6  L16.7,20.5z M10,17.4V19h1.6L10,17.4z M6.1,5c-1.9,0-3.6,1.3-4,3.2c-0.5,2.1,0.8,4.2,2.9,4.7c0,0,0,0,0,0h0.2C5.5,13,5.8,13,6,13v6  h2V7h2v7h2V7h2V5H6.1z",pdfExport:"M7,3C5.9,3,5,3.9,5,5v14c0,1.1,0.9,2,2,2h10c1.1,0,2-0.9,2-2V7.6L14.4,3H7z M17,19H7V5h6v4h4V19z M16.3,13.5  c-0.2-0.6-1.1-0.8-2.6-0.8c-0.1,0-0.1,0-0.2,0c-0.3-0.3-0.8-0.9-1-1.2c-0.2-0.2-0.3-0.3-0.4-0.6c0.2-0.7,0.2-1,0.3-1.5  c0.1-0.9,0-1.6-0.2-1.8c-0.4-0.2-0.7-0.2-0.9-0.2c-0.1,0-0.3,0.2-0.7,0.7c-0.2,0.7-0.1,1.8,0.6,2.8c-0.2,0.8-0.7,1.6-1,2.4  c-0.8,0.2-1.5,0.7-1.9,1.1c-0.7,0.7-0.9,1.1-0.7,1.6c0,0.3,0.2,0.6,0.7,0.6c0.3-0.1,0.3-0.2,0.7-0.3c0.6-0.3,1.2-1.7,1.7-2.4  c0.8-0.2,1.7-0.3,2-0.3c0.1,0,0.3,0,0.6,0c0.8,0.8,1.2,1.1,1.8,1.2c0.1,0,0.2,0,0.3,0c0.3,0,0.8-0.1,1-0.6  C16.4,14.1,16.4,13.9,16.3,13.5z M8.3,15.7c-0.1,0.1-0.2,0.1-0.2,0.1c0-0.1,0-0.3,0.6-0.8c0.2-0.2,0.6-0.3,0.9-0.7  C9,15,8.6,15.5,8.3,15.7z M11.3,9c0-0.1,0.1-0.2,0.1-0.2S11.6,9,11.5,10c0,0.1,0,0.3-0.1,0.7C11.3,10.1,11,9.5,11.3,9z M10.9,13.1  c0.2-0.6,0.6-1,0.7-1.5c0.1,0.1,0.1,0.1,0.2,0.2c0.1,0.2,0.3,0.7,0.7,0.9C12.2,12.8,11.6,13,10.9,13.1z M15.2,14.1  c-0.1,0-0.1,0-0.2,0c-0.2,0-0.7-0.2-1-0.7c1.1,0,1.6,0.2,1.6,0.6C15.5,14.1,15.4,14.1,15.2,14.1z",print:"M16.1,17c0-0.6,0.4-1,1-1c0.6,0,1,0.4,1,1s-0.4,1-1,1C16.5,18,16.1,17.6,16.1,17z M22,15v4c0,1.1-0.9,2-2,2H4  c-1.1,0-2-0.9-2-2v-4c0-1.1,0.9-2,2-2h1V5c0-1.1,0.9-2,2-2h7.4L19,7.6V13h1C21.1,13,22,13.9,22,15z M7,13h10V9h-4V5H7V13z M20,15H4  v4h16V15z",redo:"M13.6,9.4c1.7,0.3,3.2,0.9,4.6,2L21,8.5v7h-7l2.7-2.7C13,10.1,7.9,11,5.3,14.7c-0.2,0.3-0.4,0.5-0.5,0.8L3,14.6  C5.1,10.8,9.3,8.7,13.6,9.4z",removeTable:"M15,10v8H9v-8H15 M14,4H9.9l-1,1H6v2h12V5h-3L14,4z M17,8H7v10c0,1.1,0.9,2,2,2h6c1.1,0,2-0.9,2-2V8z",insertAll:"M 9.25 12 L 6.75 12 C 6.335938 12 6 11.664062 6 11.25 L 6 6 L 3.257812 6 C 2.703125 6 2.425781 5.328125 2.820312 4.933594 L 7.570312 0.179688 C 7.804688 -0.0546875 8.191406 -0.0546875 8.425781 0.179688 L 13.179688 4.933594 C 13.574219 5.328125 13.296875 6 12.742188 6 L 10 6 L 10 11.25 C 10 11.664062 9.664062 12 9.25 12 Z M 16 11.75 L 16 15.25 C 16 15.664062 15.664062 16 15.25 16 L 0.75 16 C 0.335938 16 0 15.664062 0 15.25 L 0 11.75 C 0 11.335938 0.335938 11 0.75 11 L 5 11 L 5 11.25 C 5 12.214844 5.785156 13 6.75 13 L 9.25 13 C 10.214844 13 11 12.214844 11 11.25 L 11 11 L 15.25 11 C 15.664062 11 16 11.335938 16 11.75 Z M 12.125 14.5 C 12.125 14.15625 11.84375 13.875 11.5 13.875 C 11.15625 13.875 10.875 14.15625 10.875 14.5 C 10.875 14.84375 11.15625 15.125 11.5 15.125 C 11.84375 15.125 12.125 14.84375 12.125 14.5 Z M 14.125 14.5 C 14.125 14.15625 13.84375 13.875 13.5 13.875 C 13.15625 13.875 12.875 14.15625 12.875 14.5 C 12.875 14.84375 13.15625 15.125 13.5 15.125 C 13.84375 15.125 14.125 14.84375 14.125 14.5 Z M 14.125 14.5 ",remove:"M15,10v8H9v-8H15 M14,4H9.9l-1,1H6v2h12V5h-3L14,4z M17,8H7v10c0,1.1,0.9,2,2,2h6c1.1,0,2-0.9,2-2V8z",replaceImage:"M16,5v3H4v2h12v3l4-4L16,5z M8,19v-3h12v-2H8v-3l-4,4L8,19z",row:"M20,5H4C2.9,5,2,5.9,2,7v2v1.5v3V15v2c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2v-2v-1.5v-3V9V7C22,5.9,21.1,5,20,5z M16,6.5h4  c0.3,0,0.5,0.2,0.5,0.5v2H16V6.5z M9.5,6.5h5V9h-5V6.5z M3.5,7c0-0.3,0.2-0.5,0.5-0.5h4V9H3.5V7z M8,17.5H4c-0.3,0-0.5-0.2-0.5-0.5  v-2H8V17.5z M14.5,17.5h-5V15h5V17.5z M20.5,17c0,0.3-0.2,0.5-0.5,0.5h-4V15h4.5V17z",selectAll:"M5,7h2V5C5.9,5,5,5.9,5,7z M5,11h2V9H5V11z M9,19h2v-2H9V19z M5,11h2V9H5V11z M15,5h-2v2h2V5z M17,5v2h2C19,5.9,18.1,5,17,5  z M7,19v-2H5C5,18.1,5.9,19,7,19z M5,15h2v-2H5V15z M11,5H9v2h2V5z M13,19h2v-2h-2V19z M17,11h2V9h-2V11z M17,19c1.1,0,2-0.9,2-2h-2  V19z M17,11h2V9h-2V11z M17,15h2v-2h-2V15z M13,19h2v-2h-2V19z M13,7h2V5h-2V7z M9,15h6V9H9V15z M11,11h2v2h-2V11z",smile:"M11.991,3A9,9,0,1,0,21,12,8.99557,8.99557,0,0,0,11.991,3ZM12,19a7,7,0,1,1,7-7A6.99808,6.99808,0,0,1,12,19Zm3.105-5.2h1.503a4.94542,4.94542,0,0,1-9.216,0H8.895a3.57808,3.57808,0,0,0,6.21,0ZM7.5,9.75A1.35,1.35,0,1,1,8.85,11.1,1.35,1.35,0,0,1,7.5,9.75Zm6.3,0a1.35,1.35,0,1,1,1.35,1.35A1.35,1.35,0,0,1,13.8,9.75Z",spellcheck:"M19.1,13.6l-5.6,5.6l-2.7-2.7l-1.4,1.4l4.1,4.1l7-7L19.1,13.6z M10.8,13.7l2.7,2.7l0.8-0.8L10.5,5h-2l-5,14h2l1.4-4h2.6  L10.8,13.7z M9.5,7.8l1.9,5.2H7.6L9.5,7.8z",star:"M12.1,7.7l1,2.5l0.4,0.9h1h2.4l-2.1,2l-0.6,0.6l0.2,0.9l0.6,2.3l-2.2-1.3L12,15.2l-0.8,0.5L9,17l0.5-2.5l0.1-0.8L9,13.1  l-2-2h2.5h0.9l0.4-0.8L12.1,7.7 M12.2,4L9.5,9.6H3.4L8,14.2L6.9,20l5.1-3.1l5.3,3.1l-1.5-5.8l4.8-4.6h-6.1L12.2,4L12.2,4z",strikeThrough:"M3,12.20294H21v1.5H16.63422a3.59782,3.59782,0,0,1,.34942,1.5929,3.252,3.252,0,0,1-1.31427,2.6997A5.55082,5.55082,0,0,1,12.20251,19a6.4421,6.4421,0,0,1-2.62335-.539,4.46335,4.46335,0,0,1-1.89264-1.48816,3.668,3.668,0,0,1-.67016-2.15546V14.704h.28723v-.0011h.34149v.0011H9.02v.11334a2.18275,2.18275,0,0,0,.85413,1.83069,3.69,3.69,0,0,0,2.32836.67926,3.38778,3.38778,0,0,0,2.07666-.5462,1.73346,1.73346,0,0,0,.7013-1.46655,1.69749,1.69749,0,0,0-.647-1.43439,3.00525,3.00525,0,0,0-.27491-.17725H3ZM16.34473,7.05981A4.18163,4.18163,0,0,0,14.6236,5.5462,5.627,5.627,0,0,0,12.11072,5,5.16083,5.16083,0,0,0,8.74719,6.06213,3.36315,3.36315,0,0,0,7.44006,8.76855a3.22923,3.22923,0,0,0,.3216,1.42786h2.59668c-.08338-.05365-.18537-.10577-.25269-.16064a1.60652,1.60652,0,0,1-.65283-1.30036,1.79843,1.79843,0,0,1,.68842-1.5108,3.12971,3.12971,0,0,1,1.96948-.55243,3.04779,3.04779,0,0,1,2.106.6687,2.35066,2.35066,0,0,1,.736,1.83258v.11341h2.00317V9.17346A3.90013,3.90013,0,0,0,16.34473,7.05981Z",subscript:"M10.4,12l3.6,3.6L12.6,17L9,13.4L5.4,17L4,15.6L7.6,12L4,8.4L5.4,7L9,10.6L12.6,7L14,8.4L10.4,12z M18.31234,19.674  l1.06812-1.1465c0.196-0.20141,0.37093-0.40739,0.5368-0.6088c0.15975-0.19418,0.30419-0.40046,0.432-0.617  c0.11969-0.20017,0.21776-0.41249,0.29255-0.6334c0.07103-0.21492,0.10703-0.43986,0.10662-0.66621  c0.00297-0.28137-0.04904-0.56062-0.1531-0.82206c-0.09855-0.24575-0.25264-0.46534-0.45022-0.6416  c-0.20984-0.18355-0.45523-0.32191-0.72089-0.40646c-0.63808-0.19005-1.3198-0.17443-1.94851,0.04465  c-0.28703,0.10845-0.54746,0.2772-0.76372,0.49487c-0.20881,0.20858-0.37069,0.45932-0.47483,0.73548  c-0.10002,0.26648-0.15276,0.54838-0.15585,0.833l-0.00364,0.237H17.617l0.00638-0.22692  c0.00158-0.12667,0.01966-0.25258,0.05377-0.37458c0.03337-0.10708,0.08655-0.20693,0.15679-0.29437  c0.07105-0.08037,0.15959-0.14335,0.25882-0.1841c0.22459-0.08899,0.47371-0.09417,0.7018-0.01458  c0.0822,0.03608,0.15559,0.08957,0.21509,0.15679c0.06076,0.07174,0.10745,0.15429,0.13761,0.24333  c0.03567,0.10824,0.05412,0.22141,0.05469,0.33538c-0.00111,0.08959-0.0118,0.17881-0.0319,0.26612  c-0.02913,0.10428-0.07076,0.20465-0.124,0.29893c-0.07733,0.13621-0.1654,0.26603-0.26338,0.38823  c-0.13438,0.17465-0.27767,0.34226-0.42929,0.50217l-2.15634,2.35315V21H21v-1.326H18.31234z",superscript:"M10.4,12,14,15.6,12.6,17,9,13.4,5.4,17,4,15.6,7.6,12,4,8.4,5.4,7,9,10.6,12.6,7,14,8.4Zm8.91234-3.326,1.06812-1.1465c.196-.20141.37093-.40739.5368-.6088a4.85745,4.85745,0,0,0,.432-.617,3.29,3.29,0,0,0,.29255-.6334,2.11079,2.11079,0,0,0,.10662-.66621,2.16127,2.16127,0,0,0-.1531-.82206,1.7154,1.7154,0,0,0-.45022-.6416,2.03,2.03,0,0,0-.72089-.40646,3.17085,3.17085,0,0,0-1.94851.04465,2.14555,2.14555,0,0,0-.76372.49487,2.07379,2.07379,0,0,0-.47483.73548,2.446,2.446,0,0,0-.15585.833l-.00364.237H18.617L18.62338,5.25a1.45865,1.45865,0,0,1,.05377-.37458.89552.89552,0,0,1,.15679-.29437.70083.70083,0,0,1,.25882-.1841,1.00569,1.00569,0,0,1,.7018-.01458.62014.62014,0,0,1,.21509.15679.74752.74752,0,0,1,.13761.24333,1.08893,1.08893,0,0,1,.05469.33538,1.25556,1.25556,0,0,1-.0319.26612,1.34227,1.34227,0,0,1-.124.29893,2.94367,2.94367,0,0,1-.26338.38823,6.41629,6.41629,0,0,1-.42929.50217L17.19709,8.92642V10H22V8.674Z",symbols:"M15.77493,16.98885a8.21343,8.21343,0,0,0,1.96753-2.57651,7.34824,7.34824,0,0,0,.6034-3.07618A6.09092,6.09092,0,0,0,11.99515,5a6.13347,6.13347,0,0,0-4.585,1.79187,6.417,6.417,0,0,0-1.756,4.69207,6.93955,6.93955,0,0,0,.622,2.97415,8.06587,8.06587,0,0,0,1.949,2.53076H5.41452V19h5.54114v-.04331h-.00147V16.84107a5.82825,5.82825,0,0,1-2.2052-2.2352A6.40513,6.40513,0,0,1,7.97672,11.447,4.68548,4.68548,0,0,1,9.07785,8.19191a3.73232,3.73232,0,0,1,2.9173-1.22462,3.76839,3.76839,0,0,1,2.91241,1.21489,4.482,4.482,0,0,1,1.11572,3.154,6.71141,6.71141,0,0,1-.75384,3.24732,5.83562,5.83562,0,0,1-2.22357,2.25759v2.11562H13.0444V19h5.54108V16.98885Z",tags:"M8.9749 7.47489a1.5 1.5 0 1 1 -1.5 1.5A1.5 1.5 0 0 1 8.9749 7.47489Zm3.78866 -3.12713L16.5362 8.12041l0.33565 0.33564 2.77038 2.77038a2.01988 2.01988 0 0 1 0.59 1.42 1.95518 1.95518 0 0 1 -0.5854 1.40455l0.00044 0.00043 -5.59583 5.59583 -0.00043 -0.00044a1.95518 1.95518 0 0 1 -1.40455 0.5854 1.98762 1.98762 0 0 1 -1.41 -0.58L8.45605 16.87185l-0.33564 -0.33565L4.35777 12.77357a1.99576 1.99576 0 0 1 -0.59 -1.42V9.36358l0 -3.59582a2.00579 2.00579 0 0 1 2 -2l3.59582 0h1.98995A1.98762 1.98762 0 0 1 12.76356 4.34776ZM15.46186 9.866l-0.33564 -0.33564L11.36359 5.76776H5.76776v5.59583L9.866 15.46186l2.7794 2.7794 5.5878 -5.60385 -0.001 -0.001Z",tableHeader:"M20,5H4C2.9,5,2,5.9,2,7v10c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V7C22,5.9,21.1,5,20,5z M8,17.5H4c-0.3,0-0.5-0.2-0.5-0.4  l0,0V17v-2H8V17.5z M8,13.5H3.5v-3H8V13.5z M14.5,17.5h-5V15h5V17.5z M14.5,13.5h-5v-3h5V13.5z M20.5,17c0,0.3-0.2,0.5-0.4,0.5l0,0  H16V15h4.5V17z M20.5,13.5H16v-3h4.5V13.5z M20.5,9h-4.4H16h-1.5h-5H8H7.9H3.5V7c0-0.3,0.2-0.5,0.4-0.5l0,0h4l0,0h8.2l0,0H20  c0.3,0,0.5,0.2,0.5,0.4l0,0V9z",tableStyle:"M20.0171,19.89752l.9,3.6-3.2-1.9-3.3,1.9.8-3.6-2.9-2.9h3.8l1.7-3.5,1.4,3.5h3.8ZM20,5H4A2.00591,2.00591,0,0,0,2,7V17a2.00591,2.00591,0,0,0,2,2h7.49115l-.58826-.58826L9.99115,17.5H9.5V14.9975h5.36511L16,12.66089V10.5h4.5v3h-.52783l.599,1.4975H22V7A2.00591,2.00591,0,0,0,20,5ZM3.5,7A.4724.4724,0,0,1,4,6.5H8V9H3.5Zm0,3.5H8v3H3.5Zm.5,7a.4724.4724,0,0,1-.5-.5V15H8v2.5Zm10.5-4h-5v-3h5Zm0-4.5h-5V6.5h5Zm6,0H16V6.5h4a.4724.4724,0,0,1,.5.5Z",textColor:"M15.2,13.494s-3.6,3.9-3.6,6.3a3.65,3.65,0,0,0,7.3.1v-.1C18.9,17.394,15.2,13.494,15.2,13.494Zm-1.47-1.357.669-.724L12.1,5h-2l-5,14h2l1.43-4h2.943A24.426,24.426,0,0,1,13.726,12.137ZM11.1,7.8l1.86,5.2H9.244Z",textMore:"M13.55,19h2l-5-14h-2l-5,14h2l1.4-4h5.1Zm-5.9-6,1.9-5.2,1.9,5.2Zm12.8,4.5a1.5,1.5,0,1,1-1.5-1.5A1.5,1.5,0,0,1,20.45,17.5Zm0-4a1.5,1.5,0,1,1-1.5-1.5A1.5,1.5,0,0,1,20.45,13.5Zm0-4A1.5,1.5,0,1,1,18.95,8,1.5,1.5,0,0,1,20.45,9.5Z",underline:"M19,20v2H5V20Zm-3-6.785a4,4,0,0,1-5.74,3.4A3.75,3.75,0,0,1,8,13.085V5.005H6v8.21a6,6,0,0,0,8,5.44,5.851,5.851,0,0,0,4-5.65v-8H16ZM16,5v0h2V5ZM8,5H6v0H8Z",undo:"M10.4,9.4c-1.7,0.3-3.2,0.9-4.6,2L3,8.5v7h7l-2.7-2.7c3.7-2.6,8.8-1.8,11.5,1.9c0.2,0.3,0.4,0.5,0.5,0.8l1.8-0.9  C18.9,10.8,14.7,8.7,10.4,9.4z",unlink:"M14.4,11l1.6,1.6V11H14.4z M17,7h-4v1.9h4c1.7,0,3.1,1.4,3.1,3.1c0,1.3-0.8,2.4-1.9,2.8l1.4,1.4C21,15.4,22,13.8,22,12  C22,9.2,19.8,7,17,7z M2,4.3l3.1,3.1C3.3,8.1,2,9.9,2,12c0,2.8,2.2,5,5,5h4v-1.9H7c-1.7,0-3.1-1.4-3.1-3.1c0-1.6,1.2-2.9,2.8-3.1  L8.7,11H8v2h2.7l2.3,2.3V17h1.7l4,4l1.4-1.4L3.4,2.9L2,4.3z",unorderedList:"M4,10.5c-0.8,0-1.5,0.7-1.5,1.5s0.7,1.5,1.5,1.5s1.5-0.7,1.5-1.5S4.8,10.5,4,10.5z M4,5.5C3.2,5.5,2.5,6.2,2.5,7  S3.2,8.5,4,8.5S5.5,7.8,5.5,7S4.8,5.5,4,5.5z M4,15.5c-0.8,0-1.5,0.7-1.5,1.5s0.7,1.5,1.5,1.5s1.5-0.7,1.5-1.5S4.8,15.5,4,15.5z   M7.5,6v2h14V6H7.5z M7.5,18h14v-2h-14V18z M7.5,13h14v-2h-14V13z",verticalAlignBottom:"M16,13h-3V3h-2v10H8l4,4L16,13z M3,19v2h18v-2H3z",verticalAlignMiddle:"M3,11v2h18v-2H3z M8,18h3v3h2v-3h3l-4-4L8,18z M16,6h-3V3h-2v3H8l4,4L16,6z",verticalAlignTop:"M8,11h3v10h2V11h3l-4-4L8,11z M21,5V3H3v2H21z",trackChanges:"M17.2 20H12.4599L13.9938 19.2076L14.0305 19.1886L14.0616 19.1612C14.1036 19.1242 14.1373 19.0786 14.1603 19.0275C14.1806 18.9825 14.1923 18.9342 14.1948 18.885H14.2H14.3384L14.4364 18.7874L14.7049 18.52H15.45C15.5747 18.52 15.6942 18.4705 15.7823 18.3823C15.8705 18.2942 15.92 18.1746 15.92 18.05C15.92 17.9253 15.8705 17.8058 15.7823 17.7176C15.7351 17.6704 15.6789 17.6343 15.6177 17.6109L17.33 15.9056V19.87C17.33 19.8871 17.3266 19.904 17.3201 19.9197C17.3136 19.9355 17.304 19.9499 17.2919 19.9619C17.2799 19.974 17.2655 19.9836 17.2497 19.9901C17.234 19.9966 17.2171 20 17.2 20ZM4.13 20H11.2508C11.2396 19.9629 11.2337 19.9242 11.2337 19.885C11.2337 19.8133 11.2533 19.7431 11.29 19.6819L11.2739 19.6734L11.8838 18.52H5C4.87535 18.52 4.7558 18.4705 4.66766 18.3823C4.57952 18.2942 4.53 18.1746 4.53 18.05C4.53 17.9253 4.57952 17.8058 4.66766 17.7176C4.7558 17.6295 4.87535 17.58 5 17.58H12.3809L12.3925 17.5582L12.4187 17.5284C12.4558 17.4864 12.5014 17.4527 12.5525 17.4297C12.5836 17.4156 12.6163 17.4057 12.6498 17.4001C12.6522 17.3065 12.6877 17.2166 12.7503 17.1467L13 17.37C12.9902 17.381 12.9847 17.3952 12.9847 17.41C12.9847 17.4247 12.9902 17.439 13 17.45L14.13 18.55H14.2L19.09 13.68V13.6L17.99 12.5C17.979 12.4902 17.9647 12.4847 17.95 12.4847C17.9352 12.4847 17.921 12.4902 17.91 12.5L13 17.37L12.7641 17.1322L15.1759 14.74H5C4.87535 14.74 4.7558 14.6905 4.66766 14.6023C4.57952 14.5142 4.53 14.3946 4.53 14.27C4.53 14.1453 4.57952 14.0258 4.66766 13.9376C4.7558 13.8495 4.87535 13.8 5 13.8H15.45C15.5747 13.8 15.6942 13.8495 15.7823 13.9376C15.8169 13.9722 15.8454 14.0115 15.8675 14.0541L17.33 12.6034V9.3H13.28C13.207 9.30976 13.133 9.30976 13.06 9.3C12.7697 9.22119 12.5113 9.05343 12.3212 8.82027C12.1311 8.58711 12.0187 8.30026 12 8V4H4.13C4.09552 4 4.06246 4.0137 4.03808 4.03808C4.0137 4.06246 4 4.09552 4 4.13V19.87C4 19.9045 4.0137 19.9375 4.03808 19.9619C4.06246 19.9863 4.09552 20 4.13 20ZM11.7889 20H11.8785C11.8902 19.9746 11.898 19.9475 11.9015 19.9197L11.8661 19.9866L11.8117 19.9578L13.84 18.91C13.8464 18.9044 13.8515 18.8974 13.855 18.8897C13.8585 18.8819 13.8603 18.8735 13.8603 18.865C13.8603 18.8565 13.8585 18.8481 13.855 18.8403C13.8515 18.8325 13.8464 18.8256 13.84 18.82L12.76 17.75C12.7544 17.7436 12.7474 17.7385 12.7397 17.735C12.7319 17.7315 12.7235 17.7297 12.715 17.7297C12.7065 17.7297 12.6981 17.7315 12.6903 17.735C12.6825 17.7385 12.6756 17.7436 12.67 17.75L11.57 19.83L11.5023 19.7942L11.58 19.85C11.5727 19.8602 11.5687 19.8724 11.5687 19.885C11.5687 19.8975 11.5727 19.9098 11.58 19.92L11.67 20H11.73L11.7642 19.9823L11.7889 20ZM13.1 4.65L16.6 8.15C16.6212 8.17232 16.6355 8.20028 16.6412 8.23051C16.6469 8.26075 16.6437 8.29199 16.6321 8.32048C16.6205 8.34898 16.6009 8.37352 16.5757 8.39117C16.5505 8.40882 16.5207 8.41883 16.49 8.42H13.06L12.83 8.19V4.76C12.8312 4.72925 12.8412 4.6995 12.8588 4.67429C12.8765 4.64909 12.901 4.62951 12.9295 4.6179C12.958 4.6063 12.9893 4.60315 13.0195 4.60884C13.0497 4.61453 13.0777 4.62882 13.1 4.65ZM11 6.72C11.0027 6.66089 10.9937 6.60183 10.9735 6.54621C10.9534 6.49058 10.9224 6.43948 10.8825 6.39582C10.8425 6.35216 10.7944 6.31681 10.7408 6.29179C10.6871 6.26677 10.6291 6.25257 10.57 6.25H5C4.88239 6.25773 4.77251 6.3113 4.69397 6.39918C4.61543 6.48707 4.57451 6.60226 4.58 6.72C4.57451 6.83774 4.61543 6.95293 4.69397 7.04082C4.77251 7.12871 4.88239 7.18227 5 7.19H10.6C10.714 7.1774 10.8189 7.12173 10.8933 7.03438C10.9676 6.94702 11.0058 6.83457 11 6.72ZM11.1 8.14001H5C4.87535 8.14001 4.7558 8.18953 4.66766 8.27767C4.57952 8.36582 4.53 8.48536 4.53 8.61001C4.53 8.73467 4.57952 8.85421 4.66766 8.94236C4.7558 9.0305 4.87535 9.08001 5 9.08001H11.1C11.2247 9.08001 11.3442 9.0305 11.4323 8.94236C11.5205 8.85421 11.57 8.73467 11.57 8.61001C11.57 8.48536 11.5205 8.36582 11.4323 8.27767C11.3442 8.18953 11.2247 8.14001 11.1 8.14001ZM5 11H15.45C15.5826 11 15.7098 10.9473 15.8036 10.8536C15.8973 10.7598 15.95 10.6326 15.95 10.5C15.95 10.3674 15.8973 10.2402 15.8036 10.1464C15.7098 10.0527 15.5826 10 15.45 10H5C4.86739 10 4.74021 10.0527 4.64645 10.1464C4.55268 10.2402 4.5 10.3674 4.5 10.5C4.5 10.6326 4.55268 10.7598 4.64645 10.8536C4.74021 10.9473 4.86739 11 5 11ZM5 12.86H11.1C11.2211 12.8523 11.3346 12.798 11.4166 12.7085C11.4986 12.6191 11.5428 12.5013 11.54 12.38C11.5427 12.2597 11.4982 12.1431 11.4159 12.0552C11.3337 11.9673 11.2202 11.9152 11.1 11.91H5C4.94089 11.9126 4.88286 11.9268 4.82924 11.9518C4.77562 11.9768 4.72746 12.0122 4.68752 12.0558C4.64758 12.0995 4.61664 12.1506 4.59648 12.2062C4.57631 12.2618 4.56731 12.3209 4.57 12.38C4.56451 12.5004 4.60649 12.6181 4.6869 12.7079C4.76731 12.7976 4.87974 12.8523 5 12.86ZM11.1 16.63H5C4.87535 16.63 4.7558 16.5805 4.66766 16.4923C4.57952 16.4042 4.53 16.2846 4.53 16.16C4.53 16.0353 4.57952 15.9158 4.66766 15.8276C4.7558 15.7395 4.87535 15.69 5 15.69H11.1C11.2247 15.69 11.3442 15.7395 11.4323 15.8276C11.5205 15.9158 11.57 16.0353 11.57 16.16C11.57 16.2846 11.5205 16.4042 11.4323 16.4923C11.3442 16.5805 11.2247 16.63 11.1 16.63ZM18.8503 11.592C18.7991 11.6175 18.7545 11.6544 18.72 11.7L18.26 12.14C18.2501 12.151 18.2447 12.1652 18.2447 12.18C18.2447 12.1947 18.2501 12.209 18.26 12.22L19.37 13.32C19.381 13.3298 19.3952 13.3353 19.41 13.3353C19.4247 13.3353 19.439 13.3298 19.45 13.32L19.86 12.91C19.9057 12.867 19.9421 12.8151 19.967 12.7575C19.9919 12.6998 20.0047 12.6377 20.0047 12.575C20.0047 12.5122 19.9919 12.4501 19.967 12.3925C19.9421 12.3349 19.9057 12.283 19.86 12.24L19.31 11.7C19.2755 11.6544 19.2309 11.6175 19.1797 11.592C19.1285 11.5666 19.0721 11.5533 19.015 11.5533C18.9578 11.5533 18.9014 11.5666 18.8503 11.592Z",showTrackChanges:"M17.2421 13.6048C17.2631 13.6136 17.2841 13.6226 17.305 13.6317V9.29505H13.2626C13.1897 9.30481 13.1159 9.30481 13.043 9.29505C12.7532 9.21632 12.4953 9.04872 12.3056 8.81577C12.1158 8.58283 12.0037 8.29625 11.985 7.99627V4H4.12976C4.09534 4 4.06234 4.01368 4.038 4.03804C4.01367 4.0624 4 4.09543 4 4.12988V19.8552C4 19.8896 4.01367 19.9227 4.038 19.947C4.06234 19.9714 4.09534 19.9851 4.12976 19.9851H13.4875C13.0501 19.8216 12.6281 19.6155 12.2277 19.3686C11.8529 19.1551 11.4911 18.9196 11.1442 18.6632C11.0697 18.6152 10.9982 18.5628 10.9302 18.5065H4.99812C4.87371 18.5065 4.75438 18.457 4.66641 18.3689C4.57843 18.2809 4.529 18.1614 4.529 18.0369C4.529 17.9124 4.57843 17.7929 4.66641 17.7049C4.75438 17.6168 4.87371 17.5673 4.99812 17.5673H10.4396C10.4472 17.4488 10.4756 17.3324 10.5235 17.2235C10.5939 17.017 10.6761 16.8149 10.7694 16.6182H4.99812C4.87371 16.6182 4.75438 16.5687 4.66641 16.4807C4.57843 16.3926 4.529 16.2732 4.529 16.1487C4.529 16.0241 4.57843 15.9047 4.66641 15.8166C4.75438 15.7286 4.87371 15.6791 4.99812 15.6791H11.0867C11.1576 15.6791 11.2268 15.6952 11.2895 15.7253C11.5204 15.361 11.7938 15.027 12.1033 14.73H4.99812C4.87371 14.73 4.75438 14.6805 4.66641 14.5924C4.57843 14.5044 4.529 14.385 4.529 14.2604C4.529 14.1359 4.57843 14.0164 4.66641 13.9284C4.75438 13.8403 4.87371 13.7909 4.99812 13.7909H13.4434C13.9833 13.525 14.5656 13.3516 15.166 13.2795L15.1923 13.2763H15.2189H15.4925C16.0923 13.2609 16.6886 13.3728 17.2421 13.6048ZM13.0829 4.64939L16.5764 8.14613C16.5975 8.16843 16.6118 8.19636 16.6174 8.22657C16.6231 8.25677 16.62 8.28798 16.6084 8.31645C16.5968 8.34492 16.5773 8.36944 16.5521 8.38707C16.527 8.40471 16.4973 8.41471 16.4666 8.41587H13.043L12.8134 8.18609V4.75929C12.8146 4.72857 12.8246 4.69884 12.8422 4.67366C12.8598 4.64849 12.8843 4.62893 12.9128 4.61733C12.9412 4.60573 12.9724 4.60259 13.0026 4.60827C13.0328 4.61396 13.0607 4.62824 13.0829 4.64939ZM10.9869 6.71746C10.9896 6.65841 10.9806 6.59941 10.9604 6.54383C10.9403 6.48825 10.9094 6.4372 10.8696 6.39358C10.8297 6.34997 10.7816 6.31465 10.7281 6.28965C10.6746 6.26466 10.6167 6.25047 10.5577 6.2479H4.99813C4.88074 6.25562 4.77106 6.30914 4.69267 6.39694C4.61428 6.48475 4.57343 6.59983 4.57891 6.71746C4.57343 6.83509 4.61428 6.95017 4.69267 7.03798C4.77106 7.12579 4.88074 7.1793 4.99813 7.18702H10.5876C10.7014 7.17444 10.8061 7.11882 10.8803 7.03154C10.9545 6.94427 10.9927 6.83192 10.9869 6.71746ZM11.0867 8.13614H4.99812C4.87371 8.13614 4.75438 8.18561 4.66641 8.27367C4.57843 8.36173 4.529 8.48116 4.529 8.6057C4.529 8.73023 4.57843 8.84967 4.66641 8.93773C4.75438 9.02579 4.87371 9.07526 4.99812 9.07526H11.0867C11.2111 9.07526 11.3304 9.02579 11.4184 8.93773C11.5064 8.84967 11.5558 8.73023 11.5558 8.6057C11.5558 8.48116 11.5064 8.36173 11.4184 8.27367C11.3304 8.18561 11.2111 8.13614 11.0867 8.13614ZM4.99812 10.9935H15.4285C15.5609 10.9935 15.6878 10.9408 15.7814 10.8472C15.875 10.7535 15.9276 10.6264 15.9276 10.4939C15.9276 10.3614 15.875 10.2344 15.7814 10.1407C15.6878 10.047 15.5609 9.9944 15.4285 9.9944H4.99812C4.86576 9.9944 4.73883 10.047 4.64523 10.1407C4.55164 10.2344 4.49906 10.3614 4.49906 10.4939C4.49906 10.6264 4.55164 10.7535 4.64523 10.8472C4.73883 10.9408 4.86576 10.9935 4.99812 10.9935ZM4.99812 12.8517H11.0867C11.2076 12.844 11.3208 12.7898 11.4027 12.7004C11.4845 12.611 11.5287 12.4934 11.5259 12.3722C11.5286 12.252 11.4841 12.1355 11.402 12.0477C11.3199 11.9599 11.2067 11.9078 11.0867 11.9026H4.99812C4.93912 11.9052 4.8812 11.9194 4.82769 11.9444C4.77417 11.9694 4.7261 12.0047 4.68623 12.0483C4.64637 12.0919 4.61549 12.143 4.59536 12.1985C4.57523 12.2541 4.56625 12.3131 4.56893 12.3722C4.56345 12.4925 4.60535 12.6101 4.68561 12.6998C4.76587 12.7894 4.87809 12.844 4.99812 12.8517ZM19.97 17.4974C19.5787 16.5636 19.0431 15.6971 18.383 14.9298C18.0152 14.5351 17.5679 14.2233 17.0706 14.0148C16.5732 13.8064 16.0373 13.7062 15.4984 13.7209H15.2189C14.4787 13.8098 13.7684 14.0666 13.1423 14.4717C12.5162 14.8769 11.9906 15.4196 11.6057 16.0587C11.3211 16.4677 11.0959 16.9151 10.937 17.3875C10.9006 17.464 10.8817 17.5476 10.8817 17.6323C10.8817 17.717 10.9006 17.8006 10.937 17.877C11.0642 18.0428 11.2196 18.1849 11.3961 18.2967C11.7346 18.5476 12.0879 18.7778 12.4541 18.986C13.4096 19.5767 14.497 19.92 15.6182 19.9851C16.4392 20.0504 17.2632 19.9005 18.0088 19.5501C18.7544 19.1998 19.3959 18.661 19.8702 17.9869C19.9311 17.923 19.9729 17.8432 19.9905 17.7566C20.0082 17.67 20.0011 17.5801 19.97 17.4974ZM15.9775 19.1758C14.3849 19.068 12.8507 18.5331 11.5358 17.6273C11.5788 17.5678 11.6255 17.5111 11.6756 17.4574C12.3061 16.569 13.1295 15.8359 14.0832 15.3126C13.8003 15.7406 13.6785 16.2566 13.7417 16.7681C13.7676 17.0339 13.8465 17.2918 13.9737 17.5265C14.1009 17.7613 14.2739 17.9681 14.4823 18.1348C14.6907 18.3016 14.9304 18.4248 15.1872 18.4972C15.4441 18.5696 15.7128 18.5897 15.9775 18.5564C16.305 18.4971 16.6137 18.3609 16.8785 18.159C17.1432 17.9572 17.3564 17.6954 17.5005 17.3951C17.6446 17.0949 17.7156 16.7647 17.7077 16.4317C17.6997 16.0987 17.613 15.7723 17.4547 15.4793C17.2614 15.3391 17.0533 15.2235 16.8351 15.1339C17.0715 15.226 17.2966 15.3485 17.5046 15.4993C18.0049 15.8976 18.4424 16.3691 18.8022 16.898L18.8927 17.0137L18.8927 17.0137C19.0823 17.2564 19.2729 17.5004 19.4709 17.7072C18.5404 18.6311 17.288 19.1576 15.9775 19.1758ZM16.3168 15.769C16.2085 15.8106 16.1171 15.8873 16.0574 15.9869C15.9977 16.0865 15.9731 16.2032 15.9875 16.3185C15.9949 16.3856 16.0156 16.4505 16.0483 16.5096C16.081 16.5686 16.1251 16.6206 16.178 16.6624C16.2309 16.7042 16.2916 16.7351 16.3566 16.7532C16.4216 16.7714 16.4895 16.7764 16.5564 16.7681H16.6063C16.5618 16.9495 16.4637 17.1132 16.3248 17.238C16.186 17.3627 16.0127 17.4427 15.8278 17.4674H15.6481C15.4335 17.4396 15.2337 17.3427 15.0789 17.1913C14.924 17.04 14.8226 16.8423 14.7897 16.6282C14.7628 16.3782 14.8311 16.1271 14.981 15.9253C15.1305 15.7238 15.3504 15.5861 15.5968 15.5395C15.3446 15.5862 15.12 15.7284 14.9697 15.9364C14.8191 16.1448 14.7547 16.4034 14.7897 16.6582C14.8226 16.8723 14.924 17.0699 15.0789 17.2213C15.2337 17.3727 15.4335 17.4696 15.6481 17.4974H15.8377C16.0209 17.4708 16.1919 17.39 16.3289 17.2654C16.4658 17.1408 16.5625 16.978 16.6063 16.7981C16.7293 16.7633 16.8359 16.686 16.9072 16.5799C16.9785 16.4737 17.0098 16.3457 16.9956 16.2186C16.9882 16.1515 16.9675 16.0865 16.9348 16.0275C16.9021 15.9685 16.858 15.9165 16.805 15.8747C16.7521 15.8329 16.6914 15.802 16.6264 15.7838C16.5615 15.7657 16.4936 15.7607 16.4266 15.769H16.3168Z",acceptAllChanges:"M9.36499 16.7348C9.38499 16.7547 9.41212 16.7659 9.44041 16.7659H10.9881C10.9028 16.6008 10.9289 16.3933 11.0663 16.2541L11.7266 15.585H10.1444C10.0549 15.5701 9.97363 15.5238 9.91498 15.4547C9.85639 15.3856 9.82422 15.298 9.82422 15.2074C9.82422 15.1169 9.85639 15.0292 9.91498 14.9601C9.97363 14.891 10.0549 14.8448 10.1444 14.8298H12.4879C12.5584 14.785 12.6407 14.7607 12.7257 14.7607C12.8106 14.7607 12.893 14.785 12.9635 14.8298H16.5295L18.3303 13.0091C18.4135 12.925 18.5271 12.8776 18.6456 12.8777C18.7642 12.8777 18.8777 12.9252 18.9609 13.0094L20 14.0621V8.25532H16.8001C16.7301 8.27288 16.6568 8.27288 16.5868 8.25532C16.3485 8.1935 16.1367 8.0565 15.9829 7.86478C15.8292 7.67306 15.7416 7.43688 15.7335 7.19149V4H9.44041C9.41293 4.0024 9.38718 4.01437 9.36767 4.03383C9.34816 4.05329 9.33615 4.07897 9.33375 4.10638V16.6596C9.33375 16.6878 9.34499 16.7148 9.36499 16.7348ZM10.0744 17.2979H11.4803L12.259 18.0957H5.06727C5.01734 18.0957 4.96838 18.1057 4.9232 18.1246C4.8788 18.1431 4.83798 18.1702 4.80335 18.2048C4.7333 18.2746 4.69398 18.3693 4.69398 18.468C4.69398 18.5668 4.7333 18.6615 4.80335 18.7313C4.87333 18.8011 4.96832 18.8404 5.06727 18.8404H12.9857L13.7947 19.6693L14.0836 19.9574H4.10733C4.09291 19.9591 4.07829 19.9576 4.06457 19.9528C4.05085 19.9481 4.03838 19.9403 4.02812 19.9301C4.01785 19.9198 4.01004 19.9074 4.00529 19.8937C4.00054 19.88 3.99896 19.8654 4.00067 19.8511V7.29787C4.00067 7.26966 4.01191 7.2426 4.03191 7.22265C4.05192 7.2027 4.07905 7.19149 4.10733 7.19149H8.70447V9.05319H5.06727C4.97294 9.05867 4.88453 9.10069 4.8208 9.17019C4.757 9.23973 4.72302 9.33135 4.72594 9.42553C4.72289 9.52082 4.75654 9.61364 4.82002 9.6849C4.88356 9.75613 4.97203 9.80038 5.06727 9.8085H8.70447V10.5638H5.06727C5.01968 10.5652 4.97274 10.5759 4.92932 10.5954C4.88583 10.6148 4.84664 10.6426 4.8139 10.6772C4.78122 10.7118 4.7557 10.7525 4.73877 10.7969C4.72184 10.8413 4.7139 10.8887 4.71527 10.9361C4.7139 10.9837 4.72184 11.031 4.73877 11.0754C4.74424 11.0897 4.75055 11.1037 4.75778 11.1171C4.76162 11.1243 4.76566 11.1313 4.76995 11.1382C4.78265 11.1585 4.79736 11.1776 4.8139 11.1951C4.84664 11.2297 4.88583 11.2575 4.92932 11.2769C4.95491 11.2884 4.98173 11.2968 5.0092 11.3021C5.02834 11.3058 5.04774 11.3079 5.06727 11.3085H8.70447V12.0638H5.06734C4.97782 12.0789 4.89651 12.1251 4.83792 12.1942C4.77926 12.2633 4.7471 12.351 4.7471 12.4415C4.7471 12.5321 4.77926 12.6197 4.83792 12.6888C4.89651 12.758 4.97782 12.8041 5.06734 12.8192H8.70447V13.5745H5.06734C4.97782 13.5895 4.89651 13.6357 4.83792 13.7048C4.81383 13.7332 4.79424 13.7647 4.77946 13.7983C4.7583 13.8465 4.7471 13.8988 4.7471 13.9522C4.7471 14.0427 4.77926 14.1303 4.83792 14.1994C4.89651 14.2686 4.97782 14.3147 5.06734 14.3298H8.70447V15.0744H5.06727C4.97776 15.0895 4.89651 15.1357 4.83785 15.2048C4.77926 15.2739 4.7471 15.3616 4.7471 15.4521C4.7471 15.5043 4.75778 15.5556 4.77809 15.6029C4.793 15.6376 4.81305 15.6701 4.83785 15.6994C4.89651 15.7685 4.97776 15.8147 5.06727 15.8298H8.70447V16.5851H5.06727C4.97776 16.6001 4.89651 16.6463 4.83785 16.7154C4.79489 16.7661 4.76618 16.8267 4.75387 16.8912C4.74938 16.9146 4.7471 16.9386 4.7471 16.9628C4.7471 17.0533 4.77926 17.1409 4.83785 17.21C4.89651 17.2792 4.97776 17.3253 5.06727 17.3404H9.95241C9.99552 17.3331 10.0367 17.3187 10.0744 17.2979ZM20 15.3204L18.5709 16.7659H19.8933C19.9216 16.7659 19.9487 16.7547 19.9687 16.7348C19.9887 16.7148 20 16.6878 20 16.6596V15.3204ZM14.7526 16.6264L13.7248 15.585H15.7825L14.7526 16.6264ZM14.9498 6.08721C14.9465 6.06854 14.9416 6.05023 14.9353 6.03244C14.9202 5.98939 14.897 5.94929 14.8665 5.91442C14.8145 5.85488 14.7444 5.81394 14.6669 5.79787H10.1337C10.0348 5.79787 9.93978 5.83709 9.8698 5.90693C9.79975 5.97676 9.76043 6.07146 9.76043 6.17022C9.76043 6.19463 9.76283 6.21879 9.76752 6.24239C9.77462 6.2782 9.78692 6.31268 9.80398 6.34479C9.82123 6.37716 9.8433 6.40709 9.8698 6.43348C9.93978 6.50332 10.0348 6.54257 10.1337 6.54257H14.6669C14.6811 6.54023 14.6951 6.53702 14.7088 6.53299C14.7206 6.52955 14.7322 6.52549 14.7436 6.52082C14.7624 6.51309 14.7806 6.50371 14.7979 6.4928C14.8378 6.46764 14.8722 6.43468 14.8991 6.39599C14.9259 6.35729 14.9447 6.31359 14.9543 6.26749C14.9554 6.26232 14.9563 6.25716 14.9571 6.25197C14.9579 6.24739 14.9586 6.24281 14.9591 6.23824C14.9612 6.22129 14.962 6.20424 14.9616 6.18723C14.961 6.16727 14.9588 6.14733 14.9549 6.12766C14.9539 6.11406 14.9523 6.10055 14.9498 6.08721ZM15.0189 7.29788H10.1445C10.0549 7.31291 9.97363 7.35911 9.91504 7.42823C9.85639 7.49738 9.82422 7.585 9.82422 7.67555C9.82422 7.76609 9.85639 7.85369 9.91504 7.92284C9.97363 7.99196 10.0549 8.03815 10.1445 8.05319H15.0189C15.0321 8.05241 15.0451 8.05095 15.058 8.04877C15.0745 8.04601 15.0906 8.04212 15.1064 8.03718C15.1669 8.01822 15.2219 7.98361 15.2654 7.93618C15.3291 7.86664 15.3632 7.77502 15.3602 7.68084C15.3606 7.67392 15.3608 7.66701 15.3608 7.66009C15.3609 7.65087 15.3606 7.64165 15.3599 7.63247C15.3592 7.62263 15.358 7.61279 15.3565 7.60302C15.3532 7.58188 15.3479 7.56104 15.3409 7.54072C15.3254 7.49575 15.301 7.45426 15.2693 7.41868C15.2492 7.39621 15.2265 7.37638 15.2017 7.35959C15.1872 7.34979 15.172 7.34102 15.1562 7.33339C15.1132 7.31265 15.0665 7.3006 15.0189 7.29788ZM10.1445 9.56381H18.496C18.5856 9.54877 18.6669 9.50258 18.7255 9.43346C18.7841 9.3643 18.8163 9.27671 18.8163 9.18617C18.8163 9.09562 18.7841 9.008 18.7255 8.93884C18.6669 8.86973 18.5856 8.82353 18.496 8.8085H10.1445C10.0549 8.82353 9.97363 8.86973 9.91504 8.93884C9.85639 9.008 9.82422 9.09562 9.82422 9.18617C9.82422 9.24412 9.83738 9.30087 9.86224 9.35236C9.87624 9.38132 9.89395 9.40859 9.91504 9.43346C9.97363 9.50258 10.0549 9.54877 10.1445 9.56381ZM10.1445 11.0638H15.0189C15.1084 11.0488 15.1897 11.0026 15.2483 10.9335C15.2854 10.8898 15.3118 10.8387 15.3263 10.7842C15.3347 10.7525 15.3391 10.7195 15.3391 10.6861C15.3391 10.5956 15.3069 10.508 15.2483 10.4389C15.1897 10.3697 15.1084 10.3235 15.0189 10.3085H10.1445C10.0549 10.3235 9.97363 10.3697 9.91504 10.4389C9.85639 10.508 9.82422 10.5956 9.82422 10.6861C9.82422 10.7424 9.83666 10.7976 9.8601 10.8478C9.87442 10.8785 9.89284 10.9073 9.91504 10.9335C9.97363 11.0026 10.0549 11.0488 10.1445 11.0638ZM18.496 12.5745H10.1444C10.0549 12.5594 9.97363 12.5132 9.91498 12.4441C9.85639 12.3749 9.82422 12.2873 9.82422 12.1968C9.82422 12.1062 9.85639 12.0186 9.91498 11.9495C9.97363 11.8803 10.0549 11.8342 10.1444 11.8191H18.496C18.5856 11.8342 18.6669 11.8803 18.7255 11.9495C18.7841 12.0186 18.8163 12.1062 18.8163 12.1968C18.8163 12.2873 18.7841 12.3749 18.7255 12.4441C18.6971 12.4776 18.6633 12.5058 18.6259 12.5276C18.5861 12.5507 18.5421 12.5667 18.496 12.5745ZM15.0189 14.0744H10.1444C10.0968 14.0731 10.0499 14.0624 10.0064 14.0429C9.96296 14.0234 9.92376 13.9956 9.89102 13.961C9.85834 13.9265 9.83282 13.8857 9.81589 13.8413C9.79897 13.7969 9.79102 13.7496 9.79239 13.7021C9.79102 13.6546 9.79897 13.6073 9.81589 13.5628C9.83282 13.5184 9.85834 13.4778 9.89102 13.4432C9.92376 13.4086 9.96296 13.3808 10.0064 13.3613C10.0499 13.3419 10.0968 13.3311 10.1444 13.3297H15.0189C15.0661 13.3311 15.1125 13.3419 15.1554 13.3615C15.1983 13.381 15.2368 13.4091 15.2686 13.4438C15.3005 13.4785 15.325 13.5193 15.3407 13.5637C15.3564 13.608 15.363 13.6551 15.3602 13.7021C15.3631 13.7963 15.3291 13.8879 15.2653 13.9574C15.2016 14.027 15.1132 14.0689 15.0189 14.0744ZM16.6188 4.52128L19.4133 7.30852C19.4293 7.32624 19.4401 7.34808 19.4443 7.37157C19.4485 7.39506 19.446 7.41925 19.4371 7.4414C19.4282 7.46356 19.4133 7.48278 19.394 7.4969C19.3747 7.51102 19.3518 7.51947 19.328 7.52128H16.5868L16.4054 7.34043V4.60639C16.4073 4.5826 16.4157 4.55979 16.4299 4.54056C16.444 4.52133 16.4633 4.50644 16.4855 4.49757C16.5077 4.48871 16.532 4.48624 16.5556 4.49043C16.5791 4.49462 16.601 4.50531 16.6188 4.52128ZM18.6454 13.3192L20 14.6915L14.7522 20L14.7416 19.9894L14.1123 19.3617L13.3976 18.6277L11.3817 16.5638L12.7257 15.2021L14.7522 17.2553L18.6454 13.3192Z",rejectAllChanges:"M9.54637 16.5847H8.96997V15.8295H12.786C12.8024 15.8265 12.8186 15.8223 12.8343 15.817C12.8535 15.8105 12.8719 15.8023 12.8897 15.7926C12.9315 15.7697 12.969 15.738 12.9997 15.6991C13.0268 15.6649 13.0478 15.6261 13.0621 15.5847H13.571V16.7656H9.79386C9.78396 16.7479 9.77269 16.731 9.76011 16.7151C9.70552 16.6459 9.62976 16.5998 9.54637 16.5847ZM13.4717 12.9573V13.3295H9.72523C9.6809 13.3309 9.63716 13.3416 9.59671 13.361C9.57578 13.3711 9.55595 13.3834 9.53745 13.3977C9.5201 13.411 9.50391 13.4262 9.48917 13.4429C9.45872 13.4775 9.43494 13.5182 9.41917 13.5626C9.41778 13.5664 9.41644 13.5703 9.41523 13.5742H8.96997V12.8189H12.786C12.8694 12.8039 12.9452 12.7577 12.9997 12.6886C13.0078 12.6784 13.0153 12.6677 13.0223 12.6568L13.029 12.6458L13.033 12.6389L13.0397 12.6266C13.0452 12.6157 13.0503 12.6046 13.055 12.5931C13.0576 12.5869 13.0599 12.5806 13.0621 12.5742H13.6872C13.6453 12.5965 13.607 12.6269 13.5746 12.6644C13.5059 12.7439 13.469 12.849 13.4717 12.9573ZM9.82598 14.0742H13.4758C13.4809 14.0932 13.4904 14.1108 13.5037 14.1251C13.5242 14.147 13.552 14.1593 13.581 14.1593H13.6008L13.571 14.1912V14.8295H9.72523C9.64183 14.8445 9.56614 14.8907 9.51149 14.9598C9.4845 14.994 9.46351 15.0328 9.4492 15.0741H8.96997V14.3295H9.54637C9.62976 14.3145 9.70552 14.2683 9.76011 14.1992C9.78947 14.162 9.81166 14.1195 9.82598 14.0742ZM18.9075 8.2552V12.5317H17.7846V12.323C17.7978 12.2827 17.8047 12.2399 17.8047 12.1965C17.8047 12.106 17.7747 12.0184 17.7201 11.9493C17.6655 11.8801 17.5897 11.834 17.5063 11.8189H9.72523C9.64183 11.834 9.56614 11.8801 9.51149 11.9493C9.48444 11.9835 9.46351 12.0222 9.4492 12.0636H8.96997V11.3083H9.54637C9.63425 11.3028 9.71662 11.2608 9.776 11.1913C9.80687 11.1551 9.83029 11.113 9.84527 11.0676L9.84654 11.0637H14.2667C14.3501 11.0486 14.4258 11.0024 14.4805 10.9333C14.5231 10.8794 14.5507 10.8142 14.5607 10.7452C14.5636 10.7258 14.565 10.706 14.565 10.686C14.565 10.6658 14.5635 10.6458 14.5606 10.626C14.5572 10.6026 14.5516 10.5796 14.5442 10.5573C14.5299 10.5144 14.5084 10.4741 14.4805 10.4387C14.4258 10.3696 14.3501 10.3234 14.2667 10.3083H9.72529C9.6832 10.3159 9.64299 10.3314 9.60653 10.3538C9.57081 10.3759 9.5386 10.4045 9.51155 10.4387C9.49639 10.4579 9.4831 10.4785 9.47182 10.5002C9.46133 10.5205 9.45259 10.5417 9.44568 10.5636H8.96997V9.80838H9.16873C9.25656 9.80286 9.33899 9.76085 9.39837 9.69131C9.45775 9.62177 9.48947 9.53022 9.48674 9.43601C9.48711 9.42951 9.48735 9.42302 9.48741 9.41653C9.48741 9.41049 9.48729 9.40445 9.48705 9.39848C9.49457 9.41055 9.50269 9.42218 9.51155 9.43334C9.56614 9.50249 9.64189 9.54866 9.72529 9.56372H17.5063C17.5897 9.54866 17.6655 9.50249 17.7201 9.43334C17.7747 9.36419 17.8047 9.2766 17.8047 9.18603C17.8047 9.09552 17.7747 9.00786 17.7201 8.93878C17.6655 8.86963 17.5897 8.82346 17.5063 8.8084H9.72529C9.64189 8.82346 9.56614 8.86963 9.51155 8.93878C9.4569 9.00786 9.42694 9.09552 9.42694 9.18603L9.427 9.19707L9.42754 9.20875C9.41972 9.19661 9.41123 9.18499 9.40201 9.17389C9.38478 9.15311 9.36537 9.1346 9.34427 9.11863C9.33735 9.11344 9.33026 9.1085 9.32298 9.10383C9.31855 9.10097 9.31406 9.09824 9.30951 9.09565L9.30424 9.09266L9.29659 9.08857C9.28792 9.08402 9.27906 9.07993 9.27009 9.07623C9.2616 9.07279 9.25298 9.06974 9.24431 9.06701C9.21974 9.05935 9.19439 9.05461 9.16873 9.05305H8.96997V4.10638C8.97221 4.07897 8.9834 4.05328 9.00157 4.03383C9.01975 4.01437 9.04374 4.0024 9.06935 4H14.9325V7.1914C14.9401 7.43679 15.0216 7.67296 15.1649 7.86468C15.3082 8.0564 15.5055 8.19338 15.7275 8.2552C15.7927 8.27277 15.861 8.27277 15.9262 8.2552H18.9075ZM13.571 17.2975V19.4251L13.5722 19.4615C13.5835 19.6376 13.6323 19.8068 13.7133 19.957H4.10061C4.08718 19.9587 4.07355 19.9571 4.06077 19.9524C4.04799 19.9477 4.03637 19.9399 4.02681 19.9296C4.01724 19.9194 4.00997 19.907 4.00554 19.8933C4.00111 19.8796 3.99964 19.865 4.00124 19.8506V7.29778C4.00124 7.26957 4.01171 7.24251 4.03034 7.22256C4.04898 7.20261 4.07426 7.1914 4.10061 7.1914H8.38368V9.05305H4.99497C4.90708 9.05857 4.82471 9.10052 4.76533 9.17006C4.70589 9.2396 4.67423 9.33121 4.67696 9.42536C4.67411 9.52067 4.70547 9.61346 4.76461 9.68475C4.8238 9.75598 4.90623 9.80026 4.99497 9.80838H8.38368V10.5636H4.99497C4.96682 10.5645 4.93898 10.5692 4.91199 10.5774C4.89647 10.5821 4.88124 10.588 4.86644 10.5952C4.8494 10.6034 4.83308 10.613 4.81762 10.6241C4.79627 10.6393 4.77655 10.657 4.7589 10.6771C4.72846 10.7116 4.70468 10.7523 4.68891 10.7967C4.67314 10.8411 4.66574 10.8885 4.66701 10.9359C4.66641 10.9597 4.66792 10.9834 4.67156 11.0067C4.6752 11.03 4.68102 11.053 4.68891 11.0752C4.70468 11.1196 4.72846 11.1603 4.7589 11.1949C4.7731 11.211 4.78862 11.2256 4.80524 11.2386C4.81452 11.2459 4.82417 11.2527 4.83417 11.259C4.84461 11.2655 4.85534 11.2714 4.86644 11.2767C4.9069 11.2962 4.95063 11.3069 4.99497 11.3083H8.38368V12.0636H4.99503C4.91163 12.0787 4.83587 12.1249 4.78128 12.194C4.7526 12.2303 4.7307 12.2717 4.71639 12.3159C4.70347 12.3559 4.69667 12.3983 4.69667 12.4413C4.69667 12.5318 4.72664 12.6194 4.78128 12.6886C4.809 12.7237 4.84218 12.7529 4.87906 12.7751C4.89416 12.7842 4.90993 12.7921 4.92619 12.7988C4.94833 12.8079 4.97137 12.8147 4.99503 12.8189H8.38368V13.5742H4.99503C4.95275 13.5819 4.91242 13.5975 4.87584 13.62C4.8403 13.642 4.80822 13.6705 4.78128 13.7046C4.72664 13.7737 4.69667 13.8613 4.69667 13.9519C4.69667 14.0424 4.72664 14.13 4.78128 14.1992C4.83587 14.2683 4.91163 14.3145 4.99503 14.3295H8.38368V15.0741H4.99497C4.94644 15.0829 4.90047 15.1022 4.85977 15.1304C4.83878 15.145 4.81919 15.162 4.80136 15.1811C4.79439 15.1885 4.78765 15.1964 4.78122 15.2045C4.77188 15.2163 4.76327 15.2287 4.75539 15.2416C4.74441 15.2594 4.73495 15.2781 4.727 15.2975C4.71924 15.3163 4.71293 15.3358 4.70808 15.3558C4.70407 15.3723 4.7011 15.389 4.69922 15.4061C4.69752 15.4212 4.69667 15.4364 4.69667 15.4518C4.69667 15.5423 4.72664 15.6299 4.78122 15.6991C4.83587 15.7682 4.91157 15.8144 4.99497 15.8295H8.38368V16.5847H4.99497C4.91157 16.5998 4.83587 16.6459 4.78122 16.7151C4.72664 16.7842 4.69667 16.8718 4.69667 16.9624C4.69667 17.0529 4.72664 17.1405 4.78122 17.2097C4.83587 17.2788 4.91157 17.325 4.99497 17.34H9.54637C9.58655 17.3328 9.62496 17.3183 9.66008 17.2975H13.571ZM15.7573 4.52124L18.3609 7.30839C18.3758 7.32612 18.3858 7.34796 18.3897 7.37145C18.3937 7.39493 18.3914 7.41913 18.3831 7.44128C18.3748 7.46343 18.3609 7.48266 18.3429 7.49678C18.325 7.51089 18.3036 7.51934 18.2814 7.52115H15.7275L15.5585 7.34031V4.60634C15.5602 4.58255 15.5681 4.55975 15.5813 4.54051C15.5945 4.52128 15.6125 4.50639 15.6332 4.49753C15.6539 4.48867 15.6765 4.48619 15.6984 4.49038C15.7203 4.49457 15.7407 4.50526 15.7573 4.52124ZM14.1248 5.91437C14.1732 5.97391 14.2021 6.04884 14.2071 6.1276C14.2157 6.17377 14.2155 6.22129 14.2065 6.26739C14.2045 6.27778 14.2021 6.28804 14.1992 6.29817L14.1944 6.31388C14.1847 6.34291 14.1715 6.3705 14.1551 6.39595C14.13 6.43465 14.098 6.46757 14.0608 6.49276C14.0354 6.5099 14.008 6.52328 13.9794 6.53244C13.9661 6.53672 13.9525 6.5401 13.9387 6.5425H9.71529C9.62309 6.5425 9.5346 6.50328 9.4694 6.43342C9.40413 6.36362 9.3675 6.26889 9.3675 6.17013C9.3675 6.07144 9.40413 5.97671 9.4694 5.90691C9.5346 5.83704 9.62309 5.79783 9.71529 5.79783H13.9387C13.9718 5.80516 14.0034 5.81769 14.0326 5.83484C14.0672 5.85522 14.0984 5.88204 14.1248 5.91437ZM14.2667 7.29776H9.72529C9.69606 7.30302 9.66773 7.31211 9.64092 7.3247C9.62612 7.33171 9.61175 7.33977 9.59798 7.34879C9.56565 7.36996 9.53642 7.39664 9.51155 7.42813C9.4569 7.49722 9.42694 7.58487 9.42694 7.67538C9.42694 7.70155 9.42942 7.72752 9.43434 7.75285C9.44635 7.81505 9.47273 7.87355 9.51155 7.9227C9.55292 7.9751 9.60647 8.01432 9.66628 8.03678C9.67762 8.04107 9.6892 8.04477 9.70097 8.04775C9.70898 8.04983 9.71711 8.05158 9.72529 8.05308H14.2667C14.3546 8.04756 14.437 8.00555 14.4964 7.93601C14.5558 7.86647 14.5875 7.77492 14.5847 7.68071C14.5874 7.63318 14.5813 7.58559 14.5667 7.54059C14.5522 7.4956 14.5296 7.45417 14.5 7.41859C14.4704 7.38301 14.4346 7.35398 14.3946 7.33327C14.3546 7.31256 14.3111 7.30048 14.2667 7.29776ZM4.99497 18.84H12.786C12.8783 18.84 12.9667 18.8008 13.032 18.731C13.0972 18.6611 13.1338 18.5664 13.1338 18.4677C13.1338 18.3689 13.0972 18.2742 13.032 18.2044C12.9667 18.1346 12.8783 18.0954 12.786 18.0954H4.99497C4.90277 18.0954 4.81428 18.1346 4.74908 18.2044C4.68381 18.2742 4.64718 18.3689 4.64718 18.4677C4.64718 18.5664 4.68381 18.6611 4.74908 18.731C4.81428 18.8008 4.90277 18.84 4.99497 18.84ZM17.5858 12.7444H19.5733H19.623C19.7249 12.7499 19.821 12.7971 19.8913 12.8764C19.9616 12.9556 20.0007 13.0607 20.0006 13.17V13.8295C20.0007 13.8458 19.9976 13.862 19.9914 13.8769C19.9853 13.8918 19.9764 13.9052 19.9652 13.9163C19.9539 13.9273 19.9407 13.9357 19.9262 13.9409C19.9118 13.9461 19.8965 13.948 19.8814 13.9465H13.7797C13.7507 13.9465 13.7229 13.9342 13.7024 13.9123C13.6819 13.8903 13.6704 13.8606 13.6704 13.8295V13.17C13.6677 13.0617 13.7046 12.9566 13.7733 12.8771C13.842 12.7976 13.9371 12.75 14.0381 12.7444H16.0256V12.5104C16.0352 12.439 16.0687 12.3737 16.1199 12.3268C16.1711 12.2798 16.2365 12.2544 16.3039 12.2551H17.2976C17.3667 12.2517 17.4345 12.276 17.4878 12.3232C17.541 12.3704 17.576 12.4371 17.5858 12.5104V12.7444ZM14.0679 19.4251V14.1912H19.5037V19.4251C19.4935 19.585 19.4256 19.7344 19.3143 19.8416C19.203 19.9488 19.0571 20.0055 18.9075 19.9996H14.6642C14.5146 20.0055 14.3687 19.9488 14.2574 19.8416C14.1461 19.7344 14.0781 19.585 14.0679 19.4251ZM15.5983 15.1593H15.2505C15.0969 15.1593 14.9723 15.2926 14.9723 15.4572V18.7336C14.9723 18.8981 15.0969 19.0315 15.2505 19.0315H15.5983C15.752 19.0315 15.8766 18.8981 15.8766 18.7336V15.4572C15.8766 15.2926 15.752 15.1593 15.5983 15.1593ZM16.9598 15.1593H16.612C16.4583 15.1593 16.3337 15.2926 16.3337 15.4572V18.7336C16.3337 18.8981 16.4583 19.0315 16.612 19.0315H16.9598C17.1135 19.0315 17.238 18.8981 17.238 18.7336V15.4572C17.238 15.2926 17.1135 15.1593 16.9598 15.1593ZM17.9635 15.1593H18.3113C18.465 15.1593 18.5895 15.2926 18.5895 15.4572V18.7336C18.5895 18.8981 18.465 19.0315 18.3113 19.0315H17.9635C17.8098 19.0315 17.6852 18.8981 17.6852 18.7336V15.4572C17.6852 15.2926 17.8098 15.1593 17.9635 15.1593Z",acceptSingleChange:"M17.2 20H15.6628L17.33 18.3091V19.87C17.33 19.8871 17.3266 19.904 17.3201 19.9197C17.3136 19.9355 17.304 19.9499 17.2919 19.9619C17.2799 19.974 17.2655 19.9836 17.2497 19.9901C17.234 19.9966 17.2171 20 17.2 20ZM4.13 20H14.4978L14.1823 19.6791L13.5135 18.9904L13.5123 18.9891L13.0529 18.52H5C4.87537 18.52 4.75586 18.4705 4.66766 18.3823C4.57953 18.2942 4.53003 18.1747 4.53003 18.05C4.53003 17.9253 4.57953 17.8058 4.66766 17.7177C4.75586 17.6295 4.87537 17.58 5 17.58H12.1323L11.6235 17.0604L11.6231 16.48L12.8831 15.19L13.4765 15.1896L15.0807 16.8276L17.33 14.5413V9.3H13.28C13.207 9.30976 13.133 9.30976 13.06 9.3C12.7697 9.22119 12.5113 9.05343 12.3212 8.82027C12.1311 8.58711 12.0187 8.30026 12 8V4H4.13C4.09552 4 4.06246 4.0137 4.03808 4.03808C4.0137 4.06246 4 4.09552 4 4.13V19.87C4 19.9045 4.0137 19.9375 4.03808 19.9619C4.06246 19.9863 4.09552 20 4.13 20ZM13.1 4.65L16.6 8.15C16.6212 8.17232 16.6355 8.20028 16.6412 8.23051C16.6469 8.26075 16.6437 8.29199 16.6321 8.32048C16.6205 8.34898 16.6009 8.37352 16.5757 8.39117C16.5505 8.40882 16.5208 8.41883 16.49 8.42H13.06L12.83 8.19V4.76C12.8312 4.72925 12.8412 4.6995 12.8588 4.67429C12.8765 4.64909 12.901 4.62951 12.9295 4.6179C12.958 4.6063 12.9893 4.60315 13.0195 4.60884C13.0497 4.61453 13.0777 4.62882 13.1 4.65ZM11 6.72C11.0027 6.66089 10.9937 6.60184 10.9735 6.5462C10.9534 6.49057 10.9224 6.43948 10.8825 6.39581C10.8425 6.35217 10.7944 6.3168 10.7408 6.29178C10.6871 6.26678 10.6292 6.25256 10.57 6.25H5C4.88239 6.25772 4.77252 6.31131 4.69397 6.39917C4.61542 6.48706 4.57452 6.60226 4.58002 6.72C4.57452 6.83774 4.61542 6.95294 4.69397 7.04083C4.77252 7.12869 4.88239 7.18228 5 7.19H10.6C10.7141 7.1774 10.8189 7.12173 10.8933 7.03436C10.9677 6.94702 11.0058 6.83456 11 6.72ZM11.1 8.14001H5C4.87537 8.14001 4.75586 8.18954 4.66766 8.27768C4.57953 8.36581 4.53003 8.48535 4.53003 8.61002C4.53003 8.73468 4.57953 8.85422 4.66766 8.94235C4.71558 8.99023 4.77277 9.02673 4.83496 9.05008C4.86932 9.06296 4.90521 9.07184 4.94189 9.07642C4.96106 9.0788 4.98047 9.08002 5 9.08002H11.1C11.2247 9.08002 11.3442 9.03049 11.4324 8.94235C11.5205 8.85422 11.57 8.73468 11.57 8.61002C11.57 8.48535 11.5205 8.36581 11.4324 8.27768C11.3442 8.18954 11.2247 8.14001 11.1 8.14001ZM5 11H15.45C15.5826 11 15.7098 10.9473 15.8035 10.8535C15.8973 10.7598 15.95 10.6326 15.95 10.5C15.95 10.3674 15.8973 10.2402 15.8035 10.1465C15.7098 10.0527 15.5826 10 15.45 10H5C4.86737 10 4.74023 10.0527 4.64642 10.1465C4.55267 10.2402 4.5 10.3674 4.5 10.5C4.5 10.6326 4.55267 10.7598 4.64642 10.8535C4.74023 10.9473 4.86737 11 5 11ZM5 12.86H11.1C11.2211 12.8523 11.3346 12.798 11.4166 12.7085C11.4986 12.6191 11.5428 12.5013 11.54 12.38C11.5427 12.2597 11.4982 12.1431 11.416 12.0552C11.3337 11.9673 11.2203 11.9152 11.1 11.91H5C4.94086 11.9126 4.88287 11.9268 4.82922 11.9518C4.77563 11.9768 4.72748 12.0122 4.6875 12.0558C4.65833 12.0878 4.63391 12.1237 4.61505 12.1624C4.60809 12.1767 4.60193 12.1913 4.5965 12.2062C4.58264 12.2443 4.5741 12.2841 4.57092 12.3243C4.56946 12.3428 4.56915 12.3614 4.57001 12.38C4.56451 12.5004 4.60651 12.6181 4.68689 12.7079C4.76733 12.7976 4.87976 12.8523 5 12.86ZM15.45 14.74H5C4.87537 14.74 4.75586 14.6905 4.66766 14.6023C4.57953 14.5142 4.53003 14.3947 4.53003 14.27C4.53003 14.1453 4.57953 14.0258 4.66766 13.9377C4.75586 13.8495 4.87537 13.8 5 13.8H15.45C15.5747 13.8 15.6942 13.8495 15.7823 13.9377C15.8705 14.0258 15.92 14.1453 15.92 14.27C15.92 14.3947 15.8705 14.5142 15.7823 14.6023C15.6942 14.6905 15.5747 14.74 15.45 14.74ZM11.1 16.63H5C4.87537 16.63 4.75586 16.5805 4.66766 16.4923C4.57953 16.4042 4.53003 16.2846 4.53003 16.16C4.53003 16.0353 4.57953 15.9158 4.66766 15.8276C4.75586 15.7395 4.87537 15.69 5 15.69H11.1C11.2247 15.69 11.3442 15.7395 11.4324 15.8276C11.5205 15.9158 11.57 16.0353 11.57 16.16C11.57 16.2846 11.5205 16.4042 11.4324 16.4923C11.3442 16.5805 11.2247 16.63 11.1 16.63ZM18.73 13.71L20 15.01L15.08 20L15.07 19.99L14.48 19.39L13.81 18.7L11.92 16.77L13.18 15.48L15.08 17.42L18.73 13.71Z",rejectSingleChange:"M17.0495 11.5C17.1461 11.5 17.241 11.5173 17.33 11.5501V9.3H13.28C13.207 9.30976 13.133 9.30976 13.06 9.3C12.7697 9.22119 12.5113 9.05343 12.3212 8.82027C12.1311 8.58711 12.0187 8.30026 12 8V4H4.13C4.09552 4 4.06246 4.0137 4.03808 4.03808C4.0137 4.06246 4 4.09552 4 4.13V19.87C4 19.9045 4.0137 19.9375 4.03808 19.9619C4.06246 19.9863 4.09552 20 4.13 20H13.2305C13.1075 19.8287 13.0338 19.6249 13.0205 19.4112L13.0195 19.3956V18.52H5C4.87537 18.52 4.75586 18.4705 4.66772 18.3823C4.57959 18.2942 4.53003 18.1747 4.53003 18.05C4.53003 18.0119 4.53467 17.9742 4.54358 17.9378C4.56396 17.8552 4.60657 17.7788 4.66772 17.7177C4.75586 17.6295 4.87537 17.58 5 17.58H13.0195V14.74H5C4.87537 14.74 4.75586 14.6905 4.66772 14.6023C4.57959 14.5142 4.53003 14.3947 4.53003 14.27C4.53003 14.1453 4.57959 14.0258 4.66772 13.9377C4.75586 13.8495 4.87537 13.8 5 13.8H12.8393C12.6229 13.6377 12.4998 13.3897 12.4998 13.1032C12.4997 12.8414 12.6008 12.5847 12.7513 12.3911C12.9 12.1998 13.1561 12 13.4994 12L15.2519 12C15.2928 11.8972 15.3589 11.7915 15.4649 11.6992C15.6135 11.5698 15.8041 11.499 16.0011 11.5H17.0495ZM13.1 4.65L16.6 8.15C16.6211 8.17232 16.6354 8.20028 16.6411 8.23051C16.6468 8.26075 16.6437 8.29199 16.6321 8.32048C16.6204 8.34898 16.6009 8.37352 16.5757 8.39117C16.5505 8.40882 16.5207 8.41883 16.49 8.42H13.06L12.83 8.19V4.76C12.8311 4.72925 12.8411 4.6995 12.8588 4.67429C12.8764 4.64909 12.901 4.62951 12.9295 4.6179C12.958 4.6063 12.9892 4.60315 13.0194 4.60884C13.0497 4.61453 13.0776 4.62882 13.1 4.65ZM11 6.72C11.0027 6.66089 10.9937 6.60184 10.9735 6.5462C10.9716 6.5408 10.9695 6.53543 10.9673 6.53012C10.9626 6.51852 10.9575 6.50717 10.9518 6.49603C10.9406 6.47391 10.9275 6.45273 10.9127 6.43274C10.9033 6.41992 10.8932 6.40759 10.8824 6.39581C10.8425 6.35217 10.7943 6.3168 10.7407 6.29178C10.6871 6.26678 10.629 6.25256 10.5699 6.25H5C4.88232 6.25772 4.77246 6.31131 4.69397 6.39917C4.61536 6.48706 4.57446 6.60226 4.57996 6.72C4.57715 6.7811 4.58679 6.84152 4.60767 6.8978C4.61523 6.91803 4.62415 6.93771 4.63452 6.9567C4.65088 6.98669 4.67078 7.01495 4.69397 7.04083C4.77246 7.12869 4.88232 7.18228 5 7.19H10.6C10.714 7.1774 10.8188 7.12173 10.8932 7.03436C10.922 7.00049 10.9454 6.96283 10.9629 6.92273C10.9725 6.9006 10.9805 6.87775 10.9865 6.8544C10.9933 6.82791 10.9977 6.80075 10.9995 6.77325C11.0001 6.76453 11.0004 6.75574 11.0005 6.74695C11.0006 6.73798 11.0005 6.729 11 6.72ZM11.1 8.14001H5C4.97534 8.14001 4.95081 8.14194 4.92676 8.14575C4.89587 8.15063 4.8656 8.15857 4.83643 8.1694C4.77368 8.19272 4.71606 8.2294 4.66772 8.27768C4.57959 8.36581 4.53003 8.48535 4.53003 8.61002C4.53003 8.73468 4.57959 8.85422 4.66772 8.94235C4.75586 9.03049 4.87537 9.08002 5 9.08002H11.1C11.2247 9.08002 11.3442 9.03049 11.4324 8.94235C11.4617 8.91306 11.4867 8.88028 11.5071 8.845C11.5349 8.79691 11.554 8.74414 11.5634 8.68915C11.5677 8.66318 11.5701 8.63672 11.5701 8.61002C11.5701 8.48535 11.5205 8.36581 11.4324 8.27768C11.3929 8.23831 11.3474 8.20663 11.2979 8.18365C11.2365 8.15518 11.1689 8.14001 11.1 8.14001ZM5 11H15.45C15.5826 11 15.7098 10.9473 15.8036 10.8535C15.8973 10.7598 15.95 10.6326 15.95 10.5C15.95 10.3674 15.8973 10.2402 15.8036 10.1465C15.7098 10.0527 15.5826 10 15.45 10H5C4.86743 10 4.74023 10.0527 4.64648 10.1465C4.55273 10.2402 4.5 10.3674 4.5 10.5C4.5 10.6326 4.55273 10.7598 4.64648 10.8535C4.74023 10.9473 4.86743 11 5 11ZM5 12.86H11.1C11.2211 12.8523 11.3346 12.798 11.4166 12.7085C11.4987 12.6191 11.5428 12.5013 11.54 12.38C11.5427 12.2597 11.4982 12.1431 11.4159 12.0552C11.3336 11.9673 11.2202 11.9152 11.1 11.91H5C4.94092 11.9126 4.88281 11.9268 4.82922 11.9518C4.77563 11.9768 4.72742 12.0122 4.6875 12.0558C4.64758 12.0995 4.6167 12.1506 4.59644 12.2062C4.58899 12.2266 4.58313 12.2475 4.57874 12.2687C4.57129 12.3052 4.56824 12.3426 4.56995 12.38C4.56445 12.5004 4.60645 12.6181 4.68689 12.7079C4.76733 12.7976 4.87976 12.8523 5 12.86ZM11.1 16.63H5C4.87537 16.63 4.75586 16.5805 4.66772 16.4923C4.57959 16.4042 4.53003 16.2846 4.53003 16.16C4.53003 16.0353 4.57959 15.9158 4.66772 15.8276C4.75586 15.7395 4.87537 15.69 5 15.69H11.1C11.2247 15.69 11.3442 15.7395 11.4324 15.8276C11.5205 15.9158 11.5701 16.0353 11.5701 16.16C11.5701 16.2846 11.5205 16.4042 11.4324 16.4923C11.3442 16.5805 11.2247 16.63 11.1 16.63ZM19.59 12.53H17.36V12.3C17.3574 12.2195 17.3236 12.1432 17.2657 12.0872C17.2078 12.0313 17.1305 12 17.05 12H16C15.9242 11.9994 15.8509 12.0265 15.7938 12.0762C15.7367 12.126 15.6997 12.1949 15.69 12.27V12.5H13.44C13.3768 12.4994 13.3142 12.5125 13.2565 12.5382C13.1988 12.564 13.1473 12.6019 13.1055 12.6493C13.0638 12.6968 13.0327 12.7526 13.0145 12.8132C12.9963 12.8737 12.9913 12.9374 13 13V13.67C13 13.6871 13.0033 13.704 13.0099 13.7198C13.0164 13.7355 13.026 13.7499 13.038 13.7619C13.0501 13.774 13.0644 13.7836 13.0802 13.7901C13.096 13.7966 13.1129 13.8 13.13 13.8H19.84C19.8611 13.8054 19.8834 13.8054 19.9045 13.8C19.9257 13.7946 19.9452 13.7839 19.9611 13.7689C19.9771 13.754 19.989 13.7352 19.9958 13.7144C20.0026 13.6937 20.004 13.6715 20 13.65V13C20.0028 12.8866 19.9617 12.7765 19.8853 12.6927C19.809 12.6088 19.7031 12.5577 19.59 12.55V12.53ZM13.52 14V19.38C13.5303 19.5454 13.6054 19.7 13.7289 19.8105C13.8525 19.9209 14.0145 19.9782 14.18 19.97H18.84C19.0055 19.9782 19.1676 19.9209 19.2911 19.8105C19.4146 19.7 19.4897 19.5454 19.5 19.38V14H13.52ZM15.52 18.67C15.52 18.7522 15.4874 18.8311 15.4292 18.8892C15.3711 18.9473 15.2922 18.98 15.21 18.98H14.83C14.7478 18.98 14.669 18.9473 14.6108 18.8892C14.5527 18.8311 14.52 18.7522 14.52 18.67V15.33C14.52 15.2893 14.528 15.249 14.5436 15.2114C14.5592 15.1738 14.582 15.1396 14.6108 15.1108C14.6396 15.082 14.6738 15.0592 14.7114 15.0436C14.749 15.028 14.7893 15.02 14.83 15.02H15.21C15.2507 15.02 15.291 15.028 15.3287 15.0436C15.3663 15.0592 15.4004 15.082 15.4292 15.1108C15.458 15.1396 15.4808 15.1738 15.4964 15.2114C15.512 15.249 15.52 15.2893 15.52 15.33V18.67ZM17.01 18.67C17.01 18.7522 16.9774 18.8311 16.9192 18.8892C16.8611 18.9473 16.7822 18.98 16.7 18.98H16.32C16.2798 18.98 16.2399 18.9719 16.2029 18.9562C16.1658 18.9405 16.1323 18.9176 16.1043 18.8886C16.0763 18.8597 16.0544 18.8254 16.0399 18.7879C16.0254 18.7503 16.0187 18.7102 16.02 18.67V15.33C16.0187 15.2898 16.0254 15.2497 16.0399 15.2121C16.0544 15.1746 16.0763 15.1403 16.1043 15.1114C16.1323 15.0824 16.1658 15.0595 16.2029 15.0438C16.2399 15.0281 16.2798 15.02 16.32 15.02H16.7C16.7407 15.02 16.781 15.028 16.8187 15.0436C16.8563 15.0592 16.8904 15.082 16.9192 15.1108C16.948 15.1396 16.9708 15.1738 16.9864 15.2114C17.002 15.249 17.01 15.2893 17.01 15.33V18.67ZM18.51 18.67C18.51 18.7107 18.502 18.751 18.4864 18.7886C18.4708 18.8262 18.448 18.8604 18.4192 18.8892C18.3904 18.918 18.3563 18.9408 18.3187 18.9564C18.281 18.972 18.2407 18.98 18.2 18.98H17.82C17.7378 18.98 17.659 18.9473 17.6008 18.8892C17.5427 18.8311 17.51 18.7522 17.51 18.67V15.33C17.51 15.2893 17.518 15.249 17.5336 15.2114C17.5492 15.1738 17.572 15.1396 17.6008 15.1108C17.6296 15.082 17.6638 15.0592 17.7014 15.0436C17.739 15.028 17.7793 15.02 17.82 15.02H18.2C18.2407 15.02 18.281 15.028 18.3187 15.0436C18.3563 15.0592 18.3904 15.082 18.4192 15.1108C18.448 15.1396 18.4708 15.1738 18.4864 15.2114C18.502 15.249 18.51 15.2893 18.51 15.33V18.67Z"},V.FILEICONS={docIcon:{extension:".doc",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 9.617188 46.875 C 13.234375 46.875 16.160156 43.929688 16.160156 40.292969 C 16.160156 36.695312 13.234375 33.75 9.617188 33.75 L 7.402344 33.75 C 6.820312 33.75 6.371094 34.199219 6.371094 34.78125 L 6.371094 45.84375 C 6.371094 46.335938 6.714844 46.757812 7.191406 46.855469 L 7.402344 46.875 Z M 9.617188 44.792969 L 8.453125 44.792969 L 8.453125 35.832031 L 9.617188 35.832031 C 12.089844 35.832031 14.078125 37.835938 14.078125 40.292969 C 14.078125 42.789062 12.089844 44.773438 9.617188 44.792969 Z M 24.816406 46.875 C 26.539062 46.875 28.191406 46.085938 29.296875 44.867188 C 30.460938 43.648438 31.191406 41.980469 31.191406 40.125 C 31.191406 38.269531 30.460938 36.617188 29.296875 35.382812 C 28.191406 34.144531 26.539062 33.375 24.816406 33.375 C 23.015625 33.375 21.367188 34.144531 20.222656 35.382812 C 19.058594 36.617188 18.367188 38.269531 18.367188 40.125 C 18.367188 41.980469 19.058594 43.648438 20.222656 44.867188 C 21.367188 46.085938 23.015625 46.875 24.816406 46.875 Z M 24.816406 44.738281 C 23.617188 44.738281 22.566406 44.230469 21.777344 43.386719 C 20.992188 42.582031 20.503906 41.398438 20.503906 40.125 C 20.503906 38.851562 20.992188 37.667969 21.777344 36.84375 C 22.566406 36 23.617188 35.511719 24.816406 35.511719 C 25.941406 35.511719 26.992188 36 27.777344 36.84375 C 28.546875 37.667969 29.054688 38.851562 29.054688 40.125 C 29.054688 41.398438 28.546875 42.582031 27.777344 43.386719 C 26.992188 44.230469 25.941406 44.738281 24.816406 44.738281 Z M 39.996094 46.875 C 41.648438 46.875 43.148438 46.332031 44.328125 45.414062 C 44.777344 45.054688 44.851562 44.382812 44.515625 43.914062 C 44.140625 43.460938 43.445312 43.386719 43.015625 43.707031 C 42.171875 44.382812 41.160156 44.738281 39.996094 44.738281 C 38.703125 44.738281 37.503906 44.210938 36.621094 43.386719 C 35.777344 42.5625 35.253906 41.398438 35.253906 40.125 C 35.253906 38.851562 35.777344 37.726562 36.621094 36.863281 C 37.503906 36.039062 38.703125 35.511719 39.996094 35.511719 C 41.160156 35.511719 42.191406 35.867188 43.015625 36.542969 C 43.445312 36.882812 44.140625 36.804688 44.515625 36.335938 C 44.851562 35.867188 44.777344 35.210938 44.328125 34.835938 C 43.148438 33.917969 41.648438 33.375 39.996094 33.375 C 36.246094 33.394531 33.132812 36.414062 33.117188 40.125 C 33.132812 43.855469 36.246094 46.875 39.996094 46.875 Z M 39.996094 46.875 "/>\n      </g>'},gifIcon:{extension:".gif",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 17.394531 46.875 C 18.988281 46.875 20.46875 46.332031 21.648438 45.414062 C 21.835938 45.28125 21.949219 45.132812 22.003906 44.960938 L 22.003906 44.945312 C 22.023438 44.90625 22.023438 44.886719 22.042969 44.851562 C 22.0625 44.738281 22.097656 44.664062 22.097656 44.53125 L 22.097656 40.386719 C 22.097656 39.789062 21.613281 39.335938 21.011719 39.335938 L 17.28125 39.335938 C 16.699219 39.335938 16.210938 39.789062 16.210938 40.386719 C 16.210938 40.96875 16.699219 41.457031 17.28125 41.457031 L 19.960938 41.457031 L 19.960938 44.023438 C 19.210938 44.457031 18.332031 44.738281 17.394531 44.738281 C 16.042969 44.738281 14.863281 44.230469 14.019531 43.367188 C 13.136719 42.523438 12.613281 41.382812 12.613281 40.144531 C 12.613281 38.867188 13.136719 37.726562 14.019531 36.882812 C 14.863281 36.019531 16.042969 35.511719 17.394531 35.511719 C 18.519531 35.511719 19.550781 35.90625 20.355469 36.523438 C 20.824219 36.898438 21.519531 36.804688 21.875 36.355469 C 22.230469 35.886719 22.15625 35.195312 21.667969 34.835938 C 20.503906 33.917969 18.988281 33.375 17.394531 33.375 C 13.585938 33.375 10.472656 36.375 10.472656 40.144531 C 10.472656 43.894531 13.585938 46.875 17.394531 46.875 Z M 26.945312 46.875 C 27.507812 46.875 27.996094 46.425781 27.996094 45.84375 L 27.996094 34.78125 C 27.996094 34.199219 27.507812 33.75 26.945312 33.75 C 26.363281 33.75 25.914062 34.199219 25.914062 34.78125 L 25.914062 45.84375 C 25.914062 46.425781 26.363281 46.875 26.945312 46.875 Z M 33.066406 46.875 C 33.648438 46.875 34.117188 46.40625 34.117188 45.84375 L 34.117188 41.34375 L 38.488281 41.34375 C 39.050781 41.34375 39.519531 40.875 39.519531 40.292969 C 39.519531 39.75 39.050781 39.261719 38.488281 39.261719 L 34.117188 39.261719 L 34.117188 35.832031 L 39.199219 35.832031 C 39.742188 35.832031 40.230469 35.363281 40.230469 34.78125 C 40.230469 34.21875 39.742188 33.75 39.199219 33.75 L 33.066406 33.75 C 32.488281 33.75 32.035156 34.21875 32.035156 34.78125 L 32.035156 45.84375 C 32.035156 46.40625 32.488281 46.875 33.066406 46.875 Z M 33.066406 46.875 "/>\n      </g>'},jpegIcon:{extension:".jpeg",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 9 43.75 C 11.140625 43.75 12.890625 42.015625 12.890625 39.875 L 12.890625 33.671875 C 12.890625 33.1875 12.5 32.8125 12.03125 32.8125 C 11.546875 32.8125 11.15625 33.1875 11.15625 33.671875 L 11.15625 39.875 C 11.15625 41.046875 10.1875 42.015625 9 42.015625 C 8.046875 42.015625 7.234375 41.390625 6.953125 40.53125 C 6.8125 40.078125 6.328125 39.828125 5.859375 39.984375 C 5.421875 40.109375 5.15625 40.59375 5.3125 41.0625 C 5.8125 42.625 7.28125 43.75 9 43.75 Z M 15.640625 43.75 C 16.125 43.75 16.515625 43.359375 16.515625 42.890625 L 16.515625 39.5 L 18.4375 39.5 C 20.296875 39.5 21.796875 38 21.796875 36.171875 C 21.796875 34.3125 20.296875 32.8125 18.4375 32.8125 L 15.640625 32.8125 C 15.171875 32.8125 14.78125 33.1875 14.78125 33.671875 L 14.78125 42.890625 C 14.78125 43.359375 15.171875 43.75 15.640625 43.75 Z M 18.4375 37.765625 L 16.515625 37.765625 L 16.515625 34.546875 L 18.4375 34.546875 C 19.34375 34.546875 20.046875 35.265625 20.0625 36.171875 C 20.046875 37.046875 19.34375 37.765625 18.4375 37.765625 Z M 29.234375 43.75 C 29.6875 43.75 30.09375 43.359375 30.09375 42.890625 C 30.09375 42.40625 29.6875 42.015625 29.234375 42.015625 L 25 42.015625 L 25 39.140625 L 28.640625 39.140625 C 29.109375 39.140625 29.5 38.75 29.5 38.265625 C 29.5 37.8125 29.109375 37.40625 28.640625 37.40625 L 25 37.40625 L 25 34.546875 L 29.234375 34.546875 C 29.6875 34.546875 30.09375 34.15625 30.09375 33.671875 C 30.09375 33.1875 29.6875 32.8125 29.234375 32.8125 L 24.125 32.8125 C 23.640625 32.8125 23.265625 33.1875 23.265625 33.671875 L 23.265625 42.890625 C 23.265625 43.359375 23.640625 43.75 24.125 43.75 C 24.125 43.75 24.140625 43.734375 24.140625 43.734375 C 24.140625 43.734375 24.140625 43.75 24.171875 43.75 Z M 37.1875 43.75 C 38.515625 43.75 39.75 43.296875 40.734375 42.53125 C 40.890625 42.421875 40.984375 42.296875 41.03125 42.15625 L 41.03125 42.140625 C 41.046875 42.109375 41.046875 42.09375 41.0625 42.0625 C 41.078125 41.96875 41.109375 41.90625 41.109375 41.796875 L 41.109375 38.34375 C 41.109375 37.914062 40.8125 37.578125 40.410156 37.492188 L 40.203125 37.46875 L 37.09375 37.46875 C 36.609375 37.46875 36.203125 37.84375 36.203125 38.34375 C 36.203125 38.828125 36.609375 39.234375 37.09375 39.234375 L 39.328125 39.234375 L 39.328125 41.375 C 38.703125 41.734375 37.96875 41.96875 37.1875 41.96875 C 36.0625 41.96875 35.078125 41.546875 34.375 40.828125 C 33.640625 40.125 33.203125 39.171875 33.203125 38.140625 C 33.203125 37.078125 33.640625 36.125 34.375 35.421875 C 35.078125 34.703125 36.0625 34.28125 37.1875 34.28125 C 38.125 34.28125 38.984375 34.609375 39.65625 35.125 C 40.046875 35.4375 40.625 35.359375 40.921875 34.984375 C 41.21875 34.59375 41.15625 34.015625 40.75 33.71875 C 39.78125 32.953125 38.515625 32.5 37.1875 32.5 C 34.015625 32.5 31.421875 35 31.421875 38.140625 C 31.421875 41.265625 34.015625 43.75 37.1875 43.75 Z M 37.1875 43.75 "/>\n      </g>'},logIcon:{extension:".log",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 13.542969 46.875 C 14.085938 46.875 14.574219 46.40625 14.574219 45.84375 C 14.574219 45.261719 14.085938 44.792969 13.542969 44.792969 L 8.460938 44.792969 L 8.460938 34.78125 C 8.460938 34.21875 7.992188 33.75 7.410156 33.75 C 6.828125 33.75 6.378906 34.21875 6.378906 34.78125 L 6.378906 45.84375 C 6.378906 46.40625 6.828125 46.875 7.410156 46.875 Z M 21.742188 46.875 C 23.46875 46.875 25.117188 46.085938 26.222656 44.867188 C 27.386719 43.648438 28.117188 41.980469 28.117188 40.125 C 28.117188 38.269531 27.386719 36.617188 26.222656 35.382812 C 25.117188 34.144531 23.46875 33.375 21.742188 33.375 C 19.941406 33.375 18.292969 34.144531 17.148438 35.382812 C 15.984375 36.617188 15.292969 38.269531 15.292969 40.125 C 15.292969 41.980469 15.984375 43.648438 17.148438 44.867188 C 18.292969 46.085938 19.941406 46.875 21.742188 46.875 Z M 21.742188 44.738281 C 20.542969 44.738281 19.492188 44.230469 18.703125 43.386719 C 17.917969 42.582031 17.429688 41.398438 17.429688 40.125 C 17.429688 38.851562 17.917969 37.667969 18.703125 36.84375 C 19.492188 36 20.542969 35.511719 21.742188 35.511719 C 22.867188 35.511719 23.917969 36 24.703125 36.84375 C 25.472656 37.667969 25.980469 38.851562 25.980469 40.125 C 25.980469 41.398438 25.472656 42.582031 24.703125 43.386719 C 23.917969 44.230469 22.867188 44.738281 21.742188 44.738281 Z M 37.300781 46.875 C 38.894531 46.875 40.375 46.332031 41.558594 45.414062 C 41.746094 45.28125 41.855469 45.132812 41.914062 44.960938 L 41.914062 44.945312 L 41.949219 44.851562 C 41.96875 44.738281 42.007812 44.664062 42.007812 44.53125 L 42.007812 40.386719 C 42.007812 39.789062 41.519531 39.335938 40.917969 39.335938 L 37.1875 39.335938 C 36.605469 39.335938 36.121094 39.789062 36.121094 40.386719 C 36.121094 40.96875 36.605469 41.457031 37.1875 41.457031 L 39.871094 41.457031 L 39.871094 44.023438 C 39.121094 44.457031 38.238281 44.738281 37.300781 44.738281 C 35.949219 44.738281 34.769531 44.230469 33.925781 43.367188 C 33.042969 42.523438 32.519531 41.382812 32.519531 40.144531 C 32.519531 38.867188 33.042969 37.726562 33.925781 36.882812 C 34.769531 36.019531 35.949219 35.511719 37.300781 35.511719 C 38.425781 35.511719 39.457031 35.90625 40.261719 36.523438 C 40.730469 36.898438 41.425781 36.804688 41.78125 36.355469 C 42.136719 35.886719 42.0625 35.195312 41.574219 34.835938 C 40.414062 33.917969 38.894531 33.375 37.300781 33.375 C 33.496094 33.375 30.382812 36.375 30.382812 40.144531 C 30.382812 43.894531 33.496094 46.875 37.300781 46.875 Z M 37.300781 46.875 "/>\n      </g>'},movIcon:{extension:".mov",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 15.472656 46.875 C 16.035156 46.875 16.523438 46.40625 16.523438 45.84375 L 16.523438 34.78125 C 16.523438 34.289062 16.152344 33.882812 15.679688 33.777344 L 15.472656 33.75 L 15.453125 33.75 C 15.117188 33.75 14.816406 33.898438 14.609375 34.179688 L 10.878906 39.355469 L 7.148438 34.179688 C 6.960938 33.898438 6.625 33.75 6.324219 33.75 L 6.265625 33.75 C 5.703125 33.75 5.234375 34.21875 5.234375 34.78125 L 5.234375 45.84375 C 5.234375 46.40625 5.703125 46.875 6.265625 46.875 C 6.847656 46.875 7.316406 46.40625 7.316406 45.84375 L 7.316406 37.949219 L 10 41.699219 C 10.203125 41.980469 10.523438 42.132812 10.859375 42.132812 L 10.898438 42.132812 C 11.234375 42.132812 11.535156 41.980469 11.742188 41.699219 L 14.441406 37.949219 L 14.441406 45.84375 C 14.441406 46.40625 14.890625 46.875 15.472656 46.875 Z M 25.460938 46.875 C 27.1875 46.875 28.835938 46.085938 29.941406 44.867188 C 31.105469 43.648438 31.835938 41.980469 31.835938 40.125 C 31.835938 38.269531 31.105469 36.617188 29.941406 35.382812 C 28.835938 34.144531 27.1875 33.375 25.460938 33.375 C 23.660156 33.375 22.011719 34.144531 20.867188 35.382812 C 19.703125 36.617188 19.011719 38.269531 19.011719 40.125 C 19.011719 41.980469 19.703125 43.648438 20.867188 44.867188 C 22.011719 46.085938 23.660156 46.875 25.460938 46.875 Z M 25.460938 44.738281 C 24.261719 44.738281 23.210938 44.230469 22.421875 43.386719 C 21.636719 42.582031 21.148438 41.398438 21.148438 40.125 C 21.148438 38.851562 21.636719 37.667969 22.421875 36.84375 C 23.210938 36 24.261719 35.511719 25.460938 35.511719 C 26.585938 35.511719 27.636719 36 28.421875 36.84375 C 29.191406 37.667969 29.699219 38.851562 29.699219 40.125 C 29.699219 41.398438 29.191406 42.582031 28.421875 43.386719 C 27.636719 44.230469 26.585938 44.738281 25.460938 44.738281 Z M 38.683594 46.855469 L 38.71875 46.855469 C 38.777344 46.835938 38.8125 46.820312 38.871094 46.820312 C 38.886719 46.800781 38.886719 46.800781 38.90625 46.800781 C 38.964844 46.78125 39.019531 46.726562 39.058594 46.707031 L 39.09375 46.6875 L 39.207031 46.59375 C 39.226562 46.574219 39.226562 46.574219 39.246094 46.539062 L 39.339844 46.425781 C 39.355469 46.425781 39.355469 46.425781 39.355469 46.40625 C 39.394531 46.367188 39.414062 46.292969 39.433594 46.257812 L 44.0625 35.304688 C 44.269531 34.800781 44.027344 34.179688 43.5 33.976562 C 42.996094 33.75 42.375 33.992188 42.152344 34.519531 L 38.496094 43.199219 L 34.839844 34.519531 C 34.613281 33.992188 34.011719 33.75 33.507812 33.976562 C 32.964844 34.179688 32.71875 34.800781 32.945312 35.304688 L 37.539062 46.257812 C 37.574219 46.292969 37.613281 46.367188 37.632812 46.40625 C 37.632812 46.425781 37.652344 46.425781 37.652344 46.425781 C 37.667969 46.460938 37.707031 46.5 37.746094 46.539062 C 37.746094 46.574219 37.761719 46.574219 37.761719 46.59375 C 37.820312 46.632812 37.855469 46.648438 37.894531 46.6875 L 37.914062 46.6875 C 37.96875 46.726562 38.042969 46.78125 38.082031 46.800781 L 38.101562 46.800781 C 38.101562 46.800781 38.121094 46.800781 38.121094 46.820312 C 38.15625 46.820312 38.230469 46.835938 38.269531 46.855469 L 38.308594 46.855469 L 38.402344 46.871094 L 38.496094 46.875 C 38.550781 46.875 38.605469 46.875 38.683594 46.855469 Z M 38.683594 46.855469 "/>\n      </g>'},ogvIcon:{extension:".ogv",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 11.511719 46.875 C 13.238281 46.875 14.886719 46.085938 15.996094 44.867188 C 17.15625 43.648438 17.886719 41.980469 17.886719 40.125 C 17.886719 38.269531 17.15625 36.617188 15.996094 35.382812 C 14.886719 34.144531 13.238281 33.375 11.511719 33.375 C 9.714844 33.375 8.0625 34.144531 6.917969 35.382812 C 5.757812 36.617188 5.0625 38.269531 5.0625 40.125 C 5.0625 41.980469 5.757812 43.648438 6.917969 44.867188 C 8.0625 46.085938 9.714844 46.875 11.511719 46.875 Z M 11.511719 44.738281 C 10.3125 44.738281 9.261719 44.230469 8.476562 43.386719 C 7.6875 42.582031 7.199219 41.398438 7.199219 40.125 C 7.199219 38.851562 7.6875 37.667969 8.476562 36.84375 C 9.261719 36 10.3125 35.511719 11.511719 35.511719 C 12.636719 35.511719 13.6875 36 14.476562 36.84375 C 15.246094 37.667969 15.75 38.851562 15.75 40.125 C 15.75 41.398438 15.246094 42.582031 14.476562 43.386719 C 13.6875 44.230469 12.636719 44.738281 11.511719 44.738281 Z M 27.25 46.875 C 28.84375 46.875 30.324219 46.332031 31.507812 45.414062 C 31.695312 45.28125 31.804688 45.132812 31.863281 44.960938 L 31.863281 44.945312 C 31.882812 44.90625 31.882812 44.886719 31.898438 44.851562 C 31.917969 44.738281 31.957031 44.664062 31.957031 44.53125 L 31.957031 40.386719 C 31.957031 39.789062 31.46875 39.335938 30.867188 39.335938 L 27.136719 39.335938 C 26.554688 39.335938 26.070312 39.789062 26.070312 40.386719 C 26.070312 40.96875 26.554688 41.457031 27.136719 41.457031 L 29.820312 41.457031 L 29.820312 44.023438 C 29.070312 44.457031 28.1875 44.738281 27.25 44.738281 C 25.898438 44.738281 24.71875 44.230469 23.875 43.367188 C 22.992188 42.523438 22.46875 41.382812 22.46875 40.144531 C 22.46875 38.867188 22.992188 37.726562 23.875 36.882812 C 24.71875 36.019531 25.898438 35.511719 27.25 35.511719 C 28.375 35.511719 29.40625 35.90625 30.210938 36.523438 C 30.679688 36.898438 31.375 36.804688 31.730469 36.355469 C 32.085938 35.886719 32.011719 35.195312 31.523438 34.835938 C 30.363281 33.917969 28.84375 33.375 27.25 33.375 C 23.445312 33.375 20.332031 36.375 20.332031 40.144531 C 20.332031 43.894531 23.445312 46.875 27.25 46.875 Z M 40.191406 46.855469 L 40.230469 46.855469 C 40.285156 46.835938 40.324219 46.820312 40.378906 46.820312 C 40.398438 46.800781 40.398438 46.800781 40.417969 46.800781 C 40.472656 46.78125 40.53125 46.726562 40.566406 46.707031 C 40.605469 46.6875 40.605469 46.6875 40.605469 46.6875 L 40.71875 46.59375 C 40.738281 46.574219 40.738281 46.574219 40.753906 46.539062 L 40.847656 46.425781 C 40.867188 46.425781 40.867188 46.425781 40.867188 46.40625 C 40.90625 46.367188 40.925781 46.292969 40.941406 46.257812 L 45.574219 35.304688 C 45.78125 34.800781 45.535156 34.179688 45.011719 33.976562 C 44.503906 33.75 43.886719 33.992188 43.660156 34.519531 L 40.003906 43.199219 L 36.347656 34.519531 C 36.125 33.992188 35.523438 33.75 35.019531 33.976562 C 34.472656 34.179688 34.230469 34.800781 34.457031 35.304688 L 39.050781 46.257812 C 39.085938 46.292969 39.125 46.367188 39.144531 46.40625 C 39.144531 46.425781 39.160156 46.425781 39.160156 46.425781 C 39.179688 46.460938 39.21875 46.5 39.253906 46.539062 C 39.253906 46.574219 39.273438 46.574219 39.273438 46.59375 C 39.332031 46.632812 39.367188 46.648438 39.40625 46.6875 L 39.425781 46.6875 C 39.480469 46.726562 39.554688 46.78125 39.59375 46.800781 L 39.613281 46.800781 C 39.613281 46.800781 39.628906 46.800781 39.628906 46.820312 C 39.667969 46.820312 39.742188 46.835938 39.78125 46.855469 L 39.816406 46.855469 L 39.910156 46.871094 L 40.003906 46.875 C 40.0625 46.875 40.117188 46.875 40.191406 46.855469 Z M 40.191406 46.855469 "/>\n      </g>'},pngIcon:{extension:".png",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 7.523438 46.875 C 8.105469 46.875 8.574219 46.40625 8.574219 45.84375 L 8.574219 41.773438 L 10.878906 41.773438 C 13.109375 41.773438 14.910156 39.976562 14.910156 37.78125 C 14.910156 35.550781 13.109375 33.75 10.878906 33.75 L 7.523438 33.75 C 6.960938 33.75 6.492188 34.199219 6.492188 34.78125 L 6.492188 45.84375 C 6.492188 46.40625 6.960938 46.875 7.523438 46.875 Z M 10.878906 39.695312 L 8.574219 39.695312 L 8.574219 35.832031 L 10.878906 35.832031 C 11.964844 35.832031 12.808594 36.695312 12.828125 37.78125 C 12.808594 38.832031 11.964844 39.695312 10.878906 39.695312 Z M 26.75 46.875 C 27.3125 46.875 27.78125 46.40625 27.78125 45.84375 L 27.78125 34.949219 C 27.78125 34.40625 27.3125 33.9375 26.75 33.9375 C 26.1875 33.9375 25.738281 34.40625 25.738281 34.949219 L 25.738281 42.675781 L 19.679688 34.292969 C 19.363281 33.84375 18.722656 33.75 18.253906 34.070312 C 17.972656 34.273438 17.824219 34.613281 17.84375 34.929688 L 17.84375 45.84375 C 17.84375 46.40625 18.292969 46.875 18.875 46.875 C 19.417969 46.875 19.886719 46.40625 19.886719 45.84375 L 19.886719 38.0625 L 25.886719 46.386719 C 25.90625 46.425781 25.941406 46.460938 25.980469 46.5 C 26.167969 46.726562 26.449219 46.875 26.75 46.875 Z M 38.082031 46.875 C 39.675781 46.875 41.15625 46.332031 42.339844 45.414062 C 42.527344 45.28125 42.636719 45.132812 42.695312 44.960938 L 42.695312 44.945312 C 42.714844 44.90625 42.714844 44.886719 42.730469 44.851562 C 42.75 44.738281 42.789062 44.664062 42.789062 44.53125 L 42.789062 40.386719 C 42.789062 39.789062 42.300781 39.335938 41.699219 39.335938 L 37.96875 39.335938 C 37.386719 39.335938 36.902344 39.789062 36.902344 40.386719 C 36.902344 40.96875 37.386719 41.457031 37.96875 41.457031 L 40.652344 41.457031 L 40.652344 44.023438 C 39.902344 44.457031 39.019531 44.738281 38.082031 44.738281 C 36.730469 44.738281 35.550781 44.230469 34.707031 43.367188 C 33.824219 42.523438 33.300781 41.382812 33.300781 40.144531 C 33.300781 38.867188 33.824219 37.726562 34.707031 36.882812 C 35.550781 36.019531 36.730469 35.511719 38.082031 35.511719 C 39.207031 35.511719 40.238281 35.90625 41.042969 36.523438 C 41.511719 36.898438 42.207031 36.804688 42.5625 36.355469 C 42.917969 35.886719 42.84375 35.195312 42.355469 34.835938 C 41.195312 33.917969 39.675781 33.375 38.082031 33.375 C 34.277344 33.375 31.164062 36.375 31.164062 40.144531 C 31.164062 43.894531 34.277344 46.875 38.082031 46.875 Z M 38.082031 46.875 "/>\n      </g>'},txtIcon:{extension:".txt",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 12.847656 46.875 C 13.429688 46.875 13.878906 46.425781 13.878906 45.84375 L 13.878906 35.832031 L 16.859375 35.832031 C 17.421875 35.832031 17.890625 35.34375 17.890625 34.78125 C 17.890625 34.199219 17.421875 33.75 16.859375 33.75 L 8.855469 33.75 C 8.273438 33.75 7.824219 34.199219 7.824219 34.78125 C 7.824219 35.34375 8.273438 35.832031 8.855469 35.832031 L 11.816406 35.832031 L 11.816406 45.84375 C 11.816406 46.425781 12.285156 46.875 12.847656 46.875 Z M 29.019531 46.875 C 29.222656 46.875 29.429688 46.800781 29.617188 46.667969 C 30.085938 46.351562 30.160156 45.695312 29.84375 45.242188 L 26.28125 40.367188 L 29.84375 35.53125 C 30.160156 35.0625 30.085938 34.425781 29.617188 34.105469 C 29.148438 33.75 28.53125 33.84375 28.175781 34.332031 L 25.023438 38.644531 L 21.855469 34.332031 C 21.535156 33.84375 20.878906 33.75 20.429688 34.105469 C 19.960938 34.425781 19.867188 35.0625 20.1875 35.53125 L 23.75 40.367188 L 20.1875 45.242188 C 19.867188 45.695312 19.960938 46.351562 20.429688 46.667969 C 20.597656 46.800781 20.804688 46.875 21.03125 46.875 C 21.347656 46.875 21.648438 46.707031 21.855469 46.445312 L 25.023438 42.113281 L 28.175781 46.445312 C 28.378906 46.707031 28.679688 46.875 29.019531 46.875 Z M 37.464844 46.875 C 38.042969 46.875 38.496094 46.425781 38.496094 45.84375 L 38.496094 35.832031 L 41.476562 35.832031 C 42.039062 35.832031 42.507812 35.34375 42.507812 34.78125 C 42.507812 34.199219 42.039062 33.75 41.476562 33.75 L 33.46875 33.75 C 32.886719 33.75 32.4375 34.199219 32.4375 34.78125 C 32.4375 35.34375 32.886719 35.832031 33.46875 35.832031 L 36.433594 35.832031 L 36.433594 45.84375 C 36.433594 46.425781 36.902344 46.875 37.464844 46.875 Z M 37.464844 46.875 "/>\n      </g>'},webmIcon:{extension:".webm",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 7.195312 43.734375 L 7.242188 43.734375 C 7.273438 43.71875 7.304688 43.703125 7.367188 43.703125 C 7.367188 43.6875 7.382812 43.6875 7.382812 43.6875 L 7.398438 43.6875 C 7.429688 43.671875 7.476562 43.625 7.523438 43.59375 L 7.554688 43.59375 C 7.585938 43.5625 7.617188 43.53125 7.648438 43.515625 C 7.648438 43.5 7.664062 43.5 7.664062 43.46875 L 7.757812 43.375 C 7.757812 43.375 7.757812 43.359375 7.773438 43.359375 C 7.789062 43.328125 7.820312 43.265625 7.835938 43.21875 L 9.882812 38.375 L 11.929688 43.21875 C 11.945312 43.265625 11.960938 43.328125 11.992188 43.359375 C 11.992188 43.359375 11.992188 43.375 12.023438 43.375 L 12.085938 43.46875 C 12.101562 43.5 12.101562 43.5 12.117188 43.515625 C 12.148438 43.53125 12.179688 43.5625 12.226562 43.59375 L 12.242188 43.59375 C 12.273438 43.625 12.320312 43.671875 12.382812 43.6875 C 12.398438 43.6875 12.398438 43.6875 12.414062 43.703125 C 12.445312 43.703125 12.476562 43.71875 12.523438 43.734375 L 12.570312 43.734375 L 12.640625 43.746094 L 12.710938 43.75 C 12.773438 43.75 12.820312 43.75 12.867188 43.734375 L 12.898438 43.734375 C 12.945312 43.71875 12.992188 43.703125 13.023438 43.703125 C 13.023438 43.6875 13.039062 43.6875 13.039062 43.6875 L 13.054688 43.6875 C 13.117188 43.671875 13.148438 43.625 13.195312 43.59375 L 13.210938 43.59375 C 13.242188 43.5625 13.289062 43.53125 13.320312 43.515625 C 13.320312 43.5 13.335938 43.5 13.335938 43.46875 C 13.367188 43.4375 13.398438 43.40625 13.414062 43.375 C 13.414062 43.375 13.429688 43.359375 13.429688 43.359375 C 13.460938 43.328125 13.492188 43.265625 13.507812 43.21875 L 17.335938 34.109375 C 17.523438 33.6875 17.320312 33.171875 16.898438 33 C 16.445312 32.8125 15.945312 33.015625 15.757812 33.453125 L 12.710938 40.6875 L 10.695312 35.890625 C 10.539062 35.546875 10.210938 35.359375 9.882812 35.359375 C 9.539062 35.359375 9.210938 35.546875 9.070312 35.890625 L 7.054688 40.6875 L 3.992188 33.453125 C 3.820312 33.015625 3.304688 32.8125 2.882812 33 C 2.429688 33.171875 2.242188 33.6875 2.414062 34.109375 L 6.257812 43.21875 C 6.289062 43.265625 6.304688 43.328125 6.335938 43.359375 L 6.335938 43.375 C 6.367188 43.40625 6.382812 43.4375 6.414062 43.46875 C 6.429688 43.5 6.429688 43.5 6.445312 43.515625 C 6.492188 43.53125 6.507812 43.5625 6.554688 43.59375 L 6.570312 43.59375 C 6.601562 43.625 6.664062 43.671875 6.710938 43.6875 C 6.726562 43.6875 6.726562 43.6875 6.742188 43.703125 C 6.773438 43.703125 6.804688 43.71875 6.851562 43.734375 L 6.898438 43.734375 L 6.976562 43.746094 L 7.054688 43.75 C 7.101562 43.75 7.148438 43.75 7.195312 43.734375 Z M 25.179688 43.75 C 25.632812 43.75 26.039062 43.359375 26.039062 42.890625 C 26.039062 42.40625 25.632812 42.015625 25.179688 42.015625 L 20.945312 42.015625 L 20.945312 39.140625 L 24.585938 39.140625 C 25.054688 39.140625 25.445312 38.75 25.445312 38.265625 C 25.445312 37.8125 25.054688 37.40625 24.585938 37.40625 L 20.945312 37.40625 L 20.945312 34.546875 L 25.179688 34.546875 C 25.632812 34.546875 26.039062 34.15625 26.039062 33.671875 C 26.039062 33.1875 25.632812 32.8125 25.179688 32.8125 L 20.070312 32.8125 C 19.585938 32.8125 19.210938 33.1875 19.210938 33.671875 L 19.210938 42.890625 C 19.210938 43.359375 19.585938 43.75 20.070312 43.75 C 20.070312 43.75 20.085938 43.734375 20.085938 43.734375 C 20.085938 43.734375 20.085938 43.75 20.117188 43.75 Z M 31.539062 43.75 C 33.382812 43.75 34.882812 42.25 34.882812 40.390625 C 34.882812 39.203125 34.242188 38.15625 33.304688 37.5625 C 33.679688 37.0625 33.898438 36.453125 33.898438 35.78125 C 33.898438 34.140625 32.570312 32.8125 30.929688 32.8125 L 28.710938 32.8125 C 28.242188 32.8125 27.851562 33.1875 27.851562 33.671875 L 27.851562 42.890625 C 27.851562 43.359375 28.242188 43.75 28.710938 43.75 L 28.757812 43.734375 C 28.757812 43.734375 28.757812 43.75 28.773438 43.75 Z M 30.929688 37.046875 L 29.585938 37.046875 L 29.585938 34.546875 L 30.929688 34.546875 C 31.617188 34.546875 32.164062 35.09375 32.164062 35.78125 C 32.164062 36.46875 31.617188 37.046875 30.929688 37.046875 Z M 31.539062 42.015625 L 29.585938 42.015625 L 29.585938 38.78125 L 31.539062 38.78125 C 32.429688 38.796875 33.148438 39.5 33.148438 40.390625 C 33.148438 41.296875 32.429688 42 31.539062 42.015625 Z M 45.664062 43.75 C 46.132812 43.75 46.539062 43.359375 46.539062 42.890625 L 46.539062 33.671875 C 46.539062 33.269531 46.242188 32.9375 45.859375 32.839844 L 45.664062 32.8125 L 45.648438 32.8125 C 45.367188 32.8125 45.117188 32.9375 44.945312 33.171875 L 41.835938 37.484375 L 38.726562 33.171875 C 38.570312 32.9375 38.289062 32.8125 38.039062 32.8125 L 37.992188 32.8125 C 37.523438 32.8125 37.132812 33.203125 37.132812 33.671875 L 37.132812 42.890625 C 37.132812 43.359375 37.523438 43.75 37.992188 43.75 C 38.476562 43.75 38.867188 43.359375 38.867188 42.890625 L 38.867188 36.3125 L 41.101562 39.4375 C 41.273438 39.671875 41.539062 39.796875 41.820312 39.796875 L 41.851562 39.796875 C 42.132812 39.796875 42.382812 39.671875 42.554688 39.4375 L 44.804688 36.3125 L 44.804688 42.890625 C 44.804688 43.359375 45.179688 43.75 45.664062 43.75 Z M 45.664062 43.75 "/>\n      </g>'},webpIcon:{extension:".webp",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 9.234375 43.734375 L 9.28125 43.734375 C 9.3125 43.71875 9.34375 43.703125 9.40625 43.703125 L 9.414062 43.6875 C 9.421875 43.6875 9.421875 43.6875 9.4375 43.6875 C 9.46875 43.671875 9.515625 43.625 9.5625 43.59375 L 9.59375 43.59375 C 9.625 43.5625 9.65625 43.53125 9.6875 43.515625 C 9.6875 43.5 9.703125 43.5 9.703125 43.46875 L 9.796875 43.375 C 9.796875 43.375 9.796875 43.359375 9.8125 43.359375 C 9.828125 43.328125 9.859375 43.265625 9.875 43.21875 L 11.921875 38.375 L 13.96875 43.21875 C 13.984375 43.265625 14 43.328125 14.03125 43.359375 C 14.03125 43.359375 14.03125 43.375 14.0625 43.375 L 14.125 43.46875 C 14.140625 43.5 14.140625 43.5 14.15625 43.515625 L 14.203125 43.546875 L 14.265625 43.59375 C 14.265625 43.59375 14.265625 43.59375 14.28125 43.59375 C 14.3125 43.625 14.359375 43.671875 14.421875 43.6875 C 14.4375 43.6875 14.4375 43.6875 14.453125 43.703125 C 14.484375 43.703125 14.515625 43.71875 14.5625 43.734375 L 14.609375 43.734375 L 14.679688 43.746094 L 14.75 43.75 C 14.8125 43.75 14.859375 43.75 14.90625 43.734375 L 14.9375 43.734375 C 14.984375 43.71875 15.03125 43.703125 15.0625 43.703125 C 15.0625 43.6875 15.078125 43.6875 15.078125 43.6875 L 15.09375 43.6875 C 15.15625 43.671875 15.1875 43.625 15.234375 43.59375 L 15.25 43.59375 C 15.28125 43.5625 15.328125 43.53125 15.359375 43.515625 C 15.359375 43.5 15.375 43.5 15.375 43.46875 C 15.40625 43.4375 15.4375 43.40625 15.453125 43.375 L 15.46875 43.359375 C 15.5 43.328125 15.53125 43.265625 15.546875 43.21875 L 19.375 34.109375 C 19.5625 33.6875 19.359375 33.171875 18.9375 33 C 18.484375 32.8125 17.984375 33.015625 17.796875 33.453125 L 14.75 40.6875 L 12.734375 35.890625 C 12.578125 35.546875 12.25 35.359375 11.921875 35.359375 C 11.578125 35.359375 11.25 35.546875 11.109375 35.890625 L 9.09375 40.6875 L 6.03125 33.453125 C 5.859375 33.015625 5.34375 32.8125 4.921875 33 C 4.46875 33.171875 4.28125 33.6875 4.453125 34.109375 L 8.296875 43.21875 C 8.328125 43.265625 8.34375 43.328125 8.375 43.359375 L 8.375 43.375 C 8.40625 43.40625 8.421875 43.4375 8.453125 43.46875 C 8.46875 43.5 8.46875 43.5 8.484375 43.515625 L 8.539062 43.546875 L 8.59375 43.59375 C 8.59375 43.59375 8.59375 43.59375 8.609375 43.59375 C 8.640625 43.625 8.703125 43.671875 8.75 43.6875 C 8.765625 43.6875 8.765625 43.6875 8.78125 43.703125 C 8.8125 43.703125 8.84375 43.71875 8.890625 43.734375 L 8.9375 43.734375 L 9.015625 43.746094 L 9.09375 43.75 C 9.140625 43.75 9.1875 43.75 9.234375 43.734375 Z M 27.21875 43.75 C 27.671875 43.75 28.078125 43.359375 28.078125 42.890625 C 28.078125 42.40625 27.671875 42.015625 27.21875 42.015625 L 22.984375 42.015625 L 22.984375 39.140625 L 26.625 39.140625 C 27.09375 39.140625 27.484375 38.75 27.484375 38.265625 C 27.484375 37.8125 27.09375 37.40625 26.625 37.40625 L 22.984375 37.40625 L 22.984375 34.546875 L 27.21875 34.546875 C 27.671875 34.546875 28.078125 34.15625 28.078125 33.671875 C 28.078125 33.1875 27.671875 32.8125 27.21875 32.8125 L 22.109375 32.8125 C 21.625 32.8125 21.25 33.1875 21.25 33.671875 L 21.25 42.890625 C 21.25 43.359375 21.625 43.75 22.109375 43.75 L 22.125 43.734375 C 22.125 43.734375 22.125 43.75 22.15625 43.75 Z M 33.578125 43.75 C 35.421875 43.75 36.921875 42.25 36.921875 40.390625 C 36.921875 39.203125 36.28125 38.15625 35.34375 37.5625 C 35.71875 37.0625 35.9375 36.453125 35.9375 35.78125 C 35.9375 34.140625 34.609375 32.8125 32.96875 32.8125 L 30.75 32.8125 C 30.28125 32.8125 29.890625 33.1875 29.890625 33.671875 L 29.890625 42.890625 C 29.890625 43.359375 30.28125 43.75 30.75 43.75 C 30.765625 43.75 30.765625 43.734375 30.796875 43.734375 C 30.796875 43.734375 30.796875 43.75 30.8125 43.75 Z M 32.96875 37.046875 L 31.625 37.046875 L 31.625 34.546875 L 32.96875 34.546875 C 33.65625 34.546875 34.203125 35.09375 34.203125 35.78125 C 34.203125 36.46875 33.65625 37.046875 32.96875 37.046875 Z M 33.578125 42.015625 L 31.625 42.015625 L 31.625 38.78125 L 33.578125 38.78125 C 34.46875 38.796875 35.1875 39.5 35.1875 40.390625 C 35.1875 41.296875 34.46875 42 33.578125 42.015625 Z M 40.03125 43.75 C 40.515625 43.75 40.90625 43.359375 40.90625 42.890625 L 40.90625 39.5 L 42.828125 39.5 C 44.6875 39.5 46.1875 38 46.1875 36.171875 C 46.1875 34.3125 44.6875 32.8125 42.828125 32.8125 L 40.03125 32.8125 C 39.5625 32.8125 39.171875 33.1875 39.171875 33.671875 L 39.171875 42.890625 C 39.171875 43.359375 39.5625 43.75 40.03125 43.75 Z M 42.828125 37.765625 L 40.90625 37.765625 L 40.90625 34.546875 L 42.828125 34.546875 C 43.734375 34.546875 44.4375 35.265625 44.453125 36.171875 C 44.4375 37.046875 43.734375 37.765625 42.828125 37.765625 Z M 42.828125 37.765625 "/>\n      </g>'},wmvIcon:{extension:".wmv",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 8.484375 43.734375 L 8.53125 43.734375 C 8.5625 43.71875 8.59375 43.703125 8.65625 43.703125 L 8.664062 43.6875 C 8.671875 43.6875 8.671875 43.6875 8.6875 43.6875 C 8.71875 43.671875 8.765625 43.625 8.8125 43.59375 L 8.84375 43.59375 C 8.875 43.5625 8.90625 43.53125 8.9375 43.515625 C 8.9375 43.5 8.953125 43.5 8.953125 43.46875 L 9.046875 43.375 C 9.046875 43.375 9.046875 43.359375 9.0625 43.359375 C 9.078125 43.328125 9.109375 43.265625 9.125 43.21875 L 11.171875 38.375 L 13.21875 43.21875 C 13.234375 43.265625 13.25 43.328125 13.28125 43.359375 C 13.28125 43.359375 13.28125 43.375 13.3125 43.375 L 13.375 43.46875 C 13.390625 43.5 13.390625 43.5 13.40625 43.515625 L 13.453125 43.546875 L 13.515625 43.59375 C 13.515625 43.59375 13.515625 43.59375 13.53125 43.59375 C 13.5625 43.625 13.609375 43.671875 13.671875 43.6875 C 13.6875 43.6875 13.6875 43.6875 13.703125 43.703125 C 13.734375 43.703125 13.765625 43.71875 13.8125 43.734375 L 13.859375 43.734375 L 13.929688 43.746094 L 14 43.75 C 14.0625 43.75 14.109375 43.75 14.15625 43.734375 L 14.1875 43.734375 C 14.234375 43.71875 14.28125 43.703125 14.3125 43.703125 C 14.3125 43.6875 14.328125 43.6875 14.328125 43.6875 L 14.34375 43.6875 C 14.40625 43.671875 14.4375 43.625 14.484375 43.59375 L 14.5 43.59375 C 14.53125 43.5625 14.578125 43.53125 14.609375 43.515625 C 14.609375 43.5 14.625 43.5 14.625 43.46875 C 14.65625 43.4375 14.6875 43.40625 14.703125 43.375 L 14.71875 43.359375 C 14.75 43.328125 14.78125 43.265625 14.796875 43.21875 L 18.625 34.109375 C 18.8125 33.6875 18.609375 33.171875 18.1875 33 C 17.734375 32.8125 17.234375 33.015625 17.046875 33.453125 L 14 40.6875 L 11.984375 35.890625 C 11.828125 35.546875 11.5 35.359375 11.171875 35.359375 C 10.828125 35.359375 10.5 35.546875 10.359375 35.890625 L 8.34375 40.6875 L 5.28125 33.453125 C 5.109375 33.015625 4.59375 32.8125 4.171875 33 C 3.71875 33.171875 3.53125 33.6875 3.703125 34.109375 L 7.546875 43.21875 C 7.578125 43.265625 7.59375 43.328125 7.625 43.359375 L 7.625 43.375 C 7.65625 43.40625 7.671875 43.4375 7.703125 43.46875 C 7.71875 43.5 7.71875 43.5 7.734375 43.515625 L 7.789062 43.546875 L 7.84375 43.59375 C 7.84375 43.59375 7.84375 43.59375 7.859375 43.59375 C 7.890625 43.625 7.953125 43.671875 8 43.6875 C 8.015625 43.6875 8.015625 43.6875 8.03125 43.703125 C 8.0625 43.703125 8.09375 43.71875 8.140625 43.734375 L 8.1875 43.734375 L 8.265625 43.746094 L 8.34375 43.75 C 8.390625 43.75 8.4375 43.75 8.484375 43.734375 Z M 29.03125 43.75 C 29.5 43.75 29.90625 43.359375 29.90625 42.890625 L 29.90625 33.671875 C 29.90625 33.269531 29.609375 32.9375 29.226562 32.839844 L 29.03125 32.8125 L 29.015625 32.8125 C 28.734375 32.8125 28.484375 32.9375 28.3125 33.171875 L 25.203125 37.484375 L 22.09375 33.171875 C 21.9375 32.9375 21.65625 32.8125 21.40625 32.8125 L 21.359375 32.8125 C 20.890625 32.8125 20.5 33.203125 20.5 33.671875 L 20.5 42.890625 C 20.5 43.359375 20.890625 43.75 21.359375 43.75 C 21.84375 43.75 22.234375 43.359375 22.234375 42.890625 L 22.234375 36.3125 L 24.46875 39.4375 C 24.640625 39.671875 24.90625 39.796875 25.1875 39.796875 L 25.21875 39.796875 C 25.5 39.796875 25.75 39.671875 25.921875 39.4375 L 28.171875 36.3125 L 28.171875 42.890625 C 28.171875 43.359375 28.546875 43.75 29.03125 43.75 Z M 37.015625 43.734375 L 37.0625 43.734375 C 37.09375 43.71875 37.125 43.703125 37.1875 43.703125 L 37.195312 43.6875 C 37.203125 43.6875 37.203125 43.6875 37.21875 43.6875 C 37.25 43.671875 37.296875 43.625 37.34375 43.59375 L 37.375 43.59375 C 37.40625 43.5625 37.4375 43.53125 37.46875 43.515625 C 37.46875 43.5 37.484375 43.5 37.484375 43.46875 L 37.578125 43.375 C 37.578125 43.375 37.578125 43.359375 37.59375 43.359375 C 37.609375 43.328125 37.640625 43.265625 37.65625 43.21875 L 39.703125 38.375 L 41.75 43.21875 C 41.765625 43.265625 41.78125 43.328125 41.8125 43.359375 C 41.8125 43.359375 41.8125 43.375 41.84375 43.375 L 41.90625 43.46875 C 41.921875 43.5 41.921875 43.5 41.9375 43.515625 L 41.984375 43.546875 L 42.046875 43.59375 C 42.046875 43.59375 42.046875 43.59375 42.0625 43.59375 C 42.09375 43.625 42.140625 43.671875 42.203125 43.6875 C 42.21875 43.6875 42.21875 43.6875 42.234375 43.703125 C 42.265625 43.703125 42.296875 43.71875 42.34375 43.734375 L 42.390625 43.734375 L 42.460938 43.746094 L 42.53125 43.75 C 42.59375 43.75 42.640625 43.75 42.6875 43.734375 L 42.71875 43.734375 C 42.765625 43.71875 42.8125 43.703125 42.84375 43.703125 C 42.84375 43.6875 42.859375 43.6875 42.859375 43.6875 L 42.875 43.6875 C 42.9375 43.671875 42.96875 43.625 43.015625 43.59375 L 43.03125 43.59375 C 43.0625 43.5625 43.109375 43.53125 43.140625 43.515625 C 43.140625 43.5 43.15625 43.5 43.15625 43.46875 C 43.1875 43.4375 43.21875 43.40625 43.234375 43.375 L 43.25 43.359375 C 43.28125 43.328125 43.3125 43.265625 43.328125 43.21875 L 47.15625 34.109375 C 47.34375 33.6875 47.140625 33.171875 46.71875 33 C 46.265625 32.8125 45.765625 33.015625 45.578125 33.453125 L 42.53125 40.6875 L 40.515625 35.890625 C 40.359375 35.546875 40.03125 35.359375 39.703125 35.359375 C 39.359375 35.359375 39.03125 35.546875 38.890625 35.890625 L 36.875 40.6875 L 33.8125 33.453125 C 33.640625 33.015625 33.125 32.8125 32.703125 33 C 32.25 33.171875 32.0625 33.6875 32.234375 34.109375 L 36.078125 43.21875 C 36.109375 43.265625 36.125 43.328125 36.15625 43.359375 L 36.15625 43.375 C 36.1875 43.40625 36.203125 43.4375 36.234375 43.46875 C 36.25 43.5 36.25 43.5 36.265625 43.515625 L 36.320312 43.546875 L 36.375 43.59375 C 36.375 43.59375 36.375 43.59375 36.390625 43.59375 C 36.421875 43.625 36.484375 43.671875 36.53125 43.6875 C 36.546875 43.6875 36.546875 43.6875 36.5625 43.703125 C 36.59375 43.703125 36.625 43.71875 36.671875 43.734375 L 36.71875 43.734375 L 36.796875 43.746094 L 36.875 43.75 C 36.921875 43.75 36.96875 43.75 37.015625 43.734375 Z M 37.015625 43.734375 "/>\n      </g>'},xlsIcon:{extension:".xls",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 17.21875 46.875 C 17.425781 46.875 17.632812 46.800781 17.820312 46.667969 C 18.289062 46.351562 18.363281 45.695312 18.042969 45.242188 L 14.480469 40.367188 L 18.042969 35.53125 C 18.363281 35.0625 18.289062 34.425781 17.820312 34.105469 C 17.351562 33.75 16.730469 33.84375 16.375 34.332031 L 13.226562 38.644531 L 10.054688 34.332031 C 9.738281 33.84375 9.082031 33.75 8.632812 34.105469 C 8.164062 34.425781 8.070312 35.0625 8.386719 35.53125 L 11.949219 40.367188 L 8.386719 45.242188 C 8.070312 45.695312 8.164062 46.351562 8.632812 46.667969 C 8.800781 46.800781 9.007812 46.875 9.230469 46.875 C 9.550781 46.875 9.851562 46.707031 10.054688 46.445312 L 13.226562 42.113281 L 16.375 46.445312 C 16.582031 46.707031 16.882812 46.875 17.21875 46.875 Z M 29.351562 46.875 C 29.894531 46.875 30.382812 46.40625 30.382812 45.84375 C 30.382812 45.261719 29.894531 44.792969 29.351562 44.792969 L 24.269531 44.792969 L 24.269531 34.78125 C 24.269531 34.21875 23.800781 33.75 23.21875 33.75 C 22.636719 33.75 22.1875 34.21875 22.1875 34.78125 L 22.1875 45.84375 C 22.1875 46.335938 22.53125 46.757812 23.007812 46.855469 L 23.222656 46.875 Z M 37.28125 46.855469 C 38.613281 46.855469 39.832031 46.460938 40.75 45.789062 C 41.6875 45.113281 42.363281 44.082031 42.363281 42.882812 C 42.363281 42.300781 42.195312 41.738281 41.914062 41.289062 C 41.480469 40.59375 40.804688 40.105469 40.039062 39.730469 C 39.289062 39.375 38.40625 39.132812 37.449219 38.945312 L 37.414062 38.945312 C 36.398438 38.757812 35.554688 38.457031 35.070312 38.117188 C 34.824219 37.949219 34.65625 37.78125 34.5625 37.632812 C 34.46875 37.480469 34.429688 37.332031 34.429688 37.105469 C 34.429688 36.710938 34.636719 36.300781 35.144531 35.925781 C 35.648438 35.550781 36.398438 35.289062 37.242188 35.289062 C 38.386719 35.289062 39.304688 35.851562 40.261719 36.488281 C 40.710938 36.789062 41.3125 36.65625 41.59375 36.207031 C 41.894531 35.773438 41.761719 35.175781 41.332031 34.875 C 40.375 34.257812 39.042969 33.375 37.242188 33.375 C 36.023438 33.375 34.882812 33.730469 34 34.367188 C 33.136719 35.007812 32.5 35.980469 32.5 37.105469 C 32.5 37.667969 32.648438 38.195312 32.929688 38.644531 C 33.34375 39.300781 33.960938 39.769531 34.675781 40.105469 C 35.386719 40.445312 36.210938 40.667969 37.09375 40.835938 L 37.132812 40.835938 C 38.238281 41.042969 39.15625 41.363281 39.699219 41.71875 C 39.980469 41.90625 40.148438 42.09375 40.261719 42.28125 C 40.375 42.46875 40.429688 42.636719 40.429688 42.882812 C 40.429688 43.351562 40.1875 43.820312 39.625 44.230469 C 39.0625 44.644531 38.21875 44.925781 37.28125 44.925781 C 35.949219 44.945312 34.523438 44.15625 33.699219 43.480469 C 33.289062 43.144531 32.667969 43.199219 32.332031 43.613281 C 32.011719 44.023438 32.070312 44.644531 32.480469 44.980469 C 33.550781 45.824219 35.257812 46.835938 37.28125 46.855469 Z M 37.28125 46.855469 "/>\n      </g>'},xlsxIcon:{extension:".xlsx",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 13.070312 43.75 C 13.242188 43.75 13.414062 43.6875 13.570312 43.578125 C 13.960938 43.3125 14.023438 42.765625 13.757812 42.390625 L 10.789062 38.328125 L 13.757812 34.296875 C 14.023438 33.90625 13.960938 33.375 13.570312 33.109375 C 13.179688 32.8125 12.664062 32.890625 12.367188 33.296875 L 9.742188 36.890625 L 7.101562 33.296875 C 6.835938 32.890625 6.289062 32.8125 5.914062 33.109375 C 5.523438 33.375 5.445312 33.90625 5.710938 34.296875 L 8.679688 38.328125 L 5.710938 42.390625 C 5.445312 42.765625 5.523438 43.3125 5.914062 43.578125 C 6.054688 43.6875 6.226562 43.75 6.414062 43.75 C 6.679688 43.75 6.929688 43.609375 7.101562 43.390625 L 9.742188 39.78125 L 12.367188 43.390625 C 12.539062 43.609375 12.789062 43.75 13.070312 43.75 Z M 23.179688 43.75 C 23.632812 43.75 24.039062 43.359375 24.039062 42.890625 C 24.039062 42.40625 23.632812 42.015625 23.179688 42.015625 L 18.945312 42.015625 L 18.945312 33.671875 C 18.945312 33.203125 18.554688 32.8125 18.070312 32.8125 C 17.585938 32.8125 17.210938 33.203125 17.210938 33.671875 L 17.210938 42.890625 C 17.210938 43.359375 17.585938 43.75 18.070312 43.75 Z M 29.789062 43.734375 C 30.898438 43.734375 31.914062 43.40625 32.679688 42.84375 C 33.460938 42.28125 34.023438 41.421875 34.023438 40.421875 C 34.023438 39.9375 33.882812 39.46875 33.648438 39.09375 C 33.289062 38.515625 32.726562 38.109375 32.085938 37.796875 C 31.460938 37.5 30.726562 37.296875 29.929688 37.140625 L 29.898438 37.140625 C 29.054688 36.984375 28.351562 36.734375 27.945312 36.453125 C 27.742188 36.3125 27.601562 36.171875 27.523438 36.046875 C 27.445312 35.921875 27.414062 35.796875 27.414062 35.609375 C 27.414062 35.28125 27.585938 34.9375 28.007812 34.625 C 28.429688 34.3125 29.054688 34.09375 29.757812 34.09375 C 30.710938 34.09375 31.476562 34.5625 32.273438 35.09375 C 32.648438 35.34375 33.148438 35.234375 33.382812 34.859375 C 33.632812 34.5 33.523438 34 33.164062 33.75 C 32.367188 33.234375 31.257812 32.5 29.757812 32.5 C 28.742188 32.5 27.789062 32.796875 27.054688 33.328125 C 26.335938 33.859375 25.804688 34.671875 25.804688 35.609375 C 25.804688 36.078125 25.929688 36.515625 26.164062 36.890625 C 26.507812 37.4375 27.023438 37.828125 27.617188 38.109375 C 28.210938 38.390625 28.898438 38.578125 29.632812 38.71875 L 29.664062 38.71875 C 30.585938 38.890625 31.351562 39.15625 31.804688 39.453125 C 32.039062 39.609375 32.179688 39.765625 32.273438 39.921875 C 32.367188 40.078125 32.414062 40.21875 32.414062 40.421875 C 32.414062 40.8125 32.210938 41.203125 31.742188 41.546875 C 31.273438 41.890625 30.570312 42.125 29.789062 42.125 C 28.679688 42.140625 27.492188 41.484375 26.804688 40.921875 C 26.460938 40.640625 25.945312 40.6875 25.664062 41.03125 C 25.398438 41.375 25.445312 41.890625 25.789062 42.171875 C 26.679688 42.875 28.101562 43.71875 29.789062 43.734375 Z M 43.179688 43.75 C 43.351562 43.75 43.523438 43.6875 43.679688 43.578125 C 44.070312 43.3125 44.132812 42.765625 43.867188 42.390625 L 40.898438 38.328125 L 43.867188 34.296875 C 44.132812 33.90625 44.070312 33.375 43.679688 33.109375 C 43.289062 32.8125 42.773438 32.890625 42.476562 33.296875 L 39.851562 36.890625 L 37.210938 33.296875 C 36.945312 32.890625 36.398438 32.8125 36.023438 33.109375 C 35.632812 33.375 35.554688 33.90625 35.820312 34.296875 L 38.789062 38.328125 L 35.820312 42.390625 C 35.554688 42.765625 35.632812 43.3125 36.023438 43.578125 C 36.164062 43.6875 36.335938 43.75 36.523438 43.75 C 36.789062 43.75 37.039062 43.609375 37.210938 43.390625 L 39.851562 39.78125 L 42.476562 43.390625 C 42.648438 43.609375 42.898438 43.75 43.179688 43.75 Z M 43.179688 43.75 "/>\n      </g>'},zipIcon:{extension:".zip",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 20.175781 46.875 C 20.855469 46.875 21.402344 46.351562 21.402344 45.671875 C 21.402344 44.992188 20.855469 44.445312 20.175781 44.445312 L 13.132812 44.445312 L 21.183594 33.488281 L 21.183594 33.445312 C 21.203125 33.421875 21.226562 33.378906 21.25 33.335938 C 21.269531 33.3125 21.269531 33.289062 21.292969 33.269531 C 21.3125 33.203125 21.3125 33.179688 21.335938 33.136719 C 21.335938 33.09375 21.378906 33.070312 21.378906 33.007812 C 21.378906 32.984375 21.378906 32.960938 21.402344 32.917969 L 21.402344 32.679688 C 21.402344 32.632812 21.402344 32.613281 21.378906 32.546875 C 21.378906 32.503906 21.378906 32.480469 21.335938 32.4375 C 21.335938 32.414062 21.3125 32.371094 21.3125 32.304688 C 21.292969 32.285156 21.269531 32.242188 21.269531 32.21875 C 21.25 32.195312 21.226562 32.152344 21.203125 32.109375 C 21.183594 32.066406 21.160156 32.042969 21.117188 32.023438 C 21.09375 32 21.074219 31.957031 21.050781 31.933594 C 21.03125 31.914062 21.007812 31.867188 20.964844 31.847656 C 20.941406 31.824219 20.941406 31.804688 20.898438 31.78125 L 20.875 31.78125 C 20.832031 31.757812 20.8125 31.738281 20.765625 31.714844 C 20.746094 31.695312 20.722656 31.648438 20.65625 31.648438 L 20.570312 31.605469 L 20.4375 31.585938 C 20.417969 31.585938 20.375 31.5625 20.351562 31.5625 L 10.75 31.5625 C 10.070312 31.5625 9.546875 32.085938 9.546875 32.765625 C 9.546875 33.421875 10.070312 33.992188 10.75 33.992188 L 17.8125 33.992188 L 9.785156 44.972656 L 9.765625 44.972656 C 9.742188 45.015625 9.71875 45.058594 9.699219 45.082031 C 9.699219 45.101562 9.675781 45.148438 9.632812 45.167969 C 9.632812 45.210938 9.609375 45.257812 9.609375 45.277344 C 9.589844 45.320312 9.589844 45.367188 9.566406 45.386719 L 9.566406 45.496094 C 9.546875 45.539062 9.546875 45.585938 9.546875 45.648438 L 9.546875 45.738281 C 9.546875 45.78125 9.566406 45.824219 9.566406 45.890625 C 9.566406 45.933594 9.589844 45.957031 9.589844 45.976562 L 9.632812 46.109375 C 9.632812 46.152344 9.675781 46.175781 9.699219 46.21875 C 9.699219 46.242188 9.71875 46.261719 9.742188 46.328125 C 9.765625 46.351562 9.785156 46.394531 9.808594 46.414062 C 9.828125 46.4375 9.851562 46.460938 9.894531 46.480469 L 9.9375 46.542969 L 9.984375 46.589844 C 10.003906 46.613281 10.027344 46.632812 10.046875 46.632812 L 10.046875 46.65625 C 10.070312 46.679688 10.09375 46.679688 10.136719 46.699219 C 10.179688 46.722656 10.222656 46.742188 10.246094 46.742188 C 10.265625 46.789062 10.289062 46.789062 10.3125 46.808594 C 10.375 46.808594 10.421875 46.832031 10.464844 46.832031 C 10.484375 46.851562 10.507812 46.851562 10.53125 46.851562 L 10.648438 46.871094 Z M 26.214844 46.875 C 26.871094 46.875 27.4375 46.351562 27.4375 45.671875 L 27.4375 32.765625 C 27.4375 32.085938 26.871094 31.5625 26.214844 31.5625 C 25.535156 31.5625 25.011719 32.085938 25.011719 32.765625 L 25.011719 45.671875 C 25.011719 46.351562 25.535156 46.875 26.214844 46.875 Z M 32.734375 46.875 C 33.410156 46.875 33.957031 46.328125 33.957031 45.671875 L 33.957031 40.925781 L 36.648438 40.925781 C 39.25 40.925781 41.351562 38.824219 41.351562 36.265625 C 41.351562 33.664062 39.25 31.5625 36.648438 31.5625 L 32.734375 31.5625 C 32.078125 31.5625 31.53125 32.085938 31.53125 32.765625 L 31.53125 45.671875 C 31.53125 46.328125 32.078125 46.875 32.734375 46.875 Z M 36.648438 38.496094 L 33.957031 38.496094 L 33.957031 33.992188 L 36.648438 33.992188 C 37.917969 33.992188 38.902344 34.996094 38.921875 36.265625 C 38.902344 37.492188 37.917969 38.496094 36.648438 38.496094 Z M 36.648438 38.496094 "/>\n      </g>'},docxIcon:{extension:".docx",path:'<g id="surface9" clip-path="url(#clip1)">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      </g>\n      </defs>\n      <g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <use xlink:href="#surface9" mask="url(#mask0)"/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 7.789062 43.75 C 9.589844 43.75 10.988281 43.269531 11.984375 42.304688 C 12.980469 41.339844 13.476562 39.984375 13.476562 38.234375 C 13.476562 36.496094 12.980469 35.144531 11.984375 34.179688 C 10.988281 33.214844 9.589844 32.734375 7.789062 32.734375 L 4.695312 32.734375 C 4.394531 32.734375 4.15625 32.816406 3.984375 32.984375 C 3.8125 33.152344 3.726562 33.386719 3.726562 33.6875 L 3.726562 42.796875 C 3.726562 43.097656 3.8125 43.332031 3.984375 43.5 C 4.15625 43.667969 4.394531 43.75 4.695312 43.75 Z M 7.664062 42.109375 L 5.742188 42.109375 L 5.742188 34.375 L 7.664062 34.375 C 10.195312 34.375 11.460938 35.660156 11.460938 38.234375 C 11.460938 40.816406 10.195312 42.109375 7.664062 42.109375 Z M 20.414062 43.890625 C 21.476562 43.890625 22.402344 43.660156 23.1875 43.203125 C 23.972656 42.746094 24.582031 42.089844 25.007812 41.234375 C 25.433594 40.378906 25.648438 39.378906 25.648438 38.234375 C 25.648438 37.089844 25.4375 36.089844 25.015625 35.242188 C 24.59375 34.394531 23.988281 33.738281 23.203125 33.28125 C 22.417969 32.824219 21.488281 32.59375 20.414062 32.59375 C 19.339844 32.59375 18.410156 32.824219 17.617188 33.28125 C 16.824219 33.738281 16.21875 34.394531 15.796875 35.242188 C 15.375 36.089844 15.164062 37.089844 15.164062 38.234375 C 15.164062 39.378906 15.378906 40.378906 15.804688 41.234375 C 16.230469 42.089844 16.839844 42.746094 17.625 43.203125 C 18.410156 43.660156 19.339844 43.890625 20.414062 43.890625 Z M 20.414062 42.28125 C 19.394531 42.28125 18.597656 41.933594 18.03125 41.234375 C 17.464844 40.535156 17.179688 39.535156 17.179688 38.234375 C 17.179688 36.933594 17.464844 35.933594 18.03125 35.242188 C 18.597656 34.550781 19.394531 34.203125 20.414062 34.203125 C 21.425781 34.203125 22.214844 34.550781 22.78125 35.242188 C 23.347656 35.933594 23.632812 36.933594 23.632812 38.234375 C 23.632812 39.535156 23.347656 40.535156 22.78125 41.234375 C 22.214844 41.933594 21.425781 42.28125 20.414062 42.28125 Z M 32.601562 43.890625 C 33.289062 43.890625 33.933594 43.789062 34.539062 43.585938 C 35.144531 43.382812 35.679688 43.089844 36.148438 42.703125 C 36.285156 42.597656 36.378906 42.488281 36.429688 42.367188 C 36.480469 42.246094 36.507812 42.109375 36.507812 41.953125 C 36.507812 41.722656 36.445312 41.53125 36.320312 41.375 C 36.195312 41.21875 36.042969 41.140625 35.867188 41.140625 C 35.753906 41.140625 35.644531 41.160156 35.539062 41.203125 C 35.433594 41.246094 35.332031 41.296875 35.226562 41.359375 C 34.746094 41.683594 34.316406 41.910156 33.9375 42.046875 C 33.558594 42.183594 33.144531 42.25 32.695312 42.25 C 31.613281 42.25 30.792969 41.910156 30.234375 41.234375 C 29.675781 40.558594 29.398438 39.558594 29.398438 38.234375 C 29.398438 36.921875 29.675781 35.925781 30.234375 35.25 C 30.792969 34.574219 31.613281 34.234375 32.695312 34.234375 C 33.164062 34.234375 33.589844 34.300781 33.976562 34.429688 C 34.363281 34.558594 34.777344 34.792969 35.226562 35.125 C 35.445312 35.269531 35.660156 35.34375 35.867188 35.34375 C 36.042969 35.34375 36.195312 35.265625 36.320312 35.109375 C 36.445312 34.953125 36.507812 34.761719 36.507812 34.53125 C 36.507812 34.363281 36.480469 34.222656 36.429688 34.109375 C 36.378906 33.996094 36.285156 33.886719 36.148438 33.78125 C 35.679688 33.394531 35.144531 33.101562 34.539062 32.898438 C 33.933594 32.695312 33.289062 32.59375 32.601562 32.59375 C 31.539062 32.59375 30.609375 32.824219 29.8125 33.28125 C 29.015625 33.738281 28.402344 34.394531 27.976562 35.242188 C 27.550781 36.089844 27.335938 37.089844 27.335938 38.234375 C 27.335938 39.378906 27.550781 40.378906 27.976562 41.234375 C 28.402344 42.089844 29.015625 42.746094 29.8125 43.203125 C 30.609375 43.660156 31.539062 43.890625 32.601562 43.890625 Z M 46.132812 43.84375 C 46.382812 43.84375 46.605469 43.75 46.796875 43.5625 C 46.988281 43.375 47.085938 43.15625 47.085938 42.90625 C 47.085938 42.707031 47.003906 42.511719 46.835938 42.3125 L 43.445312 38.15625 L 46.710938 34.171875 C 46.867188 34.003906 46.945312 33.808594 46.945312 33.578125 C 46.945312 33.328125 46.847656 33.113281 46.65625 32.929688 C 46.464844 32.746094 46.242188 32.65625 45.992188 32.65625 C 45.730469 32.65625 45.507812 32.769531 45.320312 33 L 42.273438 36.765625 L 39.226562 33 C 39.027344 32.769531 38.800781 32.65625 38.539062 32.65625 C 38.289062 32.65625 38.070312 32.746094 37.882812 32.929688 C 37.695312 33.113281 37.601562 33.328125 37.601562 33.578125 C 37.601562 33.808594 37.679688 34.003906 37.835938 34.171875 L 41.101562 38.15625 L 37.695312 42.3125 C 37.539062 42.5 37.460938 42.699219 37.460938 42.90625 C 37.460938 43.15625 37.558594 43.371094 37.75 43.554688 C 37.941406 43.738281 38.164062 43.828125 38.414062 43.828125 C 38.675781 43.828125 38.898438 43.71875 39.085938 43.5 L 42.273438 39.5625 L 45.445312 43.5 C 45.644531 43.730469 45.871094 43.84375 46.132812 43.84375 Z M 46.132812 43.84375 "/>\n      </g>'},jpgIcon:{extension:".jpg",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <use xlink:href="#surface9" mask="url(#mask0)"/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 8.789062 47.007812 L 9.488281 46.960938 C 12.214844 46.757812 13.578125 45.277344 13.578125 42.523438 L 13.578125 32.742188 C 13.578125 32.320312 13.453125 31.980469 13.195312 31.726562 C 12.941406 31.472656 12.59375 31.34375 12.15625 31.34375 C 11.734375 31.34375 11.394531 31.472656 11.140625 31.726562 C 10.886719 31.980469 10.757812 32.320312 10.757812 32.742188 L 10.757812 42.523438 C 10.757812 43.238281 10.605469 43.769531 10.296875 44.117188 C 9.992188 44.46875 9.539062 44.660156 8.941406 44.6875 L 8.242188 44.730469 C 7.847656 44.761719 7.558594 44.867188 7.378906 45.046875 C 7.195312 45.230469 7.105469 45.496094 7.105469 45.847656 C 7.105469 46.664062 7.667969 47.050781 8.789062 47.007812 Z M 18.304688 47.007812 C 18.742188 47.007812 19.089844 46.878906 19.34375 46.625 C 19.597656 46.367188 19.726562 46.023438 19.726562 45.585938 L 19.726562 40.882812 L 23.640625 40.882812 C 25.289062 40.882812 26.574219 40.464844 27.492188 39.632812 C 28.410156 38.804688 28.871094 37.644531 28.871094 36.15625 C 28.871094 34.667969 28.410156 33.511719 27.492188 32.6875 C 26.574219 31.863281 25.289062 31.453125 23.640625 31.453125 L 18.261719 31.453125 C 17.839844 31.453125 17.507812 31.570312 17.265625 31.804688 C 17.023438 32.035156 16.90625 32.363281 16.90625 32.789062 L 16.90625 45.585938 C 16.90625 46.023438 17.03125 46.367188 17.289062 46.625 C 17.542969 46.878906 17.882812 47.007812 18.304688 47.007812 Z M 23.292969 38.714844 L 19.726562 38.714844 L 19.726562 33.640625 L 23.292969 33.640625 C 25.230469 33.640625 26.203125 34.488281 26.203125 36.179688 C 26.203125 37.871094 25.230469 38.714844 23.292969 38.714844 Z M 38.605469 47.070312 C 39.320312 47.070312 40.0625 47.011719 40.835938 46.898438 C 41.609375 46.78125 42.285156 46.621094 42.871094 46.414062 C 43.410156 46.242188 43.765625 46.015625 43.941406 45.738281 C 44.117188 45.460938 44.203125 44.988281 44.203125 44.316406 L 44.203125 39.613281 C 44.203125 39.292969 44.101562 39.03125 43.898438 38.835938 C 43.695312 38.640625 43.425781 38.539062 43.089844 38.539062 L 39.21875 38.539062 C 38.867188 38.539062 38.59375 38.628906 38.398438 38.804688 C 38.199219 38.976562 38.101562 39.226562 38.101562 39.546875 C 38.101562 39.867188 38.199219 40.117188 38.398438 40.289062 C 38.59375 40.464844 38.867188 40.554688 39.21875 40.554688 L 41.6875 40.554688 L 41.6875 44.425781 C 40.699219 44.703125 39.707031 44.839844 38.714844 44.839844 C 35.390625 44.839844 33.726562 42.945312 33.726562 39.152344 C 33.726562 37.300781 34.132812 35.90625 34.941406 34.964844 C 35.75 34.023438 36.949219 33.554688 38.539062 33.554688 C 39.238281 33.554688 39.867188 33.644531 40.421875 33.828125 C 40.972656 34.007812 41.574219 34.324219 42.214844 34.777344 C 42.390625 34.894531 42.542969 34.980469 42.671875 35.03125 C 42.804688 35.082031 42.949219 35.105469 43.109375 35.105469 C 43.359375 35.105469 43.570312 34.996094 43.746094 34.777344 C 43.921875 34.558594 44.007812 34.289062 44.007812 33.96875 C 44.007812 33.75 43.96875 33.558594 43.886719 33.398438 C 43.808594 33.238281 43.679688 33.078125 43.503906 32.917969 C 42.191406 31.808594 40.507812 31.257812 38.453125 31.257812 C 36.90625 31.257812 35.5625 31.574219 34.425781 32.207031 C 33.289062 32.84375 32.410156 33.753906 31.789062 34.941406 C 31.171875 36.128906 30.859375 37.535156 30.859375 39.152344 C 30.859375 40.800781 31.171875 42.21875 31.789062 43.40625 C 32.410156 44.597656 33.304688 45.503906 34.46875 46.132812 C 35.636719 46.757812 37.015625 47.070312 38.605469 47.070312 Z M 38.605469 47.070312 "/>\n      </g>'},mp3Icon:{extension:".mp3",path:'<g id="surface9" clip-path="url(#clip1)">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 43.828125 43.710938 C 43.605469 44.28125 43.273438 44.804688 42.84375 45.265625 C 42.40625 45.730469 41.867188 46.113281 41.242188 46.398438 C 40.597656 46.699219 39.851562 46.855469 39.027344 46.855469 C 38.328125 46.855469 37.703125 46.757812 37.160156 46.570312 C 36.609375 46.378906 36.160156 46.136719 35.769531 45.839844 C 35.386719 45.550781 35.050781 45.210938 34.796875 44.832031 C 34.570312 44.507812 34.394531 44.195312 34.265625 43.890625 C 34.140625 43.59375 34.054688 43.335938 33.996094 43.101562 C 33.792969 42.261719 34.304688 41.417969 35.140625 41.210938 C 35.980469 41.007812 36.828125 41.519531 37.03125 42.355469 C 37.039062 42.390625 37.066406 42.488281 37.144531 42.671875 C 37.191406 42.777344 37.265625 42.914062 37.371094 43.0625 C 37.4375 43.160156 37.53125 43.257812 37.65625 43.351562 C 37.792969 43.453125 37.972656 43.542969 38.195312 43.625 C 38.332031 43.667969 38.59375 43.730469 39.027344 43.730469 C 39.390625 43.730469 39.695312 43.675781 39.925781 43.566406 C 40.1875 43.445312 40.398438 43.300781 40.558594 43.132812 C 40.71875 42.957031 40.839844 42.773438 40.914062 42.578125 C 40.996094 42.371094 41.03125 42.195312 41.03125 42.023438 C 41.03125 41.789062 41 41.585938 40.921875 41.398438 C 40.871094 41.257812 40.785156 41.148438 40.660156 41.039062 C 40.515625 40.910156 40.296875 40.792969 40.011719 40.699219 C 39.6875 40.59375 39.253906 40.539062 38.738281 40.535156 C 37.882812 40.527344 37.1875 39.832031 37.1875 38.972656 L 37.1875 38.832031 C 37.1875 37.984375 37.859375 37.292969 38.699219 37.265625 C 39.070312 37.257812 39.398438 37.195312 39.679688 37.101562 C 39.921875 37.011719 40.121094 36.902344 40.273438 36.773438 C 40.40625 36.652344 40.507812 36.519531 40.582031 36.359375 C 40.652344 36.210938 40.6875 36.027344 40.6875 35.8125 C 40.6875 35.523438 40.644531 35.289062 40.574219 35.125 C 40.5 34.96875 40.414062 34.847656 40.304688 34.757812 C 40.1875 34.660156 40.042969 34.582031 39.867188 34.53125 C 39.402344 34.386719 38.878906 34.398438 38.480469 34.542969 C 38.289062 34.617188 38.121094 34.714844 37.976562 34.84375 C 37.820312 34.984375 37.695312 35.148438 37.59375 35.339844 C 37.484375 35.550781 37.40625 35.773438 37.367188 36.039062 C 37.230469 36.890625 36.429688 37.472656 35.574219 37.335938 C 34.722656 37.195312 34.140625 36.398438 34.28125 35.542969 C 34.378906 34.9375 34.5625 34.378906 34.835938 33.871094 C 35.109375 33.355469 35.464844 32.898438 35.890625 32.519531 C 36.320312 32.132812 36.824219 31.828125 37.382812 31.617188 C 38.433594 31.226562 39.667969 31.199219 40.78125 31.539062 C 41.351562 31.714844 41.863281 31.992188 42.308594 32.355469 C 42.777344 32.753906 43.148438 33.242188 43.414062 33.824219 C 43.679688 34.402344 43.8125 35.070312 43.8125 35.8125 C 43.8125 36.476562 43.679688 37.097656 43.421875 37.660156 C 43.25 38.046875 43.023438 38.394531 42.746094 38.707031 C 43.242188 39.148438 43.609375 39.671875 43.835938 40.261719 C 44.046875 40.804688 44.15625 41.398438 44.15625 42.023438 C 44.15625 42.578125 44.046875 43.148438 43.828125 43.710938 Z M 31.445312 38.492188 C 31.148438 39.140625 30.734375 39.703125 30.199219 40.164062 C 29.6875 40.605469 29.078125 40.957031 28.390625 41.199219 C 27.71875 41.4375 26.976562 41.5625 26.191406 41.5625 L 25 41.5625 L 25 45 C 25 45.859375 24.296875 46.5625 23.4375 46.5625 C 22.578125 46.5625 21.875 45.859375 21.875 45 L 21.875 32.8125 C 21.875 31.945312 22.578125 31.25 23.4375 31.25 L 26.191406 31.25 C 27.890625 31.25 29.257812 31.667969 30.253906 32.5 C 31.339844 33.398438 31.886719 34.714844 31.886719 36.40625 C 31.886719 37.148438 31.738281 37.851562 31.445312 38.492188 Z M 18.730469 45.210938 C 18.730469 46.070312 18.03125 46.773438 17.167969 46.773438 C 16.300781 46.773438 15.605469 46.070312 15.605469 45.210938 L 15.605469 39.28125 L 14.015625 43.140625 C 14.007812 43.164062 13.996094 43.191406 13.984375 43.214844 C 13.71875 43.777344 13.15625 44.117188 12.566406 44.117188 L 12.53125 44.117188 C 11.9375 44.117188 11.375 43.777344 11.109375 43.214844 L 11.082031 43.160156 L 9.339844 39.101562 L 9.339844 45.210938 C 9.339844 46.070312 8.640625 46.773438 7.777344 46.773438 C 6.910156 46.773438 6.214844 46.070312 6.214844 45.210938 L 6.214844 32.824219 C 6.214844 31.960938 6.910156 31.261719 7.777344 31.261719 L 7.835938 31.261719 C 8.472656 31.261719 9.046875 31.617188 9.335938 32.1875 L 12.527344 39.09375 L 15.59375 32.207031 C 15.894531 31.617188 16.46875 31.261719 17.105469 31.261719 L 17.167969 31.261719 C 18.03125 31.261719 18.730469 31.960938 18.730469 32.824219 Z M 41.382812 28.125 L 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.136719 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.136719 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 41.382812 28.125 "/>\n      </g>\n      </defs>\n      <g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <use xlink:href="#surface9" mask="url(#mask0)"/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 28.257812 34.902344 C 27.835938 34.550781 27.140625 34.375 26.191406 34.375 L 25 34.375 L 25 38.4375 L 26.191406 38.4375 C 26.621094 38.4375 27.007812 38.375 27.34375 38.253906 C 27.667969 38.140625 27.929688 37.992188 28.148438 37.804688 C 28.34375 37.632812 28.492188 37.4375 28.601562 37.195312 C 28.710938 36.964844 28.757812 36.703125 28.757812 36.40625 C 28.757812 35.324219 28.382812 35.003906 28.257812 34.902344 "/>\n      <path style="fill:none;stroke-width:1;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(99.607843%,99.607843%,99.607843%);stroke-opacity:1;stroke-miterlimit:4;" d="M 11.34125 13.57875 C 11.345 13.5925 11.3525 13.62375 11.36375 13.67375 C 11.3775 13.7225 11.3975 13.78125 11.42625 13.85 C 11.45375 13.9175 11.49375 13.9875 11.54625 14.0625 C 11.5975 14.13875 11.66625 14.20875 11.75 14.27125 C 11.83375 14.33625 11.9375 14.38875 12.0575 14.43125 C 12.1775 14.4725 12.32 14.49375 12.4875 14.49375 C 12.67875 14.49375 12.845 14.46125 12.9875 14.39375 C 13.13 14.32875 13.24875 14.245 13.34375 14.1425 C 13.43875 14.0425 13.51125 13.93 13.55875 13.8075 C 13.6075 13.6825 13.63125 13.56375 13.63125 13.4475 C 13.63125 13.31125 13.6075 13.1825 13.5625 13.065 C 13.515 12.9475 13.4425 12.845 13.3425 12.7575 C 13.2425 12.67 13.115 12.6 12.96 12.55 C 12.805 12.49875 12.6175 12.4725 12.4 12.4725 L 12.4 12.42625 C 12.57 12.42 12.72375 12.3925 12.8625 12.34375 C 13.0025 12.29625 13.11875 12.2275 13.21625 12.14375 C 13.31375 12.05875 13.3875 11.96 13.44125 11.845 C 13.4925 11.7275 13.52 11.60125 13.52 11.46 C 13.52 11.29375 13.4925 11.1525 13.43875 11.0325 C 13.38375 10.91375 13.31125 10.81625 13.21875 10.74 C 13.1275 10.66375 13.0225 10.6075 12.90375 10.5725 C 12.78625 10.535 12.66375 10.5175 12.5375 10.5175 C 12.395 10.5175 12.26125 10.54 12.14 10.58625 C 12.0175 10.6325 11.91 10.69625 11.81875 10.77875 C 11.72625 10.8625 11.64875 10.96 11.5875 11.07375 C 11.5275 11.18875 11.48625 11.315 11.4625 11.45375 M 7.5 14.4 L 7.5 10.5 L 8.3825 10.5 C 8.8075 10.5 9.13375 10.595 9.3625 10.78375 C 9.59 10.975 9.7025 11.2625 9.7025 11.65 C 9.7025 11.81625 9.6725 11.97125 9.6075 12.11125 C 9.5425 12.2525 9.4525 12.37375 9.335 12.475 C 9.21875 12.5775 9.0775 12.65625 8.9175 12.71375 C 8.75625 12.77125 8.5775 12.8 8.3825 12.8 L 7.6 12.8 M 2.4875 14.4675 L 2.4875 10.50375 L 2.5075 10.50375 C 2.5225 10.50375 2.53375 10.5125 2.5425 10.52625 L 3.9925 13.58625 C 3.99875 13.5975 4.005 13.6075 4.00875 13.6175 M 4.02125 13.6175 C 4.02625 13.6075 4.03125 13.5975 4.0375 13.58625 L 5.44 10.52625 C 5.4475 10.5125 5.45875 10.50375 5.4725 10.50375 L 5.4925 10.50375 L 5.4925 14.4675 " transform="matrix(3.125,0,0,3.125,0,0)"/>\n      </g>'},mp4Icon:{extension:".mp4",path:'<g id="surface6" clip-path="url(#clip1)">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 36.898438 40.625 L 40.625 35.480469 L 40.625 40.625 Z M 28.761719 36.40625 C 28.761719 36.703125 28.707031 36.964844 28.605469 37.195312 C 28.496094 37.433594 28.347656 37.632812 28.148438 37.804688 C 27.929688 37.992188 27.667969 38.144531 27.34375 38.257812 C 27.003906 38.375 26.621094 38.4375 26.191406 38.4375 L 25 38.4375 L 25 34.375 L 26.191406 34.375 C 27.140625 34.375 27.835938 34.554688 28.253906 34.902344 C 28.378906 35.007812 28.761719 35.324219 28.761719 36.40625 Z M 44.6875 43.75 L 43.75 43.75 L 43.75 45.3125 C 43.75 46.175781 43.050781 46.875 42.1875 46.875 C 41.324219 46.875 40.625 46.175781 40.625 45.3125 L 40.625 43.75 L 34.066406 43.75 C 33.199219 43.75 32.503906 43.050781 32.503906 42.1875 L 32.503906 41.875 C 32.503906 41.546875 32.605469 41.226562 32.800781 40.957031 L 39.363281 31.898438 C 39.660156 31.492188 40.128906 31.25 40.628906 31.25 L 42.1875 31.25 C 43.050781 31.25 43.75 31.949219 43.75 32.8125 L 43.75 40.625 L 44.6875 40.625 C 45.550781 40.625 46.25 41.324219 46.25 42.1875 C 46.25 43.050781 45.550781 43.75 44.6875 43.75 Z M 31.445312 38.492188 C 31.148438 39.140625 30.730469 39.703125 30.195312 40.167969 C 29.6875 40.605469 29.082031 40.957031 28.390625 41.203125 C 27.71875 41.441406 26.976562 41.5625 26.191406 41.5625 L 25 41.5625 L 25 45 C 25 45.863281 24.300781 46.5625 23.4375 46.5625 C 22.578125 46.5625 21.875 45.863281 21.875 45 L 21.875 32.8125 C 21.875 31.949219 22.578125 31.25 23.4375 31.25 L 26.191406 31.25 C 27.890625 31.25 29.257812 31.671875 30.253906 32.5 C 31.339844 33.398438 31.886719 34.714844 31.886719 36.40625 C 31.886719 37.148438 31.738281 37.851562 31.445312 38.492188 Z M 18.730469 45.210938 C 18.730469 46.070312 18.027344 46.773438 17.167969 46.773438 C 16.300781 46.773438 15.605469 46.070312 15.605469 45.210938 L 15.605469 39.6875 L 14.035156 43.105469 C 14.019531 43.144531 14.003906 43.179688 13.984375 43.214844 C 13.71875 43.78125 13.15625 44.117188 12.566406 44.117188 L 12.53125 44.117188 C 11.941406 44.117188 11.378906 43.78125 11.113281 43.214844 C 11.097656 43.183594 11.078125 43.152344 11.066406 43.125 L 9.339844 39.484375 L 9.339844 45.210938 C 9.339844 46.070312 8.640625 46.773438 7.777344 46.773438 C 6.910156 46.773438 6.214844 46.070312 6.214844 45.210938 L 6.214844 32.824219 C 6.214844 31.960938 6.910156 31.261719 7.777344 31.261719 L 7.835938 31.261719 C 8.472656 31.261719 9.046875 31.617188 9.335938 32.191406 L 9.355469 32.226562 L 12.523438 38.90625 L 15.578125 32.242188 C 15.585938 32.226562 15.597656 32.210938 15.605469 32.191406 C 15.894531 31.617188 16.46875 31.261719 17.105469 31.261719 L 17.164062 31.261719 C 18.027344 31.261719 18.726562 31.960938 18.726562 32.824219 L 18.726562 45.210938 Z M 41.382812 28.125 L 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 41.382812 28.125 "/>\n      </g>\n      </defs>\n      <g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <use xlink:href="#surface6" mask="url(#mask0)"/>\n      <path style="fill:none;stroke-width:1;stroke-linecap:round;stroke-linejoin:round;stroke:rgb(99.607843%,99.607843%,99.607843%);stroke-opacity:1;stroke-miterlimit:4;" d="M 14.3 13.5 L 10.90125 13.5 L 10.90125 13.4 L 13.00125 10.5 L 13.5 10.5 L 13.5 14.5 M 7.5 14.4 L 7.5 10.5 L 8.3825 10.5 C 8.8075 10.5 9.13375 10.595 9.3625 10.78375 C 9.59 10.975 9.7025 11.2625 9.7025 11.65 C 9.7025 11.81625 9.6725 11.97125 9.6075 12.11125 C 9.5425 12.2525 9.4525 12.37375 9.335 12.47625 C 9.21875 12.5775 9.0775 12.65625 8.9175 12.71375 C 8.75625 12.77125 8.5775 12.8 8.3825 12.8 L 7.6 12.8 M 2.4875 14.4675 L 2.4875 10.50375 L 2.5075 10.50375 C 2.5225 10.50375 2.53375 10.5125 2.5425 10.52625 L 3.9925 13.58625 C 3.99875 13.5975 4.005 13.6075 4.00875 13.6175 M 4.02125 13.6175 C 4.02625 13.6075 4.03125 13.5975 4.0375 13.58625 L 5.44 10.52625 C 5.4475 10.5125 5.45875 10.50375 5.4725 10.50375 L 5.4925 10.50375 L 5.4925 14.4675 " transform="matrix(3.125,0,0,3.125,0,0)"/>\n      </g>'},oggIcon:{extension:".ogg",path:'<g id="surface9" clip-path="url(#clip1)">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.621094 28.125 C 3.859375 28.125 0 31.984375 0 36.742188 L 0 41.378906 C 0 46.140625 3.859375 50 8.621094 50 L 41.378906 50 C 46.140625 50 50 46.140625 50 41.382812 L 50 36.746094 C 50 31.984375 46.140625 28.125 41.382812 28.125 Z M 8.621094 28.125 "/>\n      </g>\n      </defs>\n      <g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.578125 25 L 39.421875 25 C 41.53125 25 43.527344 25.492188 45.3125 26.367188 L 45.3125 15.367188 C 45.3125 13.90625 44.976562 13.097656 43.984375 12.109375 C 42.996094 11.121094 35.105469 3.226562 34.503906 2.628906 C 33.90625 2.027344 33.070312 1.5625 31.617188 1.5625 L 6.5625 1.5625 C 5.527344 1.5625 4.6875 2.402344 4.6875 3.4375 L 4.6875 26.367188 C 6.476562 25.492188 8.472656 25 10.578125 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.710938 L 42.164062 12.5 L 34.515625 12.5 C 34.464844 12.46875 34.414062 12.425781 34.375 12.390625 Z M 6.25 25.722656 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.25 13.980469 32.496094 15.210938 33.742188 15.539062 C 33.902344 15.59375 34.074219 15.625 34.257812 15.625 L 43.75 15.625 L 43.75 25.722656 C 44.859375 26.105469 45.910156 26.625 46.875 27.269531 L 46.875 15.363281 C 46.875 13.511719 46.375 12.289062 45.089844 11.003906 L 35.609375 1.523438 C 34.582031 0.496094 33.273438 0 31.617188 0 L 6.5625 0 C 4.667969 0 3.125 1.542969 3.125 3.4375 L 3.125 27.269531 C 4.089844 26.625 5.140625 26.105469 6.25 25.722656 Z M 6.25 25.722656 "/>\n      <use xlink:href="#surface9" mask="url(#mask0)"/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 8.976562 47.070312 C 10.464844 47.070312 11.757812 46.75 12.859375 46.109375 C 13.960938 45.46875 14.808594 44.550781 15.40625 43.351562 C 16.003906 42.15625 16.304688 40.757812 16.304688 39.152344 C 16.304688 37.550781 16.007812 36.152344 15.417969 34.964844 C 14.828125 33.777344 13.980469 32.859375 12.882812 32.21875 C 11.78125 31.578125 10.480469 31.257812 8.976562 31.257812 C 7.472656 31.257812 6.167969 31.578125 5.0625 32.21875 C 3.953125 32.859375 3.101562 33.777344 2.511719 34.964844 C 1.921875 36.152344 1.625 37.550781 1.625 39.152344 C 1.625 40.757812 1.925781 42.15625 2.523438 43.351562 C 3.121094 44.550781 3.972656 45.46875 5.070312 46.109375 C 6.171875 46.75 7.472656 47.070312 8.976562 47.070312 Z M 8.976562 44.820312 C 7.546875 44.820312 6.433594 44.332031 5.640625 43.351562 C 4.847656 42.375 4.449219 40.976562 4.449219 39.152344 C 4.449219 37.332031 4.847656 35.933594 5.640625 34.964844 C 6.433594 33.996094 7.546875 33.507812 8.976562 33.507812 C 10.390625 33.507812 11.496094 33.996094 12.289062 34.964844 C 13.085938 35.933594 13.484375 37.332031 13.484375 39.152344 C 13.484375 40.976562 13.085938 42.375 12.289062 43.351562 C 11.496094 44.332031 10.390625 44.820312 8.976562 44.820312 Z M 26.410156 47.070312 C 27.125 47.070312 27.871094 47.011719 28.640625 46.898438 C 29.414062 46.78125 30.09375 46.621094 30.675781 46.414062 C 31.214844 46.242188 31.574219 46.015625 31.75 45.738281 C 31.921875 45.460938 32.011719 44.988281 32.011719 44.316406 L 32.011719 39.613281 C 32.011719 39.292969 31.910156 39.03125 31.703125 38.835938 C 31.5 38.640625 31.230469 38.539062 30.894531 38.539062 L 27.023438 38.539062 C 26.671875 38.539062 26.398438 38.628906 26.203125 38.804688 C 26.007812 38.976562 25.90625 39.226562 25.90625 39.546875 C 25.90625 39.867188 26.007812 40.117188 26.203125 40.289062 C 26.398438 40.464844 26.671875 40.554688 27.023438 40.554688 L 29.496094 40.554688 L 29.496094 44.425781 C 28.503906 44.703125 27.511719 44.839844 26.519531 44.839844 C 23.195312 44.839844 21.53125 42.945312 21.53125 39.152344 C 21.53125 37.300781 21.9375 35.90625 22.746094 34.964844 C 23.554688 34.023438 24.753906 33.554688 26.34375 33.554688 C 27.046875 33.554688 27.671875 33.644531 28.226562 33.828125 C 28.78125 34.007812 29.378906 34.324219 30.019531 34.777344 C 30.195312 34.894531 30.347656 34.980469 30.480469 35.03125 C 30.609375 35.082031 30.757812 35.105469 30.917969 35.105469 C 31.164062 35.105469 31.375 34.996094 31.550781 34.777344 C 31.726562 34.558594 31.8125 34.289062 31.8125 33.96875 C 31.8125 33.75 31.773438 33.558594 31.695312 33.398438 C 31.613281 33.238281 31.484375 33.078125 31.3125 32.917969 C 30 31.808594 28.3125 31.257812 26.257812 31.257812 C 24.710938 31.257812 23.371094 31.574219 22.234375 32.207031 C 21.09375 32.84375 20.214844 33.753906 19.597656 34.941406 C 18.976562 36.128906 18.667969 37.535156 18.667969 39.152344 C 18.667969 40.800781 18.976562 42.21875 19.597656 43.40625 C 20.214844 44.597656 21.109375 45.503906 22.277344 46.132812 C 23.441406 46.757812 24.820312 47.070312 26.410156 47.070312 Z M 42.445312 47.070312 C 43.160156 47.070312 43.902344 47.011719 44.675781 46.898438 C 45.449219 46.78125 46.128906 46.621094 46.710938 46.414062 C 47.25 46.242188 47.609375 46.015625 47.78125 45.738281 C 47.957031 45.460938 48.046875 44.988281 48.046875 44.316406 L 48.046875 39.613281 C 48.046875 39.292969 47.941406 39.03125 47.738281 38.835938 C 47.535156 38.640625 47.265625 38.539062 46.929688 38.539062 L 43.058594 38.539062 C 42.707031 38.539062 42.433594 38.628906 42.238281 38.804688 C 42.039062 38.976562 41.941406 39.226562 41.941406 39.546875 C 41.941406 39.867188 42.039062 40.117188 42.238281 40.289062 C 42.433594 40.464844 42.707031 40.554688 43.058594 40.554688 L 45.53125 40.554688 L 45.53125 44.425781 C 44.539062 44.703125 43.546875 44.839844 42.554688 44.839844 C 39.230469 44.839844 37.566406 42.945312 37.566406 39.152344 C 37.566406 37.300781 37.972656 35.90625 38.78125 34.964844 C 39.589844 34.023438 40.789062 33.554688 42.378906 33.554688 C 43.078125 33.554688 43.707031 33.644531 44.261719 33.828125 C 44.816406 34.007812 45.414062 34.324219 46.054688 34.777344 C 46.230469 34.894531 46.382812 34.980469 46.515625 35.03125 C 46.644531 35.082031 46.792969 35.105469 46.953125 35.105469 C 47.199219 35.105469 47.410156 34.996094 47.585938 34.777344 C 47.761719 34.558594 47.847656 34.289062 47.847656 33.96875 C 47.847656 33.75 47.808594 33.558594 47.726562 33.398438 C 47.648438 33.238281 47.519531 33.078125 47.34375 32.917969 C 46.03125 31.808594 44.347656 31.257812 42.292969 31.257812 C 40.746094 31.257812 39.40625 31.574219 38.265625 32.207031 C 37.128906 32.84375 36.25 33.753906 35.632812 34.941406 C 35.011719 36.128906 34.703125 37.535156 34.703125 39.152344 C 34.703125 40.800781 35.011719 42.21875 35.632812 43.40625 C 36.25 44.597656 37.144531 45.503906 38.3125 46.132812 C 39.476562 46.757812 40.855469 47.070312 42.445312 47.070312 Z M 42.445312 47.070312 "/>\n      </g>'},pdfIcon:{extension:".pdf",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(99.607843%,99.607843%,99.607843%);fill-opacity:1;" d="M 10.59375 25 L 39.4375 25 C 41.476562 25.003906 43.484375 25.472656 45.3125 26.375 L 45.3125 15.375 C 45.347656 14.191406 44.867188 13.054688 44 12.25 L 34.625 2.875 C 33.875 2.003906 32.773438 1.523438 31.625 1.5625 L 6.625 1.5625 C 5.589844 1.5625 4.75 2.402344 4.75 3.4375 L 4.75 26.375 C 6.566406 25.480469 8.566406 25.007812 10.59375 25 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 34.375 4.71875 L 42.15625 12.5 L 34.53125 12.5 C 34.480469 12.511719 34.425781 12.511719 34.375 12.5 Z M 6.25 25.71875 L 6.25 3.4375 C 6.25 3.265625 6.390625 3.125 6.5625 3.125 L 31.25 3.125 L 31.25 12.5 C 31.300781 13.980469 32.316406 15.253906 33.75 15.625 C 33.957031 15.675781 34.167969 15.675781 34.375 15.625 L 43.75 15.625 L 43.75 25.71875 C 44.859375 26.09375 45.910156 26.621094 46.875 27.28125 L 46.875 15.375 C 46.964844 13.722656 46.3125 12.117188 45.09375 11 L 35.71875 1.625 C 34.648438 0.523438 33.160156 -0.0664062 31.625 0 L 6.625 0 C 5.703125 -0.015625 4.8125 0.339844 4.152344 0.984375 C 3.496094 1.632812 3.125 2.515625 3.125 3.4375 L 3.125 27.28125 C 4.09375 26.625 5.144531 26.101562 6.25 25.71875 Z M 6.25 25.71875 "/>\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 8.625 28.125 C 6.335938 28.117188 4.136719 29.023438 2.515625 30.640625 C 0.898438 32.261719 -0.0078125 34.460938 0 36.75 L 0 41.375 C 0 46.136719 3.863281 50 8.625 50 L 41.375 50 C 46.132812 49.984375 49.984375 46.132812 50 41.375 L 50 36.75 C 50 31.988281 46.136719 28.125 41.375 28.125 Z M 8.625 28.125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 14.40625 41.78125 L 12.09375 41.78125 L 12.09375 45.84375 C 12.003906 46.351562 11.5625 46.726562 11.046875 46.726562 C 10.53125 46.726562 10.089844 46.351562 10 45.84375 L 10 34.78125 C 10 34.210938 10.460938 33.75 11.03125 33.75 L 14.40625 33.75 C 15.925781 33.617188 17.390625 34.351562 18.191406 35.648438 C 18.992188 36.945312 18.992188 38.585938 18.191406 39.882812 C 17.390625 41.179688 15.925781 41.914062 14.40625 41.78125 Z M 12.09375 39.6875 L 14.40625 39.6875 C 15.152344 39.78125 15.882812 39.4375 16.289062 38.804688 C 16.691406 38.171875 16.691406 37.359375 16.289062 36.726562 C 15.882812 36.09375 15.152344 35.75 14.40625 35.84375 L 12.09375 35.84375 Z M 12.09375 39.6875 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 20.3125 45.84375 L 20.3125 34.78125 C 20.3125 34.210938 20.773438 33.75 21.34375 33.75 L 23.5625 33.75 C 27.1875 33.75 30.125 36.6875 30.125 40.3125 C 30.125 43.9375 27.1875 46.875 23.5625 46.875 L 21.34375 46.875 C 20.773438 46.875 20.3125 46.414062 20.3125 45.84375 Z M 22.40625 44.78125 L 23.5625 44.78125 C 26.03125 44.78125 28.03125 42.78125 28.03125 40.3125 C 28.03125 37.84375 26.03125 35.84375 23.5625 35.84375 L 22.40625 35.84375 Z M 22.40625 44.78125 "/>\n      <path style=" stroke:none;fill-rule:nonzero;fill:rgb(100%,100%,100%);fill-opacity:1;" d="M 33.1875 45.84375 L 33.1875 34.78125 C 33.183594 34.476562 33.3125 34.1875 33.542969 33.992188 C 33.769531 33.792969 34.074219 33.703125 34.375 33.75 L 40.625 33.75 C 41.132812 33.839844 41.507812 34.28125 41.507812 34.796875 C 41.507812 35.3125 41.132812 35.753906 40.625 35.84375 L 35.25 35.84375 L 35.25 39.28125 L 39.625 39.28125 C 40.195312 39.28125 40.65625 39.742188 40.65625 40.3125 C 40.65625 40.882812 40.195312 41.34375 39.625 41.34375 L 35.25 41.34375 L 35.25 45.84375 C 35.257812 46.359375 34.882812 46.796875 34.375 46.875 C 34.074219 46.921875 33.769531 46.832031 33.542969 46.632812 C 33.3125 46.4375 33.183594 46.148438 33.1875 45.84375 Z M 33.1875 45.84375 "/>\n      </g>'},defaultIcon:{extension:".default",path:'<g id="surface1">\n      <path style=" stroke:none;fill-rule:evenodd;fill:rgb(0%,0%,0%);fill-opacity:1;" d="M 3.117188 44.777344 C 1.394531 44.777344 0 43.386719 0 41.671875 L 0 3.484375 C 0 1.769531 1.394531 0.378906 3.117188 0.378906 L 25.792969 0.378906 C 27.164062 0.304688 28.5 0.808594 29.480469 1.765625 L 37.980469 10.230469 C 39.144531 11.242188 39.769531 12.730469 39.683594 14.265625 L 39.683594 41.671875 C 39.683594 43.386719 38.289062 44.777344 36.5625 44.777344 Z M 25.511719 3.203125 L 3.117188 3.203125 C 2.960938 3.203125 2.832031 3.328125 2.832031 3.484375 L 2.832031 41.671875 C 2.832031 41.828125 2.960938 41.957031 3.117188 41.957031 L 36.5625 41.957031 C 36.679688 41.949219 36.785156 41.867188 36.820312 41.757812 L 36.820312 14.492188 L 28.34375 14.492188 C 28.160156 14.539062 27.964844 14.539062 27.777344 14.492188 C 26.480469 14.15625 25.554688 13.007812 25.511719 11.671875 Z M 28.34375 4.640625 L 28.34375 11.671875 C 28.390625 11.683594 28.441406 11.683594 28.488281 11.671875 L 35.402344 11.671875 Z M 28.34375 4.640625 "/>\n      </g>'}},V.MODULES.modals=function(l){var a=l.$;l.shared.modals||(l.shared.modals={});var o,c=l.shared.modals;function e(){for(var e in c)if(Object.prototype.hasOwnProperty.call(c,e)){var t=c[e];t&&t.$modal&&t.$modal.removeData().remove()}o&&o.removeData().remove(),c={}}function s(e,t){if(c[e]){var n=c[e].$modal,r=n.data("instance")||l;r.events.enableBlur(),n.hide(),o.hide(),a(r.o_doc).find("body").first().removeClass("fr-prevent-scroll fr-mobile"),n.removeClass("fr-active"),t||(r.accessibility.restoreSelection(),r.events.trigger("modals.hide"))}}function n(e){var t;if("string"==typeof e){if(!c[e])return;t=c[e].$modal}else t=e;return t&&l.node.hasClass(t,"fr-active")&&l.core.sameInstance(t)||!1}return{_init:function t(){l.events.on("shared.destroy",e,!0)},get:function r(e){return c[e]},create:function d(n,e,t){if(e='<div class="fr-modal-head-line">'.concat(e,"</div>"),l.shared.$overlay||(l.shared.$overlay=a(l.doc.createElement("DIV")).addClass("fr-overlay"),a("body").first().append(l.shared.$overlay)),o=l.shared.$overlay,l.opts.theme&&o.addClass("".concat(l.opts.theme,"-theme")),!c[n]){var r=function i(e,t){var n='<div tabIndex="-1" class="fr-modal'.concat(l.opts.theme?" ".concat(l.opts.theme,"-theme"):"",'"><div class="fr-modal-wrapper">'),r='<button title="'.concat(l.language.translate("Cancel"),'" class="fr-command fr-btn fr-modal-close"><svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 24 24"><path d="').concat(V.SVG.close,'"/></svg></button>');n+='<div class="fr-modal-head">'.concat(e).concat(r,"</div>"),n+='<div tabIndex="-1" class="fr-modal-body">'.concat(t,"</div>"),n+="</div></div>";var o=a(l.doc.createElement("DIV"));return o.html(n),o.find("> .fr-modal")}(e,t);c[n]={$modal:r,$head:r.find(".fr-modal-head"),$body:r.find(".fr-modal-body")},l.helpers.isMobile()||r.addClass("fr-desktop"),a("body").first().append(r),l.events.$on(r,"click",".fr-modal-close",function(){s(n)},!0),c[n].$body.css("margin-top",c[n].$head.outerHeight()),l.events.$on(r,"keydown",function(e){var t=e.which;return t===V.KEYCODE.ESC?(s(n),l.accessibility.focusModalButton(r),!1):!(!a(e.currentTarget).is("input[type=text], textarea")&&t!==V.KEYCODE.ARROW_UP&&t!==V.KEYCODE.ARROW_DOWN&&!l.keys.isBrowserAction(e)&&(e.preventDefault(),e.stopPropagation(),1))},!0),s(n,!0)}return c[n]},show:function i(e){if(c[e]){var t=c[e].$modal;t.data("instance",l),t.show(),o.show(),a(l.o_doc).find("body").first().addClass("fr-prevent-scroll"),l.helpers.isMobile()&&a(l.o_doc).find("body").first().addClass("fr-mobile"),t.addClass("fr-active"),l.accessibility.focusModal(t)}},hide:s,resize:function f(e){if(c[e]){var t=c[e],n=t.$modal,r=t.$body,o=l.o_win.innerHeight,i=n.find(".fr-modal-wrapper"),a=o-i.outerHeight(!0)+(i.height()-(r.outerHeight(!0)-r.height())),s="auto";a<r.get(0).scrollHeight&&(s=a),r.height(s)}},isVisible:n,areVisible:function p(e){for(var t in c)if(Object.prototype.hasOwnProperty.call(c,t)&&n(t)&&(void 0===e||c[t].$modal.data("instance")===e))return c[t].$modal;return!1}}},V.MODULES.position=function(L){var E=L.$;function o(){var e=L.selection.ranges(0).getBoundingClientRect();if(0===e.top&&0===e.left&&0===e.width||0===e.height){var t=!1;0===L.$el.find(".fr-marker").length&&(L.selection.save(),t=!0);var n=L.$el.find(".fr-marker").first();n.css("display","inline"),n.css("line-height","");var r=n.offset(),o=n.outerHeight();n.css("display","none"),n.css("line-height",0),(e={}).left=r&&r.left,e.width=0,e.height=o,e.top=r&&r.top-(L.helpers.isMobile()&&!L.helpers.isIOS()||L.opts.iframe?0:L.helpers.scrollTop()),e.right=1,e.bottom=1,e.ok=!0,t&&L.selection.restore()}return e}function i(e,t,n,r){var o=n.data("container");if(!o||"BODY"===o.get(0).tagName&&"static"===o.css("position")||(e&&(e-=o.offset().left),t&&(t-=o.offset().top),"BODY"!==o.get(0).tagName?(e&&(e+=o.get(0).scrollLeft),t&&(t+=o.get(0).scrollTop)):"absolute"===o.css("position")&&(e&&(e+=o.position().left),t&&(t+=o.position().top))),L.opts.iframe&&o&&L.$tb&&o.get(0)!==L.$tb.get(0)){var i=L.helpers.getPX(L.$wp.find(".fr-iframe").css("padding-top")),a=L.helpers.getPX(L.$wp.find(".fr-iframe").css("padding-left"));e&&(e+=L.$iframe.offset().left+a),t&&(t+=L.$iframe.offset().top+i)}var s=function l(e,t){var n=e.outerWidth(!0);return t+n>L.$sc.get(0).clientWidth-10&&(t=L.$sc.get(0).clientWidth-n-10),t<0&&(t=10),t}(n,e);e&&n.css("left",s),t&&n.css("top",function c(e,t,n){var r=e.outerHeight(!0);if(!L.helpers.isMobile()&&L.$tb&&e.parent().get(0)!==L.$tb.get(0)){var o=e.parent().offset().top,i=t-r-(n||0);e.parent().get(0)===L.$sc.get(0)&&(o-=e.parent().position().top);var a=L.$sc.get(0).clientHeight;o+t+r>L.$sc.offset().top+a&&0<e.parent().offset().top+i&&0<i?i>L.$wp.scrollTop()&&(t=i,e.addClass("fr-above")):e.removeClass("fr-above")}return t}(n,t,r))}function a(e){var n=E(e),t=n.is(".fr-sticky-on"),r=n.data("sticky-top"),o=n.data("sticky-scheduled");if(void 0===r){n.data("sticky-top",0);var i=E('<div class="fr-sticky-dummy" style="height: '.concat(n.outerHeight(),'px;"></div>'));L.$box.prepend(i)}else L.$box.find(".fr-sticky-dummy").css("height",n.outerHeight());if(L.core.hasFocus()||0<L.$tb.findVisible("input:focus").length){var a=L.helpers.scrollTop(),s=Math.min(Math.max(a-L.$tb.parent().offset().top,0),L.$tb.parent().outerHeight()-n.outerHeight());if(s!==r&&s!==o&&(clearTimeout(n.data("sticky-timeout")),n.data("sticky-scheduled",s),n.outerHeight()<a-L.$tb.parent().offset().top&&n.addClass("fr-opacity-0"),n.data("sticky-timeout",setTimeout(function(){var e=L.helpers.scrollTop(),t=Math.min(Math.max(e-L.$tb.parent().offset().top,0),L.$tb.parent().outerHeight()-n.outerHeight());0<t&&"BODY"===L.$tb.parent().get(0).tagName&&(t+=L.$tb.parent().position().top),t!==r&&(n.css("top",Math.max(t,0)),n.data("sticky-top",t),n.data("sticky-scheduled",t)),n.removeClass("fr-opacity-0")},100))),!t){var l=L.$tb.parent(),c=l.get(0).offsetWidth-l.get(0).clientWidth;n.css("top","0"),n.width(l.width()-c),n.addClass("fr-sticky-on"),L.$box.addClass("fr-sticky-box")}}else clearTimeout(E(e).css("sticky-timeout")),n.css("top","0"),n.css("position",""),n.css("width",""),n.data("sticky-top",0),n.removeClass("fr-sticky-on"),L.$box.removeClass("fr-sticky-box")}function t(e){if(e.offsetWidth){var t=E(e),n=t.outerHeight(),r=t.data("sticky-position"),o=E("body"===L.opts.scrollableContainer?L.o_win:L.opts.scrollableContainer).outerHeight(),i=0,a=0;"body"!==L.opts.scrollableContainer&&(i=L.$sc.offset().top,a=E(L.o_win).outerHeight()-i-o);var s="body"===L.opts.scrollableContainer?L.helpers.scrollTop():i,l=t.is(".fr-sticky-on");t.data("sticky-parent")||t.data("sticky-parent",t.parent());var c=t.data("sticky-parent"),d=c.offset().top,f=c.outerHeight();if(t.data("sticky-offset")?L.$box.find(".fr-sticky-dummy").css("height","".concat(n,"px")):(t.data("sticky-offset",!0),t.after('<div class="fr-sticky-dummy" style="height: '.concat(n,'px;"></div>'))),!r){var p="auto"!==t.css("top")||"auto"!==t.css("bottom");p||t.css("position","fixed"),r={top:L.node.hasClass(t.get(0),"fr-top"),bottom:L.node.hasClass(t.get(0),"fr-bottom")},p||t.css("position",""),t.data("sticky-position",r),t.data("top",L.node.hasClass(t.get(0),"fr-top")?t.css("top"):"auto"),t.data("bottom",L.node.hasClass(t.get(0),"fr-bottom")?t.css("bottom"):"auto")}var h=L.helpers.getPX(t.data("top")),u=L.helpers.getPX(t.data("bottom")),C=r.top&&function v(){return d<s+h&&s+h<=d+f-n}()&&(L.helpers.isInViewPort(L.$sc.get(0))||"body"===L.opts.scrollableContainer),g=r.bottom&&function b(){return d+n<s+o-u&&s+o-u<d+f}();if(C||g){var m=c.get(0).offsetWidth-c.get(0).clientWidth;t.css("width","".concat(c.get(0).getBoundingClientRect().width-m,"px")),l||(t.addClass("fr-sticky-on"),t.removeClass("fr-sticky-off"),t.css("top")&&("auto"!==t.data("top")?t.css("top",L.helpers.getPX(t.data("top"))+i):t.data("top","auto")),t.css("bottom")&&("auto"!==t.data("bottom")?t.css("bottom",L.helpers.getPX(t.data("bottom"))+a):t.css("bottom","auto")))}else L.node.hasClass(t.get(0),"fr-sticky-off")||(t.css("width",""),t.removeClass("fr-sticky-on"),t.addClass("fr-sticky-off"),t.css("top")&&"auto"!==t.data("top")&&r.top&&t.css("top",0),t.css("bottom")&&"auto"!==t.data("bottom")&&r.bottom&&t.css("bottom",0))}}function s(){if(L.helpers.requestAnimationFrame()(s),!1!==L.events.trigger("position.refresh"))for(var e=0;e<L._stickyElements.length;e++)if(L.opts.toolbarBottom){var t=L.$tb.parent(),n=t.get(0).offsetWidth-t.get(0).clientWidth,r=E(L._stickyElements[e]);r.width(t.width()-n),r.addClass("fr-sticky-on"),L.$box.addClass("fr-sticky-box")}else a(L._stickyElements[e])}function n(){if(L._stickyElements)for(var e=0;e<L._stickyElements.length;e++)t(L._stickyElements[e])}return{_init:function r(){!function e(){L._stickyElements=[],L.helpers.isIOS()?(s(),L.events.$on(E(L.o_win),"scroll",function(){if(L.core.hasFocus())for(var e=0;e<L._stickyElements.length;e++){var t=E(L._stickyElements[e]),n=t.parent(),r=L.helpers.scrollTop();t.outerHeight()<r-n.offset().top&&(L.opts.toolbarBottom&&L.helpers.isIOS()||(t.addClass("fr-opacity-0"),t.data("sticky-top",-1),t.data("sticky-scheduled",-1)))}},!0)):("body"!==L.opts.scrollableContainer&&L.events.$on(E(L.opts.scrollableContainer),"scroll",n,!0),L.events.$on(E(L.o_win),"scroll",n,!0),L.events.$on(E(L.o_win),"resize",n,!0),L.events.on("initialized",n),L.events.on("focus",n),L.events.$on(E(L.o_win),"resize","textarea",n,!0)),L.events.on("destroy",function(){L._stickyElements=[]})}()},forSelection:function l(e){var t=o();e.css({top:0,left:0});var n=t.top+t.height,r=t.left+t.width/2-e.get(0).offsetWidth/2+L.helpers.scrollLeft();L.opts.iframe||(n+=L.helpers.scrollTop()),i(r,n,e,t.height)},addSticky:function c(e){e.addClass("fr-sticky"),L.helpers.isIOS()&&!L.opts.toolbarBottom&&e.addClass("fr-sticky-ios"),e.removeClass("fr-sticky"),L._stickyElements.push(e.get(0))},refresh:n,at:i,getBoundingRect:o}},V.MODULES.refresh=function(l){var c=l.$;function i(e,t){e.toggleClass("fr-disabled",t).attr("aria-disabled",t)}function e(e){var t=l.$tb.find('.fr-more-toolbar[data-name="'.concat(e.attr("data-group-name"),'"]')),n=function s(e,t){var n=0,r=t.find("> .fr-command, > .fr-btn-wrap");r.each(function(e,t){n+=c(t).outerWidth()});var o,i=l.helpers.getPX(c(r[0]).css("margin-left")),a=l.helpers.getPX(c(r[0]).css("margin-right"));o="rtl"===l.opts.direction?l.$tb.outerWidth()-e.offset().left+l.$tb.offset().left-(n+e.outerWidth()+r.length*(i+a))/2:e.offset().left-l.$tb.offset().left-(n-e.outerWidth()+r.length*(i+a))/2;o+n+r.length*(i+a)>l.$tb.outerWidth()&&(o-=(n+r.length*(i+a)-e.outerWidth())/2);o<0&&(o=0);return o}(e,t);"rtl"===l.opts.direction?t.css("padding-right",n):t.css("padding-left",n)}return{undo:function t(e){i(e,!l.undo.canDo())},redo:function n(e){i(e,!l.undo.canRedo())},outdent:function a(e){if(l.node.hasClass(e.get(0),"fr-no-refresh"))return!1;if(c("button#markdown-".concat(l.id,".fr-active")).length)return!1;for(var t=l.selection.blocks(),n=0;n<t.length;n++){var r="rtl"===l.opts.direction||"rtl"===c(t[n]).css("direction")?"margin-right":"margin-left",o=t[0].parentElement;if("P"!=o.parentNode.tagName&&"DIV"!=o.parentNode.tagName&&"UL"!=o.parentNode.tagName&&"OL"!=o.parentNode.tagName&&"LI"!=o.parentNode.tagName)return i(e,!0),!0;if(t[0].previousSibling&&"none"==o.parentNode.style.listStyleType)return i(e,!0),!0;if("LI"===t[n].tagName||"LI"===t[n].parentNode.tagName)return i(e,!1),!0;if(0<l.helpers.getPX(c(t[n]).css(r)))return i(e,!1),!0}i(e,!0)},indent:function o(e){if(l.node.hasClass(e.get(0),"fr-no-refresh"))return!1;if(c("button#markdown-".concat(l.id,".fr-active")).length)return!1;for(var t=l.selection.blocks(),n=0;n<t.length;n++){for(var r=t[n].previousSibling;r&&r.nodeType===Node.TEXT_NODE&&0===r.textContent.length;)r=r.previousSibling;if("LI"!==t[n].tagName||r)return i(e,!1),!0;i(e,!0)}},moreText:e,moreParagraph:e,moreMisc:e,moreRich:e}},Object.assign(V.DEFAULTS,{attribution:!0,toolbarBottom:!1,toolbarButtons:null,toolbarButtonsXS:null,toolbarButtonsSM:null,toolbarButtonsMD:null,toolbarContainer:null,toolbarInline:!1,toolbarSticky:!0,toolbarStickyOffset:0,toolbarVisibleWithoutSelection:!1}),V.TOOLBAR_BUTTONS={moreText:{buttons:["bold","italic","underline","strikeThrough","subscript","superscript","fontFamily","fontSize","textColor","backgroundColor","inlineClass","inlineStyle","clearFormatting"]},moreParagraph:{buttons:["alignLeft","alignCenter","formatOLSimple","alignRight","alignJustify","formatOL","formatUL","paragraphFormat","paragraphStyle","lineHeight","outdent","indent","quote"]},moreRich:{buttons:["trackChanges","markdown","insertLink","insertFiles","insertImage","insertVideo","insertTable","emoticons","fontAwesome","specialCharacters","embedly","insertFile","insertHR"],buttonsVisible:4},moreMisc:{buttons:["undo","redo","fullscreen","print","getPDF","spellChecker","selectAll","html","help"],align:"right",buttonsVisible:2},trackChanges:{buttons:["showChanges","applyAll","removeAll","applyLast","removeLast"],buttonsVisible:0}},V.TOOLBAR_BUTTONS_MD=null,(V.TOOLBAR_BUTTONS_SM={}).moreText=Object.assign({},V.TOOLBAR_BUTTONS.moreText,{buttonsVisible:2}),V.TOOLBAR_BUTTONS_SM.moreParagraph=Object.assign({},V.TOOLBAR_BUTTONS.moreParagraph,{buttonsVisible:2}),V.TOOLBAR_BUTTONS_SM.moreRich=Object.assign({},V.TOOLBAR_BUTTONS.moreRich,{buttonsVisible:2}),V.TOOLBAR_BUTTONS_SM.moreMisc=Object.assign({},V.TOOLBAR_BUTTONS.moreMisc,{buttonsVisible:2}),V.TOOLBAR_BUTTONS_SM.trackChanges=Object.assign({},V.TOOLBAR_BUTTONS.trackChanges,{buttonsVisible:0}),(V.TOOLBAR_BUTTONS_XS={}).moreText=Object.assign({},V.TOOLBAR_BUTTONS.moreText,{buttonsVisible:0}),V.TOOLBAR_BUTTONS_XS.moreParagraph=Object.assign({},V.TOOLBAR_BUTTONS.moreParagraph,{buttonsVisible:0}),V.TOOLBAR_BUTTONS_XS.moreRich=Object.assign({},V.TOOLBAR_BUTTONS.moreRich,{buttonsVisible:0}),V.TOOLBAR_BUTTONS_XS.moreMisc=Object.assign({},V.TOOLBAR_BUTTONS.moreMisc,{buttonsVisible:2}),V.TOOLBAR_BUTTONS_XS.trackChanges=Object.assign({},V.TOOLBAR_BUTTONS.trackChanges,{buttonsVisible:0}),V.POWERED_BY='<a id="fr-logo" href="https://froala.com/wysiwyg-editor" target="_blank" title="Froala WYSIWYG HTML Editor"><span>Powered by</span><svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 822.8 355.33"><defs><style>.fr-logo{fill:#b1b2b7;}</style></defs><title>Froala</title><path class="fr-logo" d="M123.58,78.65A16.16,16.16,0,0,0,111.13,73H16.6C7.6,73,0,80.78,0,89.94V128.3a16.45,16.45,0,0,0,32.9,0V104.14h78.5A15.63,15.63,0,0,0,126.87,91.2,15.14,15.14,0,0,0,123.58,78.65Z"/><path class="fr-logo" d="M103.54,170a16.05,16.05,0,0,0-11.44-4.85H15.79A15.81,15.81,0,0,0,0,180.93v88.69a16.88,16.88,0,0,0,5,11.92,16,16,0,0,0,11.35,4.7h.17a16.45,16.45,0,0,0,16.41-16.6v-73.4H92.2A15.61,15.61,0,0,0,107.89,181,15.1,15.1,0,0,0,103.54,170Z"/><path class="fr-logo" d="M233,144.17c-5.29-6.22-16-7.52-24.14-7.52-16.68,0-28.72,7.71-36.5,23.47v-5.67a16.15,16.15,0,1,0-32.3,0v115.5a16.15,16.15,0,1,0,32.3,0v-38.7c0-19.09,3.5-63.5,35.9-63.5a44.73,44.73,0,0,1,5.95.27h.12c12.79,1.2,20.06-2.73,21.6-11.69C236.76,151.48,235.78,147.39,233,144.17Z"/><path class="fr-logo" d="M371.83,157c-13.93-13.11-32.9-20.33-53.43-20.33S279,143.86,265.12,157c-14.67,13.88-22.42,32.82-22.42,54.77,0,21.68,8,41.28,22.4,55.2,13.92,13.41,32.85,20.8,53.3,20.8s39.44-7.38,53.44-20.79c14.55-13.94,22.56-33.54,22.56-55.21S386.39,170.67,371.83,157Zm-9.73,54.77c0,25.84-18.38,44.6-43.7,44.6s-43.7-18.76-43.7-44.6c0-25.15,18.38-43.4,43.7-43.4S362.1,186.59,362.1,211.74Z"/><path class="fr-logo" d="M552.7,138.14a16.17,16.17,0,0,0-16,16.3v1C526.41,143.85,509,136.64,490,136.64c-19.83,0-38.19,7.24-51.69,20.4C424,171,416.4,190,416.4,212c0,21.61,7.78,41.16,21.9,55,13.56,13.33,31.92,20.67,51.7,20.67,18.83,0,36.29-7.41,46.7-19.37v1.57a16.15,16.15,0,1,0,32.3,0V154.44A16.32,16.32,0,0,0,552.7,138.14Zm-16.3,73.6c0,30.44-22.81,44.3-44,44.3-24.57,0-43.1-19-43.1-44.3s18.13-43.4,43.1-43.4C513.73,168.34,536.4,183.55,536.4,211.74Z"/><path class="fr-logo" d="M623.5,61.94a16.17,16.17,0,0,0-16,16.3v191.7a16.15,16.15,0,1,0,32.3,0V78.24A16.32,16.32,0,0,0,623.5,61.94Z"/><path class="fr-logo" d="M806.5,138.14a16.17,16.17,0,0,0-16,16.3v1c-10.29-11.63-27.74-18.84-46.7-18.84-19.83,0-38.19,7.24-51.69,20.4-14.33,14-21.91,33-21.91,55,0,21.61,7.78,41.16,21.9,55,13.56,13.33,31.92,20.67,51.7,20.67,18.83,0,36.29-7.41,46.7-19.37v1.57a16.15,16.15,0,1,0,32.3,0V154.44A16.32,16.32,0,0,0,806.5,138.14Zm-16.3,73.6c0,30.44-22.81,44.3-44,44.3-24.57,0-43.1-19-43.1-44.3s18.13-43.4,43.1-43.4C767.53,168.34,790.2,183.55,790.2,211.74Z"/></svg></a>',V.MODULES.toolbar=function(E){var y,S=E.$,t=[];function e(e){var n={};if(Array.isArray(e)){if(!Array.isArray(e[0])){for(var t=[],r=[],o=0;o<e.length;o++)"|"===e[o]||"-"===e[o]?(0<r.length&&t.push(r),r=[]):r.push(e[o]);0<r.length&&t.push(r),e=t}e.forEach(function(e,t){n["group".concat(t+1)]={buttons:e}}),n.showMoreButtons=!1}else"object"!==N(e)||Array.isArray(e)||((n=e).showMoreButtons=!0);return n}function M(){var e=E.helpers.screenSize();return t[y=e]}function T(){for(var e=E.$tb.find(".fr-more-toolbar"),t=0;t<e.length;t++){var c=S(e[t]);c.hasClass("fr-expanded")?function(){var n=E.helpers.getPX(c.css("padding-left")),e=c.find("> .fr-command, > .fr-btn-wrap"),t=S(e[0]),r=E.helpers.getPX(t.css("margin-left")),o=E.helpers.getPX(t.css("margin-right")),i=E.helpers.getPX(t.css("margin-top")),a=E.helpers.getPX(t.css("margin-bottom"));if(e.each(function(e,t){n+=S(t).outerWidth()+r+o}),E.$tb.outerWidth()<n){var s=Math.floor(n/E.$tb.outerWidth());n+=s*(n/c[0].childElementCount),s=Math.ceil(n/E.$tb.outerWidth());var l=(E.helpers.getPX(t.css("height"))+i+a)*s;c.css("height",l)}}():c.css("height","")}!E.helpers.isMobile()&&E.opts.toolbarBottom?E.$tb.find(".fr-toolbar .fr-more-toolbar").removeClass("position-relative"):E.$tb.find(".fr-toolbar .fr-more-toolbar").addClass("position-relative")}function r(){if(0==S("[data-name='trackChanges-".concat(E.id,"']")).length){S(".fr-toolbar").append(S('<div class="fr-more-toolbar"></div>').data("name","trackChanges-".concat(E.id)));for(var e=0,t=["showChanges","applyAll","removeAll","applyLast","removeLast"];e<t.length;e++){var n=t[e],r=V.COMMANDS[n];r.more_btn=!0;var o=S(E.button.build(n,r,!0));E.button.addButtons(o),S("[data-name='trackChanges-".concat(E.id,"']")).append(o)}}if(y!==E.helpers.screenSize()){var i=M(),a=S(),s=S();for(var l in E.$tb.find(".fr-btn-grp > .fr-command, .fr-more-toolbar > .fr-command, .fr-btn-grp > .fr-btn-wrap > .fr-command, .fr-more-toolbar > .fr-btn-wrap > .fr-command").addClass("fr-hidden"),function L(){for(var t=E.$tb.find(".fr-btn-grp, .fr-more-toolbar"),r=function r(e){var n=S(t[e]);n.children().each(function(e,t){n.before(t)}),n.remove()},e=0;e<t.length;e++)r(e)}(),i){var c=i[l];if(c.buttons){var d=void 0,f=0,p=3,h=void 0;"trackChanges"!==l&&(h=S('<div class="fr-btn-grp fr-float-'.concat(i[l].align?i[l].align:"left",'"></div>'))),i.showMoreButtons&&(d=S('<div class="fr-more-toolbar"></div>').data("name","".concat(l,"-").concat(E.id)),"trackChanges"!==l&&"moreRich"!==l||!E.opts.trackChangesEnabled||d.addClass("fr-expanded"));for(var u=0;u<c.buttons.length;u++){c.buttonsVisible!==undefined&&(p=c.buttonsVisible);var C=E.$tb.find('> .fr-command[data-cmd="'+c.buttons[u]+'"], > div.fr-btn-wrap > .fr-command[data-cmd="'+c.buttons[u]+'"]'),g=null;E.node.hasClass(C.next().get(0),"fr-dropdown-menu")&&(g=C.next()),E.node.hasClass(C.next().get(0),"fr-options")&&(C.removeClass("fr-hidden"),C.next().removeClass("fr-hidden"),C=C.parent()),C.removeClass("fr-hidden"),i.showMoreButtons&&p<=f?(d.append(C),g&&d.append(g)):(h.append(C),g&&h.append(g)),f++}if(i.showMoreButtons&&p<f){var m=E.$tb.find('.fr-command[data-cmd="'.concat(l,'"]'));if(0<m.length)m.removeClass("fr-hidden fr-open");else{var v=l,b=V.COMMANDS[v];b.more_btn=!0,m=S(E.button.build(v,b,!0)),E.button.addButtons(m)}h&&h.append(m)}h&&a.push(h),i.showMoreButtons&&s.push(d)}}E.opts.toolbarBottom?(E.$tb.append(s),E.$tb.find(".fr-newline").remove(),E.$tb.append('<div class="fr-newline"></div>'),E.$tb.append(a)):(E.$tb.append(a),E.$tb.find(".fr-newline").remove(),E.$tb.append('<div class="fr-newline"></div>'),E.$tb.append(s)),E.$tb.removeClass("fr-toolbar-open"),E.$box.removeClass("fr-toolbar-open"),E.events.trigger("codeView.toggle")}T()}function n(e,t){setTimeout(function(){if((!e||e.which!=V.KEYCODE.ESC)&&E.selection.inEditor()&&E.core.hasFocus()&&!E.popups.areVisible()&&"false"!=S(E.selection.blocks()[0]).closest("table").attr("contenteditable")&&(E.opts.toolbarVisibleWithoutSelection||!E.selection.isCollapsed()&&!E.keys.isIME()||t)){if(E.$tb.data("instance",E),!1===E.events.trigger("toolbar.show",[e]))return;E.$tb.show(),E.opts.toolbarContainer||E.position.forSelection(E.$tb),1<E.opts.zIndex?E.$tb.css("z-index",E.opts.zIndex+1):E.$tb.css("z-index",null)}},0)}function o(e){return(!e||"blur"!==e.type||document.activeElement!==E.el)&&(!(!e||"keydown"!==e.type||!E.keys.ctrlKey(e))||(!!E.button.getButtons(".fr-dropdown.fr-active").next().find(E.o_doc.activeElement).length||(E.helpers.isMobile()&&E.opts.toolbarInline&&(E.$tb.find(".fr-expanded").toggleClass("fr-expanded"),E.$tb.find(".fr-open").removeClass("fr-open"),E.$tb.removeClass("fr-toolbar-open"),T()),void(!1!==E.events.trigger("toolbar.hide")&&E.$tb.hide()))))}t[V.XS]=e(E.opts.toolbarButtonsXS||E.opts.toolbarButtons||V.TOOLBAR_BUTTONS_XS||V.TOOLBAR_BUTTONS||[]),t[V.SM]=e(E.opts.toolbarButtonsSM||E.opts.toolbarButtons||V.TOOLBAR_BUTTONS_SM||V.TOOLBAR_BUTTONS||[]),t[V.MD]=e(E.opts.toolbarButtonsMD||E.opts.toolbarButtons||V.TOOLBAR_BUTTONS_MD||V.TOOLBAR_BUTTONS||[]),t[V.LG]=e(E.opts.toolbarButtons||V.TOOLBAR_BUTTONS||[]);var i=null;function a(e){clearTimeout(i),e&&e.which===V.KEYCODE.ESC||(i=setTimeout(n,E.opts.typingTimer))}function s(){E.events.on("window.mousedown",o),E.events.on("keydown",o),E.events.on("blur",o),E.events.$on(E.$tb,"transitionend",".fr-more-toolbar",function(){E.position.forSelection(E.$tb)}),E.helpers.isMobile()||E.events.on("window.mouseup",n),E.helpers.isMobile()?E.helpers.isIOS()||(E.events.on("window.touchend",n),E.browser.mozilla&&setInterval(n,200)):E.events.on("window.keyup",a),E.events.on("keydown",function(e){e&&e.which===V.KEYCODE.ESC&&E.events.trigger("toolbar.esc")}),E.events.on("keydown",function(e){if(e.which===V.KEYCODE.ALT)return e.stopPropagation(),!1},!0),E.events.$on(E.$wp,"scroll.toolbar",n),E.events.on("commands.after",n),E.helpers.isMobile()&&(E.events.$on(E.$doc,"selectionchange",a),E.events.$on(E.$doc,"orientationchange",n))}function l(){E.$tb.html("").removeData().remove(),E.$tb=null,E.$second_tb&&(E.$second_tb.html("").removeData().remove(),E.$second_tb=null)}function c(){E.$box.removeClass("fr-top fr-bottom fr-inline fr-basic"),E.$box.find(".fr-sticky-dummy").remove()}function d(){E.opts.theme&&E.$tb.addClass("".concat(E.opts.theme,"-theme")),1<E.opts.zIndex&&E.$tb.css("z-index",E.opts.zIndex+1),"auto"!==E.opts.direction&&E.$tb.removeClass("fr-ltr fr-rtl").addClass("fr-".concat(E.opts.direction)),E.helpers.isMobile()?E.$tb.addClass("fr-mobile"):E.$tb.addClass("fr-desktop"),E.opts.toolbarContainer?(E.opts.toolbarInline&&(s(),o()),E.opts.toolbarBottom?E.$tb.addClass("fr-bottom"):E.$tb.addClass("fr-top")):function e(){E.opts.toolbarInline?(E.$sc.append(E.$tb),E.$tb.data("container",E.$sc),E.$tb.addClass("fr-inline"),s(),E.opts.toolbarBottom=!1):(E.opts.toolbarBottom?(E.$box.append(E.$tb),E.$tb.addClass("fr-bottom"),E.$box.addClass("fr-bottom")):(E.opts.toolbarBottom=!1,E.$box.prepend(E.$tb),E.$tb.addClass("fr-top"),E.$box.addClass("fr-top")),E.$tb.addClass("fr-basic"),E.opts.toolbarSticky&&(E.opts.toolbarStickyOffset&&(E.opts.toolbarBottom?E.$tb.css("bottom",E.opts.toolbarStickyOffset):E.$tb.css("top",E.opts.toolbarStickyOffset)),E.position.addSticky(E.$tb)))}(),function t(){var e=E.button.buildGroup(M());E.$tb.append(e),T(),E.button.bindCommands(E.$tb)}(),function n(){E.events.$on(S(E.o_win),"resize",r),E.events.$on(S(E.o_win),"orientationchange",r),E.opts.toolbarButtons&&-1<JSON.stringify(E.opts.toolbarButtons).indexOf("trackChanges")&&r()}(),E.accessibility.registerToolbar(E.$tb),E.events.$on(E.$tb,"".concat(E._mousedown," ").concat(E._mouseup),function(e){var t=e.originalEvent?e.originalEvent.target||e.originalEvent.originalTarget:null;if(t&&"INPUT"!==t.tagName&&!E.edit.isDisabled())return e.stopPropagation(),e.preventDefault(),!1},!0),E.events.$on(E.$tb,"transitionend",".fr-more-toolbar",function(){E.$box.hasClass("fr-fullscreen")&&(E.opts.height=E.o_win.innerHeight-(E.opts.toolbarInline?0:E.$tb.outerHeight()+(E.$second_tb?E.$second_tb.outerHeight():0)),E.size.refresh())})}var f=!1;return{_init:function p(){if(E.$sc=S(E.opts.scrollableContainer).first(),!E.$wp)return!1;E.opts.toolbarInline||E.opts.toolbarBottom||(E.$second_tb=S(E.doc.createElement("div")).attr("class","fr-second-toolbar"),E.$box.append(E.$second_tb),(!1!==E.ul||E.opts.attribution)&&E.$second_tb.prepend(V.POWERED_BY)),E.opts.toolbarContainer?(E.shared.$tb?(E.$tb=E.shared.$tb,E.opts.toolbarInline&&s()):(E.shared.$tb=S(E.doc.createElement("DIV")),E.shared.$tb.addClass("fr-toolbar"),E.$tb=E.shared.$tb,S(E.opts.toolbarContainer).append(E.$tb),d(),E.$tb.data("instance",E)),E.helpers.isMobile()&&E.events.$on(E.$tb,"click",function(){E.popups.areVisible().length||E.id!==E.shared.selected_editor||E.$el.focus()}),E.opts.toolbarInline?E.$box.addClass("fr-inline"):E.$box.addClass("fr-basic"),E.events.on("focus",function(){E.$tb.data("instance",E)},!0),E.opts.toolbarInline=!1):E.opts.toolbarInline?(E.$box.addClass("fr-inline"),E.shared.$tb?(E.$tb=E.shared.$tb,s()):(E.shared.$tb=S(E.doc.createElement("DIV")),E.shared.$tb.addClass("fr-toolbar"),E.$tb=E.shared.$tb,d())):(E.$box.addClass("fr-basic"),E.$tb=S(E.doc.createElement("DIV")),E.$tb.addClass("fr-toolbar"),d(),E.$tb.data("instance",E)),E.events.on("destroy",c,!0),E.events.on(E.opts.toolbarInline||E.opts.toolbarContainer?"shared.destroy":"destroy",l,!0),E.events.on("edit.on",function(){E.$tb.removeClass("fr-disabled").removeAttr("aria-disabled")}),E.events.on("edit.off",function(){E.$tb.addClass("fr-disabled").attr("aria-disabled",!0)}),function e(){E.events.on("shortcut",function(e,t,n){var r;if(t&&!n?r=E.$tb.find('.fr-command[data-cmd="'.concat(t,'"]')):t&&n&&(r=E.$tb.find('.fr-command[data-cmd="'.concat(t,'"][data-param1="').concat(n,'"]'))),r.length&&(e.preventDefault(),e.stopPropagation(),r.parents(".fr-toolbar").data("instance",E),"keydown"===e.type))return E.button.exec(r),!1})}()},hide:o,show:function h(){if(!1===E.events.trigger("toolbar.show"))return!1;E.$tb.show()},showInline:n,disable:function u(){!f&&E.$tb&&(E.$tb.find(".fr-btn-grp > .fr-command, .fr-more-toolbar > .fr-command").addClass("fr-disabled fr-no-refresh").attr("aria-disabled",!0),f=!0)},enable:function C(){f&&E.$tb&&(E.$tb.find(".fr-btn-grp > .fr-command, .fr-more-toolbar > .fr-command").removeClass("fr-disabled fr-no-refresh").attr("aria-disabled",!1),f=!1),E.button.bulkRefresh()},setMoreToolbarsHeight:T}};var c=["scroll","wheel","touchmove","touchstart","touchend"],d=["webkit","moz","ms","o"],f=["transitionend"],o=document.createElement("div").style,i=["Webkit","Moz","ms","O","css","style"],s={visibility:"hidden",display:"block"},r=["focus","blur","click"],a={},l=function l(e,t){return{altKey:e.altKey,bubbles:e.bubbles,cancelable:e.cancelable,changedTouches:e.changedTouches,ctrlKey:e.ctrlKey,detail:e.detail,eventPhase:e.eventPhase,metaKey:e.metaKey,pageX:e.pageX,pageY:e.pageY,shiftKey:e.shiftKey,view:e.view,"char":e["char"],key:e.key,keyCode:e.keyCode,button:e.button,buttons:e.buttons,clientX:e.clientX,clientY:e.clientY,offsetX:e.offsetX,offsetY:e.offsetY,pointerId:e.pointerId,pointerType:e.pointerType,screenX:e.screenX,screenY:e.screenY,targetTouches:e.targetTouches,toElement:e.toElement,touches:e.touches,type:e.type,which:e.which,target:e.target,currentTarget:t,originalEvent:e,stopPropagation:function(){e.stopPropagation()},stopImmediatePropagation:function(){e.stopImmediatePropagation()},preventDefault:function(){-1===c.indexOf(e.type)&&e.preventDefault()}}},p=function p(e){return e.ownerDocument&&e.ownerDocument.body.contains(e)||"#document"===e.nodeName||"HTML"===e.nodeName||e===window},h=function h(n,r){return function(e){var t=e.target;if(r)for(r=C(r);t&&t!==this;)Element.prototype.matches.call(t,C(r))&&n.call(t,l(e,t)),t=t.parentNode;else p(t)&&n.call(t,l(e,t))}},u=function u(e,t){return new v(e,t)},C=function C(e){return e&&"string"==typeof e?e.replace(/^\s*>/g,":scope >").replace(/,\s*>/g,", :scope >"):e},g=function g(e){return"function"==typeof e&&"number"!=typeof e.nodeType},m=u;u.fn=u.prototype={constructor:u,length:0,contains:function(e){if(!e)return!1;if(Array.isArray(e)){for(var t=0;t<e.length;t++)if(this.contains(e[t])&&this!=e[t])return!0;return!1}for(var n=0;n<this.length;n++)for(var r=e;r;){if(r==this[n]||r[0]&&r[0].isEqualNode(this[n]))return!0;r=r.parentNode}return!1},findVisible:function(e){for(var t=this.find(e),n=t.length-1;0<=n;n--)m(t[n]).isVisible()||t.splice(n,1);return t},formatParams:function(t){var e="".concat(Object.keys(t).map(function(e){return"".concat(e,"=").concat(encodeURIComponent(t[e]))}).join("&"));return e||""},ajax:function(t){var n=new XMLHttpRequest,e=this.formatParams(t.data);for(var r in"GET"===t.method.toUpperCase()&&(t.url=e?t.url+"?"+e:t.url),n.open(t.method,t.url,!0),t.withCredentials&&(n.withCredentials=!0),t.crossDomain&&n.setRequestHeader("Access-Control-Allow-Origin","*"),t.headers)Object.prototype.hasOwnProperty.call(t.headers,r)&&n.setRequestHeader(r,t.headers[r]);Object.prototype.hasOwnProperty.call(t.headers,"Content-Type")||("json"===t.dataType?n.setRequestHeader("Content-Type","application/json"):n.setRequestHeader("Content-Type","application/x-www-form-urlencoded; charset=UTF-8")),n.onload=function(){if(200==n.status){var e=n.responseText;"json"===t.dataType&&(e=JSON.parse(e)),t.done(e,n.status,n)}else t.fail(n)},n.send(e)},prevAll:function(){var e=m();if(!this[0])return e;for(var t=this[0];t&&t.previousSibling;)t=t.previousSibling,e.push(t);return e},index:function(e){return e?"string"==typeof e?[].indexOf.call(m(e),this[0]):[].indexOf.call(this,e.length?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},isVisible:function(){return!!this[0]&&!!(this[0].offsetWidth||this[0].offsetHeight||this[0].getClientRects().length)},toArray:function(){return[].slice.call(this)},get:function(e){return null==e?[].slice.call(this):e<0?this[e+this.length]:this[e]},pushStack:function(e){var t=u.merge(this.constructor(),e);return t.prevObject=this,t},wrapAll:function(e){var t;return this[0]&&(g(e)&&(e=e.call(this[0])),t=u(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){for(var e=this;e.firstElementChild;)e=e.firstElementChild;return e}).append(this)),this},wrapInner:function(e){if("string"==typeof e){for(var t=e.split(" "),n=0;n<t.length&&0===t[n].trim().length;)n++;if(n<t.length&&(m(e).length&&t[n].trim()===m(e)[0].tagName&&(e=document.createElement(t[n].trim())),n++),"string"!=typeof e)for(var r=m(e);n<t.length;n++){t[n]=t[n].trim();var o=t[n].split("=");r.attr(o[0],o[1].replace('"',""))}}for(;this[0].firstChild&&this[0].firstChild!==e&&"string"!=typeof e;)e.appendChild(this[0].firstChild)},wrap:function(t){var n=g(t);return this.each(function(e){m(this).wrapAll(n?t.call(this,e):t)})},unwrap:function(){return this.parent().each(function(){this.nodeName&&this.nodeName.toLowerCase()===name.toLowerCase()||u(this).replaceWith(this.childNodes)})},grep:function(e,t,n){for(var r=[],o=0,i=e.length,a=!n;o<i;o++)!t(e[o],o)!==a&&r.push(e[o]);return r},map:function(n){return this.pushStack(u.map(this,function(e,t){return n.call(e,t,e)}))},slice:function(){return this.pushStack([].slice.apply(this,arguments))},each:function(e){if(this.length)for(var t=0;t<this.length&&!1!==e.call(this[t],t,this[t]);t++);return this},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(e<0?t:0);return this.pushStack(0<=n&&n<t?[this[n]]:[])},empty:function(){for(var e=0;e<this.length;e++)this[e].innerHTML=""},contents:function(){for(var e=m(),t=0;t<this.length;t++)for(var n=this[t].childNodes,r=0;r<n.length;r++)e.push(n[r]);return e},attr:function(e,t){if("object"===N(e)){for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&null!==e[n]&&this.attr(n,e[n]);return this}if(void 0===t)return 0===this.length||!this[0].getAttribute&&"checked"!==e?undefined:"checked"===e?this[0].checked:"tagName"===e?this[0].tagName:this[0].getAttribute(e);if("checked"===e)for(var r=0;r<this.length;r++)this[r].checked=t;else if("tagName"===e)for(var o=0;o<this.length;o++)this[o].tagName=t;else for(var i=0;i<this.length;i++)this[i].setAttribute(e,t);return this},removeAttr:function(e){for(var t=0;t<this.length;t++)this[t].removeAttribute&&this[t].removeAttribute(e);return this},hide:function(){return this.css("display","none"),this},show:function(){return this.css("display","block"),this},focus:function(){return this.length&&this[0].focus(),this},blur:function(){return this.length&&this[0].blur(),this},data:function(e,t){if(void 0!==t){for(var n=0;n<this.length;n++)"object"!==N(this[n]["data-"+e]=t)&&"function"!=typeof t&&this[n].setAttribute&&this[n].setAttribute("data-"+e,t);return this}if(void 0!==t)return this.attr("data-"+e,t);if(0===this.length)return undefined;for(var r=0;r<this.length;r++){var o=this[r]["data-"+e];if(null==o&&this[r].getAttribute&&(o=this[r].getAttribute("data-"+e)),void 0!==o&&null!=o)return o}return undefined},removeData:function(e){for(var t=0;t<this.length;t++)this[t].removeAttribute&&this[t].removeAttribute("data-"+e),this[t]["data-"+e]=null;return this},getCorrectStyleName:function(e){if(!a[e]){var t;e in o&&(t=e);for(var n=e[0].toUpperCase()+e.slice(1),r=i.length;r--;)(e=i[r]+n)in o&&(t=e);a[e]=t}return a[e]},css:function(e,t){if(void 0!==t){if(0===this.length)return this;("string"!=typeof t||""===t.trim()||isNaN(t))&&"number"!=typeof t||!/(margin)|(padding)|(height)|(width)|(top)|(left)|(right)|(bottom)/gi.test(e)||/(line-height)/gi.test(e)||(t+="px");for(var n=0;n<this.length;n++)e=m(this).getCorrectStyleName(e),this[n].style[e]=t;return this}if("string"==typeof e){if(0===this.length)return undefined;var r=this[0].ownerDocument||document,o=r.defaultView||r.parentWindow;return e=m(this).getCorrectStyleName(e),o.getComputedStyle(this[0])[e]}for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&this.css(i,e[i]);return this},toggleClass:function(e,t){if(1<e.split(" ").length){for(var n=e.split(" "),r=0;r<n.length;r++)this.toggleClass(n[r],t);return this}for(var o=0;o<this.length;o++)void 0===t?this[o].classList.contains(e)?this[o].classList.remove(e):this[o].classList.add(e):t?this[o].classList.contains(e)||this[o].classList.add(e):this[o].classList.contains(e)&&this[o].classList.remove(e);return this},addClass:function(e){if(0===e.length)return this;if(1<e.split(" ").length){for(var t=e.split(" "),n=0;n<t.length;n++)this.addClass(t[n]);return this}for(var r=0;r<this.length;r++)this[r].classList.add(e);return this},removeClass:function(e){if(1<e.split(" ").length){for(var t=e.split(" "),n=0;n<t.length;n++)t[n]=t[n].trim(),t[n].length&&this.removeClass(t[n]);return this}for(var r=0;r<this.length;r++)e.length&&this[r].classList.remove(e);return this},getClass:function(e){return e.getAttribute&&e.getAttribute("class")||""},stripAndCollapse:function(e){return(e.match(/[^\x20\t\r\n\f]+/g)||[]).join(" ")},hasClass:function(e){var t,n,r=0;for(t=" "+e+" ";n=this[r++];)if(1===n.nodeType&&-1<(" "+m(this).stripAndCollapse(m(this).getClass(n))+" ").indexOf(t))return!0;return!1},scrollTop:function(e){if(void 0===e)return 0===this.length?undefined:this[0]===document?document.documentElement.scrollTop:this[0].scrollTop;for(var t=0;t<this.length;t++)this[t]===document?window.scrollTo(document.documentElement.scrollLeft,e):this[t].scrollTop=e},scrollLeft:function(e){if(void 0===e)return 0===this.length?undefined:this[0]===document?document.documentElement.scrollLeft:this[0].scrollLeft;for(var t=0;t<this.length;t++)this[t]===document?window.scrollTo(e,document.documentElement.scrollTop):this[t].scrollLeft=e},on:function(e,t,n){if(1<e.split(" ").length){for(var r=e.split(" "),o=0;o<r.length;o++)if(-1!==f.indexOf(e))for(var i=0;i<d.length;i++)this.on(d[i]+e[0].toUpperCase()+e.slice(1),t,n);else this.on(r[o],t,n);return this}n="function"==typeof t?h(t,null):h(n,t);for(var a=0;a<this.length;a++){var s=m(this[a]);s.data("events")||s.data("events",[]),s.data("events").push([e,n]);var l=e.split(".");l=l[0],0<=c.indexOf(l)?s.get(0).addEventListener(l,n,{passive:!0}):s.get(0).addEventListener(l,n)}},off:function(e){if(1<e.split(" ").length){for(var t=e.split(" "),n=0;n<t.length;n++)this.off(t[n]);return this}for(var r=0;r<this.length;r++){var o=m(this[r]);if(o.data("events")){var i=e.split(".");i=i[0];for(var a=o.data("events")||[],s=a.length-1;0<=s;s--){var l=a[s];l[0]==e&&(o.get(0).removeEventListener(i,l[1]),a.splice(s,1))}}}},trigger:function(e){for(var t=0;t<this.length;t++){var n=void 0;"function"==typeof Event?n=0<=e.search(/^mouse/g)?new MouseEvent(e,{view:window,cancelable:!0,bubbles:!0}):new Event(e):0<=e.search(/^mouse/g)?(n=document.createEvent("MouseEvents")).initMouseEvent(e,!0,!0,window,0,0,0,0,0,!1,!1,!1,!1,0,null):(n=document.createEvent("Event")).initEvent(e,!0,!0),0<=r.indexOf(e)&&"function"==typeof this[t][e]?this[t][e]():this[t].dispatchEvent(n)}},triggerHandler:function(){},val:function(e){if(void 0===e)return this[0].value;for(var t=0;t<this.length;t++)this[t].value=e;return this},siblings:function(){return m(this[0]).parent().children().not(this)},find:function(e){var t=m();if("string"!=typeof e){for(var n=0;n<e.length;n++)for(var r=0;r<this.length;r++)if(this[r]!==e[n]&&m(this[r]).contains(e[n])){t.push(e[n]);break}return t}var o=function o(e){return"object"===("undefined"==typeof HTMLElement?"undefined":N(HTMLElement))?e instanceof HTMLElement:e&&"object"===N(e)&&null!==e&&1===e.nodeType&&"string"==typeof e.nodeName};e=C(e);for(var i=0;i<this.length;i++)if(this[i].querySelectorAll){var a=[];if(e&&"string"==typeof e)try{a=this[i].querySelectorAll(e)}catch(l){a=this[i].children}else o(e)&&(a=[e]);for(var s=0;s<a.length;s++)t.push(a[s])}return t},children:function(){for(var e=m(),t=0;t<this.length;t++)for(var n=this[t].children,r=0;r<n.length;r++)e.push(n[r]);return e},not:function(e){if("string"==typeof e)for(var t=this.length-1;0<=t;t--)Element.prototype.matches.call(this[t],e)&&this.splice(t,1);else if(e instanceof u){for(var n=this.length-1;0<=n;n--)for(var r=0;r<e.length;r++)if(this[n]===e[r]){this.splice(n,1);break}}else for(var o=this.length-1;0<=o;o--)this[o]===e[0]&&this.splice(o,1);return this},add:function(e){for(var t=0;t<e.length;t++)this.push(e[t]);return this},closest:function(e){for(var t=0;t<this.length;t++){var n=Element.prototype.closest.call(this[t],e);if(n)return m(n)}return m()},html:function(e){if(void 0===e)return 0===this.length?undefined:this[0].innerHTML;if("string"==typeof e)for(var t=0;t<this.length;t++){this[t].innerHTML=e;for(var n=this[t].children,r=this[t].ownerDocument||document,o=0;o<n.length;o++)if("SCRIPT"===n[o].tagName){var i=r.createElement("script");i.innerHTML=n[o].innerHTML,n[o].hasAttribute("async")&&i.setAttribute("async",""),i.src=n[o].src,n[o].hasAttribute("defer")&&i.setAttribute("defer",""),r.head.appendChild(i).parentNode.removeChild(i)}}else{this[0].innerHTML="",this.append(e[0]);var a=this[0].ownerDocument||document;if("SCRIPT"===e[0].tagName){var s=a.createElement("script");s.innerHTML=e[0].innerHTML,a.head.appendChild(s).parentNode.removeChild(s)}}return this},text:function(e){if(!e)return this.length?this[0].textContent:"";for(var t=0;t<this.length;t++)this[t].textContent=e},after:function e(t){if(t)if("string"==typeof t)for(var n=0;n<this.length;n++){var e=this[n];if(e.nodeType!=Node.ELEMENT_NODE){var r=e.ownerDocument.createElement("SPAN");m(e).after(r),m(r).after(t).remove()}else e.insertAdjacentHTML("afterend",t)}else{var o=this[0];if(o.nextSibling)if(t instanceof u)for(var i=0;i<t.length;i++)o.nextSibling.parentNode.insertBefore(t[i],o.nextSibling);else o.nextSibling.parentNode.insertBefore(t,o.nextSibling);else m(o.parentNode).append(t)}return this},clone:function(e){for(var t=m(),n=0;n<this.length;n++)t.push(this[n].cloneNode(e));return t},replaceWith:function(e){if("string"==typeof e)for(var t=0;t<this.length;t++)this[t].parentNode&&(this[t].outerHTML=e);else if(e.length)for(var n=0;n<this.length;n++)this.replaceWith(e[n]);else this.after(e).remove()},insertBefore:function(e){return m(e).before(this[0]),this},before:function e(t){if(t instanceof u){for(var n=0;n<t.length;n++)this.before(t[n]);return this}if(t)if("string"==typeof t)for(var r=0;r<this.length;r++){var e=this[r];if(e.nodeType!=Node.ELEMENT_NODE){var o=e.ownerDocument.createElement("SPAN");m(e).before(o),m(o).before(t).remove()}else e.parentNode&&e.insertAdjacentHTML("beforebegin",t)}else{var i=this[0];if(i.parentNode)if(t instanceof u)for(var a=0;a<t.length;a++)i.parentNode.insertBefore(t[a],i);else i.parentNode.insertBefore(t,i)}return this},append:function(e){if(0==this.length)return this;if("string"==typeof e)for(var t=0;t<this.length;t++){var n=this[t],r=n.ownerDocument.createElement("SPAN");m(n).append(r),m(r).after(e).remove()}else if(e instanceof u||Array.isArray(e))for(var o=0;o<e.length;o++)this.append(e[o]);else"function"!=typeof e&&this[0].appendChild(e);return this},prepend:function(e){if(0==this.length)return this;if("string"==typeof e)for(var t=0;t<this.length;t++){var n=this[t],r=n.ownerDocument.createElement("SPAN");m(n).prepend(r),m(r).before(e).remove()}else if(e instanceof u)for(var o=0;o<e.length;o++)this.prepend(e[o]);else{var i=this[0];i.firstChild?i.firstChild?i.insertBefore(e,i.firstChild):i.appendChild(e):m(i).append(e)}return this},remove:function(){for(var e=0;e<this.length;e++)this[e].parentNode&&this[e].parentNode.removeChild(this[e]);return this},prev:function(){return this.length&&this[0].previousElementSibling?m(this[0].previousElementSibling):m()},next:function(){return this.length&&this[0].nextElementSibling?m(this[0].nextElementSibling):m()},nextAllVisible:function(){return this.next()},prevAllVisible:function(){return this.prev()},outerHeight:function(e){if(0===this.length)return undefined;var t=this[0];if(t===t.window)return t.innerHeight;var n={},r=this.isVisible();if(!r)for(var o in s)n[o]=t.style[o],t.style[o]=s[o];var i=t.offsetHeight;if(e&&(i+=parseInt(m(t).css("marginTop"))+parseInt(m(t).css("marginBottom"))),!r)for(var a in s)t.style[a]=n[a];return i},outerWidth:function(e){if(0===this.length)return undefined;var t=this[0];if(t===t.window)return t.outerWidth;var n={},r=this.isVisible();if(!r)for(var o in s)n[o]=t.style[o],t.style[o]=s[o];var i=t.offsetWidth;if(e&&(i+=parseInt(m(t).css("marginLeft"))+parseInt(m(t).css("marginRight"))),!r)for(var a in s)t.style[a]=n[a];return i},width:function(e){if(e===undefined){if(this[0]instanceof HTMLDocument)return this[0].body.offsetWidth;if(this[0])return this[0].offsetWidth}else this[0].style.width=e+"px"},height:function(e){var t=this[0];if(e===undefined){if(t instanceof HTMLDocument){var n=t.documentElement;return Math.max(t.body.scrollHeight,n.scrollHeight,t.body.offsetHeight,n.offsetHeight,n.clientHeight)}return t.offsetHeight}t.style.height=e+"px"},is:function(e){return 0!==this.length&&("string"==typeof e&&this[0].matches?this[0].matches(e):e instanceof u?this[0]==e[0]:this[0]==e)},parent:function(){return 0===this.length?m():m(this[0].parentNode)},_matches:function(e,t){var n=e.matches||e.matchesSelector||e.msMatchesSelector||e.mozMatchesSelector||e.webkitMatchesSelector||e.oMatchesSelector;return e&&!t?n:n.call(e,t)},parents:function(e){for(var t=m(),n=0;n<this.length;n++)for(var r=this[n].parentNode;r&&r!=document&&this._matches(r);)e?this._matches(r,e)&&t.push(r):t.push(r),r=r.parentNode;return t},parentsUntil:function(e,t){var n=m();e instanceof u&&0<e.length&&(e=e[0]);for(var r=0;r<this.length;r++)for(var o=this[r].parentNode;o&&o!=document&&o!=e&&this[r]!=e&&("string"!=typeof e||!Element.prototype.matches.call(o,e));)t?Element.prototype.matches.call(o,t)&&n.push(o):n.push(o),o=o.parentNode;return n},insertAfter:function(e){var t=e.parent()[0];t&&t.insertBefore(this[0],e[0].nextElementSibling)},filter:function(e){var t=m();if("function"==typeof e)for(var n=0;n<this.length;n++)e.call(this[n],this[n])&&t.push(this[n]);else if("string"==typeof e)for(var r=0;r<this.length;r++)this[r].matches(e)&&t.push(this[r]);return t},offset:function(){if(0===this.length)return undefined;var e=this[0].getBoundingClientRect(),t=this[0].ownerDocument.defaultView;return{top:e.top+t.pageYOffset,left:e.left+t.pageXOffset}},position:function(){return{left:this[0].offsetLeft,top:this[0].offsetTop}},push:[].push,splice:[].splice},u.extend=function(e){e=e||{};for(var t=1;t<arguments.length;t++)if(arguments[t])for(var n in arguments[t])Object.prototype.hasOwnProperty.call(arguments[t],n)&&(e[n]=arguments[t][n]);return e},u.merge=function(e,t){for(var n=+t.length,r=0,o=e.length;r<n;r++)e[o++]=t[r];return e.length=o,e},u.map=function(e,t,n){var r,o,i=0,a=[];if(Array.isArray(e))for(r=e.length;i<r;i++)null!=(o=t(e[i],i,n))&&a.push(o);else for(i in e)null!=(o=t(e[i],i,n))&&a.push(o);return[].concat.apply([],a)};var v=function v(e,t){if(!e)return this;if("string"==typeof e&&"<"===e[0]){var n=document.createElement("DIV");return n.innerHTML=e,m(n.firstElementChild)}if(t=t instanceof u?t[0]:t,"string"!=typeof e)return e instanceof u?e:(this[0]=e,this.length=1,this);e=C(e);for(var r=(t||document).querySelectorAll(e),o=0;o<r.length;o++)this[o]=r[o];return this.length=r.length,this};v.prototype=u.prototype;var b=V;function L(){this.doc=this.$el.get(0).ownerDocument,this.win="defaultView"in this.doc?this.doc.defaultView:this.doc.parentWindow,this.$doc=u(this.doc),this.$win=u(this.win),this.opts.pluginsEnabled||(this.opts.pluginsEnabled=Object.keys(b.PLUGINS)),this.opts.initOnClick?(this.load(b.MODULES),this.$el.on("touchstart.init",function(){u(this).data("touched",!0)}),this.$el.on("touchmove.init",function(){u(this).removeData("touched")}),this.$el.on("mousedown.init touchend.init dragenter.init focus.init",function r(e){if("touchend"===e.type&&!this.$el.data("touched"))return!0;if(1===e.which||!e.which){this.$el.off("mousedown.init touchstart.init touchmove.init touchend.init dragenter.init focus.init"),this.load(b.MODULES),this.load(b.PLUGINS);var t=e.originalEvent&&e.originalEvent.originalTarget;if(t&&"IMG"===t.tagName&&u(t).trigger("mousedown"),"undefined"==typeof this.ul&&this.destroy(),"touchend"===e.type&&this.image&&e.originalEvent&&e.originalEvent.target&&u(e.originalEvent.target).is("img")){var n=this;setTimeout(function(){n.image.edit(u(e.originalEvent.target))},100)}this.ready=!0,this.events.trigger("initialized")}}.bind(this)),this.events.trigger("initializationDelayed")):(this.load(b.MODULES),this.load(b.PLUGINS),u(this.o_win).scrollTop(this.c_scroll),"undefined"==typeof this.ul&&this.destroy(),this.ready=!0,this.events.trigger("initialized"))}return b.Bootstrap=function(e,t,n){this.id=++b.ID,this.$=u;var r={};"function"==typeof t&&(n=t,t={}),n&&(t.events||(t.events={}),t.events.initialized=n),t&&t.documentReady&&(r.toolbarButtons=[["fullscreen","undo","redo","getPDF","print"],["bold","italic","underline","textColor","backgroundColor","clearFormatting"],["alignLeft","alignCenter","alignRight","alignJustify"],["formatOL","formatUL","indent","outdent"],["paragraphFormat"],["fontFamily"],["fontSize"],["insertLink","insertImage","quote"]],r.paragraphFormatSelection=!0,r.fontFamilySelection=!0,r.fontSizeSelection=!0,r.placeholderText="",r.quickInsertEnabled=!1,r.charCounterCount=!1),this.opts=Object.assign({},Object.assign({},b.DEFAULTS,r,"object"===N(t)&&t));var o=JSON.stringify(this.opts);b.OPTS_MAPPING[o]=b.OPTS_MAPPING[o]||this.id,this.sid=b.OPTS_MAPPING[o],b.SHARED[this.sid]=b.SHARED[this.sid]||{},this.shared=b.SHARED[this.sid],this.shared.count=(this.shared.count||0)+1,this.$oel=u(e),this.$oel.data("froala.editor",this),this.o_doc=e.ownerDocument,this.o_win="defaultView"in this.o_doc?this.o_doc.defaultView:this.o_doc.parentWindow,this.c_scroll=u(this.o_win).scrollTop(),this._init()},b.Bootstrap.prototype._init=function(){var e=this.$oel.get(0).tagName;this.$oel.closest("label").length;var t=function(){"TEXTAREA"!==e&&(this._original_html=this._original_html||this.$oel.html()),this.$box=this.$box||this.$oel,this.opts.fullPage&&(this.opts.iframe=!0),this.opts.iframe?(this.$iframe=u('<iframe src="about:blank" frameBorder="0">'),this.$wp=u("<div></div>"),this.$box.html(this.$wp),this.$wp.append(this.$iframe),this.$iframe.get(0).contentWindow.document.open(),this.$iframe.get(0).contentWindow.document.write("<!DOCTYPE html>"),this.$iframe.get(0).contentWindow.document.write("<html><head></head><body></body></html>"),this.$iframe.get(0).contentWindow.document.close(),this.iframe_document=this.$iframe.get(0).contentWindow.document,this.$el=u(this.iframe_document.querySelector("body")),this.el=this.$el.get(0),this.$head=u(this.iframe_document.querySelector("head")),this.$html=u(this.iframe_document.querySelector("html"))):(this.$el=u(this.o_doc.createElement("DIV")),this.el=this.$el.get(0),this.$wp=u(this.o_doc.createElement("DIV")).append(this.$el),this.$box.html(this.$wp)),setTimeout(L.bind(this),0)}.bind(this),n=function(){this.$box=u("<div>"),this.$oel.before(this.$box).hide(),this._original_html=this.$oel.val();var e=this;this.$oel.parents("form").on("submit.".concat(this.id),function(){e.events.trigger("form.submit")}),this.$oel.parents("form").on("reset.".concat(this.id),function(){e.events.trigger("form.reset")}),t()}.bind(this),r=function(){this.$el=this.$oel,this.el=this.$el.get(0),this.$el.attr("contenteditable",!0).css("outline","none").css("display","inline-block"),this.opts.multiLine=!1,this.opts.toolbarInline=!1,setTimeout(L.bind(this),0)}.bind(this),o=function(){this.$el=this.$oel,this.el=this.$el.get(0),this.opts.toolbarInline=!1,setTimeout(L.bind(this),0)}.bind(this),i=function(){this.$el=this.$oel,this.el=this.$el.get(0),this.opts.toolbarInline=!1,this.$oel.on("click.popup",function(e){e.preventDefault()}),setTimeout(L.bind(this),0)}.bind(this);this.opts.editInPopup?i():"TEXTAREA"===e?n():"A"===e?r():"IMG"===e?o():"BUTTON"===e||"INPUT"===e?(this.opts.editInPopup=!0,this.opts.toolbarInline=!1,i()):t()},b.Bootstrap.prototype.load=function(e){for(var t in e)if(Object.prototype.hasOwnProperty.call(e,t)){if(this[t])continue;if(b.PLUGINS[t]&&this.opts.pluginsEnabled.indexOf(t)<0)continue;if(this[t]=new e[t](this),this[t]._init&&(this[t]._init(),this.opts.initOnClick&&"core"===t))return!1}},b.Bootstrap.prototype.destroy=function(){this.destrying=!0,this.shared.count--,this.events&&this.events.$off();var e=this.html&&this.html.get();if(this.opts.iframe&&(this.events.disableBlur(),this.win.focus(),this.events.enableBlur()),this.events&&(this.events.trigger("destroy",[],!0),this.events.trigger("shared.destroy",[],!0)),0===this.shared.count){for(var t in this.shared)Object.prototype.hasOwnProperty.call(this.shared,t)&&(this.shared[t]=null,b.SHARED[this.sid][t]=null);delete b.SHARED[this.sid]}this.$oel.parents("form").off(".".concat(this.id)),this.$oel.off("click.popup"),this.$oel.removeData("froala.editor"),this.$oel.off("froalaEditor"),this.core&&this.core.destroy(e),b.INSTANCES.splice(b.INSTANCES.indexOf(this),1)},V});
},{}],4:[function(require,module,exports){
(function (setImmediate){(function (){
;(function(){

  /* UNBUILD */
  function USE(arg, req){
    return req? require(arg) : arg.slice? USE[R(arg)] : function(mod, path){
      arg(mod = {exports: {}});
      USE[R(path)] = mod.exports;
    }
    function R(p){
      return p.split('/').slice(-1).toString().replace('.js','');
    }
  }
  if(typeof module !== "undefined"){ var MODULE = module }
  /* UNBUILD */

	;USE(function(module){
		// Shim for generic javascript utilities.
		String.random = function(l, c){
			var s = '';
			l = l || 24; // you are not going to make a 0 length random number, so no need to check type
			c = c || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz';
			while(l-- > 0){ s += c.charAt(Math.floor(Math.random() * c.length)) }
			return s;
		}
		String.match = function(t, o){ var tmp, u;
			if('string' !== typeof t){ return false }
			if('string' == typeof o){ o = {'=': o} }
			o = o || {};
			tmp = (o['='] || o['*'] || o['>'] || o['<']);
			if(t === tmp){ return true }
			if(u !== o['=']){ return false }
			tmp = (o['*'] || o['>']);
			if(t.slice(0, (tmp||'').length) === tmp){ return true }
			if(u !== o['*']){ return false }
			if(u !== o['>'] && u !== o['<']){
				return (t >= o['>'] && t <= o['<'])? true : false;
			}
			if(u !== o['>'] && t >= o['>']){ return true }
			if(u !== o['<'] && t <= o['<']){ return true }
			return false;
		}
		String.hash = function(s, c){ // via SO
			if(typeof s !== 'string'){ return }
	    c = c || 0; // CPU schedule hashing by
	    if(!s.length){ return c }
	    for(var i=0,l=s.length,n; i<l; ++i){
	      n = s.charCodeAt(i);
	      c = ((c<<5)-c)+n;
	      c |= 0;
	    }
	    return c;
	  }
		var has = Object.prototype.hasOwnProperty;
		Object.plain = function(o){ return o? (o instanceof Object && o.constructor === Object) || Object.prototype.toString.call(o).match(/^\[object (\w+)\]$/)[1] === 'Object' : false }
		Object.empty = function(o, n){
			for(var k in o){ if(has.call(o, k) && (!n || -1==n.indexOf(k))){ return false } }
			return true;
		}
		Object.keys = Object.keys || function(o){
			var l = [];
			for(var k in o){ if(has.call(o, k)){ l.push(k) } }
			return l;
		}
		;(function(){ // max ~1ms or before stack overflow 
			var u, sT = setTimeout, l = 0, c = 0, sI = (typeof setImmediate !== ''+u && setImmediate) || sT; // queueMicrotask faster but blocks UI
			sT.poll = sT.poll || function(f){ //f(); return; // for testing
				if((1 >= (+new Date - l)) && c++ < 3333){ f(); return }
				sI(function(){ l = +new Date; f() },c=0)
			}
		}());
		;(function(){ // Too many polls block, this "threads" them in turns over a single thread in time.
			var sT = setTimeout, t = sT.turn = sT.turn || function(f){ 1 == s.push(f) && p(T) }
			, s = t.s = [], p = sT.poll, i = 0, f, T = function(){
				if(f = s[i++]){ f() }
				if(i == s.length || 99 == i){
					s = t.s = s.slice(i);
					i = 0;
				}
				if(s.length){ p(T) }
			}
		}());
		;(function(){
			var u, sT = setTimeout, T = sT.turn;
			(sT.each = sT.each || function(l,f,e,S){ S = S || 9; (function t(s,L,r){
			  if(L = (s = (l||[]).splice(0,S)).length){
			  	for(var i = 0; i < L; i++){
			  		if(u !== (r = f(s[i]))){ break }
			  	}
			  	if(u === r){ T(t); return }
			  } e && e(r);
			}())})();
		}());
	})(USE, './shim');

	;USE(function(module){
		// On event emitter generic javascript utility.
		module.exports = function onto(tag, arg, as){
			if(!tag){ return {to: onto} }
			var u, f = 'function' == typeof arg, tag = (this.tag || (this.tag = {}))[tag] || f && (
				this.tag[tag] = {tag: tag, to: onto._ = { next: function(arg){ var tmp;
					if(tmp = this.to){ tmp.next(arg) }
			}}});
			if(f){
				var be = {
					off: onto.off ||
					(onto.off = function(){
						if(this.next === onto._.next){ return !0 }
						if(this === this.the.last){
							this.the.last = this.back;
						}
						this.to.back = this.back;
						this.next = onto._.next;
						this.back.to = this.to;
						if(this.the.last === this.the){
							delete this.on.tag[this.the.tag];
						}
					}),
					to: onto._,
					next: arg,
					the: tag,
					on: this,
					as: as,
				};
				(be.back = tag.last || tag).to = be;
				return tag.last = be;
			}
			if((tag = tag.to) && u !== arg){ tag.next(arg) }
			return tag;
		};
	})(USE, './onto');

	;USE(function(module){
		USE('./shim');
		module.exports = function(v){ // Valid values are a subset of JSON: null, binary, number (!Infinity), text, or a soul relation. Arrays need special algorithms to handle concurrency, so they are not supported directly. Use an extension that supports them if needed but research their problems first.
			if(v === undefined){ return false }
			if(v === null){ return true } // "deletes", nulling out keys.
			if(v === Infinity){ return false } // we want this to be, but JSON does not support it, sad face.
			if(v !== v){ return false } // can you guess what this checks for? ;)
			if('string' == typeof v // text!
			|| 'boolean' == typeof v
			|| 'number' == typeof v){
				return true; // simple values are valid.
			}
			if(v && ('string' == typeof (v['#']||0)) && Object.empty(v, ['#'])){ return v['#'] } // is link
			return false; // If not, everything else remaining is an invalid data type. Custom extensions can be built on top of these primitives to support other types.
		}
	})(USE, './valid');

	;USE(function(module){
		USE('./shim');
		function State(){
			var t = +new Date;
			if(last < t){
				return N = 0, last = t + State.drift;
			}
			return last = t + ((N += 1) / D) + State.drift;
		}
		State.drift = 0;
		var NI = -Infinity, N = 0, D = 999, last = NI, u; // WARNING! In the future, on machines that are D times faster than 2016AD machines, you will want to increase D by another several orders of magnitude so the processing speed never out paces the decimal resolution (increasing an integer effects the state accuracy).
		State.is = function(n, k, o){ // convenience function to get the state on a key on a node and return it.
			var tmp = (k && n && n._ && n._['>']) || o;
			if(!tmp){ return }
			return ('number' == typeof (tmp = tmp[k]))? tmp : NI;
		}
		State.ify = function(n, k, s, v, soul){ // put a key's state on a node.
			(n = n || {})._ = n._ || {}; // safety check or init.
			if(soul){ n._['#'] = soul } // set a soul if specified.
			var tmp = n._['>'] || (n._['>'] = {}); // grab the states data.
			if(u !== k && k !== '_'){
				if('number' == typeof s){ tmp[k] = s } // add the valid state.
				if(u !== v){ n[k] = v } // Note: Not its job to check for valid values!
			}
			return n;
		}
		module.exports = State;
	})(USE, './state');

	;USE(function(module){
		USE('./shim');
		function Dup(opt){
			var dup = {s:{}}, s = dup.s;
			opt = opt || {max: 999, age: 1000 * 9};//*/ 1000 * 9 * 3};
			dup.check = function(id){
				if(!s[id]){ return false }
				return dt(id);
			}
			var dt = dup.track = function(id){
				var it = s[id] || (s[id] = {});
				it.was = dup.now = +new Date;
				if(!dup.to){ dup.to = setTimeout(dup.drop, opt.age + 9) }
				return it;
			}
			dup.drop = function(age){
				dup.to = null;
				dup.now = +new Date;
				var l = Object.keys(s);
				console.STAT && console.STAT(dup.now, +new Date - dup.now, 'dup drop keys'); // prev ~20% CPU 7% RAM 300MB // now ~25% CPU 7% RAM 500MB
				setTimeout.each(l, function(id){ var it = s[id]; // TODO: .keys( is slow?
					if(it && (age || opt.age) > (dup.now - it.was)){ return }
					delete s[id];
				},0,99);
			}
			return dup;
		}
		module.exports = Dup;
	})(USE, './dup');

	;USE(function(module){
		// request / response module, for asking and acking messages.
		USE('./onto'); // depends upon onto!
		module.exports = function ask(cb, as){
			if(!this.on){ return }
			var lack = (this.opt||{}).lack || 9000;
			if(!('function' == typeof cb)){
				if(!cb){ return }
				var id = cb['#'] || cb, tmp = (this.tag||'')[id];
				if(!tmp){ return }
				if(as){
					tmp = this.on(id, as);
					clearTimeout(tmp.err);
					tmp.err = setTimeout(function(){ tmp.off() }, lack);
				}
				return true;
			}
			var id = (as && as['#']) || random(9);
			if(!cb){ return id }
			var to = this.on(id, cb, as);
			to.err = to.err || setTimeout(function(){ to.off();
				to.next({err: "Error: No ACK yet.", lack: true});
			}, lack);
			return id;
		}
		var random = String.random || function(){ return Math.random().toString(36).slice(2) }
	})(USE, './ask');

	;USE(function(module){

		function Gun(o){
			if(o instanceof Gun){ return (this._ = {$: this}).$ }
			if(!(this instanceof Gun)){ return new Gun(o) }
			return Gun.create(this._ = {$: this, opt: o});
		}

		Gun.is = function($){ return ($ instanceof Gun) || ($ && $._ && ($ === $._.$)) || false }

		Gun.version = 0.2020;

		Gun.chain = Gun.prototype;
		Gun.chain.toJSON = function(){};

		USE('./shim');
		Gun.valid = USE('./valid');
		Gun.state = USE('./state');
		Gun.on = USE('./onto');
		Gun.dup = USE('./dup');
		Gun.ask = USE('./ask');

		;(function(){
			Gun.create = function(at){
				at.root = at.root || at;
				at.graph = at.graph || {};
				at.on = at.on || Gun.on;
				at.ask = at.ask || Gun.ask;
				at.dup = at.dup || Gun.dup();
				var gun = at.$.opt(at.opt);
				if(!at.once){
					at.on('in', universe, at);
					at.on('out', universe, at);
					at.on('put', map, at);
					Gun.on('create', at);
					at.on('create', at);
				}
				at.once = 1;
				return gun;
			}
			function universe(msg){
				//if(!F){ var eve = this; setTimeout(function(){ universe.call(eve, msg,1) },Math.random() * 100);return; } // ADD F TO PARAMS!
				if(!msg){ return }
				if(msg.out === universe){ this.to.next(msg); return }
				var eve = this, as = eve.as, at = as.at || as, gun = at.$, dup = at.dup, tmp, DBG = msg.DBG;
				(tmp = msg['#']) || (tmp = msg['#'] = text_rand(9));
				if(dup.check(tmp)){ return } dup.track(tmp);
				tmp = msg._; msg._ = ('function' == typeof tmp)? tmp : function(){};
				(msg.$ && (msg.$ === (msg.$._||'').$)) || (msg.$ = gun);
				if(msg['@'] && !msg.put){ ack(msg) }
				if(!at.ask(msg['@'], msg)){ // is this machine listening for an ack?
					DBG && (DBG.u = +new Date);
					if(msg.put){ put(msg); return } else
					if(msg.get){ Gun.on.get(msg, gun) }
				}
				DBG && (DBG.uc = +new Date);
				eve.to.next(msg);
				DBG && (DBG.ua = +new Date);
				if(msg.nts || msg.NTS){ return } // TODO: This shouldn't be in core, but fast way to prevent NTS spread. Delete this line after all peers have upgraded to newer versions.
				msg.out = universe; at.on('out', msg);
				DBG && (DBG.ue = +new Date);
			}
			function put(msg){
				if(!msg){ return }
				var ctx = msg._||'', root = ctx.root = ((ctx.$ = msg.$||'')._||'').root;
				if(msg['@'] && ctx.faith && !ctx.miss){ // TODO: AXE may split/route based on 'put' what should we do here? Detect @ in AXE? I think we don't have to worry, as DAM will route it on @.
					msg.out = universe;
					root.on('out', msg);
					return;
				}
				ctx.latch = root.hatch; ctx.match = root.hatch = [];
				var put = msg.put;
				var DBG = ctx.DBG = msg.DBG, S = +new Date;
				if(put['#'] && put['.']){ /*root && root.on('put', msg);*/ return } // TODO: BUG! This needs to call HAM instead.
				DBG && (DBG.p = S);
				ctx['#'] = msg['#'];
				ctx.msg = msg;
				ctx.all = 0;
				ctx.stun = 1;
				var nl = Object.keys(put);//.sort(); // TODO: This is unbounded operation, large graphs will be slower. Write our own CPU scheduled sort? Or somehow do it in below? Keys itself is not O(1) either, create ES5 shim over ?weak map? or custom which is constant.
				console.STAT && console.STAT(S, ((DBG||ctx).pk = +new Date) - S, 'put sort');
				var ni = 0, nj, kl, soul, node, states, err, tmp;
				(function pop(o){
					if(nj != ni){ nj = ni;
						if(!(soul = nl[ni])){
							console.STAT && console.STAT(S, ((DBG||ctx).pd = +new Date) - S, 'put');
							fire(ctx);
							return;
						}
						if(!(node = put[soul])){ err = ERR+cut(soul)+"no node." } else
						if(!(tmp = node._)){ err = ERR+cut(soul)+"no meta." } else
						if(soul !== tmp['#']){ err = ERR+cut(soul)+"soul not same." } else
						if(!(states = tmp['>'])){ err = ERR+cut(soul)+"no state." }
						kl = Object.keys(node||{}); // TODO: .keys( is slow
					}
					if(err){
						msg.err = ctx.err = err; // invalid data should error and stun the message.
						fire(ctx);
						//console.log("handle error!", err) // handle!
						return;
					}
					var i = 0, key; o = o || 0;
					while(o++ < 9 && (key = kl[i++])){
						if('_' === key){ continue }
						var val = node[key], state = states[key];
						if(u === state){ err = ERR+cut(key)+"on"+cut(soul)+"no state."; break }
						if(!valid(val)){ err = ERR+cut(key)+"on"+cut(soul)+"bad "+(typeof val)+cut(val); break }
						//ctx.all++; //ctx.ack[soul+key] = '';
						ham(val, key, soul, state, msg);
					}
					if((kl = kl.slice(i)).length){ turn(pop); return }
					++ni; kl = null; pop(o);
				}());
			} Gun.on.put = put;
			console.log("BEWARE: BETA VERSION OF NEW GUN! NOT ALL FEATURES FINISHED!"); // clock below, reconnect sync, SEA certify wire merge, User.auth taking multiple times, // msg put, put, say ack, hear loop...
			function ham(val, key, soul, state, msg){
				var ctx = msg._||'', root = ctx.root, graph = root.graph, lot, tmp;
				var vertex = graph[soul] || empty, was = state_is(vertex, key, 1), known = vertex[key];
				
				var DBG = ctx.DBG; if(tmp = console.STAT){ if(!graph[soul] || !known){ tmp.has = (tmp.has || 0) + 1 } }

				var now = State(), u;
				if(state > now){
					setTimeout(function(){ ham(val, key, soul, state, msg) }, (tmp = state - now) > MD? MD : tmp); // Max Defer 32bit. :(
					console.STAT && console.STAT(((DBG||ctx).Hf = +new Date), tmp, 'future');
					return;
				}
				if(state < was){ /*old;*/ if(!ctx.miss){ return } } // but some chains have a cache miss that need to re-fire. // TODO: Improve in future. // for AXE this would reduce rebroadcast, but GUN does it on message forwarding.
				if(!ctx.faith){ // TODO: BUG? Can this be used for cache miss as well? // Yes this was a bug, need to check cache miss for RAD tests, but should we care about the faith check now? Probably not.
					if(state === was && (val === known || L(val) <= L(known))){ /*console.log("same");*/ /*same;*/ if(!ctx.miss){ return } } // same
				}
				ctx.stun++; // TODO: 'forget' feature in SEA tied to this, bad approach, but hacked in for now. Any changes here must update there.
				var aid = msg['#']+ctx.all++, id = {toString: function(){ return aid }, _: ctx}; id.toJSON = id.toString; // this *trick* makes it compatible between old & new versions.
				DBG && (DBG.ph = DBG.ph || +new Date);
				root.on('put', {'#': id, '@': msg['@'], put: {'#': soul, '.': key, ':': val, '>': state}, _: ctx});
			}
			function map(msg){
				var DBG; if(DBG = (msg._||'').DBG){ DBG.pa = +new Date; DBG.pm = DBG.pm || +new Date}
      	var eve = this, root = eve.as, graph = root.graph, ctx = msg._, put = msg.put, soul = put['#'], key = put['.'], val = put[':'], state = put['>'], id = msg['#'], tmp;
      	if((tmp = ctx.msg) && (tmp = tmp.put) && (tmp = tmp[soul])){ state_ify(tmp, key, state, val, soul) } // necessary! or else out messages do not get SEA transforms.
				graph[soul] = state_ify(graph[soul], key, state, val, soul);
				if(tmp = (root.next||'')[soul]){ tmp.on('in', msg) }
				fire(ctx);
				eve.to.next(msg);
			}
			function fire(ctx, msg){ var root;
				if(ctx.stop){ return }
				if(!ctx.err && 0 < --ctx.stun){ return } // TODO: 'forget' feature in SEA tied to this, bad approach, but hacked in for now. Any changes here must update there.
				ctx.stop = 1;
				if(!(root = ctx.root)){ return }
				var tmp = ctx.match; tmp.end = 1;
				if(tmp === root.hatch){ if(!(tmp = ctx.latch) || tmp.end){ delete root.hatch } else { root.hatch = tmp } }
				ctx.hatch && ctx.hatch(); // TODO: rename/rework how put & this interact.
				setTimeout.each(ctx.match, function(cb){cb && cb()}); 
				if(!(msg = ctx.msg) || ctx.err || msg.err){ return }
				msg.out = universe;
				ctx.root.on('out', msg);
			}
			function ack(msg){ // aggregate ACKs.
				var id = msg['@'] || '', ctx;
				if(!(ctx = id._)){ return }
				ctx.acks = (ctx.acks||0) + 1;
				if(ctx.err = msg.err){
					msg['@'] = ctx['#'];
					fire(ctx); // TODO: BUG? How it skips/stops propagation of msg if any 1 item is error, this would assume a whole batch/resync has same malicious intent.
				}
				if(!ctx.stop && !ctx.crack){ ctx.crack = ctx.match && ctx.match.push(function(){back(ctx)}) } // handle synchronous acks
				back(ctx);
			}
			function back(ctx){
				if(!ctx || !ctx.root){ return }
				if(ctx.stun || ctx.acks !== ctx.all){ return }
				ctx.root.on('in', {'@': ctx['#'], err: ctx.err, ok: ctx.err? u : {'':1}});
			}

			var ERR = "Error: Invalid graph!";
			var cut = function(s){ return " '"+(''+s).slice(0,9)+"...' " }
			var L = JSON.stringify, MD = 2147483647, State = Gun.state;

		}());

		;(function(){
			Gun.on.get = function(msg, gun){
				var root = gun._, get = msg.get, soul = get['#'], node = root.graph[soul], has = get['.'];
				var next = root.next || (root.next = {}), at = next[soul];
				// queue concurrent GETs?
				// TODO: consider tagging original message into dup for DAM.
				// TODO: ^ above? In chat app, 12 messages resulted in same peer asking for `#user.pub` 12 times. (same with #user GET too, yipes!) // DAM note: This also resulted in 12 replies from 1 peer which all had same ##hash but none of them deduped because each get was different.
				// TODO: Moving quick hacks fixing these things to axe for now.
				// TODO: a lot of GET #foo then GET #foo."" happening, why?
				// TODO: DAM's ## hash check, on same get ACK, producing multiple replies still, maybe JSON vs YSON?
				// TMP note for now: viMZq1slG was chat LEX query #.
				/*if(gun !== (tmp = msg.$) && (tmp = (tmp||'')._)){
					if(tmp.Q){ tmp.Q[msg['#']] = ''; return } // chain does not need to ask for it again.
					tmp.Q = {};
				}*/
				/*if(u === has){
					if(at.Q){
						//at.Q[msg['#']] = '';
						//return;
					}
					at.Q = {};
				}*/
				var ctx = msg._||{}, DBG = ctx.DBG = msg.DBG;
				DBG && (DBG.g = +new Date);
				//console.log("GET:", get, node, has);
				if(!node){ return root.on('get', msg) }
				if(has){
					if('string' != typeof has || u === node[has]){ return root.on('get', msg) }
					node = state_ify({}, has, state_is(node, has), node[has], soul);
					// If we have a key in-memory, do we really need to fetch?
					// Maybe... in case the in-memory key we have is a local write
					// we still need to trigger a pull/merge from peers.
				}
				//Gun.window? Gun.obj.copy(node) : node; // HNPERF: If !browser bump Performance? Is this too dangerous to reference root graph? Copy / shallow copy too expensive for big nodes. Gun.obj.to(node); // 1 layer deep copy // Gun.obj.copy(node); // too slow on big nodes
				node && ack(msg, node);
				root.on('get', msg); // send GET to storage adapters.
			}
			function ack(msg, node){
				var S = +new Date, ctx = msg._||{}, DBG = ctx.DBG = msg.DBG;
				var to = msg['#'], id = text_rand(9), keys = Object.keys(node||'').sort(), soul = ((node||'')._||'')['#'], kl = keys.length, j = 0, root = msg.$._.root, F = (node === root.graph[soul]);
				console.STAT && console.STAT(S, ((DBG||ctx).gk = +new Date) - S, 'got keys');
				// PERF: Consider commenting this out to force disk-only reads for perf testing? // TODO: .keys( is slow
				node && (function go(){
					S = +new Date;
					var i = 0, k, put = {}, tmp;
					while(i < 9 && (k = keys[i++])){
						state_ify(put, k, state_is(node, k), node[k], soul);
					}
					keys = keys.slice(i);
					(tmp = {})[soul] = put; put = tmp;
					var faith; if(F){ faith = function(){}; faith.ram = faith.faith = true; } // HNPERF: We're testing performance improvement by skipping going through security again, but this should be audited.
					tmp = keys.length;
					console.STAT && console.STAT(S, -(S - (S = +new Date)), 'got copied some');
					DBG && (DBG.ga = +new Date);
					root.on('in', {'@': to, '#': id, put: put, '%': (tmp? (id = text_rand(9)) : u), $: root.$, _: faith, DBG: DBG});
					console.STAT && console.STAT(S, +new Date - S, 'got in');
					if(!tmp){ return }
					setTimeout.turn(go);
				}());
				if(!node){ root.on('in', {'@': msg['#']}) } // TODO: I don't think I like this, the default lS adapter uses this but "not found" is a sensitive issue, so should probably be handled more carefully/individually.
			} Gun.on.get.ack = ack;
		}());

		;(function(){
			Gun.chain.opt = function(opt){
				opt = opt || {};
				var gun = this, at = gun._, tmp = opt.peers || opt;
				if(!Object.plain(opt)){ opt = {} }
				if(!Object.plain(at.opt)){ at.opt = opt }
				if('string' == typeof tmp){ tmp = [tmp] }
				if(tmp instanceof Array){
					if(!Object.plain(at.opt.peers)){ at.opt.peers = {}}
					tmp.forEach(function(url){
						var p = {}; p.id = p.url = url;
						at.opt.peers[url] = at.opt.peers[url] || p;
					})
				}
				at.opt.peers = at.opt.peers || {};
				obj_each(opt, function each(k){ var v = this[k];
					if((this && this.hasOwnProperty(k)) || 'string' == typeof v || Object.empty(v)){ this[k] = v; return }
					if(v && v.constructor !== Object && !(v instanceof Array)){ return }
					obj_each(v, each);
				});
				Gun.on('opt', at);
				at.opt.uuid = at.opt.uuid || function uuid(l){ return Gun.state().toString(36).replace('.','') + String.random(l||12) }
				return gun;
			}
		}());

		var obj_each = function(o,f){ Object.keys(o).forEach(f,o) }, text_rand = String.random, turn = setTimeout.turn, valid = Gun.valid, state_is = Gun.state.is, state_ify = Gun.state.ify, u, empty = {}, C;

		Gun.log = function(){ return (!Gun.log.off && C.log.apply(C, arguments)), [].slice.call(arguments).join(' ') };
		Gun.log.once = function(w,s,o){ return (o = Gun.log.once)[w] = o[w] || 0, o[w]++ || Gun.log(s) };

		if(typeof window !== "undefined"){ (window.GUN = window.Gun = Gun).window = window }
		try{ if(typeof MODULE !== "undefined"){ MODULE.exports = Gun } }catch(e){}
		module.exports = Gun;
		
		(Gun.window||{}).console = (Gun.window||{}).console || {log: function(){}};
		(C = console).only = function(i, s){ return (C.only.i && i === C.only.i && C.only.i++) && (C.log.apply(C, arguments) || s) };

		;"Please do not remove welcome log unless you are paying for a monthly sponsorship, thanks!";
		Gun.log.once("welcome", "Hello wonderful person! :) Thanks for using GUN, please ask for help on http://chat.gun.eco if anything takes you longer than 5min to figure out!");
	})(USE, './root');

	;USE(function(module){
		var Gun = USE('./root');
		Gun.chain.back = function(n, opt){ var tmp;
			n = n || 1;
			if(-1 === n || Infinity === n){
				return this._.root.$;
			} else
			if(1 === n){
				return (this._.back || this._).$;
			}
			var gun = this, at = gun._;
			if(typeof n === 'string'){
				n = n.split('.');
			}
			if(n instanceof Array){
				var i = 0, l = n.length, tmp = at;
				for(i; i < l; i++){
					tmp = (tmp||empty)[n[i]];
				}
				if(u !== tmp){
					return opt? gun : tmp;
				} else
				if((tmp = at.back)){
					return tmp.$.back(n, opt);
				}
				return;
			}
			if('function' == typeof n){
				var yes, tmp = {back: at};
				while((tmp = tmp.back)
				&& u === (yes = n(tmp, opt))){}
				return yes;
			}
			if('number' == typeof n){
				return (at.back || at).$.back(n - 1);
			}
			return this;
		}
		var empty = {}, u;
	})(USE, './back');

	;USE(function(module){
		// WARNING: GUN is very simple, but the JavaScript chaining API around GUN
		// is complicated and was extremely hard to build. If you port GUN to another
		// language, consider implementing an easier API to build.
		var Gun = USE('./root');
		Gun.chain.chain = function(sub){
			var gun = this, at = gun._, chain = new (sub || gun).constructor(gun), cat = chain._, root;
			cat.root = root = at.root;
			cat.id = ++root.once;
			cat.back = gun._;
			cat.on = Gun.on;
			cat.on('in', Gun.on.in, cat); // For 'in' if I add my own listeners to each then I MUST do it before in gets called. If I listen globally for all incoming data instead though, regardless of individual listeners, I can transform the data there and then as well.
			cat.on('out', Gun.on.out, cat); // However for output, there isn't really the global option. I must listen by adding my own listener individually BEFORE this one is ever called.
			return chain;
		}

		function output(msg){
			var put, get, at = this.as, back = at.back, root = at.root, tmp;
			if(!msg.$){ msg.$ = at.$ }
			this.to.next(msg);
			if(at.err){ at.on('in', {put: at.put = u, $: at.$}); return }
			if(get = msg.get){
				/*if(u !== at.put){
					at.on('in', at);
					return;
				}*/
				if(root.pass){ root.pass[at.id] = at; } // will this make for buggy behavior elsewhere?
				if(at.lex){ Object.keys(at.lex).forEach(function(k){ tmp[k] = at.lex[k] }, tmp = msg.get = msg.get || {}) }
				if(get['#'] || at.soul){
					get['#'] = get['#'] || at.soul;
					msg['#'] || (msg['#'] = text_rand(9)); // A3120 ?
					back = (root.$.get(get['#'])._);
					if(!(get = get['.'])){ // soul
						tmp = back.ask && back.ask['']; // check if we have already asked for the full node
						(back.ask || (back.ask = {}))[''] = back; // add a flag that we are now.
						if(u !== back.put){ // if we already have data,
							back.on('in', back); // send what is cached down the chain
							if(tmp){ return } // and don't ask for it again.
						}
						msg.$ = back.$;
					} else
					if(obj_has(back.put, get)){ // TODO: support #LEX !
						tmp = back.ask && back.ask[get];
						(back.ask || (back.ask = {}))[get] = back.$.get(get)._;
						back.on('in', {get: get, put: {'#': back.soul, '.': get, ':': back.put[get], '>': state_is(root.graph[back.soul], get)}});
						if(tmp){ return }
					}
						/*put = (back.$.get(get)._);
						if(!(tmp = put.ack)){ put.ack = -1 }
						back.on('in', {
							$: back.$,
							put: Gun.state.ify({}, get, Gun.state(back.put, get), back.put[get]),
							get: back.get
						});
						if(tmp){ return }
					} else
					if('string' != typeof get){
						var put = {}, meta = (back.put||{})._;
						Gun.obj.map(back.put, function(v,k){
							if(!Gun.text.match(k, get)){ return }
							put[k] = v;
						})
						if(!Gun.obj.empty(put)){
							put._ = meta;
							back.on('in', {$: back.$, put: put, get: back.get})
						}
						if(tmp = at.lex){
							tmp = (tmp._) || (tmp._ = function(){});
							if(back.ack < tmp.ask){ tmp.ask = back.ack }
							if(tmp.ask){ return }
							tmp.ask = 1;
						}
					}
					*/
					root.ask(ack, msg); // A3120 ?
					return root.on('in', msg);
				}
				//if(root.now){ root.now[at.id] = root.now[at.id] || true; at.pass = {} }
				if(get['.']){
					if(at.get){
						msg = {get: {'.': at.get}, $: at.$};
						(back.ask || (back.ask = {}))[at.get] = msg.$._; // TODO: PERFORMANCE? More elegant way?
						return back.on('out', msg);
					}
					msg = {get: at.lex? msg.get : {}, $: at.$};
					return back.on('out', msg);
				}
				(at.ask || (at.ask = {}))[''] = at;	 //at.ack = at.ack || -1;
				if(at.get){
					get['.'] = at.get;
					(back.ask || (back.ask = {}))[at.get] = msg.$._; // TODO: PERFORMANCE? More elegant way?
					return back.on('out', msg);
				}
			}
			return back.on('out', msg);
		}; Gun.on.out = output;

		function input(msg, cat){ cat = cat || this.as; // TODO: V8 may not be able to optimize functions with different parameter calls, so try to do benchmark to see if there is any actual difference.
			var root = cat.root, gun = msg.$ || (msg.$ = cat.$), at = (gun||'')._ || empty, tmp = msg.put||'', soul = tmp['#'], key = tmp['.'], change = (u !== tmp['='])? tmp['='] : tmp[':'], state = tmp['>'] || -Infinity, sat; // eve = event, at = data at, cat = chain at, sat = sub at (children chains).
			if(u !== msg.put && (u === tmp['#'] || u === tmp['.'] || (u === tmp[':'] && u === tmp['=']) || u === tmp['>'])){ // convert from old format
				if(!valid(tmp)){
					if(!(soul = ((tmp||'')._||'')['#'])){ console.log("chain not yet supported for", tmp, '...', msg, cat); return; }
					gun = cat.root.$.get(soul);
					return setTimeout.each(Object.keys(tmp).sort(), function(k){ // TODO: .keys( is slow // BUG? ?Some re-in logic may depend on this being sync?
						if('_' == k || u === (state = state_is(tmp, k))){ return }
						cat.on('in', {$: gun, put: {'#': soul, '.': k, '=': tmp[k], '>': state}, VIA: msg});
					});
				}
				cat.on('in', {$: at.back.$, put: {'#': soul = at.back.soul, '.': key = at.has || at.get, '=': tmp, '>': state_is(at.back.put, key)}, via: msg}); // TODO: This could be buggy! It assumes/approxes data, other stuff could have corrupted it.
				return;
			}
			if((msg.seen||'')[cat.id]){ return } (msg.seen || (msg.seen = function(){}))[cat.id] = cat; // help stop some infinite loops

			if(cat !== at){ // don't worry about this when first understanding the code, it handles changing contexts on a message. A soul chain will never have a different context.
				Object.keys(msg).forEach(function(k){ tmp[k] = msg[k] }, tmp = {}); // make copy of message
				tmp.get = cat.get || tmp.get;
				if(!cat.soul && !cat.has){ // if we do not recognize the chain type
					tmp.$$$ = tmp.$$$ || cat.$; // make a reference to wherever it came from.
				} else
				if(at.soul){ // a has (property) chain will have a different context sometimes if it is linked (to a soul chain). Anything that is not a soul or has chain, will always have different contexts.
					tmp.$ = cat.$;
					tmp.$$ = tmp.$$ || at.$;
				}
				msg = tmp; // use the message with the new context instead;
			}
			unlink(msg, cat);

			if(((cat.soul/* && (cat.ask||'')['']*/) || msg.$$) && state >= state_is(root.graph[soul], key)){ // The root has an in-memory cache of the graph, but if our peer has asked for the data then we want a per deduplicated chain copy of the data that might have local edits on it.
				(tmp = root.$.get(soul)._).put = state_ify(tmp.put, key, state, change, soul);
			}
			if(!at.soul /*&& (at.ask||'')['']*/ && state >= state_is(root.graph[soul], key) && (sat = (root.$.get(soul)._.next||'')[key])){ // Same as above here, but for other types of chains. // TODO: Improve perf by preventing echoes recaching.
				sat.put = change; // update cache
				if('string' == typeof (tmp = valid(change))){
					sat.put = root.$.get(tmp)._.put || change; // share same cache as what we're linked to.
				}
			}

			this.to && this.to.next(msg); // 1st API job is to call all chain listeners.
			// TODO: Make input more reusable by only doing these (some?) calls if we are a chain we recognize? This means each input listener would be responsible for when listeners need to be called, which makes sense, as they might want to filter.
			cat.any && setTimeout.each(Object.keys(cat.any), function(any){ (any = cat.any[any]) && any(msg) },0,99); // 1st API job is to call all chain listeners. // TODO: .keys( is slow // BUG: Some re-in logic may depend on this being sync.
			cat.echo && setTimeout.each(Object.keys(cat.echo), function(lat){ (lat = cat.echo[lat]) && lat.on('in', msg) },0,99); // & linked at chains // TODO: .keys( is slow // BUG: Some re-in logic may depend on this being sync.

			if(((msg.$$||'')._||at).soul){ // comments are linear, but this line of code is non-linear, so if I were to comment what it does, you'd have to read 42 other comments first... but you can't read any of those comments until you first read this comment. What!? // shouldn't this match link's check?
				// is there cases where it is a $$ that we do NOT want to do the following? 
				if((sat = cat.next) && (sat = sat[key])){ // TODO: possible trick? Maybe have `ionmap` code set a sat? // TODO: Maybe we should do `cat.ask` instead? I guess does not matter.
					tmp = {}; Object.keys(msg).forEach(function(k){ tmp[k] = msg[k] });
					tmp.$ = (msg.$$||msg.$).get(tmp.get = key); delete tmp.$$; delete tmp.$$$;
					sat.on('in', tmp);
				}
			}

			link(msg, cat);
		}; Gun.on.in = input;

		function link(msg, cat){ cat = cat || this.as || msg.$._;
			if(msg.$$ && this !== Gun.on){ return } // $$ means we came from a link, so we are at the wrong level, thus ignore it unless overruled manually by being called directly.
			if(!msg.put || cat.soul){ return } // But you cannot overrule being linked to nothing, or trying to link a soul chain - that must never happen.
			var put = msg.put||'', link = put['=']||put[':'], tmp;
			var root = cat.root, tat = root.$.get(put['#']).get(put['.'])._;
			if('string' != typeof (link = valid(link))){
				if(this === Gun.on){ (tat.echo || (tat.echo = {}))[cat.id] = cat } // allow some chain to explicitly force linking to simple data.
				return; // by default do not link to data that is not a link.
			}
			if((tat.echo || (tat.echo = {}))[cat.id] // we've already linked ourselves so we do not need to do it again. Except... (annoying implementation details)
				&& !(root.pass||'')[cat.id]){ return } // if a new event listener was added, we need to make a pass through for it. The pass will be on the chain, not always the chain passed down. 
			if(tmp = root.pass){ if(tmp[link+cat.id]){ return } tmp[link+cat.id] = 1 } // But the above edge case may "pass through" on a circular graph causing infinite passes, so we hackily add a temporary check for that.

			(tat.echo||(tat.echo={}))[cat.id] = cat; // set ourself up for the echo! // TODO: BUG? Echo to self no longer causes problems? Confirm.

			if(cat.has){ cat.link = link }
			var sat = root.$.get(tat.link = link)._; // grab what we're linking to.
			(sat.echo || (sat.echo = {}))[tat.id] = tat; // link it.
			var tmp = cat.ask||''; // ask the chain for what needs to be loaded next!
			if(tmp[''] || cat.lex){ // we might need to load the whole thing // TODO: cat.lex probably has edge case bugs to it, need more test coverage.
				sat.on('out', {get: {'#': link}});
			}
			setTimeout.each(Object.keys(tmp), function(get, sat){ // if sub chains are asking for data. // TODO: .keys( is slow // BUG? ?Some re-in logic may depend on this being sync?
				if(!get || !(sat = tmp[get])){ return }
				sat.on('out', {get: {'#': link, '.': get}}); // go get it.
			},0,99);
		}; Gun.on.link = link;

		function unlink(msg, cat){ // ugh, so much code for seemingly edge case behavior.
			var put = msg.put||'', change = (u !== put['='])? put['='] : put[':'], root = cat.root, link, tmp;
			if(u === change){ // 1st edge case: If we have a brand new database, no data will be found.
				// TODO: BUG! because emptying cache could be async from below, make sure we are not emptying a newer cache. So maybe pass an Async ID to check against?
				// TODO: BUG! What if this is a map? // Warning! Clearing things out needs to be robust against sync/async ops, or else you'll see `map val get put` test catastrophically fail because map attempts to link when parent graph is streamed before child value gets set. Need to differentiate between lack acks and force clearing.
				if(cat.soul && u !== cat.put){ return } // data may not be found on a soul, but if a soul already has data, then nothing can clear the soul as a whole.
				//if(!cat.has){ return }
				tmp = (msg.$$||msg.$||'')._||'';
				if(msg['@'] && (u !== tmp.put || u !== cat.put)){ return } // a "not found" from other peers should not clear out data if we have already found it.
				//if(cat.has && u === cat.put && !(root.pass||'')[cat.id]){ return } // if we are already unlinked, do not call again, unless edge case. // TODO: BUG! This line should be deleted for "unlink deeply nested".
				if(link = cat.link || msg.linked){
					delete (root.$.get(link)._.echo||'')[cat.id];
				}
				if(cat.has){ // TODO: Empty out links, maps, echos, acks/asks, etc.?
					cat.link = null;
				}
				cat.put = u; // empty out the cache if, for example, alice's car's color no longer exists (relative to alice) if alice no longer has a car.
				// TODO: BUG! For maps, proxy this so the individual sub is triggered, not all subs.
				setTimeout.each(Object.keys(cat.next||''), function(get, sat){ // empty out all sub chains. // TODO: .keys( is slow // BUG? ?Some re-in logic may depend on this being sync? // TODO: BUG? This will trigger deeper put first, does put logic depend on nested order? // TODO: BUG! For map, this needs to be the isolated child, not all of them.
					if(!(sat = cat.next[get])){ return }
					//if(cat.has && u === sat.put && !(root.pass||'')[sat.id]){ return } // if we are already unlinked, do not call again, unless edge case. // TODO: BUG! This line should be deleted for "unlink deeply nested".
					if(link){ delete (root.$.get(link).get(get)._.echo||'')[sat.id] }
					sat.on('in', {get: get, put: u, $: sat.$}); // TODO: BUG? Add recursive seen check?
				},0,99);
				return;
			}
			if(cat.soul){ return } // a soul cannot unlink itself.
			if(msg.$$){ return } // a linked chain does not do the unlinking, the sub chain does. // TODO: BUG? Will this cancel maps?
			link = valid(change); // need to unlink anytime we are not the same link, though only do this once per unlink (and not on init).
			tmp = msg.$._||'';
			if(link === tmp.link || (cat.has && !tmp.link)){
				if((root.pass||'')[cat.id] && 'string' !== typeof link){

				} else {
					return;
				}
			}
			delete (tmp.echo||'')[cat.id];
			unlink({get: cat.get, put: u, $: msg.$, linked: msg.linked = msg.linked || tmp.link}, cat); // unlink our sub chains.
		}; Gun.on.unlink = unlink;

		function ack(msg, ev){
			//if(!msg['%'] && (this||'').off){ this.off() } // do NOT memory leak, turn off listeners! Now handled by .ask itself
			// manhattan:
			var as = this.as, at = as.$._, root = at.root, get = as.get||'', tmp = (msg.put||'')[get['#']]||'';
			if(!msg.put || ('string' == typeof get['.'] && u === tmp[get['.']])){
				if(u !== at.put){ return }
				if(!at.soul && !at.has){ return } // TODO: BUG? For now, only core-chains will handle not-founds, because bugs creep in if non-core chains are used as $ but we can revisit this later for more powerful extensions.
				at.ack = (at.ack || 0) + 1;
				at.on('in', {
					get: at.get,
					put: at.put = u,
					$: at.$,
					'@': msg['@']
				});
				/*(tmp = at.Q) && setTimeout.each(Object.keys(tmp), function(id){ // TODO: Temporary testing, not integrated or being used, probably delete.
					Object.keys(msg).forEach(function(k){ tmp[k] = msg[k] }, tmp = {}); tmp['@'] = id; // copy message
					root.on('in', tmp);
				}); delete at.Q;*/
				return;
			}
			(msg._||{}).miss = 1;
			Gun.on.put(msg);
			return; // eom
		}

		var empty = {}, u, text_rand = String.random, valid = Gun.valid, obj_has = function(o, k){ return o && Object.prototype.hasOwnProperty.call(o, k) }, state = Gun.state, state_is = state.is, state_ify = state.ify;
	})(USE, './chain');

	;USE(function(module){
		var Gun = USE('./root');
		Gun.chain.get = function(key, cb, as){
			var gun, tmp;
			if(typeof key === 'string'){
				if(key.length == 0) {	
					(gun = this.chain())._.err = {err: Gun.log('0 length key!', key)};
					if(cb){ cb.call(gun, gun._.err) }
					return gun;
				}
				var back = this, cat = back._;
				var next = cat.next || empty;
				if(!(gun = next[key])){
					gun = key && cache(key, back);
				}
				gun = gun && gun.$;
			} else
			if('function' == typeof key){
				if(true === cb){ return soul(this, key, cb, as), this }
				gun = this;
				var cat = gun._, opt = cb || {}, root = cat.root, id;
				opt.at = cat;
				opt.ok = key;
				var wait = {}; // can we assign this to the at instead, like in once?
				//var path = []; cat.$.back(at => { at.get && path.push(at.get.slice(0,9))}); path = path.reverse().join('.');
				function any(msg, eve, f){
					if(any.stun){ return }
					if((tmp = root.pass) && !tmp[id]){ return }
					var at = msg.$._, sat = (msg.$$||'')._, data = (sat||at).put, odd = (!at.has && !at.soul), test = {}, link, tmp;
					if(odd || u === data){ // handles non-core
						data = (u === ((tmp = msg.put)||'')['='])? (u === (tmp||'')[':'])? tmp : tmp[':'] : tmp['='];
					}
					if(link = ('string' == typeof (tmp = Gun.valid(data)))){
						data = (u === (tmp = root.$.get(tmp)._.put))? opt.not? u : data : tmp;
					}
					if(opt.not && u === data){ return }
					if(u === opt.stun){
						if((tmp = root.stun) && tmp.on){
							cat.$.back(function(a){ // our chain stunned?
								tmp.on(''+a.id, test = {});
								if((test.run || 0) < any.id){ return test } // if there is an earlier stun on gapless parents/self.
							});
							!test.run && tmp.on(''+at.id, test = {}); // this node stunned?
							!test.run && sat && tmp.on(''+sat.id, test = {}); // linked node stunned?
							if(any.id > test.run){
								if(!test.stun || test.stun.end){
									test.stun = tmp.on('stun');
									test.stun = test.stun && test.stun.last;
								}
								if(test.stun && !test.stun.end){
									//if(odd && u === data){ return }
									//if(u === msg.put){ return } // "not found" acks will be found if there is stun, so ignore these.
									(test.stun.add || (test.stun.add = {}))[id] = function(){ any(msg,eve,1) } // add ourself to the stun callback list that is called at end of the write.
									return;
								}
							}
						}
						if(/*odd &&*/ u === data){ f = 0 } // if data not found, keep waiting/trying.
						/*if(f && u === data){
							cat.on('out', opt.out);
							return;
						}*/
						if((tmp = root.hatch) && !tmp.end && u === opt.hatch && !f){ // quick hack! // What's going on here? Because data is streamed, we get things one by one, but a lot of developers would rather get a callback after each batch instead, so this does that by creating a wait list per chain id that is then called at the end of the batch by the hatch code in the root put listener.
							if(wait[at.$._.id]){ return } wait[at.$._.id] = 1;
							tmp.push(function(){any(msg,eve,1)});
							return;
						}; wait = {}; // end quick hack.
					}
					// call:
					if(root.pass){ if(root.pass[id+at.id]){ return } root.pass[id+at.id] = 1 }
					if(opt.on){ opt.ok.call(at.$, data, at.get, msg, eve || any); return } // TODO: Also consider breaking `this` since a lot of people do `=>` these days and `.call(` has slower performance.
					if(opt.v2020){ opt.ok(msg, eve || any); return }
					Object.keys(msg).forEach(function(k){ tmp[k] = msg[k] }, tmp = {}); msg = tmp; msg.put = data; // 2019 COMPATIBILITY! TODO: GET RID OF THIS!
					opt.ok.call(opt.as, msg, eve || any); // is this the right
				};
				any.at = cat;
				//(cat.any||(cat.any=function(msg){ setTimeout.each(Object.keys(cat.any||''), function(act){ (act = cat.any[act]) && act(msg) },0,99) }))[id = String.random(7)] = any; // maybe switch to this in future?
				(cat.any||(cat.any={}))[id = String.random(7)] = any;
				any.off = function(){ any.stun = 1; if(!cat.any){ return } delete cat.any[id] }
				any.rid = rid; // logic from old version, can we clean it up now?
				any.id = opt.run || ++root.once; // used in callback to check if we are earlier than a write. // will this ever cause an integer overflow?
				tmp = root.pass; (root.pass = {})[id] = 1; // Explanation: test trade-offs want to prevent recursion so we add/remove pass flag as it gets fulfilled to not repeat, however map map needs many pass flags - how do we reconcile?
				opt.out = opt.out || {get: {}};
				cat.on('out', opt.out);
				root.pass = tmp;
				return gun;
			} else
			if('number' == typeof key){
				return this.get(''+key, cb, as);
			} else
			if('string' == typeof (tmp = valid(key))){
				return this.get(tmp, cb, as);
			} else
			if(tmp = this.get.next){
				gun = tmp(this, key);
			}
			if(!gun){
				(gun = this.chain())._.err = {err: Gun.log('Invalid get request!', key)}; // CLEAN UP
				if(cb){ cb.call(gun, gun._.err) }
				return gun;
			}
			if(cb && 'function' == typeof cb){
				gun.get(cb, as);
			}
			return gun;
		}
		function cache(key, back){
			var cat = back._, next = cat.next, gun = back.chain(), at = gun._;
			if(!next){ next = cat.next = {} }
			next[at.get = key] = at;
			if(back === cat.root.$){
				at.soul = key;
			} else
			if(cat.soul || cat.has){
				at.has = key;
				//if(obj_has(cat.put, key)){
					//at.put = cat.put[key];
				//}
			}
			return at;
		}
		function soul(gun, cb, opt, as){
			var cat = gun._, acks = 0, tmp;
			if(tmp = cat.soul || cat.link){ return cb(tmp, as, cat) }
			if(cat.jam){ return cat.jam.push([cb, as]) }
			cat.jam = [[cb,as]];
			gun.get(function go(msg, eve){
				if(u === msg.put && !cat.root.opt.super && (tmp = Object.keys(cat.root.opt.peers).length) && ++acks <= tmp){ // TODO: super should not be in core code, bring AXE up into core instead to fix? // TODO: .keys( is slow
					return;
				}
				eve.rid(msg);
				var at = ((at = msg.$) && at._) || {}, i = 0, as;
				tmp = cat.jam; delete cat.jam; // tmp = cat.jam.splice(0, 100);
				//if(tmp.length){ process.nextTick(function(){ go(msg, eve) }) }
				while(as = tmp[i++]){ //Gun.obj.map(tmp, function(as, cb){
					var cb = as[0], id; as = as[1];
					cb && cb(id = at.link || at.soul || Gun.valid(msg.put) || ((msg.put||{})._||{})['#'], as, msg, eve);
				} //);
			}, {out: {get: {'.':true}}});
			return gun;
		}
		function rid(at){
			var cat = this.at || this.on;
			if(!at || cat.soul || cat.has){ return this.off() }
			if(!(at = (at = (at = at.$ || at)._ || at).id)){ return }
			var map = cat.map, tmp, seen;
			//if(!map || !(tmp = map[at]) || !(tmp = tmp.at)){ return }
			if(tmp = (seen = this.seen || (this.seen = {}))[at]){ return true }
			seen[at] = true;
			return;
			//tmp.echo[cat.id] = {}; // TODO: Warning: This unsubscribes ALL of this chain's listeners from this link, not just the one callback event.
			//obj.del(map, at); // TODO: Warning: This unsubscribes ALL of this chain's listeners from this link, not just the one callback event.
			return;
		}
		var empty = {}, valid = Gun.valid, u;
	})(USE, './get');

	;USE(function(module){
		var Gun = USE('./root');
		Gun.chain.put = function(data, cb, as){ // I rewrote it :)
			var gun = this, at = gun._, root = at.root;
			as = as || {};
			as.root = at.root;
			as.run || (as.run = root.once);
			stun(as, at.id); // set a flag for reads to check if this chain is writing.
			as.ack = as.ack || cb;
			as.via = as.via || gun;
			as.data = as.data || data;
			as.soul || (as.soul = at.soul || ('string' == typeof cb && cb));
			var s = as.state = as.state || Gun.state();
			if('function' == typeof data){ data(function(d){ as.data = d; gun.put(u,u,as) }); return gun }
			if(!as.soul){ return get(as), gun }
			as.$ = root.$.get(as.soul); // TODO: This may not allow user chaining and similar?
			as.todo = [{it: as.data, ref: as.$}];
			as.turn = as.turn || turn;
			as.ran = as.ran || ran;
			//var path = []; as.via.back(at => { at.get && path.push(at.get.slice(0,9)) }); path = path.reverse().join('.');
			// TODO: Perf! We only need to stun chains that are being modified, not necessarily written to.
			(function walk(){
				var to = as.todo, at = to.pop(), d = at.it, cid = at.ref && at.ref._.id, v, k, cat, tmp, g;
				stun(as, at.ref);
				if(tmp = at.todo){
					k = tmp.pop(); d = d[k];
					if(tmp.length){ to.push(at) }
				}
				k && (to.path || (to.path = [])).push(k);
				if(!(v = valid(d)) && !(g = Gun.is(d))){
					if(!Object.plain(d)){ (as.ack||noop).call(as, as.out = {err: as.err = Gun.log("Invalid data: " + ((d && (tmp = d.constructor) && tmp.name) || typeof d) + " at " + (as.via.back(function(at){at.get && tmp.push(at.get)}, tmp = []) || tmp.join('.'))+'.'+(to.path||[]).join('.'))}); as.ran(as); return }
					var seen = as.seen || (as.seen = []), i = seen.length;
					while(i--){ if(d === (tmp = seen[i]).it){ v = d = tmp.link; break } }
				}
				if(k && v){ at.node = state_ify(at.node, k, s, d) } // handle soul later.
				else {
					as.seen.push(cat = {it: d, link: {}, todo: g? [] : Object.keys(d).sort().reverse(), path: (to.path||[]).slice(), up: at}); // Any perf reasons to CPU schedule this .keys( ?
					at.node = state_ify(at.node, k, s, cat.link);
					!g && cat.todo.length && to.push(cat);
					// ---------------
					var id = as.seen.length;
					(as.wait || (as.wait = {}))[id] = '';
					tmp = (cat.ref = (g? d : k? at.ref.get(k) : at.ref))._;
					(tmp = (d && (d._||'')['#']) || tmp.soul || tmp.link)? resolve({soul: tmp}) : cat.ref.get(resolve, {run: as.run, /*hatch: 0,*/ v2020:1, out:{get:{'.':' '}}}); // TODO: BUG! This should be resolve ONLY soul to prevent full data from being loaded. // Fixed now?
					//setTimeout(function(){ if(F){ return } console.log("I HAVE NOT BEEN CALLED!", path, id, cat.ref._.id, k) }, 9000); var F; // MAKE SURE TO ADD F = 1 below!
					function resolve(msg, eve){
						var end = cat.link['#'];
						if(eve){ eve.off(); eve.rid(msg) } // TODO: Too early! Check all peers ack not found.
						// TODO: BUG maybe? Make sure this does not pick up a link change wipe, that it uses the changign link instead.
						var soul = end || msg.soul || (tmp = (msg.$$||msg.$)._||'').soul || tmp.link || ((tmp = tmp.put||'')._||'')['#'] || tmp['#'] || (((tmp = msg.put||'') && msg.$$)? tmp['#'] : (tmp['=']||tmp[':']||'')['#']);
						!end && stun(as, msg.$);
						if(!soul && !at.link['#']){ // check soul link above us
							(at.wait || (at.wait = [])).push(function(){ resolve(msg, eve) }) // wait
							return;
						}
						if(!soul){
							soul = [];
							(msg.$$||msg.$).back(function(at){
								if(tmp = at.soul || at.link){ return soul.push(tmp) }
								soul.push(at.get);
							});
							soul = soul.reverse().join('/');
						}
						cat.link['#'] = soul;
						!g && (((as.graph || (as.graph = {}))[soul] = (cat.node || (cat.node = {_:{}})))._['#'] = soul);
						delete as.wait[id];
						cat.wait && setTimeout.each(cat.wait, function(cb){ cb && cb() });
						as.ran(as);
					};
					// ---------------
				}
				if(!to.length){ return as.ran(as) }
				as.turn(walk);
			}());
			return gun;
		}

		function stun(as, id){
			if(!id){ return } id = (id._||'').id||id;
			var run = as.root.stun || (as.root.stun = {on: Gun.on}), test = {}, tmp;
			as.stun || (as.stun = run.on('stun', function(){ }));
			if(tmp = run.on(''+id)){ tmp.the.last.next(test) }
			if(test.run >= as.run){ return }
			run.on(''+id, function(test){
				if(as.stun.end){
					this.off();
					this.to.next(test);
					return;
				}
				test.run = test.run || as.run;
				test.stun = test.stun || as.stun; return;
				if(this.to.to){
					this.the.last.next(test);
					return;
				}
				test.stun = as.stun;
			});
		}

		function ran(as){
			if(as.err){ ran.end(as.stun, as.root); return } // move log handle here.
			if(as.todo.length || as.end || !Object.empty(as.wait)){ return } as.end = 1;
			var cat = (as.$.back(-1)._), root = cat.root, ask = cat.ask(function(ack){
				root.on('ack', ack);
				if(ack.err){ Gun.log(ack) }
				if(++acks > (as.acks || 0)){ this.off() } // Adjustable ACKs! Only 1 by default.
				if(!as.ack){ return }
				as.ack(ack, this);
			}, as.opt), acks = 0, stun = as.stun, tmp;
			(tmp = function(){ // this is not official yet, but quick solution to hack in for now.
				if(!stun){ return }
				ran.end(stun, root);
				setTimeout.each(Object.keys(stun = stun.add||''), function(cb){ if(cb = stun[cb]){cb()} }); // resume the stunned reads // Any perf reasons to CPU schedule this .keys( ?
			}).hatch = tmp; // this is not official yet ^
			//console.log(1, "PUT", as.run, as.graph);
			(as.via._).on('out', {put: as.out = as.graph, opt: as.opt, '#': ask, _: tmp});
		}; ran.end = function(stun,root){
			stun.end = noop; // like with the earlier id, cheaper to make this flag a function so below callbacks do not have to do an extra type check.
			if(stun.the.to === stun && stun === stun.the.last){ delete root.stun }
			stun.off();
		}

		function get(as){
			var at = as.via._, tmp;
			as.via = as.via.back(function(at){
				if(at.soul || !at.get){ return at.$ }
				tmp = as.data; (as.data = {})[at.get] = tmp;
			});
			if(!as.via || !as.via._.soul){
				as.via = at.root.$.get(((as.data||'')._||'')['#'] || at.$.back('opt.uuid')())
			}
			as.via.put(as.data, as.ack, as);
			

			return;
			if(at.get && at.back.soul){
				tmp = as.data;
				as.via = at.back.$;
				(as.data = {})[at.get] = tmp; 
				as.via.put(as.data, as.ack, as);
				return;
			}
		}

		var u, empty = {}, noop = function(){}, turn = setTimeout.turn, valid = Gun.valid, state_ify = Gun.state.ify;
		var iife = function(fn,as){fn.call(as||empty)}
	})(USE, './put');

	;USE(function(module){
		var Gun = USE('./root');
		USE('./chain');
		USE('./back');
		USE('./put');
		USE('./get');
		module.exports = Gun;
	})(USE, './index');

	;USE(function(module){
		var Gun = USE('./index');
		Gun.chain.on = function(tag, arg, eas, as){ // don't rewrite!
			var gun = this, cat = gun._, root = cat.root, act, off, id, tmp;
			if(typeof tag === 'string'){
				if(!arg){ return cat.on(tag) }
				act = cat.on(tag, arg, eas || cat, as);
				if(eas && eas.$){
					(eas.subs || (eas.subs = [])).push(act);
				}
				return gun;
			}
			var opt = arg;
			(opt = (true === opt)? {change: true} : opt || {}).not = 1; opt.on = 1;
			//opt.at = cat;
			//opt.ok = tag;
			//opt.last = {};
			var wait = {}; // can we assign this to the at instead, like in once?
			gun.get(tag, opt);
			/*gun.get(function on(data,key,msg,eve){ var $ = this;
				if(tmp = root.hatch){ // quick hack!
					if(wait[$._.id]){ return } wait[$._.id] = 1;
					tmp.push(function(){on.call($, data,key,msg,eve)});
					return;
				}; wait = {}; // end quick hack.
				tag.call($, data,key,msg,eve);
			}, opt); // TODO: PERF! Event listener leak!!!?*/
			/*
			function one(msg, eve){
				if(one.stun){ return }
				var at = msg.$._, data = at.put, tmp;
				if(tmp = at.link){ data = root.$.get(tmp)._.put }
				if(opt.not===u && u === data){ return }
				if(opt.stun===u && (tmp = root.stun) && (tmp = tmp[at.id] || tmp[at.back.id]) && !tmp.end){ // Remember! If you port this into `.get(cb` make sure you allow stun:0 skip option for `.put(`.
					tmp[id] = function(){one(msg,eve)};
					return;
				}
				//tmp = one.wait || (one.wait = {}); console.log(tmp[at.id] === ''); if(tmp[at.id] !== ''){ tmp[at.id] = tmp[at.id] || setTimeout(function(){tmp[at.id]='';one(msg,eve)},1); return } delete tmp[at.id];
				// call:
				if(opt.as){
					opt.ok.call(opt.as, msg, eve || one);
				} else {
					opt.ok.call(at.$, data, msg.get || at.get, msg, eve || one);
				}
			};
			one.at = cat;
			(cat.act||(cat.act={}))[id = String.random(7)] = one;
			one.off = function(){ one.stun = 1; if(!cat.act){ return } delete cat.act[id] }
			cat.on('out', {get: {}});*/
			return gun;
		}
		// Rules:
		// 1. If cached, should be fast, but not read while write.
		// 2. Should not retrigger other listeners, should get triggered even if nothing found.
		// 3. If the same callback passed to many different once chains, each should resolve - an unsubscribe from the same callback should not effect the state of the other resolving chains, if you do want to cancel them all early you should mutate the callback itself with a flag & check for it at top of callback
		Gun.chain.once = function(cb, opt){ opt = opt || {}; // avoid rewriting
			if(!cb){ return none(this,opt) }
			var gun = this, cat = gun._, root = cat.root, data = cat.put, id = String.random(7), one, tmp;
			gun.get(function(data,key,msg,eve){
				var $ = this, at = $._, one = (at.one||(at.one={}));
				if(eve.stun){ return } if('' === one[id]){ return }
				if(true === (tmp = Gun.valid(data))){ once(); return }
				if('string' == typeof tmp){ return } // TODO: BUG? Will this always load?
				clearTimeout(one[id]); one[id] = setTimeout(once, opt.wait||99); // TODO: Bug? This doesn't handle plural chains.
				function once(){
					if(!at.has && !at.soul){ at = {put: data, get: key} } // handles non-core messages.
					if(u === (tmp = at.put)){ tmp = ((msg.$$||'')._||'').put }
					if('string' == typeof Gun.valid(tmp)){ tmp = root.$.get(tmp)._.put; if(tmp === u){return} }
					if(eve.stun){ return } if('' === one[id]){ return } one[id] = '';
					if(cat.soul || cat.has){ eve.off() } // TODO: Plural chains? // else { ?.off() } // better than one check?
					cb.call($, tmp, at.get);
				};
			}, {on: 1});
			return gun;
		}
		function none(gun,opt,chain){
			Gun.log.once("valonce", "Chainable val is experimental, its behavior and API may change moving forward. Please play with it and report bugs and ideas on how to improve it.");
			(chain = gun.chain())._.nix = gun.once(function(data, key){ chain._.on('in', this._) });
			chain._.lex = gun._.lex; // TODO: Better approach in future? This is quick for now.
			return chain;
		}

		Gun.chain.off = function(){
			// make off more aggressive. Warning, it might backfire!
			var gun = this, at = gun._, tmp;
			var cat = at.back;
			if(!cat){ return }
			at.ack = 0; // so can resubscribe.
			if(tmp = cat.next){
				if(tmp[at.get]){
					delete tmp[at.get];
				} else {

				}
			}
			// TODO: delete cat.one[map.id]?
			if(tmp = cat.ask){
				delete tmp[at.get];
			}
			if(tmp = cat.put){
				delete tmp[at.get];
			}
			if(tmp = at.soul){
				delete cat.root.graph[tmp];
			}
			if(tmp = at.map){
				Object.keys(tmp).forEach(function(i,at){ at = tmp[i]; //obj_map(tmp, function(at){
					if(at.link){
						cat.root.$.get(at.link).off();
					}
				});
			}
			if(tmp = at.next){
				Object.keys(tmp).forEach(function(i,neat){ neat = tmp[i]; //obj_map(tmp, function(neat){
					neat.$.off();
				});
			}
			at.on('off', {});
			return gun;
		}
		var empty = {}, noop = function(){}, u;
	})(USE, './on');

	;USE(function(module){
		var Gun = USE('./index'), next = Gun.chain.get.next;
		Gun.chain.get.next = function(gun, lex){ var tmp;
			if(!Object.plain(lex)){ return (next||noop)(gun, lex) }
			if(tmp = ((tmp = lex['#'])||'')['='] || tmp){ return gun.get(tmp) }
			(tmp = gun.chain()._).lex = lex; // LEX!
			gun.on('in', function(eve){
				if(String.match(eve.get|| (eve.put||'')['.'], lex['.'] || lex['#'] || lex)){
					tmp.on('in', eve);
				}
				this.to.next(eve);
			});
			return tmp.$;
		}
		Gun.chain.map = function(cb, opt, t){
			var gun = this, cat = gun._, lex, chain;
			if(Object.plain(cb)){ lex = cb['.']? cb : {'.': cb}; cb = u }
			if(!cb){
				if(chain = cat.each){ return chain }
				(cat.each = chain = gun.chain())._.lex = lex || chain._.lex || cat.lex;
				chain._.nix = gun.back('nix');
				gun.on('in', map, chain._);
				return chain;
			}
			Gun.log.once("mapfn", "Map functions are experimental, their behavior and API may change moving forward. Please play with it and report bugs and ideas on how to improve it.");
			chain = gun.chain();
			gun.map().on(function(data, key, msg, eve){
				var next = (cb||noop).call(this, data, key, msg, eve);
				if(u === next){ return }
				if(data === next){ return chain._.on('in', msg) }
				if(Gun.is(next)){ return chain._.on('in', next._) }
				var tmp = {}; Object.keys(msg.put).forEach(function(k){ tmp[k] = msg.put[k] }, tmp); tmp['='] = next; 
				chain._.on('in', {get: key, put: tmp});
			});
			return chain;
		}
		function map(msg){ this.to.next(msg);
			var cat = this.as, gun = msg.$, at = gun._, put = msg.put, tmp;
			if(!at.soul && !msg.$$){ return } // this line took hundreds of tries to figure out. It only works if core checks to filter out above chains during link tho. This says "only bother to map on a node" for this layer of the chain. If something is not a node, map should not work.
			if((tmp = cat.lex) && !String.match(msg.get|| (put||'')['.'], tmp['.'] || tmp['#'] || tmp)){ return }
			Gun.on.link(msg, cat);
		}
		var noop = function(){}, event = {stun: noop, off: noop}, u;
	})(USE, './map');

	;USE(function(module){
		var Gun = USE('./index');
		Gun.chain.set = function(item, cb, opt){
			var gun = this, root = gun.back(-1), soul, tmp;
			cb = cb || function(){};
			opt = opt || {}; opt.item = opt.item || item;
			if(soul = ((item||'')._||'')['#']){ (item = {})['#'] = soul } // check if node, make link.
			if('string' == typeof (tmp = Gun.valid(item))){ return gun.get(soul = tmp).put(item, cb, opt) } // check if link
			if(!Gun.is(item)){
				if(Object.plain(item)){
					item = root.get(soul = gun.back('opt.uuid')()).put(item);
				}
				return gun.get(soul || root.back('opt.uuid')(7)).put(item, cb, opt);
			}
			gun.put(function(go){
				item.get(function(soul, o, msg){ // TODO: BUG! We no longer have this option? & go error not handled?
					if(!soul){ return cb.call(gun, {err: Gun.log('Only a node can be linked! Not "' + msg.put + '"!')}) }
					(tmp = {})[soul] = {'#': soul}; go(tmp);
				},true);
			})
			return item;
		}
	})(USE, './set');

	;USE(function(module){
		USE('./shim');

		function Mesh(root){
			var mesh = function(){};
			var opt = root.opt || {};
			opt.log = opt.log || console.log;
			opt.gap = opt.gap || opt.wait || 0;
			opt.max = opt.max || (opt.memory? (opt.memory * 999 * 999) : 300000000) * 0.3;
			opt.pack = opt.pack || (opt.max * 0.01 * 0.01);
			opt.puff = opt.puff || 9; // IDEA: do a start/end benchmark, divide ops/result.
			var puff = setTimeout.turn || setTimeout;
			var parse = JSON.parseAsync || function(t,cb,r){ var u; try{ cb(u, JSON.parse(t,r)) }catch(e){ cb(e) } }
			var json = JSON.stringifyAsync || function(v,cb,r,s){ var u; try{ cb(u, JSON.stringify(v,r,s)) }catch(e){ cb(e) } }

			var dup = root.dup, dup_check = dup.check, dup_track = dup.track;

			var ST = +new Date, LT = ST;

			var hear = mesh.hear = function(raw, peer){
				if(!raw){ return }
				if(opt.max <= raw.length){ return mesh.say({dam: '!', err: "Message too big!"}, peer) }
				if(mesh === this){
					/*if('string' == typeof raw){ try{
						var stat = console.STAT || {};
						//console.log('HEAR:', peer.id, (raw||'').slice(0,250), ((raw||'').length / 1024 / 1024).toFixed(4));
						
						//console.log(setTimeout.turn.s.length, 'stacks', parseFloat((-(LT - (LT = +new Date))/1000).toFixed(3)), 'sec', parseFloat(((LT-ST)/1000 / 60).toFixed(1)), 'up', stat.peers||0, 'peers', stat.has||0, 'has', stat.memhused||0, stat.memused||0, stat.memax||0, 'heap mem max');
					}catch(e){ console.log('DBG err', e) }}*/
					hear.d += raw.length||0 ; ++hear.c } // STATS!
				var S = peer.SH = +new Date;
				var tmp = raw[0], msg;
				//raw && raw.slice && console.log("hear:", ((peer.wire||'').headers||'').origin, raw.length, raw.slice && raw.slice(0,50)); //tc-iamunique-tc-package-ds1
				if('[' === tmp){
					parse(raw, function(err, msg){
						if(err || !msg){ return mesh.say({dam: '!', err: "DAM JSON parse error."}, peer) }
						console.STAT && console.STAT(+new Date, msg.length, '# on hear batch');
						var P = opt.puff;
						(function go(){
							var S = +new Date;
							var i = 0, m; while(i < P && (m = msg[i++])){ hear(m, peer) }
							msg = msg.slice(i); // slicing after is faster than shifting during.
							console.STAT && console.STAT(S, +new Date - S, 'hear loop');
							flush(peer); // force send all synchronously batched acks.
							if(!msg.length){ return }
							puff(go, 0);
						}());
					});
					raw = ''; // 
					return;
				}
				if('{' === tmp || ((raw['#'] || Object.plain(raw)) && (msg = raw))){
					if(msg){ return hear.one(msg, peer, S) }
					parse(raw, function(err, msg){
						if(err || !msg){ return mesh.say({dam: '!', err: "DAM JSON parse error."}, peer) }
						hear.one(msg, peer, S);
					});
					return;
				}
			}
			hear.one = function(msg, peer, S){ // S here is temporary! Undo.
				var id, hash, tmp, ash, DBG;
				if(msg.DBG){ msg.DBG = DBG = {DBG: msg.DBG} }
				DBG && (DBG.h = S);
				DBG && (DBG.hp = +new Date);
				if(!(id = msg['#'])){ id = msg['#'] = String.random(9) }
				if(tmp = dup_check(id)){ return }
				// DAM logic:
				if(!(hash = msg['##']) && false && u !== msg.put){ /*hash = msg['##'] = Type.obj.hash(msg.put)*/ } // disable hashing for now // TODO: impose warning/penalty instead (?)
				if(hash && (tmp = msg['@'] || (msg.get && id)) && dup.check(ash = tmp+hash)){ return } // Imagine A <-> B <=> (C & D), C & D reply with same ACK but have different IDs, B can use hash to dedup. Or if a GET has a hash already, we shouldn't ACK if same.
				(msg._ = function(){}).via = mesh.leap = peer;
				if((tmp = msg['><']) && 'string' == typeof tmp){ tmp.slice(0,99).split(',').forEach(function(k){ this[k] = 1 }, (msg._).yo = {}) } // Peers already sent to, do not resend.
				// DAM ^
				if(tmp = msg.dam){
					if(tmp = mesh.hear[tmp]){
						tmp(msg, peer, root);
					}
					dup_track(id);
					return;
				}
				var S = +new Date;
				DBG && (DBG.is = S); peer.SI = id;
				root.on('in', mesh.last = msg);
				//ECHO = msg.put || ECHO; !(msg.ok !== -3740) && mesh.say({ok: -3740, put: ECHO, '@': msg['#']}, peer);
				DBG && (DBG.hd = +new Date);
				console.STAT && console.STAT(S, +new Date - S, msg.get? 'msg get' : msg.put? 'msg put' : 'msg');
				(tmp = dup_track(id)).via = peer; // don't dedup message ID till after, cause GUN has internal dedup check.
				if(msg.get){ tmp.it = msg }
				if(ash){ dup_track(ash) } //dup.track(tmp+hash, true).it = it(msg);
				mesh.leap = mesh.last = null; // warning! mesh.leap could be buggy.
			}
			var tomap = function(k,i,m){m(k,true)};
			var noop = function(){};
			hear.c = hear.d = 0;

			;(function(){
				var SMIA = 0;
				var loop;
				mesh.hash = function(msg, peer){ var h, s, t;
					var S = +new Date;
					json(msg.put, function hash(err, text){
						var ss = (s || (s = t = text||'')).slice(0, 32768); // 1024 * 32
					  h = String.hash(ss, h); s = s.slice(32768);
					  if(s){ puff(hash, 0); return }
						console.STAT && console.STAT(S, +new Date - S, 'say json+hash');
					  msg._.$put = t;
					  msg['##'] = h;
					  say(msg, peer);
					  delete msg._.$put;
					}, sort);
				}
				function sort(k, v){ var tmp;
					if(!(v instanceof Object)){ return v }
					Object.keys(v).sort().forEach(sorta, {to: tmp = {}, on: v});
					return tmp;
				} function sorta(k){ this.to[k] = this.on[k] }

				var say = mesh.say = function(msg, peer){ var tmp;
					if((tmp = this) && (tmp = tmp.to) && tmp.next){ tmp.next(msg) } // compatible with middleware adapters.
					if(!msg){ return false }
					var id, hash, raw, ack = msg['@'];
//if(opt.super && (!ack || !msg.put)){ return } // TODO: MANHATTAN STUB //OBVIOUSLY BUG! But squelch relay. // :( get only is 100%+ CPU usage :(
					var meta = msg._||(msg._=function(){});
					var DBG = msg.DBG, S = +new Date; meta.y = meta.y || S; if(!peer){ DBG && (DBG.y = S) }
					if(!(id = msg['#'])){ id = msg['#'] = String.random(9) }
					!loop && dup_track(id);//.it = it(msg); // track for 9 seconds, default. Earth<->Mars would need more! // always track, maybe move this to the 'after' logic if we split function.
					if(msg.put && (msg.err || (dup.s[id]||'').err)){ return false } // TODO: in theory we should not be able to stun a message, but for now going to check if it can help network performance preventing invalid data to relay.
					if(!(hash = msg['##']) && u !== msg.put && !meta.via && ack){ mesh.hash(msg, peer); return } // TODO: Should broadcasts be hashed?
					if(!peer && ack){ peer = ((tmp = dup.s[ack]) && (tmp.via || ((tmp = tmp.it) && (tmp = tmp._) && tmp.via))) || ((tmp = mesh.last) && ack === tmp['#'] && mesh.leap) } // warning! mesh.leap could be buggy! mesh last check reduces this.
					if(!peer && ack){ // still no peer, then ack daisy chain lost.
						if(dup.s[ack]){ return } // in dups but no peer hints that this was ack to self, ignore.
						console.STAT && console.STAT(+new Date, ++SMIA, 'total no peer to ack to');
						return false;
					} // TODO: Temporary? If ack via trace has been lost, acks will go to all peers, which trashes browser bandwidth. Not relaying the ack will force sender to ask for ack again. Note, this is technically wrong for mesh behavior.
					if(!peer && mesh.way){ return mesh.way(msg) }
					DBG && (DBG.yh = +new Date);
					if(!(raw = meta.raw)){ mesh.raw(msg, peer); return }
					DBG && (DBG.yr = +new Date);
					if(!peer || !peer.id){
						if(!Object.plain(peer || opt.peers)){ return false }
						var S = +new Date;
						var P = opt.puff, ps = opt.peers, pl = Object.keys(peer || opt.peers || {}); // TODO: .keys( is slow
						console.STAT && console.STAT(S, +new Date - S, 'peer keys');
						;(function go(){
							var S = +new Date;
							//Type.obj.map(peer || opt.peers, each); // in case peer is a peer list.
							loop = 1; var wr = meta.raw; meta.raw = raw; // quick perf hack
							var i = 0, p; while(i < 9 && (p = (pl||'')[i++])){
								if(!(p = ps[p])){ continue }
								say(msg, p);
							}
							meta.raw = wr; loop = 0;
							pl = pl.slice(i); // slicing after is faster than shifting during.
							console.STAT && console.STAT(S, +new Date - S, 'say loop');
							if(!pl.length){ return }
							puff(go, 0);
							ack && dup_track(ack); // keep for later
						}());
						return;
					}
					// TODO: PERF: consider splitting function here, so say loops do less work.
					if(!peer.wire && mesh.wire){ mesh.wire(peer) }
					if(id === peer.last){ return } peer.last = id;  // was it just sent?
					if(peer === meta.via){ return false } // don't send back to self.
					if((tmp = meta.yo) && (tmp[peer.url] || tmp[peer.pid] || tmp[peer.id]) /*&& !o*/){ return false }
					console.STAT && console.STAT(S, ((DBG||meta).yp = +new Date) - (meta.y || S), 'say prep');
					!loop && ack && dup_track(ack); // streaming long responses needs to keep alive the ack.
					if(peer.batch){
						peer.tail = (tmp = peer.tail || 0) + raw.length;
						if(peer.tail <= opt.pack){
							peer.batch += (tmp?',':'')+raw;
							return;
						}
						flush(peer);
					}
					peer.batch = '['; // Prevents double JSON!
					var ST = +new Date;
					setTimeout(function(){
						console.STAT && console.STAT(ST, +new Date - ST, '0ms TO');
						flush(peer);
					}, opt.gap); // TODO: queuing/batching might be bad for low-latency video game performance! Allow opt out?
					send(raw, peer);
					console.STAT && (ack === peer.SI) && console.STAT(S, +new Date - peer.SH, 'say ack');
				}
				mesh.say.c = mesh.say.d = 0;
				// TODO: this caused a out-of-memory crash!
				mesh.raw = function(msg, peer){ // TODO: Clean this up / delete it / move logic out!
					if(!msg){ return '' }
					var meta = (msg._) || {}, put, tmp;
					if(tmp = meta.raw){ return tmp }
					if('string' == typeof msg){ return msg }
					var hash = msg['##'], ack = msg['@'];
					if(hash && ack){
						if(!meta.via && dup_check(ack+hash)){ return false } // for our own out messages, memory & storage may ack the same thing, so dedup that. Tho if via another peer, we already tracked it upon hearing, so this will always trigger false positives, so don't do that!
						if((tmp = (dup.s[ack]||'').it) || ((tmp = mesh.last) && ack === tmp['#'])){
							if(hash === tmp['##']){ return false } // if ask has a matching hash, acking is optional.
							if(!tmp['##']){ tmp['##'] = hash } // if none, add our hash to ask so anyone we relay to can dedup. // NOTE: May only check against 1st ack chunk, 2nd+ won't know and still stream back to relaying peers which may then dedup. Any way to fix this wasted bandwidth? I guess force rate limiting breaking change, that asking peer has to ask for next lexical chunk.
						}
					}
					if(!msg.dam){
						var i = 0, to = []; tmp = opt.peers;
						for(var k in tmp){ var p = tmp[k]; // TODO: Make it up peers instead!
							to.push(p.url || p.pid || p.id);
							if(++i > 6){ break }
						}
						if(i > 1){ msg['><'] = to.join() } // TODO: BUG! This gets set regardless of peers sent to! Detect?
					}
					if(put = meta.$put){
						tmp = {}; Object.keys(msg).forEach(function(k){ tmp[k] = msg[k] });
						tmp.put = ':])([:';
						json(tmp, function(err, raw){
							if(err){ return } // TODO: Handle!!
							var S = +new Date;
							tmp = raw.indexOf('"put":":])([:"');
							res(u, raw = raw.slice(0, tmp+6) + put + raw.slice(tmp + 14));
							console.STAT && console.STAT(S, +new Date - S, 'say slice');
						});
						return;
					}
					json(msg, res);
					function res(err, raw){
						if(err){ return } // TODO: Handle!!
						meta.raw = raw; //if(meta && (raw||'').length < (999 * 99)){ meta.raw = raw } // HNPERF: If string too big, don't keep in memory.
						say(msg, peer);
					}
				}
			}());

			function flush(peer){
				var tmp = peer.batch, t = 'string' == typeof tmp, l;
				if(t){ tmp += ']' }// TODO: Prevent double JSON!
				peer.batch = peer.tail = null;
				if(!tmp){ return }
				if(t? 3 > tmp.length : !tmp.length){ return } // TODO: ^
				if(!t){try{tmp = (1 === tmp.length? tmp[0] : JSON.stringify(tmp));
				}catch(e){return opt.log('DAM JSON stringify error', e)}}
				if(!tmp){ return }
				send(tmp, peer);
			}
			// for now - find better place later.
			function send(raw, peer){ try{
				//console.log('SAY:', peer.id, (raw||'').slice(0,250), ((raw||'').length / 1024 / 1024).toFixed(4));
				var wire = peer.wire;
				if(peer.say){
					peer.say(raw);
				} else
				if(wire.send){
					wire.send(raw);
				}
				mesh.say.d += raw.length||0; ++mesh.say.c; // STATS!
			}catch(e){
				(peer.queue = peer.queue || []).push(raw);
			}}

			mesh.hi = function(peer){
				var tmp = peer.wire || {};
				if(peer.id){
					opt.peers[peer.url || peer.id] = peer;
				} else {
					tmp = peer.id = peer.id || String.random(9);
					mesh.say({dam: '?', pid: root.opt.pid}, opt.peers[tmp] = peer);
					delete dup.s[peer.last]; // IMPORTANT: see https://gun.eco/docs/DAM#self
				}
				peer.met = peer.met || +(new Date);
				if(!tmp.hied){ root.on(tmp.hied = 'hi', peer) }
				// @rogowski I need this here by default for now to fix go1dfish's bug
				tmp = peer.queue; peer.queue = [];
				setTimeout.each(tmp||[],function(msg){
					send(msg, peer);
				},0,9);
				//Type.obj.native && Type.obj.native(); // dirty place to check if other JS polluted.
			}
			mesh.bye = function(peer){
				root.on('bye', peer);
				var tmp = +(new Date); tmp = (tmp - (peer.met||tmp));
				mesh.bye.time = ((mesh.bye.time || tmp) + tmp) / 2;
			}
			mesh.hear['!'] = function(msg, peer){ opt.log('Error:', msg.err) }
			mesh.hear['?'] = function(msg, peer){
				if(msg.pid){
					if(!peer.pid){ peer.pid = msg.pid }
					if(msg['@']){ return }
				}
				mesh.say({dam: '?', pid: opt.pid, '@': msg['#']}, peer);
				delete dup.s[peer.last]; // IMPORTANT: see https://gun.eco/docs/DAM#self
			}

			root.on('create', function(root){
				root.opt.pid = root.opt.pid || String.random(9);
				this.to.next(root);
				root.on('out', mesh.say);
			});

			root.on('bye', function(peer, tmp){
				peer = opt.peers[peer.id || peer] || peer;
				this.to.next(peer);
				peer.bye? peer.bye() : (tmp = peer.wire) && tmp.close && tmp.close();
				delete opt.peers[peer.id];
				peer.wire = null;
			});

			var gets = {};
			root.on('bye', function(peer, tmp){ this.to.next(peer);
				if(tmp = console.STAT){ tmp.peers = (tmp.peers || 0) - 1; }
				if(!(tmp = peer.url)){ return } gets[tmp] = true;
				setTimeout(function(){ delete gets[tmp] },opt.lack || 9000);
			});
			root.on('hi', function(peer, tmp){ this.to.next(peer);
				if(tmp = console.STAT){ tmp.peers = (tmp.peers || 0) + 1 }
				if(!(tmp = peer.url) || !gets[tmp]){ return } delete gets[tmp];
				if(opt.super){ return } // temporary (?) until we have better fix/solution?
				setTimeout.each(Object.keys(root.next), function(soul){ var node = root.next[soul]; // TODO: .keys( is slow
					tmp = {}; tmp[soul] = root.graph[soul]; tmp = String.hash(tmp); // TODO: BUG! This is broken.
					mesh.say({'##': tmp, get: {'#': soul}}, peer);
				});
			});

			return mesh;
		}
	  var empty = {}, ok = true, u;

	  try{ module.exports = Mesh }catch(e){}

	})(USE, './mesh');

	;USE(function(module){
		var Gun = USE('../index');
		Gun.Mesh = USE('./mesh');

		// TODO: resync upon reconnect online/offline
		//window.ononline = window.onoffline = function(){ console.log('online?', navigator.onLine) }

		Gun.on('opt', function(root){
			this.to.next(root);
			if(root.once){ return }
			var opt = root.opt;
			if(false === opt.WebSocket){ return }

			var env = Gun.window || {};
			var websocket = opt.WebSocket || env.WebSocket || env.webkitWebSocket || env.mozWebSocket;
			if(!websocket){ return }
			opt.WebSocket = websocket;

			var mesh = opt.mesh = opt.mesh || Gun.Mesh(root);

			var wire = mesh.wire || opt.wire;
			mesh.wire = opt.wire = open;
			function open(peer){ try{
				if(!peer || !peer.url){ return wire && wire(peer) }
				var url = peer.url.replace(/^http/, 'ws');
				var wire = peer.wire = new opt.WebSocket(url);
				wire.onclose = function(){
					opt.mesh.bye(peer);
					reconnect(peer);
				};
				wire.onerror = function(error){
					reconnect(peer);
				};
				wire.onopen = function(){
					opt.mesh.hi(peer);
				}
				wire.onmessage = function(msg){
					if(!msg){ return }
					opt.mesh.hear(msg.data || msg, peer);
				};
				return wire;
			}catch(e){}}

			setTimeout(function(){ !opt.super && root.on('out', {dam:'hi'}) },1); // it can take a while to open a socket, so maybe no longer lazy load for perf reasons?

			var wait = 2 * 999;
			function reconnect(peer){
				clearTimeout(peer.defer);
				if(doc && peer.retry <= 0){ return }
				peer.retry = (peer.retry || opt.retry+1 || 60) - ((-peer.tried + (peer.tried = +new Date) < wait*4)?1:0);
				peer.defer = setTimeout(function to(){
					if(doc && doc.hidden){ return setTimeout(to,wait) }
					open(peer);
				}, wait);
			}
			var doc = (''+u !== typeof document) && document;
		});
		var noop = function(){}, u;
	})(USE, './websocket');

	;USE(function(module){
		if(typeof Gun === 'undefined'){ return }

		var noop = function(){}, store, u;
		try{store = (Gun.window||noop).localStorage}catch(e){}
		if(!store){
			Gun.log("Warning: No localStorage exists to persist data to!");
			store = {setItem: function(k,v){this[k]=v}, removeItem: function(k){delete this[k]}, getItem: function(k){return this[k]}};
		}
		Gun.on('create', function lg(root){
			this.to.next(root);
			var opt = root.opt, graph = root.graph, acks = [], disk, to;
			if(false === opt.localStorage){ return }
			opt.prefix = opt.file || 'gun/';
			try{ disk = lg[opt.prefix] = lg[opt.prefix] || JSON.parse(store.getItem(opt.prefix)) || {}; // TODO: Perf! This will block, should we care, since limited to 5MB anyways?
			}catch(e){ disk = lg[opt.prefix] = {}; }

			root.on('get', function(msg){
				this.to.next(msg);
				var lex = msg.get, soul, data, tmp, u;
				if(!lex || !(soul = lex['#'])){ return }
				data = disk[soul] || u;
				if(data && (tmp = lex['.']) && !Object.plain(tmp)){ // pluck!
					data = Gun.state.ify({}, tmp, Gun.state.is(data, tmp), data[tmp], soul);
				}
				//if(data){ (tmp = {})[soul] = data } // back into a graph.
				//setTimeout(function(){
				Gun.on.get.ack(msg, data); //root.on('in', {'@': msg['#'], put: tmp, lS:1});// || root.$});
				//}, Math.random() * 10); // FOR TESTING PURPOSES!
			});

			root.on('put', function(msg){
				this.to.next(msg); // remember to call next middleware adapter
				var put = msg.put, soul = put['#'], key = put['.'], tmp; // pull data off wire envelope
				disk[soul] = Gun.state.ify(disk[soul], key, put['>'], put[':'], soul); // merge into disk object
				if(!msg['@']){ acks.push(msg['#']) } // then ack any non-ack write. // TODO: use batch id.
				if(to){ return }
				//flush();return;
				to = setTimeout(flush, opt.wait || 1); // that gets saved as a whole to disk every 1ms
			});
			function flush(){
				var err, ack = acks; clearTimeout(to); to = false; acks = [];
				try{store.setItem(opt.prefix, JSON.stringify(disk));
				}catch(e){
					Gun.log((err = (e || "localStorage failure")) + " Consider using GUN's IndexedDB plugin for RAD for more storage space, https://gun.eco/docs/RAD#install");
					root.on('localStorage:error', {err: err, get: opt.prefix, put: disk});
				}
				if(!err && !Object.empty(opt.peers)){ return } // only ack if there are no peers. // Switch this to probabilistic mode
				setTimeout.each(ack, function(id){
					root.on('in', {'@': id, err: err, ok: 0}); // localStorage isn't reliable, so make its `ok` code be a low number.
				});
			}
		
		});
	})(USE, './localStorage');

}());

/* BELOW IS TEMPORARY FOR OLD INTERNAL COMPATIBILITY, THEY ARE IMMEDIATELY DEPRECATED AND WILL BE REMOVED IN NEXT VERSION */
;(function(){
	var u;
	if(''+u == typeof Gun){ return }
	var DEP = function(n){ console.log("Warning! Deprecated internal utility will break in next version:", n) }
	// Generic javascript utilities.
	var Type = Gun;
	//Type.fns = Type.fn = {is: function(fn){ return (!!fn && fn instanceof Function) }}
	Type.fn = Type.fn || {is: function(fn){ DEP('fn'); return (!!fn && 'function' == typeof fn) }}
	Type.bi = Type.bi || {is: function(b){ DEP('bi');return (b instanceof Boolean || typeof b == 'boolean') }}
	Type.num = Type.num || {is: function(n){ DEP('num'); return !list_is(n) && ((n - parseFloat(n) + 1) >= 0 || Infinity === n || -Infinity === n) }}
	Type.text = Type.text || {is: function(t){ DEP('text'); return (typeof t == 'string') }}
	Type.text.ify = Type.text.ify || function(t){ DEP('text.ify');
		if(Type.text.is(t)){ return t }
		if(typeof JSON !== "undefined"){ return JSON.stringify(t) }
		return (t && t.toString)? t.toString() : t;
	}
	Type.text.random = Type.text.random || function(l, c){ DEP('text.random');
		var s = '';
		l = l || 24; // you are not going to make a 0 length random number, so no need to check type
		c = c || '0123456789ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxyz';
		while(l > 0){ s += c.charAt(Math.floor(Math.random() * c.length)); l-- }
		return s;
	}
	Type.text.match = Type.text.match || function(t, o){ var tmp, u; DEP('text.match');
		if('string' !== typeof t){ return false }
		if('string' == typeof o){ o = {'=': o} }
		o = o || {};
		tmp = (o['='] || o['*'] || o['>'] || o['<']);
		if(t === tmp){ return true }
		if(u !== o['=']){ return false }
		tmp = (o['*'] || o['>'] || o['<']);
		if(t.slice(0, (tmp||'').length) === tmp){ return true }
		if(u !== o['*']){ return false }
		if(u !== o['>'] && u !== o['<']){
			return (t >= o['>'] && t <= o['<'])? true : false;
		}
		if(u !== o['>'] && t >= o['>']){ return true }
		if(u !== o['<'] && t <= o['<']){ return true }
		return false;
	}
	Type.text.hash = Type.text.hash || function(s, c){ // via SO
		DEP('text.hash');
		if(typeof s !== 'string'){ return }
	  c = c || 0;
	  if(!s.length){ return c }
	  for(var i=0,l=s.length,n; i<l; ++i){
	    n = s.charCodeAt(i);
	    c = ((c<<5)-c)+n;
	    c |= 0;
	  }
	  return c;
	}
	Type.list = Type.list || {is: function(l){ DEP('list'); return (l instanceof Array) }}
	Type.list.slit = Type.list.slit || Array.prototype.slice;
	Type.list.sort = Type.list.sort || function(k){ // creates a new sort function based off some key
		DEP('list.sort');
		return function(A,B){
			if(!A || !B){ return 0 } A = A[k]; B = B[k];
			if(A < B){ return -1 }else if(A > B){ return 1 }
			else { return 0 }
		}
	}
	Type.list.map = Type.list.map || function(l, c, _){ DEP('list.map'); return obj_map(l, c, _) }
	Type.list.index = 1; // change this to 0 if you want non-logical, non-mathematical, non-matrix, non-convenient array notation
	Type.obj = Type.boj || {is: function(o){ DEP('obj'); return o? (o instanceof Object && o.constructor === Object) || Object.prototype.toString.call(o).match(/^\[object (\w+)\]$/)[1] === 'Object' : false }}
	Type.obj.put = Type.obj.put || function(o, k, v){ DEP('obj.put'); return (o||{})[k] = v, o }
	Type.obj.has = Type.obj.has || function(o, k){ DEP('obj.has'); return o && Object.prototype.hasOwnProperty.call(o, k) }
	Type.obj.del = Type.obj.del || function(o, k){ DEP('obj.del'); 
		if(!o){ return }
		o[k] = null;
		delete o[k];
		return o;
	}
	Type.obj.as = Type.obj.as || function(o, k, v, u){ DEP('obj.as'); return o[k] = o[k] || (u === v? {} : v) }
	Type.obj.ify = Type.obj.ify || function(o){ DEP('obj.ify'); 
		if(obj_is(o)){ return o }
		try{o = JSON.parse(o);
		}catch(e){o={}};
		return o;
	}
	;(function(){ var u;
		function map(v,k){
			if(obj_has(this,k) && u !== this[k]){ return }
			this[k] = v;
		}
		Type.obj.to = Type.obj.to || function(from, to){ DEP('obj.to'); 
			to = to || {};
			obj_map(from, map, to);
			return to;
		}
	}());
	Type.obj.copy = Type.obj.copy || function(o){ DEP('obj.copy'); // because http://web.archive.org/web/20140328224025/http://jsperf.com/cloning-an-object/2
		return !o? o : JSON.parse(JSON.stringify(o)); // is shockingly faster than anything else, and our data has to be a subset of JSON anyways!
	}
	;(function(){
		function empty(v,i){ var n = this.n, u;
			if(n && (i === n || (obj_is(n) && obj_has(n, i)))){ return }
			if(u !== i){ return true }
		}
		Type.obj.empty = Type.obj.empty || function(o, n){ DEP('obj.empty'); 
			if(!o){ return true }
			return obj_map(o,empty,{n:n})? false : true;
		}
	}());
	;(function(){
		function t(k,v){
			if(2 === arguments.length){
				t.r = t.r || {};
				t.r[k] = v;
				return;
			} t.r = t.r || [];
			t.r.push(k);
		};
		var keys = Object.keys, map, u;
		Object.keys = Object.keys || function(o){ return map(o, function(v,k,t){t(k)}) }
		Type.obj.map = map = Type.obj.map || function(l, c, _){ DEP('obj.map'); 
			var u, i = 0, x, r, ll, lle, f = 'function' == typeof c;
			t.r = u;
			if(keys && obj_is(l)){
				ll = keys(l); lle = true;
			}
			_ = _ || {};
			if(list_is(l) || ll){
				x = (ll || l).length;
				for(;i < x; i++){
					var ii = (i + Type.list.index);
					if(f){
						r = lle? c.call(_, l[ll[i]], ll[i], t) : c.call(_, l[i], ii, t);
						if(r !== u){ return r }
					} else {
						//if(Type.test.is(c,l[i])){ return ii } // should implement deep equality testing!
						if(c === l[lle? ll[i] : i]){ return ll? ll[i] : ii } // use this for now
					}
				}
			} else {
				for(i in l){
					if(f){
						if(obj_has(l,i)){
							r = _? c.call(_, l[i], i, t) : c(l[i], i, t);
							if(r !== u){ return r }
						}
					} else {
						//if(a.test.is(c,l[i])){ return i } // should implement deep equality testing!
						if(c === l[i]){ return i } // use this for now
					}
				}
			}
			return f? t.r : Type.list.index? 0 : -1;
		}
	}());
	Type.time = Type.time || {};
	Type.time.is = Type.time.is || function(t){ DEP('time'); return t? t instanceof Date : (+new Date().getTime()) }

	var fn_is = Type.fn.is;
	var list_is = Type.list.is;
	var obj = Type.obj, obj_is = obj.is, obj_has = obj.has, obj_map = obj.map;

	var Val = {};
	Val.is = function(v){ DEP('val.is'); // Valid values are a subset of JSON: null, binary, number (!Infinity), text, or a soul relation. Arrays need special algorithms to handle concurrency, so they are not supported directly. Use an extension that supports them if needed but research their problems first.
		if(v === u){ return false }
		if(v === null){ return true } // "deletes", nulling out keys.
		if(v === Infinity){ return false } // we want this to be, but JSON does not support it, sad face.
		if(text_is(v) // by "text" we mean strings.
		|| bi_is(v) // by "binary" we mean boolean.
		|| num_is(v)){ // by "number" we mean integers or decimals.
			return true; // simple values are valid.
		}
		return Val.link.is(v) || false; // is the value a soul relation? Then it is valid and return it. If not, everything else remaining is an invalid data type. Custom extensions can be built on top of these primitives to support other types.
	}
	Val.link = Val.rel = {_: '#'};
	;(function(){
		Val.link.is = function(v){ DEP('val.link.is'); // this defines whether an object is a soul relation or not, they look like this: {'#': 'UUID'}
			if(v && v[rel_] && !v._ && obj_is(v)){ // must be an object.
				var o = {};
				obj_map(v, map, o);
				if(o.id){ // a valid id was found.
					return o.id; // yay! Return it.
				}
			}
			return false; // the value was not a valid soul relation.
		}
		function map(s, k){ var o = this; // map over the object...
			if(o.id){ return o.id = false } // if ID is already defined AND we're still looping through the object, it is considered invalid.
			if(k == rel_ && text_is(s)){ // the key should be '#' and have a text value.
				o.id = s; // we found the soul!
			} else {
				return o.id = false; // if there exists anything else on the object that isn't the soul, then it is considered invalid.
			}
		}
	}());
	Val.link.ify = function(t){ DEP('val.link.ify'); return obj_put({}, rel_, t) } // convert a soul into a relation and return it.
	Type.obj.has._ = '.';
	var rel_ = Val.link._, u;
	var bi_is = Type.bi.is;
	var num_is = Type.num.is;
	var text_is = Type.text.is;
	var obj = Type.obj, obj_is = obj.is, obj_put = obj.put, obj_map = obj.map;

	Type.val = Type.val || Val;

	var Node = {_: '_'};
	Node.soul = function(n, o){ DEP('node.soul'); return (n && n._ && n._[o || soul_]) } // convenience function to check to see if there is a soul on a node and return it.
	Node.soul.ify = function(n, o){ DEP('node.soul.ify'); // put a soul on an object.
		o = (typeof o === 'string')? {soul: o} : o || {};
		n = n || {}; // make sure it exists.
		n._ = n._ || {}; // make sure meta exists.
		n._[soul_] = o.soul || n._[soul_] || text_random(); // put the soul on it.
		return n;
	}
	Node.soul._ = Val.link._;
	;(function(){
		Node.is = function(n, cb, as){ DEP('node.is'); var s; // checks to see if an object is a valid node.
			if(!obj_is(n)){ return false } // must be an object.
			if(s = Node.soul(n)){ // must have a soul on it.
				return !obj_map(n, map, {as:as,cb:cb,s:s,n:n});
			}
			return false; // nope! This was not a valid node.
		}
		function map(v, k){ // we invert this because the way we check for this is via a negation.
			if(k === Node._){ return } // skip over the metadata.
			if(!Val.is(v)){ return true } // it is true that this is an invalid node.
			if(this.cb){ this.cb.call(this.as, v, k, this.n, this.s) } // optionally callback each key/value.
		}
	}());
	;(function(){
		Node.ify = function(obj, o, as){ DEP('node.ify'); // returns a node from a shallow object.
			if(!o){ o = {} }
			else if(typeof o === 'string'){ o = {soul: o} }
			else if('function' == typeof o){ o = {map: o} }
			if(o.map){ o.node = o.map.call(as, obj, u, o.node || {}) }
			if(o.node = Node.soul.ify(o.node || {}, o)){
				obj_map(obj, map, {o:o,as:as});
			}
			return o.node; // This will only be a valid node if the object wasn't already deep!
		}
		function map(v, k){ var o = this.o, tmp, u; // iterate over each key/value.
			if(o.map){
				tmp = o.map.call(this.as, v, ''+k, o.node);
				if(u === tmp){
					obj_del(o.node, k);
				} else
				if(o.node){ o.node[k] = tmp }
				return;
			}
			if(Val.is(v)){
				o.node[k] = v;
			}
		}
	}());
	var obj = Type.obj, obj_is = obj.is, obj_del = obj.del, obj_map = obj.map;
	var text = Type.text, text_random = text.random;
	var soul_ = Node.soul._;
	var u;
	Type.node = Type.node || Node;

	var State = Type.state;
	State.lex = function(){ DEP('state.lex'); return State().toString(36).replace('.','') }
	State.to = function(from, k, to){ DEP('state.to'); 
		var val = (from||{})[k];
		if(obj_is(val)){
			val = obj_copy(val);
		}
		return State.ify(to, k, State.is(from, k), val, Node.soul(from));
	}
	;(function(){
		State.map = function(cb, s, as){ DEP('state.map'); var u; // for use with Node.ify
			var o = obj_is(o = cb || s)? o : null;
			cb = fn_is(cb = cb || s)? cb : null;
			if(o && !cb){
				s = num_is(s)? s : State();
				o[N_] = o[N_] || {};
				obj_map(o, map, {o:o,s:s});
				return o;
			}
			as = as || obj_is(s)? s : u;
			s = num_is(s)? s : State();
			return function(v, k, o, opt){
				if(!cb){
					map.call({o: o, s: s}, v,k);
					return v;
				}
				cb.call(as || this || {}, v, k, o, opt);
				if(obj_has(o,k) && u === o[k]){ return }
				map.call({o: o, s: s}, v,k);
			}
		}
		function map(v,k){
			if(N_ === k){ return }
			State.ify(this.o, k, this.s) ;
		}
	}());
	var obj = Type.obj, obj_as = obj.as, obj_has = obj.has, obj_is = obj.is, obj_map = obj.map, obj_copy = obj.copy;
	var num = Type.num, num_is = num.is;
	var fn = Type.fn, fn_is = fn.is;
	var N_ = Node._, u;

	var Graph = {};
	;(function(){
		Graph.is = function(g, cb, fn, as){ DEP('graph.is'); // checks to see if an object is a valid graph.
			if(!g || !obj_is(g) || obj_empty(g)){ return false } // must be an object.
			return !obj_map(g, map, {cb:cb,fn:fn,as:as}); // makes sure it wasn't an empty object.
		}
		function map(n, s){ // we invert this because the way'? we check for this is via a negation.
			if(!n || s !== Node.soul(n) || !Node.is(n, this.fn, this.as)){ return true } // it is true that this is an invalid graph.
			if(!this.cb){ return }
			nf.n = n; nf.as = this.as; // sequential race conditions aren't races.
			this.cb.call(nf.as, n, s, nf);
		}
		function nf(fn){ // optional callback for each node.
			if(fn){ Node.is(nf.n, fn, nf.as) } // where we then have an optional callback for each key/value.
		}
	}());
	;(function(){
		Graph.ify = function(obj, env, as){ DEP('graph.ify'); 
			var at = {path: [], obj: obj};
			if(!env){
				env = {};
			} else
			if(typeof env === 'string'){
				env = {soul: env};
			} else
			if('function' == typeof env){
				env.map = env;
			}
			if(typeof as === 'string'){
				env.soul = env.soul || as;
				as = u;
			}
			if(env.soul){
				at.link = Val.link.ify(env.soul);
			}
			env.shell = (as||{}).shell;
			env.graph = env.graph || {};
			env.seen = env.seen || [];
			env.as = env.as || as;
			node(env, at);
			env.root = at.node;
			return env.graph;
		}
		function node(env, at){ var tmp;
			if(tmp = seen(env, at)){ return tmp }
			at.env = env;
			at.soul = soul;
			if(Node.ify(at.obj, map, at)){
				at.link = at.link || Val.link.ify(Node.soul(at.node));
				if(at.obj !== env.shell){
					env.graph[Val.link.is(at.link)] = at.node;
				}
			}
			return at;
		}
		function map(v,k,n){
			var at = this, env = at.env, is, tmp;
			if(Node._ === k && obj_has(v,Val.link._)){
				return n._; // TODO: Bug?
			}
			if(!(is = valid(v,k,n, at,env))){ return }
			if(!k){
				at.node = at.node || n || {};
				if(obj_has(v, Node._) && Node.soul(v)){ // ? for safety ?
					at.node._ = obj_copy(v._);
				}
				at.node = Node.soul.ify(at.node, Val.link.is(at.link));
				at.link = at.link || Val.link.ify(Node.soul(at.node));
			}
			if(tmp = env.map){
				tmp.call(env.as || {}, v,k,n, at);
				if(obj_has(n,k)){
					v = n[k];
					if(u === v){
						obj_del(n, k);
						return;
					}
					if(!(is = valid(v,k,n, at,env))){ return }
				}
			}
			if(!k){ return at.node }
			if(true === is){
				return v;
			}
			tmp = node(env, {obj: v, path: at.path.concat(k)});
			if(!tmp.node){ return }
			return tmp.link; //{'#': Node.soul(tmp.node)};
		}
		function soul(id){ var at = this;
			var prev = Val.link.is(at.link), graph = at.env.graph;
			at.link = at.link || Val.link.ify(id);
			at.link[Val.link._] = id;
			if(at.node && at.node[Node._]){
				at.node[Node._][Val.link._] = id;
			}
			if(obj_has(graph, prev)){
				graph[id] = graph[prev];
				obj_del(graph, prev);
			}
		}
		function valid(v,k,n, at,env){ var tmp;
			if(Val.is(v)){ return true }
			if(obj_is(v)){ return 1 }
			if(tmp = env.invalid){
				v = tmp.call(env.as || {}, v,k,n);
				return valid(v,k,n, at,env);
			}
			env.err = "Invalid value at '" + at.path.concat(k).join('.') + "'!";
			if(Type.list.is(v)){ env.err += " Use `.set(item)` instead of an Array." }
		}
		function seen(env, at){
			var arr = env.seen, i = arr.length, has;
			while(i--){ has = arr[i];
				if(at.obj === has.obj){ return has }
			}
			arr.push(at);
		}
	}());
	Graph.node = function(node){ DEP('graph.node'); 
		var soul = Node.soul(node);
		if(!soul){ return }
		return obj_put({}, soul, node);
	}
	;(function(){
		Graph.to = function(graph, root, opt){ DEP('graph.to'); 
			if(!graph){ return }
			var obj = {};
			opt = opt || {seen: {}};
			obj_map(graph[root], map, {obj:obj, graph: graph, opt: opt});
			return obj;
		}
		function map(v,k){ var tmp, obj;
			if(Node._ === k){
				if(obj_empty(v, Val.link._)){
					return;
				}
				this.obj[k] = obj_copy(v);
				return;
			}
			if(!(tmp = Val.link.is(v))){
				this.obj[k] = v;
				return;
			}
			if(obj = this.opt.seen[tmp]){
				this.obj[k] = obj;
				return;
			}
			this.obj[k] = this.opt.seen[tmp] = Graph.to(this.graph, tmp, this.opt);
		}
	}());
	var fn_is = Type.fn.is;
	var obj = Type.obj, obj_is = obj.is, obj_del = obj.del, obj_has = obj.has, obj_empty = obj.empty, obj_put = obj.put, obj_map = obj.map, obj_copy = obj.copy;
	var u;
	Type.graph = Type.graph || Graph;
}());
}).call(this)}).call(this,require("timers").setImmediate)
},{"timers":9}],5:[function(require,module,exports){
(function (global,Buffer){(function (){
;(function(){

  /* UNBUILD */
  function USE(arg, req){
    return req? require(arg) : arg.slice? USE[R(arg)] : function(mod, path){
      arg(mod = {exports: {}});
      USE[R(path)] = mod.exports;
    }
    function R(p){
      return p.split('/').slice(-1).toString().replace('.js','');
    }
  }
  if(typeof module !== "undefined"){ var MODULE = module }
  /* UNBUILD */

  ;USE(function(module){
    // Security, Encryption, and Authorization: SEA.js
    // MANDATORY READING: https://gun.eco/explainers/data/security.html
    // IT IS IMPLEMENTED IN A POLYFILL/SHIM APPROACH.
    // THIS IS AN EARLY ALPHA!

    if(typeof window !== "undefined"){ module.window = window }

    var tmp = module.window || module, u;
    var SEA = tmp.SEA || {};

    if(SEA.window = module.window){ SEA.window.SEA = SEA }

    try{ if(u+'' !== typeof MODULE){ MODULE.exports = SEA } }catch(e){}
    module.exports = SEA;
  })(USE, './root');

  ;USE(function(module){
    var SEA = USE('./root');
    try{ if(SEA.window){
      if(location.protocol.indexOf('s') < 0
      && location.host.indexOf('localhost') < 0
      && ! /^127\.\d+\.\d+\.\d+$/.test(location.hostname)
      && location.protocol.indexOf('file:') < 0){
        console.warn('HTTPS needed for WebCrypto in SEA, redirecting...');
        location.protocol = 'https:'; // WebCrypto does NOT work without HTTPS!
      }
    } }catch(e){}
  })(USE, './https');

  ;USE(function(module){
    var u;
    if(u+''== typeof btoa){
      if(u+'' == typeof Buffer){
        try{ global.Buffer = USE("buffer", 1).Buffer }catch(e){ console.log("Please add `buffer` to your package.json!") }
      }
      global.btoa = function(data){ return Buffer.from(data, "binary").toString("base64") };
      global.atob = function(data){ return Buffer.from(data, "base64").toString("binary") };
    }
  })(USE, './base64');

  ;USE(function(module){
    USE('./base64');
    // This is Array extended to have .toString(['utf8'|'hex'|'base64'])
    function SeaArray() {}
    Object.assign(SeaArray, { from: Array.from })
    SeaArray.prototype = Object.create(Array.prototype)
    SeaArray.prototype.toString = function(enc, start, end) { enc = enc || 'utf8'; start = start || 0;
      const length = this.length
      if (enc === 'hex') {
        const buf = new Uint8Array(this)
        return [ ...Array(((end && (end + 1)) || length) - start).keys()]
        .map((i) => buf[ i + start ].toString(16).padStart(2, '0')).join('')
      }
      if (enc === 'utf8') {
        return Array.from(
          { length: (end || length) - start },
          (_, i) => String.fromCharCode(this[ i + start])
        ).join('')
      }
      if (enc === 'base64') {
        return btoa(this)
      }
    }
    module.exports = SeaArray;
  })(USE, './array');

  ;USE(function(module){
    USE('./base64');
    // This is Buffer implementation used in SEA. Functionality is mostly
    // compatible with NodeJS 'safe-buffer' and is used for encoding conversions
    // between binary and 'hex' | 'utf8' | 'base64'
    // See documentation and validation for safe implementation in:
    // https://github.com/feross/safe-buffer#update
    var SeaArray = USE('./array');
    function SafeBuffer(...props) {
      console.warn('new SafeBuffer() is depreciated, please use SafeBuffer.from()')
      return SafeBuffer.from(...props)
    }
    SafeBuffer.prototype = Object.create(Array.prototype)
    Object.assign(SafeBuffer, {
      // (data, enc) where typeof data === 'string' then enc === 'utf8'|'hex'|'base64'
      from() {
        if (!Object.keys(arguments).length || arguments[0]==null) {
          throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
        }
        const input = arguments[0]
        let buf
        if (typeof input === 'string') {
          const enc = arguments[1] || 'utf8'
          if (enc === 'hex') {
            const bytes = input.match(/([\da-fA-F]{2})/g)
            .map((byte) => parseInt(byte, 16))
            if (!bytes || !bytes.length) {
              throw new TypeError('Invalid first argument for type \'hex\'.')
            }
            buf = SeaArray.from(bytes)
          } else if (enc === 'utf8' || 'binary' === enc) { // EDIT BY MARK: I think this is safe, tested it against a couple "binary" strings. This lets SafeBuffer match NodeJS Buffer behavior more where it safely btoas regular strings.
            const length = input.length
            const words = new Uint16Array(length)
            Array.from({ length: length }, (_, i) => words[i] = input.charCodeAt(i))
            buf = SeaArray.from(words)
          } else if (enc === 'base64') {
            const dec = atob(input)
            const length = dec.length
            const bytes = new Uint8Array(length)
            Array.from({ length: length }, (_, i) => bytes[i] = dec.charCodeAt(i))
            buf = SeaArray.from(bytes)
          } else if (enc === 'binary') { // deprecated by above comment
            buf = SeaArray.from(input) // some btoas were mishandled.
          } else {
            console.info('SafeBuffer.from unknown encoding: '+enc)
          }
          return buf
        }
        const byteLength = input.byteLength // what is going on here? FOR MARTTI
        const length = input.byteLength ? input.byteLength : input.length
        if (length) {
          let buf
          if (input instanceof ArrayBuffer) {
            buf = new Uint8Array(input)
          }
          return SeaArray.from(buf || input)
        }
      },
      // This is 'safe-buffer.alloc' sans encoding support
      alloc(length, fill = 0 /*, enc*/ ) {
        return SeaArray.from(new Uint8Array(Array.from({ length: length }, () => fill)))
      },
      // This is normal UNSAFE 'buffer.alloc' or 'new Buffer(length)' - don't use!
      allocUnsafe(length) {
        return SeaArray.from(new Uint8Array(Array.from({ length : length })))
      },
      // This puts together array of array like members
      concat(arr) { // octet array
        if (!Array.isArray(arr)) {
          throw new TypeError('First argument must be Array containing ArrayBuffer or Uint8Array instances.')
        }
        return SeaArray.from(arr.reduce((ret, item) => ret.concat(Array.from(item)), []))
      }
    })
    SafeBuffer.prototype.from = SafeBuffer.from
    SafeBuffer.prototype.toString = SeaArray.prototype.toString

    module.exports = SafeBuffer;
  })(USE, './buffer');

  ;USE(function(module){
    const SEA = USE('./root')
    const api = {Buffer: USE('./buffer')}
    var o = {}, u;

    // ideally we can move away from JSON entirely? unlikely due to compatibility issues... oh well.
    JSON.parseAsync = JSON.parseAsync || function(t,cb,r){ var u; try{ cb(u, JSON.parse(t,r)) }catch(e){ cb(e) } }
    JSON.stringifyAsync = JSON.stringifyAsync || function(v,cb,r,s){ var u; try{ cb(u, JSON.stringify(v,r,s)) }catch(e){ cb(e) } }

    api.parse = function(t,r){ return new Promise(function(res, rej){
      JSON.parseAsync(t,function(err, raw){ err? rej(err) : res(raw) },r);
    })}
    api.stringify = function(v,r,s){ return new Promise(function(res, rej){
      JSON.stringifyAsync(v,function(err, raw){ err? rej(err) : res(raw) },r,s);
    })}

    if(SEA.window){
      api.crypto = window.crypto || window.msCrypto
      api.subtle = (api.crypto||o).subtle || (api.crypto||o).webkitSubtle;
      api.TextEncoder = window.TextEncoder;
      api.TextDecoder = window.TextDecoder;
      api.random = (len) => api.Buffer.from(api.crypto.getRandomValues(new Uint8Array(api.Buffer.alloc(len))));
    }
    if(!api.TextDecoder)
    {
      const { TextEncoder, TextDecoder } = USE((u+'' == typeof MODULE?'.':'')+'./lib/text-encoding', 1);
      api.TextDecoder = TextDecoder;
      api.TextEncoder = TextEncoder;
    }
    if(!api.crypto)
    {
      try
      {
      var crypto = USE('crypto', 1);
      Object.assign(api, {
        crypto,
        random: (len) => api.Buffer.from(crypto.randomBytes(len))
      });      
      const { Crypto: WebCrypto } = USE('@peculiar/webcrypto', 1);
      api.ossl = api.subtle = new WebCrypto({directory: 'ossl'}).subtle // ECDH
    }
    catch(e){
      console.log("Please add `@peculiar/webcrypto` to your package.json!");
    }}

    module.exports = api
  })(USE, './shim');

  ;USE(function(module){
    var SEA = USE('./root');
    var shim = USE('./shim');
    var s = {};
    s.pbkdf2 = {hash: {name : 'SHA-256'}, iter: 100000, ks: 64};
    s.ecdsa = {
      pair: {name: 'ECDSA', namedCurve: 'P-256'},
      sign: {name: 'ECDSA', hash: {name: 'SHA-256'}}
    };
    s.ecdh = {name: 'ECDH', namedCurve: 'P-256'};

    // This creates Web Cryptography API compliant JWK for sign/verify purposes
    s.jwk = function(pub, d){  // d === priv
      pub = pub.split('.');
      var x = pub[0], y = pub[1];
      var jwk = {kty: "EC", crv: "P-256", x: x, y: y, ext: true};
      jwk.key_ops = d ? ['sign'] : ['verify'];
      if(d){ jwk.d = d }
      return jwk;
    };
    
    s.keyToJwk = function(keyBytes) {
      const keyB64 = keyBytes.toString('base64');
      const k = keyB64.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
      return { kty: 'oct', k: k, ext: false, alg: 'A256GCM' };
    }

    s.recall = {
      validity: 12 * 60 * 60, // internally in seconds : 12 hours
      hook: function(props){ return props } // { iat, exp, alias, remember } // or return new Promise((resolve, reject) => resolve(props)
    };

    s.check = function(t){ return (typeof t == 'string') && ('SEA{' === t.slice(0,4)) }
    s.parse = async function p(t){ try {
      var yes = (typeof t == 'string');
      if(yes && 'SEA{' === t.slice(0,4)){ t = t.slice(3) }
      return yes ? await shim.parse(t) : t;
      } catch (e) {}
      return t;
    }

    SEA.opt = s;
    module.exports = s
  })(USE, './settings');

  ;USE(function(module){
    var shim = USE('./shim');
    module.exports = async function(d, o){
      var t = (typeof d == 'string')? d : await shim.stringify(d);
      var hash = await shim.subtle.digest({name: o||'SHA-256'}, new shim.TextEncoder().encode(t));
      return shim.Buffer.from(hash);
    }
  })(USE, './sha256');

  ;USE(function(module){
    // This internal func returns SHA-1 hashed data for KeyID generation
    const __shim = USE('./shim')
    const subtle = __shim.subtle
    const ossl = __shim.ossl ? __shim.ossl : subtle
    const sha1hash = (b) => ossl.digest({name: 'SHA-1'}, new ArrayBuffer(b))
    module.exports = sha1hash
  })(USE, './sha1');

  ;USE(function(module){
    var SEA = USE('./root');
    var shim = USE('./shim');
    var S = USE('./settings');
    var sha = USE('./sha256');
    var u;

    SEA.work = SEA.work || (async (data, pair, cb, opt) => { try { // used to be named `proof`
      var salt = (pair||{}).epub || pair; // epub not recommended, salt should be random!
      opt = opt || {};
      if(salt instanceof Function){
        cb = salt;
        salt = u;
      }
      data = (typeof data == 'string')? data : await shim.stringify(data);
      if('sha' === (opt.name||'').toLowerCase().slice(0,3)){
        var rsha = shim.Buffer.from(await sha(data, opt.name), 'binary').toString(opt.encode || 'base64')
        if(cb){ try{ cb(rsha) }catch(e){console.log(e)} }
        return rsha;
      }
      salt = salt || shim.random(9);
      var key = await (shim.ossl || shim.subtle).importKey('raw', new shim.TextEncoder().encode(data), {name: opt.name || 'PBKDF2'}, false, ['deriveBits']);
      var work = await (shim.ossl || shim.subtle).deriveBits({
        name: opt.name || 'PBKDF2',
        iterations: opt.iterations || S.pbkdf2.iter,
        salt: new shim.TextEncoder().encode(opt.salt || salt),
        hash: opt.hash || S.pbkdf2.hash,
      }, key, opt.length || (S.pbkdf2.ks * 8))
      data = shim.random(data.length)  // Erase data in case of passphrase
      var r = shim.Buffer.from(work, 'binary').toString(opt.encode || 'base64')
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) { 
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.work;
  })(USE, './work');

  ;USE(function(module){
    var SEA = USE('./root');
    var shim = USE('./shim');
    var S = USE('./settings');

    SEA.name = SEA.name || (async (cb, opt) => { try {
      if(cb){ try{ cb() }catch(e){console.log(e)} }
      return;
    } catch(e) {
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    //SEA.pair = async (data, proof, cb) => { try {
    SEA.pair = SEA.pair || (async (cb, opt) => { try {

      var ecdhSubtle = shim.ossl || shim.subtle;
      // First: ECDSA keys for signing/verifying...
      var sa = await shim.subtle.generateKey({name: 'ECDSA', namedCurve: 'P-256'}, true, [ 'sign', 'verify' ])
      .then(async (keys) => {
        // privateKey scope doesn't leak out from here!
        //const { d: priv } = await shim.subtle.exportKey('jwk', keys.privateKey)
        var key = {};
        key.priv = (await shim.subtle.exportKey('jwk', keys.privateKey)).d;
        var pub = await shim.subtle.exportKey('jwk', keys.publicKey);
        //const pub = Buff.from([ x, y ].join(':')).toString('base64') // old
        key.pub = pub.x+'.'+pub.y; // new
        // x and y are already base64
        // pub is UTF8 but filename/URL safe (https://www.ietf.org/rfc/rfc3986.txt)
        // but split on a non-base64 letter.
        return key;
      })
      
      // To include PGPv4 kind of keyId:
      // const pubId = await SEA.keyid(keys.pub)
      // Next: ECDH keys for encryption/decryption...

      try{
      var dh = await ecdhSubtle.generateKey({name: 'ECDH', namedCurve: 'P-256'}, true, ['deriveKey'])
      .then(async (keys) => {
        // privateKey scope doesn't leak out from here!
        var key = {};
        key.epriv = (await ecdhSubtle.exportKey('jwk', keys.privateKey)).d;
        var pub = await ecdhSubtle.exportKey('jwk', keys.publicKey);
        //const epub = Buff.from([ ex, ey ].join(':')).toString('base64') // old
        key.epub = pub.x+'.'+pub.y; // new
        // ex and ey are already base64
        // epub is UTF8 but filename/URL safe (https://www.ietf.org/rfc/rfc3986.txt)
        // but split on a non-base64 letter.
        return key;
      })
      }catch(e){
        if(SEA.window){ throw e }
        if(e == 'Error: ECDH is not a supported algorithm'){ console.log('Ignoring ECDH...') }
        else { throw e }
      } dh = dh || {};

      var r = { pub: sa.pub, priv: sa.priv, /* pubId, */ epub: dh.epub, epriv: dh.epriv }
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) {
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.pair;
  })(USE, './pair');

  ;USE(function(module){
    var SEA = USE('./root');
    var shim = USE('./shim');
    var S = USE('./settings');
    var sha = USE('./sha256');
    var u;

    SEA.sign = SEA.sign || (async (data, pair, cb, opt) => { try {
      opt = opt || {};
      if(!(pair||opt).priv){
        if(!SEA.I){ throw 'No signing key.' }
        pair = await SEA.I(null, {what: data, how: 'sign', why: opt.why});
      }
      if(u === data){ throw '`undefined` not allowed.' }
      var json = await S.parse(data);
      var check = opt.check = opt.check || json;
      if(SEA.verify && (SEA.opt.check(check) || (check && check.s && check.m))
      && u !== await SEA.verify(check, pair)){ // don't sign if we already signed it.
        var r = await S.parse(check);
        if(!opt.raw){ r = 'SEA' + await shim.stringify(r) }
        if(cb){ try{ cb(r) }catch(e){console.log(e)} }
        return r;
      }
      var pub = pair.pub;
      var priv = pair.priv;
      var jwk = S.jwk(pub, priv);
      var hash = await sha(json);
      var sig = await (shim.ossl || shim.subtle).importKey('jwk', jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ['sign'])
      .then((key) => (shim.ossl || shim.subtle).sign({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, new Uint8Array(hash))) // privateKey scope doesn't leak out from here!
      var r = {m: json, s: shim.Buffer.from(sig, 'binary').toString(opt.encode || 'base64')}
      if(!opt.raw){ r = 'SEA' + await shim.stringify(r) }

      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) {
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.sign;
  })(USE, './sign');

  ;USE(function(module){
    var SEA = USE('./root');
    var shim = USE('./shim');
    var S = USE('./settings');
    var sha = USE('./sha256');
    var u;

    SEA.verify = SEA.verify || (async (data, pair, cb, opt) => { try {
      var json = await S.parse(data);
      if(false === pair){ // don't verify!
        var raw = await S.parse(json.m);
        if(cb){ try{ cb(raw) }catch(e){console.log(e)} }
        return raw;
      }
      opt = opt || {};
      // SEA.I // verify is free! Requires no user permission.
      var pub = pair.pub || pair;
      var key = SEA.opt.slow_leak? await SEA.opt.slow_leak(pub) : await (shim.ossl || shim.subtle).importKey('jwk', S.jwk(pub), {name: 'ECDSA', namedCurve: 'P-256'}, false, ['verify']);
      var hash = await sha(json.m);
      var buf, sig, check, tmp; try{
        buf = shim.Buffer.from(json.s, opt.encode || 'base64'); // NEW DEFAULT!
        sig = new Uint8Array(buf);
        check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash));
        if(!check){ throw "Signature did not match." }
      }catch(e){
        if(SEA.opt.fallback){
          return await SEA.opt.fall_verify(data, pair, cb, opt);
        }
      }
      var r = check? await S.parse(json.m) : u;

      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) {
      console.log(e); // mismatched owner FOR MARTTI
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.verify;
    // legacy & ossl leak mitigation:

    var knownKeys = {};
    var keyForPair = SEA.opt.slow_leak = pair => {
      if (knownKeys[pair]) return knownKeys[pair];
      var jwk = S.jwk(pair);
      knownKeys[pair] = (shim.ossl || shim.subtle).importKey("jwk", jwk, {name: 'ECDSA', namedCurve: 'P-256'}, false, ["verify"]);
      return knownKeys[pair];
    };

    var O = SEA.opt;
    SEA.opt.fall_verify = async function(data, pair, cb, opt, f){
      if(f === SEA.opt.fallback){ throw "Signature did not match" } f = f || 1;
      var tmp = data||'';
      data = SEA.opt.unpack(data) || data;
      var json = await S.parse(data), pub = pair.pub || pair, key = await SEA.opt.slow_leak(pub);
      var hash = (f <= SEA.opt.fallback)? shim.Buffer.from(await shim.subtle.digest({name: 'SHA-256'}, new shim.TextEncoder().encode(await S.parse(json.m)))) : await sha(json.m); // this line is old bad buggy code but necessary for old compatibility.
      var buf; var sig; var check; try{
        buf = shim.Buffer.from(json.s, opt.encode || 'base64') // NEW DEFAULT!
        sig = new Uint8Array(buf)
        check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash))
        if(!check){ throw "Signature did not match." }
      }catch(e){ try{
        buf = shim.Buffer.from(json.s, 'utf8') // AUTO BACKWARD OLD UTF8 DATA!
        sig = new Uint8Array(buf)
        check = await (shim.ossl || shim.subtle).verify({name: 'ECDSA', hash: {name: 'SHA-256'}}, key, sig, new Uint8Array(hash))
        }catch(e){
        if(!check){ throw "Signature did not match." }
        }
      }
      var r = check? await S.parse(json.m) : u;
      O.fall_soul = tmp['#']; O.fall_key = tmp['.']; O.fall_val = data; O.fall_state = tmp['>'];
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    }
    SEA.opt.fallback = 2;

  })(USE, './verify');

  ;USE(function(module){
    var shim = USE('./shim');
    var S = USE('./settings');
    var sha256hash = USE('./sha256');

    const importGen = async (key, salt, opt) => {
      //const combo = shim.Buffer.concat([shim.Buffer.from(key, 'utf8'), salt || shim.random(8)]).toString('utf8') // old
      opt = opt || {};
      const combo = key + (salt || shim.random(8)).toString('utf8'); // new
      const hash = shim.Buffer.from(await sha256hash(combo), 'binary')
      
      const jwkKey = S.keyToJwk(hash)      
      return await shim.subtle.importKey('jwk', jwkKey, {name:'AES-GCM'}, false, ['encrypt', 'decrypt'])
    }
    module.exports = importGen;
  })(USE, './aeskey');

  ;USE(function(module){
    var SEA = USE('./root');
    var shim = USE('./shim');
    var S = USE('./settings');
    var aeskey = USE('./aeskey');
    var u;

    SEA.encrypt = SEA.encrypt || (async (data, pair, cb, opt) => { try {
      opt = opt || {};
      var key = (pair||opt).epriv || pair;
      if(u === data){ throw '`undefined` not allowed.' }
      if(!key){
        if(!SEA.I){ throw 'No encryption key.' }
        pair = await SEA.I(null, {what: data, how: 'encrypt', why: opt.why});
        key = pair.epriv || pair;
      }
      var msg = (typeof data == 'string')? data : await shim.stringify(data);
      var rand = {s: shim.random(9), iv: shim.random(15)}; // consider making this 9 and 15 or 18 or 12 to reduce == padding.
      var ct = await aeskey(key, rand.s, opt).then((aes) => (/*shim.ossl ||*/ shim.subtle).encrypt({ // Keeping the AES key scope as private as possible...
        name: opt.name || 'AES-GCM', iv: new Uint8Array(rand.iv)
      }, aes, new shim.TextEncoder().encode(msg)));
      var r = {
        ct: shim.Buffer.from(ct, 'binary').toString(opt.encode || 'base64'),
        iv: rand.iv.toString(opt.encode || 'base64'),
        s: rand.s.toString(opt.encode || 'base64')
      }
      if(!opt.raw){ r = 'SEA' + await shim.stringify(r) }

      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) { 
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.encrypt;
  })(USE, './encrypt');

  ;USE(function(module){
    var SEA = USE('./root');
    var shim = USE('./shim');
    var S = USE('./settings');
    var aeskey = USE('./aeskey');

    SEA.decrypt = SEA.decrypt || (async (data, pair, cb, opt) => { try {
      opt = opt || {};
      var key = (pair||opt).epriv || pair;
      if(!key){
        if(!SEA.I){ throw 'No decryption key.' }
        pair = await SEA.I(null, {what: data, how: 'decrypt', why: opt.why});
        key = pair.epriv || pair;
      }
      var json = await S.parse(data);
      var buf, bufiv, bufct; try{
        buf = shim.Buffer.from(json.s, opt.encode || 'base64');
        bufiv = shim.Buffer.from(json.iv, opt.encode || 'base64');
        bufct = shim.Buffer.from(json.ct, opt.encode || 'base64');
        var ct = await aeskey(key, buf, opt).then((aes) => (/*shim.ossl ||*/ shim.subtle).decrypt({  // Keeping aesKey scope as private as possible...
          name: opt.name || 'AES-GCM', iv: new Uint8Array(bufiv), tagLength: 128
        }, aes, new Uint8Array(bufct)));
      }catch(e){
        if('utf8' === opt.encode){ throw "Could not decrypt" }
        if(SEA.opt.fallback){
          opt.encode = 'utf8';
          return await SEA.decrypt(data, pair, cb, opt);
        }
      }
      var r = await S.parse(new shim.TextDecoder('utf8').decode(ct));
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) { 
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.decrypt;
  })(USE, './decrypt');

  ;USE(function(module){
    var SEA = USE('./root');
    var shim = USE('./shim');
    var S = USE('./settings');
    // Derive shared secret from other's pub and my epub/epriv 
    SEA.secret = SEA.secret || (async (key, pair, cb, opt) => { try {
      opt = opt || {};
      if(!pair || !pair.epriv || !pair.epub){
        if(!SEA.I){ throw 'No secret mix.' }
        pair = await SEA.I(null, {what: key, how: 'secret', why: opt.why});
      }
      var pub = key.epub || key;
      var epub = pair.epub;
      var epriv = pair.epriv;
      var ecdhSubtle = shim.ossl || shim.subtle;
      var pubKeyData = keysToEcdhJwk(pub);
      var props = Object.assign({ public: await ecdhSubtle.importKey(...pubKeyData, true, []) },{name: 'ECDH', namedCurve: 'P-256'}); // Thanks to @sirpy !
      var privKeyData = keysToEcdhJwk(epub, epriv);
      var derived = await ecdhSubtle.importKey(...privKeyData, false, ['deriveBits']).then(async (privKey) => {
        // privateKey scope doesn't leak out from here!
        var derivedBits = await ecdhSubtle.deriveBits(props, privKey, 256);
        var rawBits = new Uint8Array(derivedBits);
        var derivedKey = await ecdhSubtle.importKey('raw', rawBits,{ name: 'AES-GCM', length: 256 }, true, [ 'encrypt', 'decrypt' ]);
        return ecdhSubtle.exportKey('jwk', derivedKey).then(({ k }) => k);
      })
      var r = derived;
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) {
      console.log(e);
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    // can this be replaced with settings.jwk?
    var keysToEcdhJwk = (pub, d) => { // d === priv
      //var [ x, y ] = shim.Buffer.from(pub, 'base64').toString('utf8').split(':') // old
      var [ x, y ] = pub.split('.') // new
      var jwk = d ? { d: d } : {}
      return [  // Use with spread returned value...
        'jwk',
        Object.assign(
          jwk,
          { x: x, y: y, kty: 'EC', crv: 'P-256', ext: true }
        ), // ??? refactor
        {name: 'ECDH', namedCurve: 'P-256'}
      ]
    }

    module.exports = SEA.secret;
  })(USE, './secret');

  ;USE(function(module){
    var SEA = USE('./root');
    // This is to certify that a group of "certificants" can "put" anything at a group of matched "paths" to the certificate authority's graph
    SEA.certify = SEA.certify || (async (certificants, policy = {}, authority, cb, opt = {}) => { try {
      /*
      IMPORTANT: A Certificate is like a Signature. No one knows who (authority) created/signed a cert until you put it into their graph.
      "certificants": '*' or a String (Bob.pub) || an Object that contains "pub" as a key || an array of [object || string]. These people will have the rights.
      "policy": A string ('inbox'), or a RAD/LEX object {'*': 'inbox'}, or an Array of RAD/LEX objects or strings. RAD/LEX object can contain key "?" with indexOf("*") > -1 to force key equals certificant pub. This rule is used to check against soul+'/'+key using Gun.text.match or String.match.
      "authority": Key pair or priv of the certificate authority.
      "cb": A callback function after all things are done.
      "opt": If opt.expiry (a timestamp) is set, SEA won't sync data after opt.expiry. If opt.blacklist is set, SEA will look for blacklist before syncing.
      */
      console.log('SEA.certify() is an early experimental community supported method that may change API behavior without warning in any future version.')

      certificants = (() => {
        var data = []
        if (certificants) {
          if ((typeof certificants === 'string' || Array.isArray(certificants)) && certificants.indexOf('*') !== -1) return '*'
          if (typeof certificants === 'string') {
            return certificants
          }

          if (Array.isArray(certificants)) {
            if (certificants.length === 1 && certificants[0]) return typeof certificants[0] === 'object' && certificants[0].pub ? certificants[0].pub : typeof certificants[0] === 'string' ? certificants[0] : null
            certificants.map(certificant => {
              if (typeof certificant ==='string') data.push(certificant)
              else if (typeof certificant === 'object' && certificant.pub) data.push(certificant.pub)
            })
          }

          if (typeof certificants === 'object' && certificants.pub) return certificants.pub
          return data.length > 0 ? data : null
        }
        return null
      })()

      if (!certificants) return console.log("No certificant found.")

      const expiry = opt.expiry && (typeof opt.expiry === 'number' || typeof opt.expiry === 'string') ? parseFloat(opt.expiry) : null
      const readPolicy = (policy || {}).read ? policy.read : null
      const writePolicy = (policy || {}).write ? policy.write : typeof policy === 'string' || Array.isArray(policy) || policy["+"] || policy["#"] || policy["."] || policy["="] || policy["*"] || policy[">"] || policy["<"] ? policy : null
      const readBlacklist = ((opt || {}).blacklist || {}).read && (typeof opt.blacklist.read === 'string' || opt.blacklist.read['#']) ? opt.blacklist.read : null
      const writeBlacklist = typeof (opt || {}).blacklist === 'string' || (((opt || {}).blacklist || {}).write || {})['#'] ? opt.blacklist : ((opt || {}).blacklist || {}).write && (typeof opt.blacklist.write === 'string' || opt.blacklist.write['#']) ? opt.blacklist.write : null

      if (!readPolicy && !writePolicy) return console.log("No policy found.")

      // reserved keys: c, e, r, w, rb, wb
      const data = JSON.stringify({
        c: certificants,
        ...(expiry ? {e: expiry} : {}), // inject expiry if possible
        ...(readPolicy ? {r: readPolicy }  : {}), // "r" stands for read, which means read permission.
        ...(writePolicy ? {w: writePolicy} : {}), // "w" stands for write, which means write permission.
        ...(readBlacklist ? {rb: readBlacklist} : {}), // inject READ blacklist if possible
        ...(writeBlacklist ? {wb: writeBlacklist} : {}), // inject WRITE blacklist if possible
      })

      const certificate = await SEA.sign(data, authority, null, {raw:1})

      var r = certificate
      if(!opt.raw){ r = 'SEA'+JSON.stringify(r) }
      if(cb){ try{ cb(r) }catch(e){console.log(e)} }
      return r;
    } catch(e) {
      SEA.err = e;
      if(SEA.throw){ throw e }
      if(cb){ cb() }
      return;
    }});

    module.exports = SEA.certify;
  })(USE, './certify');

  ;USE(function(module){
    var shim = USE('./shim');
    // Practical examples about usage found in tests.
    var SEA = USE('./root');
    SEA.work = USE('./work');
    SEA.sign = USE('./sign');
    SEA.verify = USE('./verify');
    SEA.encrypt = USE('./encrypt');
    SEA.decrypt = USE('./decrypt');
    SEA.certify = USE('./certify');
    //SEA.opt.aeskey = USE('./aeskey'); // not official! // this causes problems in latest WebCrypto.

    SEA.random = SEA.random || shim.random;

    // This is Buffer used in SEA and usable from Gun/SEA application also.
    // For documentation see https://nodejs.org/api/buffer.html
    SEA.Buffer = SEA.Buffer || USE('./buffer');

    // These SEA functions support now ony Promises or
    // async/await (compatible) code, use those like Promises.
    //
    // Creates a wrapper library around Web Crypto API
    // for various AES, ECDSA, PBKDF2 functions we called above.
    // Calculate public key KeyID aka PGPv4 (result: 8 bytes as hex string)
    SEA.keyid = SEA.keyid || (async (pub) => {
      try {
        // base64('base64(x):base64(y)') => shim.Buffer(xy)
        const pb = shim.Buffer.concat(
          pub.replace(/-/g, '+').replace(/_/g, '/').split('.')
          .map((t) => shim.Buffer.from(t, 'base64'))
        )
        // id is PGPv4 compliant raw key
        const id = shim.Buffer.concat([
          shim.Buffer.from([0x99, pb.length / 0x100, pb.length % 0x100]), pb
        ])
        const sha1 = await sha1hash(id)
        const hash = shim.Buffer.from(sha1, 'binary')
        return hash.toString('hex', hash.length - 8)  // 16-bit ID as hex
      } catch (e) {
        console.log(e)
        throw e
      }
    });
    // all done!
    // Obviously it is missing MANY necessary features. This is only an alpha release.
    // Please experiment with it, audit what I've done so far, and complain about what needs to be added.
    // SEA should be a full suite that is easy and seamless to use.
    // Again, scroll naer the top, where I provide an EXAMPLE of how to create a user and sign in.
    // Once logged in, the rest of the code you just read handled automatically signing/validating data.
    // But all other behavior needs to be equally easy, like opinionated ways of
    // Adding friends (trusted public keys), sending private messages, etc.
    // Cheers! Tell me what you think.
    ((SEA.window||{}).GUN||{}).SEA = SEA;

    module.exports = SEA
    // -------------- END SEA MODULES --------------------
    // -- BEGIN SEA+GUN MODULES: BUNDLED BY DEFAULT UNTIL OTHERS USE SEA ON OWN -------
  })(USE, './sea');

  ;USE(function(module){
    var SEA = USE('./sea'), Gun, u;
    if(SEA.window){
      Gun = SEA.window.GUN || {chain:{}};
    } else {
      Gun = USE((u+'' == typeof MODULE?'.':'')+'./gun', 1);
    }
    SEA.GUN = Gun;

    function User(root){ 
      this._ = {$: this};
    }
    User.prototype = (function(){ function F(){}; F.prototype = Gun.chain; return new F() }()) // Object.create polyfill
    User.prototype.constructor = User;

    // let's extend the gun chain with a `user` function.
    // only one user can be logged in at a time, per gun instance.
    Gun.chain.user = function(pub){
      var gun = this, root = gun.back(-1), user;
      if(pub){
        pub = SEA.opt.pub((pub._||'')['#']) || pub;
        return root.get('~'+pub);
      }
      if(user = root.back('user')){ return user }
      var root = (root._), at = root, uuid = at.opt.uuid || lex;
      (at = (user = at.user = gun.chain(new User))._).opt = {};
      at.opt.uuid = function(cb){
        var id = uuid(), pub = root.user;
        if(!pub || !(pub = pub.is) || !(pub = pub.pub)){ return id }
        id = '~' + pub + '/' + id;
        if(cb && cb.call){ cb(null, id) }
        return id;
      }
      return user;
    }
    function lex(){ return Gun.state().toString(36).replace('.','') }
    Gun.User = User;
    User.GUN = Gun;
    User.SEA = Gun.SEA = SEA;
    module.exports = User;
  })(USE, './user');

  ;USE(function(module){
    var u, Gun = (''+u != typeof window)? (window.Gun||{chain:{}}) : USE((''+u === typeof MODULE?'.':'')+'./gun', 1);
    Gun.chain.then = function(cb, opt){
      var gun = this, p = (new Promise(function(res, rej){
        gun.once(res, opt);
      }));
      return cb? p.then(cb) : p;
    }
  })(USE, './then');

  ;USE(function(module){
    var User = USE('./user'), SEA = User.SEA, Gun = User.GUN, noop = function(){};

    // Well first we have to actually create a user. That is what this function does.
    User.prototype.create = function(...args){
      var pair = typeof args[0] === 'object' && (args[0].pub || args[0].epub) ? args[0] : typeof args[1] === 'object' && (args[1].pub || args[1].epub) ? args[1] : null;
      var alias = pair && (pair.pub || pair.epub) ? pair.pub : typeof args[0] === 'string' ? args[0] : null;
      var pass = pair && (pair.pub || pair.epub) ? pair : alias && typeof args[1] === 'string' ? args[1] : null;
      var cb = args.filter(arg => typeof arg === 'function')[0] || null; // cb now can stand anywhere, after alias/pass or pair
      var opt = args && args.length > 1 && typeof args[args.length-1] === 'object' ? args[args.length-1] : {}; // opt is always the last parameter which typeof === 'object' and stands after cb
      
      var gun = this, cat = (gun._), root = gun.back(-1);
      cb = cb || noop;
      opt = opt || {};
      if(false !== opt.check){
        var err;
        if(!alias){ err = "No user." }
        if((pass||'').length < 8){ err = "Password too short!" }
        if(err){
          cb({err: Gun.log(err)});
          return gun;
        }
      }
      if(cat.ing){
        (cb || noop)({err: Gun.log("User is already being created or authenticated!"), wait: true});
        return gun;
      }
      cat.ing = true;
      var act = {}, u;
      act.a = function(pubs){
        act.pubs = pubs;
        if(pubs && !opt.already){
          // If we can enforce that a user name is already taken, it might be nice to try, but this is not guaranteed.
          var ack = {err: Gun.log('User already created!')};
          cat.ing = false;
          (cb || noop)(ack);
          gun.leave();
          return;
        }
        act.salt = String.random(64); // pseudo-randomly create a salt, then use PBKDF2 function to extend the password with it.
        SEA.work(pass, act.salt, act.b); // this will take some short amount of time to produce a proof, which slows brute force attacks.
      }
      act.b = function(proof){
        act.proof = proof;
        pair ? act.c(pair) : SEA.pair(act.c) // generate a brand new key pair or use the existing.
      }
      act.c = function(pair){
        var tmp
        act.pair = pair || {};
        if(tmp = cat.root.user){
          tmp._.sea = pair;
          tmp.is = {pub: pair.pub, epub: pair.epub, alias: alias};
        }
        // the user's public key doesn't need to be signed. But everything else needs to be signed with it! // we have now automated it! clean up these extra steps now!
        act.data = {pub: pair.pub};
        act.d();
      }
      act.d = function(){
        act.data.alias = alias;
        act.e();
      }
      act.e = function(){
        act.data.epub = act.pair.epub; 
        SEA.encrypt({priv: act.pair.priv, epriv: act.pair.epriv}, act.proof, act.f, {raw:1}); // to keep the private key safe, we AES encrypt it with the proof of work!
      }
      act.f = function(auth){
        act.data.auth = JSON.stringify({ek: auth, s: act.salt}); 
        act.g(act.data.auth);
      }
      act.g = function(auth){ var tmp;
        act.data.auth = act.data.auth || auth;
        root.get(tmp = '~'+act.pair.pub).put(act.data).on(act.h); // awesome, now we can actually save the user with their public key as their ID.
        var link = {}; link[tmp] = {'#': tmp}; root.get('~@'+alias).put(link).get(tmp).on(act.i); // next up, we want to associate the alias with the public key. So we add it to the alias list.
      }
      act.h = function(data, key, msg, eve){
        eve.off(); act.h.ok = 1; act.i();
      }
      act.i = function(data, key, msg, eve){
        if(eve){ act.i.ok = 1; eve.off() }
        if(!act.h.ok || !act.i.ok){ return }
        cat.ing = false;
        cb({ok: 0, pub: act.pair.pub}); // callback that the user has been created. (Note: ok = 0 because we didn't wait for disk to ack)
        if(noop === cb){ pair? gun.auth(pair) : gun.auth(alias, pass) } // if no callback is passed, auto-login after signing up.
      }
      root.get('~@'+alias).once(act.a);
      return gun;
    }
    User.prototype.leave = function(opt, cb){
      var gun = this, user = (gun.back(-1)._).user;
      if(user){
        delete user.is;
        delete user._.is;
        delete user._.sea;
      }
      if(SEA.window){
        try{var sS = {};
        sS = window.sessionStorage;
        delete sS.recall;
        delete sS.pair;
        }catch(e){};
      }
      return gun;
    }
  })(USE, './create');

  ;USE(function(module){
    var User = USE('./user'), SEA = User.SEA, Gun = User.GUN, noop = function(){};
    // now that we have created a user, we want to authenticate them!
    User.prototype.auth = function(...args){ // TODO: this PR with arguments need to be cleaned up / refactored.
      var pair = typeof args[0] === 'object' && (args[0].pub || args[0].epub) ? args[0] : typeof args[1] === 'object' && (args[1].pub || args[1].epub) ? args[1] : null;
      var alias = !pair && typeof args[0] === 'string' ? args[0] : null;
      var pass = alias && typeof args[1] === 'string' ? args[1] : null;
      var cb = args.filter(arg => typeof arg === 'function')[0] || null; // cb now can stand anywhere, after alias/pass or pair
      var opt = args && args.length > 1 && typeof args[args.length-1] === 'object' ? args[args.length-1] : {}; // opt is always the last parameter which typeof === 'object' and stands after cb
      
      var gun = this, cat = (gun._), root = gun.back(-1);
      
      if(cat.ing){
        (cb || noop)({err: Gun.log("User is already being created or authenticated!"), wait: true});
        return gun;
      }
      cat.ing = true;
      
      var act = {}, u;
      act.a = function(data){
        if(!data){ return act.b() }
        if(!data.pub){
          var tmp = []; Object.keys(data).forEach(function(k){ if('_'==k){ return } tmp.push(data[k]) })
          return act.b(tmp);
        }
        if(act.name){ return act.f(data) }
        act.c((act.data = data).auth);
      }
      act.b = function(list){
        var get = (act.list = (act.list||[]).concat(list||[])).shift();
        if(u === get){
          if(act.name){ return act.err('Your user account is not published for dApps to access, please consider syncing it online, or allowing local access by adding your device as a peer.') }
          return act.err('Wrong user or password.') 
        }
        root.get(get).once(act.a);
      }
      act.c = function(auth){
        if(u === auth){ return act.b() }
        if('string' == typeof auth){ return act.c(obj_ify(auth)) } // in case of legacy
        SEA.work(pass, (act.auth = auth).s, act.d, act.enc); // the proof of work is evidence that we've spent some time/effort trying to log in, this slows brute force.
      }
      act.d = function(proof){
        SEA.decrypt(act.auth.ek, proof, act.e, act.enc);
      }
      act.e = function(half){
        if(u === half){
          if(!act.enc){ // try old format
            act.enc = {encode: 'utf8'};
            return act.c(act.auth);
          } act.enc = null; // end backwards
          return act.b();
        }
        act.half = half;
        act.f(act.data);
      }
      act.f = function(pair){
        var half = act.half || {}, data = act.data || {};
        act.g(act.lol = {pub: pair.pub || data.pub, epub: pair.epub || data.epub, priv: pair.priv || half.priv, epriv: pair.epriv || half.epriv});
      }
      act.g = function(pair){
        if(!pair || !pair.pub || !pair.epub){ return act.b() }
        act.pair = pair;
        var user = (root._).user, at = (user._);
        var tmp = at.tag;
        var upt = at.opt;
        at = user._ = root.get('~'+pair.pub)._;
        at.opt = upt;
        // add our credentials in-memory only to our root user instance
        user.is = {pub: pair.pub, epub: pair.epub, alias: alias || pair};
        at.sea = act.pair;
        cat.ing = false;
        try{if(pass && u == (obj_ify(cat.root.graph['~'+pair.pub].auth)||'')[':']){ opt.shuffle = opt.change = pass; } }catch(e){} // migrate UTF8 & Shuffle!
        opt.change? act.z() : (cb || noop)(at);
        if(SEA.window && ((gun.back('user')._).opt||opt).remember){
          // TODO: this needs to be modular.
          try{var sS = {};
          sS = window.sessionStorage;
          sS.recall = true;
          sS.pair = JSON.stringify(pair); // auth using pair is more reliable than alias/pass
          }catch(e){}
        }
        try{
          if(root._.tag.auth){ // auth handle might not be registered yet
          (root._).on('auth', at) // TODO: Deprecate this, emit on user instead! Update docs when you do.
          } else { setTimeout(function(){ (root._).on('auth', at) },1) } // if not, hackily add a timeout.
          //at.on('auth', at) // Arrgh, this doesn't work without event "merge" code, but "merge" code causes stack overflow and crashes after logging in & trying to write data.
        }catch(e){
          Gun.log("Your 'auth' callback crashed with:", e);
        }
      }
      act.z = function(){
        // password update so encrypt private key using new pwd + salt
        act.salt = String.random(64); // pseudo-random
        SEA.work(opt.change, act.salt, act.y);
      }
      act.y = function(proof){
        SEA.encrypt({priv: act.pair.priv, epriv: act.pair.epriv}, proof, act.x, {raw:1});
      }
      act.x = function(auth){
        act.w(JSON.stringify({ek: auth, s: act.salt}));
      }
      act.w = function(auth){
        if(opt.shuffle){ // delete in future!
          console.log('migrate core account from UTF8 & shuffle');
          var tmp = {}; Object.keys(act.data).forEach(function(k){ tmp[k] = act.data[k] });
          delete tmp._;
          tmp.auth = auth;
          root.get('~'+act.pair.pub).put(tmp);
        } // end delete
        root.get('~'+act.pair.pub).get('auth').put(auth, cb || noop);
      }
      act.err = function(e){
        var ack = {err: Gun.log(e || 'User cannot be found!')};
        cat.ing = false;
        (cb || noop)(ack);
      }
      act.plugin = function(name){
        if(!(act.name = name)){ return act.err() }
        var tmp = [name];
        if('~' !== name[0]){
          tmp[1] = '~'+name;
          tmp[2] = '~@'+name;
        }
        act.b(tmp);
      }
      if(pair){
        act.g(pair);
      } else
      if(alias){
        root.get('~@'+alias).once(act.a);
      } else
      if(!alias && !pass){
        SEA.name(act.plugin);
      }
      return gun;
    }
    function obj_ify(o){
      if('string' != typeof o){ return o }
      try{o = JSON.parse(o);
      }catch(e){o={}};
      return o;
    }
  })(USE, './auth');

  ;USE(function(module){
    var User = USE('./user'), SEA = User.SEA, Gun = User.GUN;
    User.prototype.recall = function(opt, cb){
      var gun = this, root = gun.back(-1), tmp;
      opt = opt || {};
      if(opt && opt.sessionStorage){
        if(SEA.window){
          try{
            var sS = {};
            sS = window.sessionStorage;
            if(sS){
              (root._).opt.remember = true;
              ((gun.back('user')._).opt||opt).remember = true;
              if(sS.recall || sS.pair) root.user().auth(JSON.parse(sS.pair), cb); // pair is more reliable than alias/pass
            }
          }catch(e){}
        }
        return gun;
      }
      /*
        TODO: copy mhelander's expiry code back in.
        Although, we should check with community,
        should expiry be core or a plugin?
      */
      return gun;
    }
  })(USE, './recall');

  ;USE(function(module){
    var User = USE('./user'), SEA = User.SEA, Gun = User.GUN, noop = function(){};
    User.prototype.pair = function(){
      var user = this, proxy; // undeprecated, hiding with proxies.
      try{ proxy = new Proxy({DANGER:'\u2620'}, {get: function(t,p,r){
        if(!user.is || !(user._||'').sea){ return }
        return user._.sea[p];
      }})}catch(e){}
      return proxy;
    }
    // If authenticated user wants to delete his/her account, let's support it!
    User.prototype.delete = async function(alias, pass, cb){
      console.log("user.delete() IS DEPRECATED AND WILL BE MOVED TO A MODULE!!!");
      var gun = this, root = gun.back(-1), user = gun.back('user');
      try {
        user.auth(alias, pass, function(ack){
          var pub = (user.is||{}).pub;
          // Delete user data
          user.map().once(function(){ this.put(null) });
          // Wipe user data from memory
          user.leave();
          (cb || noop)({ok: 0});
        });
      } catch (e) {
        Gun.log('User.delete failed! Error:', e);
      }
      return gun;
    }
    User.prototype.alive = async function(){
      console.log("user.alive() IS DEPRECATED!!!");
      const gunRoot = this.back(-1)
      try {
        // All is good. Should we do something more with actual recalled data?
        await authRecall(gunRoot)
        return gunRoot._.user._
      } catch (e) {
        const err = 'No session!'
        Gun.log(err)
        throw { err }
      }
    }
    User.prototype.trust = async function(user){
      console.log("`.trust` API MAY BE DELETED OR CHANGED OR RENAMED, DO NOT USE!");
      // TODO: BUG!!! SEA `node` read listener needs to be async, which means core needs to be async too.
      //gun.get('alice').get('age').trust(bob);
      if (Gun.is(user)) {
        user.get('pub').get((ctx, ev) => {
          console.log(ctx, ev)
        })
      }
      user.get('trust').get(path).put(theirPubkey);

      // do a lookup on this gun chain directly (that gets bob's copy of the data)
      // do a lookup on the metadata trust table for this path (that gets all the pubkeys allowed to write on this path)
      // do a lookup on each of those pubKeys ON the path (to get the collab data "layers")
      // THEN you perform Jachen's mix operation
      // and return the result of that to...
    }
    User.prototype.grant = function(to, cb){
      console.log("`.grant` API MAY BE DELETED OR CHANGED OR RENAMED, DO NOT USE!");
      var gun = this, user = gun.back(-1).user(), pair = user._.sea, path = '';
      gun.back(function(at){ if(at.is){ return } path += (at.get||'') });
      (async function(){
      var enc, sec = await user.get('grant').get(pair.pub).get(path).then();
      sec = await SEA.decrypt(sec, pair);
      if(!sec){
        sec = SEA.random(16).toString();
        enc = await SEA.encrypt(sec, pair);
        user.get('grant').get(pair.pub).get(path).put(enc);
      }
      var pub = to.get('pub').then();
      var epub = to.get('epub').then();
      pub = await pub; epub = await epub;
      var dh = await SEA.secret(epub, pair);
      enc = await SEA.encrypt(sec, dh);
      user.get('grant').get(pub).get(path).put(enc, cb);
      }());
      return gun;
    }
    User.prototype.secret = function(data, cb){
      console.log("`.secret` API MAY BE DELETED OR CHANGED OR RENAMED, DO NOT USE!");
      var gun = this, user = gun.back(-1).user(), pair = user.pair(), path = '';
      gun.back(function(at){ if(at.is){ return } path += (at.get||'') });
      (async function(){
      var enc, sec = await user.get('trust').get(pair.pub).get(path).then();
      sec = await SEA.decrypt(sec, pair);
      if(!sec){
        sec = SEA.random(16).toString();
        enc = await SEA.encrypt(sec, pair);
        user.get('trust').get(pair.pub).get(path).put(enc);
      }
      enc = await SEA.encrypt(data, sec);
      gun.put(enc, cb);
      }());
      return gun;
    }

    /**
     * returns the decrypted value, encrypted by secret
     * @returns {Promise<any>}
     // Mark needs to review 1st before officially supported
    User.prototype.decrypt = function(cb) {
      let gun = this,
        path = ''
      gun.back(function(at) {
        if (at.is) {
          return
        }
        path += at.get || ''
      })
      return gun
        .then(async data => {
          if (data == null) {
            return
          }
          const user = gun.back(-1).user()
          const pair = user.pair()
          let sec = await user
            .get('trust')
            .get(pair.pub)
            .get(path)
          sec = await SEA.decrypt(sec, pair)
          if (!sec) {
            return data
          }
          let decrypted = await SEA.decrypt(data, sec)
          return decrypted
        })
        .then(res => {
          cb && cb(res)
          return res
        })
    }
    */
    module.exports = User
  })(USE, './share');

  ;USE(function(module){
    var SEA = USE('./sea'), S = USE('./settings'), noop = function() {}, u;
    var Gun = (''+u != typeof window)? (window.Gun||{on:noop}) : USE((''+u === typeof MODULE?'.':'')+'./gun', 1);
    // After we have a GUN extension to make user registration/login easy, we then need to handle everything else.

    // We do this with a GUN adapter, we first listen to when a gun instance is created (and when its options change)
    Gun.on('opt', function(at){
      if(!at.sea){ // only add SEA once per instance, on the "at" context.
        at.sea = {own: {}};
        at.on('put', check, at); // SEA now runs its firewall on HAM diffs, not all i/o.
      }
      this.to.next(at); // make sure to call the "next" middleware adapter.
    });

    // Alright, this next adapter gets run at the per node level in the graph database.
    // correction: 2020 it gets run on each key/value pair in a node upon a HAM diff.
    // This will let us verify that every property on a node has a value signed by a public key we trust.
    // If the signature does not match, the data is just `undefined` so it doesn't get passed on.
    // If it does match, then we transform the in-memory "view" of the data into its plain value (without the signature).
    // Now NOTE! Some data is "system" data, not user data. Example: List of public keys, aliases, etc.
    // This data is self-enforced (the value can only match its ID), but that is handled in the `security` function.
    // From the self-enforced data, we can see all the edges in the graph that belong to a public key.
    // Example: ~ASDF is the ID of a node with ASDF as its public key, signed alias and salt, and
    // its encrypted private key, but it might also have other signed values on it like `profile = <ID>` edge.
    // Using that directed edge's ID, we can then track (in memory) which IDs belong to which keys.
    // Here is a problem: Multiple public keys can "claim" any node's ID, so this is dangerous!
    // This means we should ONLY trust our "friends" (our key ring) public keys, not any ones.
    // I have not yet added that to SEA yet in this alpha release. That is coming soon, but beware in the meanwhile!

    function check(msg){ // REVISE / IMPROVE, NO NEED TO PASS MSG/EVE EACH SUB?
      var eve = this, at = eve.as, put = msg.put, soul = put['#'], key = put['.'], val = put[':'], state = put['>'], id = msg['#'], tmp;
      if(!soul || !key){ return }
      if((msg._||'').faith && (at.opt||'').faith && 'function' == typeof msg._){
        SEA.opt.pack(put, function(raw){
        SEA.verify(raw, false, function(data){ // this is synchronous if false
          put['='] = SEA.opt.unpack(data);
          eve.to.next(msg);
        })})
        return 
      }
      var no = function(why){ at.on('in', {'@': id, err: msg.err = why}) }; // exploit internal relay stun for now, maybe violates spec, but testing for now. // Note: this may be only the sharded message, not original batch.
      //var no = function(why){ msg.ack(why) };
      (msg._||'').DBG && ((msg._||'').DBG.c = +new Date);
      if(0 <= soul.indexOf('<?')){ // special case for "do not sync data X old" forget
        // 'a~pub.key/b<?9'
        tmp = parseFloat(soul.split('<?')[1]||'');
        if(tmp && (state < (Gun.state() - (tmp * 1000)))){ // sec to ms
          (tmp = msg._) && (tmp.stun) && (tmp.stun--); // THIS IS BAD CODE! It assumes GUN internals do something that will probably change in future, but hacking in now.
          return; // omit!
        }
      }
      
      if('~@' === soul){  // special case for shared system data, the list of aliases.
        check.alias(eve, msg, val, key, soul, at, no); return;
      }
      if('~@' === soul.slice(0,2)){ // special case for shared system data, the list of public keys for an alias.
        check.pubs(eve, msg, val, key, soul, at, no); return;
      }
      //if('~' === soul.slice(0,1) && 2 === (tmp = soul.slice(1)).split('.').length){ // special case, account data for a public key.
      if(tmp = SEA.opt.pub(soul)){ // special case, account data for a public key.
        check.pub(eve, msg, val, key, soul, at, no, at.user||'', tmp); return;
      }
      if(0 <= soul.indexOf('#')){ // special case for content addressing immutable hashed data.
        check.hash(eve, msg, val, key, soul, at, no); return;
      } 
      check.any(eve, msg, val, key, soul, at, no, at.user||''); return;
      eve.to.next(msg); // not handled
    }
    check.hash = function(eve, msg, val, key, soul, at, no){
      SEA.work(val, null, function(data){
        if(data && data === key.split('#').slice(-1)[0]){ return eve.to.next(msg) }
        no("Data hash not same as hash!");
      }, {name: 'SHA-256'});
    }
    check.alias = function(eve, msg, val, key, soul, at, no){ // Example: {_:#~@, ~@alice: {#~@alice}}
      if(!val){ return no("Data must exist!") } // data MUST exist
      if('~@'+key === link_is(val)){ return eve.to.next(msg) } // in fact, it must be EXACTLY equal to itself
      no("Alias not same!"); // if it isn't, reject.
    };
    check.pubs = function(eve, msg, val, key, soul, at, no){ // Example: {_:#~@alice, ~asdf: {#~asdf}}
      if(!val){ return no("Alias must exist!") } // data MUST exist
      if(key === link_is(val)){ return eve.to.next(msg) } // and the ID must be EXACTLY equal to its property
      no("Alias not same!"); // that way nobody can tamper with the list of public keys.
    };
    check.pub = async function(eve, msg, val, key, soul, at, no, user, pub){ var tmp // Example: {_:#~asdf, hello:'world'~fdsa}}
      const raw = await S.parse(val) || {}
      const verify = (certificate, certificant, cb) => {
        if (certificate.m && certificate.s && certificant && pub)
          // now verify certificate
          return SEA.verify(certificate, pub, data => { // check if "pub" (of the graph owner) really issued this cert
            if (u !== data && u !== data.e && msg.put['>'] && msg.put['>'] > parseFloat(data.e)) return no("Certificate expired.") // certificate expired
            // "data.c" = a list of certificants/certified users
            // "data.w" = lex WRITE permission, in the future, there will be "data.r" which means lex READ permission
            if (u !== data && data.c && data.w && (data.c === certificant || data.c.indexOf('*' || certificant) > -1)) {
              // ok, now "certificant" is in the "certificants" list, but is "path" allowed? Check path
              let path = soul.indexOf('/') > -1 ? soul.replace(soul.substring(0, soul.indexOf('/') + 1), '') : ''
              String.match = String.match || Gun.text.match
              const w = Array.isArray(data.w) ? data.w : typeof data.w === 'object' || typeof data.w === 'string' ? [data.w] : []
              for (const lex of w) {
                if ((String.match(path, lex['#']) && String.match(key, lex['.'])) || (!lex['.'] && String.match(path, lex['#'])) || (!lex['#'] && String.match(key, lex['.'])) || String.match((path ? path + '/' + key : key), lex['#'] || lex)) {
                  // is Certificant forced to present in Path
                  if (lex['+'] && lex['+'].indexOf('*') > -1 && path && path.indexOf(certificant) == -1 && key.indexOf(certificant) == -1) return no(`Path "${path}" or key "${key}" must contain string "${certificant}".`)
                  // path is allowed, but is there any WRITE blacklist? Check it out
                  if (data.wb && (typeof data.wb === 'string' || ((data.wb || {})['#']))) { // "data.wb" = path to the WRITE blacklist
                    var root = at.$.back(-1)
                    if (typeof data.wb === 'string' && '~' !== data.wb.slice(0, 1)) root = root.get('~' + pub)
                    return root.get(data.wb).get(certificant).once(value => {
                      if (value && (value === 1 || value === true)) return no("Certificant blacklisted.")
                      return cb(data)
                    })
                  }
                  return cb(data)
                }
              }
              return no("Certificate verification fail.")
            }
          })
        return
      }
      
      if ('pub' === key && '~' + pub === soul) {
        if (val === pub) return eve.to.next(msg) // the account MUST match `pub` property that equals the ID of the public key.
        return no("Account not same!")
      }

      if ((tmp = user.is) && tmp.pub && !raw['*'] && !raw['+'] && (pub === tmp.pub || (pub !== tmp.pub && ((msg._.msg || {}).opt || {}).cert))){
        SEA.opt.pack(msg.put, packed => {
          SEA.sign(packed, (user._).sea, async function(data) {
            if (u === data) return no(SEA.err || 'Signature fail.')
            msg.put[':'] = {':': tmp = SEA.opt.unpack(data.m), '~': data.s}
            msg.put['='] = tmp
  
            // if writing to own graph, just allow it
            if (pub === user.is.pub) {
              if (tmp = link_is(val)) (at.sea.own[tmp] = at.sea.own[tmp] || {})[pub] = 1
              JSON.stringifyAsync(msg.put[':'], function(err,s){
                if(err){ return no(err || "Stringify error.") }
                msg.put[':'] = s;
                return eve.to.next(msg);
              })
              return
            }
  
            // if writing to other's graph, check if cert exists then try to inject cert into put, also inject self pub so that everyone can verify the put
            if (pub !== user.is.pub && ((msg._.msg || {}).opt || {}).cert) {
              const cert = await S.parse(msg._.msg.opt.cert)
              // even if cert exists, we must verify it
              if (cert && cert.m && cert.s)
                verify(cert, user.is.pub, _ => {
                  msg.put[':']['+'] = cert // '+' is a certificate
                  msg.put[':']['*'] = user.is.pub // '*' is pub of the user who puts
                  JSON.stringifyAsync(msg.put[':'], function(err,s){
                    if(err){ return no(err || "Stringify error.") }
                    msg.put[':'] = s;
                    return eve.to.next(msg);
                  })
                  return
                })
            }
          }, {raw: 1})
        })
        return;
      }

      SEA.opt.pack(msg.put, packed => {
        SEA.verify(packed, raw['*'] || pub, function(data){ var tmp;
          data = SEA.opt.unpack(data);
          if (u === data) return no("Unverified data.") // make sure the signature matches the account it claims to be on. // reject any updates that are signed with a mismatched account.
          if ((tmp = link_is(data)) && pub === SEA.opt.pub(tmp)) (at.sea.own[tmp] = at.sea.own[tmp] || {})[pub] = 1
          
          // check if cert ('+') and putter's pub ('*') exist
          if (raw['+'] && raw['+']['m'] && raw['+']['s'] && raw['*'])
            // now verify certificate
            verify(raw['+'], raw['*'], _ => {
              msg.put['='] = data;
              return eve.to.next(msg);
            })
          else {
            msg.put['='] = data;
            return eve.to.next(msg);
          }
        });
      })
      return
    };
    check.any = function(eve, msg, val, key, soul, at, no, user){ var tmp, pub;
      if(at.opt.secure){ return no("Soul missing public key at '" + key + "'.") }
      // TODO: Ask community if should auto-sign non user-graph data.
      at.on('secure', function(msg){ this.off();
        if(!at.opt.secure){ return eve.to.next(msg) }
        no("Data cannot be changed.");
      }).on.on('secure', msg);
      return;
    }

    var valid = Gun.valid, link_is = function(d,l){ return 'string' == typeof (l = valid(d)) && l }, state_ify = (Gun.state||'').ify;

    var pubcut = /[^\w_-]/; // anything not alphanumeric or _ -
    SEA.opt.pub = function(s){
      if(!s){ return }
      s = s.split('~');
      if(!s || !(s = s[1])){ return }
      s = s.split(pubcut).slice(0,2);
      if(!s || 2 != s.length){ return }
      if('@' === (s[0]||'')[0]){ return }
      s = s.slice(0,2).join('.');
      return s;
    }
    SEA.opt.stringy = function(t){
      // TODO: encrypt etc. need to check string primitive. Make as breaking change.
    }
    SEA.opt.pack = function(d,cb,k, n,s){ var tmp, f; // pack for verifying
      if(SEA.opt.check(d)){ return cb(d) }
      if(d && d['#'] && d['.'] && d['>']){ tmp = d[':']; f = 1 }
      JSON.parseAsync(f? tmp : d, function(err, meta){
        var sig = ((u !== (meta||'')[':']) && (meta||'')['~']); // or just ~ check?
        if(!sig){ cb(d); return }
        cb({m: {'#':s||d['#'],'.':k||d['.'],':':(meta||'')[':'],'>':d['>']||Gun.state.is(n, k)}, s: sig});
      });
    }
    var O = SEA.opt;
    SEA.opt.unpack = function(d, k, n){ var tmp;
      if(u === d){ return }
      if(d && (u !== (tmp = d[':']))){ return tmp }
      k = k || O.fall_key; if(!n && O.fall_val){ n = {}; n[k] = O.fall_val }
      if(!k || !n){ return }
      if(d === n[k]){ return d }
      if(!SEA.opt.check(n[k])){ return d }
      var soul = (n && n._ && n._['#']) || O.fall_soul, s = Gun.state.is(n, k) || O.fall_state;
      if(d && 4 === d.length && soul === d[0] && k === d[1] && fl(s) === fl(d[3])){
        return d[2];
      }
      if(s < SEA.opt.shuffle_attack){
        return d;
      }
    }
    SEA.opt.shuffle_attack = 1546329600000; // Jan 1, 2019
    var fl = Math.floor; // TODO: Still need to fix inconsistent state issue.
    // TODO: Potential bug? If pub/priv key starts with `-`? IDK how possible.

  })(USE, './index');
}());
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"buffer":2}],6:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],7:[function(require,module,exports){
/*!
 * jQuery JavaScript Library v3.6.0
 * https://jquery.com/
 *
 * Includes Sizzle.js
 * https://sizzlejs.com/
 *
 * Copyright OpenJS Foundation and other contributors
 * Released under the MIT license
 * https://jquery.org/license
 *
 * Date: 2021-03-02T17:08Z
 */
( function( global, factory ) {

	"use strict";

	if ( typeof module === "object" && typeof module.exports === "object" ) {

		// For CommonJS and CommonJS-like environments where a proper `window`
		// is present, execute the factory and get jQuery.
		// For environments that do not have a `window` with a `document`
		// (such as Node.js), expose a factory as module.exports.
		// This accentuates the need for the creation of a real `window`.
		// e.g. var jQuery = require("jquery")(window);
		// See ticket #14549 for more info.
		module.exports = global.document ?
			factory( global, true ) :
			function( w ) {
				if ( !w.document ) {
					throw new Error( "jQuery requires a window with a document" );
				}
				return factory( w );
			};
	} else {
		factory( global );
	}

// Pass this if window is not defined yet
} )( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

// Edge <= 12 - 13+, Firefox <=18 - 45+, IE 10 - 11, Safari 5.1 - 9+, iOS 6 - 9.1
// throw exceptions when non-strict code (e.g., ASP.NET 4.5) accesses strict mode
// arguments.callee.caller (trac-13335). But as of jQuery 3.0 (2016), strict mode should be common
// enough that all such attempts are guarded in a try block.
"use strict";

var arr = [];

var getProto = Object.getPrototypeOf;

var slice = arr.slice;

var flat = arr.flat ? function( array ) {
	return arr.flat.call( array );
} : function( array ) {
	return arr.concat.apply( [], array );
};


var push = arr.push;

var indexOf = arr.indexOf;

var class2type = {};

var toString = class2type.toString;

var hasOwn = class2type.hasOwnProperty;

var fnToString = hasOwn.toString;

var ObjectFunctionString = fnToString.call( Object );

var support = {};

var isFunction = function isFunction( obj ) {

		// Support: Chrome <=57, Firefox <=52
		// In some browsers, typeof returns "function" for HTML <object> elements
		// (i.e., `typeof document.createElement( "object" ) === "function"`).
		// We don't want to classify *any* DOM node as a function.
		// Support: QtWeb <=3.8.5, WebKit <=534.34, wkhtmltopdf tool <=0.12.5
		// Plus for old WebKit, typeof returns "function" for HTML collections
		// (e.g., `typeof document.getElementsByTagName("div") === "function"`). (gh-4756)
		return typeof obj === "function" && typeof obj.nodeType !== "number" &&
			typeof obj.item !== "function";
	};


var isWindow = function isWindow( obj ) {
		return obj != null && obj === obj.window;
	};


var document = window.document;



	var preservedScriptAttributes = {
		type: true,
		src: true,
		nonce: true,
		noModule: true
	};

	function DOMEval( code, node, doc ) {
		doc = doc || document;

		var i, val,
			script = doc.createElement( "script" );

		script.text = code;
		if ( node ) {
			for ( i in preservedScriptAttributes ) {

				// Support: Firefox 64+, Edge 18+
				// Some browsers don't support the "nonce" property on scripts.
				// On the other hand, just using `getAttribute` is not enough as
				// the `nonce` attribute is reset to an empty string whenever it
				// becomes browsing-context connected.
				// See https://github.com/whatwg/html/issues/2369
				// See https://html.spec.whatwg.org/#nonce-attributes
				// The `node.getAttribute` check was added for the sake of
				// `jQuery.globalEval` so that it can fake a nonce-containing node
				// via an object.
				val = node[ i ] || node.getAttribute && node.getAttribute( i );
				if ( val ) {
					script.setAttribute( i, val );
				}
			}
		}
		doc.head.appendChild( script ).parentNode.removeChild( script );
	}


function toType( obj ) {
	if ( obj == null ) {
		return obj + "";
	}

	// Support: Android <=2.3 only (functionish RegExp)
	return typeof obj === "object" || typeof obj === "function" ?
		class2type[ toString.call( obj ) ] || "object" :
		typeof obj;
}
/* global Symbol */
// Defining this global in .eslintrc.json would create a danger of using the global
// unguarded in another place, it seems safer to define global only for this module



var
	version = "3.6.0",

	// Define a local copy of jQuery
	jQuery = function( selector, context ) {

		// The jQuery object is actually just the init constructor 'enhanced'
		// Need init if jQuery is called (just allow error to be thrown if not included)
		return new jQuery.fn.init( selector, context );
	};

jQuery.fn = jQuery.prototype = {

	// The current version of jQuery being used
	jquery: version,

	constructor: jQuery,

	// The default length of a jQuery object is 0
	length: 0,

	toArray: function() {
		return slice.call( this );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {

		// Return all the elements in a clean array
		if ( num == null ) {
			return slice.call( this );
		}

		// Return just the one element from the set
		return num < 0 ? this[ num + this.length ] : this[ num ];
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems ) {

		// Build a new jQuery matched element set
		var ret = jQuery.merge( this.constructor(), elems );

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	each: function( callback ) {
		return jQuery.each( this, callback );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map( this, function( elem, i ) {
			return callback.call( elem, i, elem );
		} ) );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ) );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	even: function() {
		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
			return ( i + 1 ) % 2;
		} ) );
	},

	odd: function() {
		return this.pushStack( jQuery.grep( this, function( _elem, i ) {
			return i % 2;
		} ) );
	},

	eq: function( i ) {
		var len = this.length,
			j = +i + ( i < 0 ? len : 0 );
		return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
	},

	end: function() {
		return this.prevObject || this.constructor();
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: arr.sort,
	splice: arr.splice
};

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[ 0 ] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;

		// Skip the boolean and the target
		target = arguments[ i ] || {};
		i++;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !isFunction( target ) ) {
		target = {};
	}

	// Extend jQuery itself if only one argument is passed
	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {

		// Only deal with non-null/undefined values
		if ( ( options = arguments[ i ] ) != null ) {

			// Extend the base object
			for ( name in options ) {
				copy = options[ name ];

				// Prevent Object.prototype pollution
				// Prevent never-ending loop
				if ( name === "__proto__" || target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
					( copyIsArray = Array.isArray( copy ) ) ) ) {
					src = target[ name ];

					// Ensure proper type for the source value
					if ( copyIsArray && !Array.isArray( src ) ) {
						clone = [];
					} else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
						clone = {};
					} else {
						clone = src;
					}
					copyIsArray = false;

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend( {

	// Unique for each copy of jQuery on the page
	expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

	// Assume jQuery is ready without the ready module
	isReady: true,

	error: function( msg ) {
		throw new Error( msg );
	},

	noop: function() {},

	isPlainObject: function( obj ) {
		var proto, Ctor;

		// Detect obvious negatives
		// Use toString instead of jQuery.type to catch host objects
		if ( !obj || toString.call( obj ) !== "[object Object]" ) {
			return false;
		}

		proto = getProto( obj );

		// Objects with no prototype (e.g., `Object.create( null )`) are plain
		if ( !proto ) {
			return true;
		}

		// Objects with prototype are plain iff they were constructed by a global Object function
		Ctor = hasOwn.call( proto, "constructor" ) && proto.constructor;
		return typeof Ctor === "function" && fnToString.call( Ctor ) === ObjectFunctionString;
	},

	isEmptyObject: function( obj ) {
		var name;

		for ( name in obj ) {
			return false;
		}
		return true;
	},

	// Evaluates a script in a provided context; falls back to the global one
	// if not specified.
	globalEval: function( code, options, doc ) {
		DOMEval( code, { nonce: options && options.nonce }, doc );
	},

	each: function( obj, callback ) {
		var length, i = 0;

		if ( isArrayLike( obj ) ) {
			length = obj.length;
			for ( ; i < length; i++ ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		} else {
			for ( i in obj ) {
				if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
					break;
				}
			}
		}

		return obj;
	},

	// results is for internal usage only
	makeArray: function( arr, results ) {
		var ret = results || [];

		if ( arr != null ) {
			if ( isArrayLike( Object( arr ) ) ) {
				jQuery.merge( ret,
					typeof arr === "string" ?
						[ arr ] : arr
				);
			} else {
				push.call( ret, arr );
			}
		}

		return ret;
	},

	inArray: function( elem, arr, i ) {
		return arr == null ? -1 : indexOf.call( arr, elem, i );
	},

	// Support: Android <=4.0 only, PhantomJS 1 only
	// push.apply(_, arraylike) throws on ancient WebKit
	merge: function( first, second ) {
		var len = +second.length,
			j = 0,
			i = first.length;

		for ( ; j < len; j++ ) {
			first[ i++ ] = second[ j ];
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, invert ) {
		var callbackInverse,
			matches = [],
			i = 0,
			length = elems.length,
			callbackExpect = !invert;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( ; i < length; i++ ) {
			callbackInverse = !callback( elems[ i ], i );
			if ( callbackInverse !== callbackExpect ) {
				matches.push( elems[ i ] );
			}
		}

		return matches;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var length, value,
			i = 0,
			ret = [];

		// Go through the array, translating each of the items to their new values
		if ( isArrayLike( elems ) ) {
			length = elems.length;
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}

		// Go through every key on the object,
		} else {
			for ( i in elems ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret.push( value );
				}
			}
		}

		// Flatten any nested arrays
		return flat( ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// jQuery.support is not used in Core but other projects attach their
	// properties to it so it needs to exist.
	support: support
} );

if ( typeof Symbol === "function" ) {
	jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
}

// Populate the class2type map
jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
	function( _i, name ) {
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	} );

function isArrayLike( obj ) {

	// Support: real iOS 8.2 only (not reproducible in simulator)
	// `in` check used to prevent JIT error (gh-2145)
	// hasOwn isn't used here due to false negatives
	// regarding Nodelist length in IE
	var length = !!obj && "length" in obj && obj.length,
		type = toType( obj );

	if ( isFunction( obj ) || isWindow( obj ) ) {
		return false;
	}

	return type === "array" || length === 0 ||
		typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
var Sizzle =
/*!
 * Sizzle CSS Selector Engine v2.3.6
 * https://sizzlejs.com/
 *
 * Copyright JS Foundation and other contributors
 * Released under the MIT license
 * https://js.foundation/
 *
 * Date: 2021-02-16
 */
( function( window ) {
var i,
	support,
	Expr,
	getText,
	isXML,
	tokenize,
	compile,
	select,
	outermostContext,
	sortInput,
	hasDuplicate,

	// Local document vars
	setDocument,
	document,
	docElem,
	documentIsHTML,
	rbuggyQSA,
	rbuggyMatches,
	matches,
	contains,

	// Instance-specific data
	expando = "sizzle" + 1 * new Date(),
	preferredDoc = window.document,
	dirruns = 0,
	done = 0,
	classCache = createCache(),
	tokenCache = createCache(),
	compilerCache = createCache(),
	nonnativeSelectorCache = createCache(),
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
		}
		return 0;
	},

	// Instance methods
	hasOwn = ( {} ).hasOwnProperty,
	arr = [],
	pop = arr.pop,
	pushNative = arr.push,
	push = arr.push,
	slice = arr.slice,

	// Use a stripped-down indexOf as it's faster than native
	// https://jsperf.com/thor-indexof-vs-for/5
	indexOf = function( list, elem ) {
		var i = 0,
			len = list.length;
		for ( ; i < len; i++ ) {
			if ( list[ i ] === elem ) {
				return i;
			}
		}
		return -1;
	},

	booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|" +
		"ismap|loop|multiple|open|readonly|required|scoped",

	// Regular expressions

	// http://www.w3.org/TR/css3-selectors/#whitespace
	whitespace = "[\\x20\\t\\r\\n\\f]",

	// https://www.w3.org/TR/css-syntax-3/#ident-token-diagram
	identifier = "(?:\\\\[\\da-fA-F]{1,6}" + whitespace +
		"?|\\\\[^\\r\\n\\f]|[\\w-]|[^\0-\\x7f])+",

	// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
	attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +

		// Operator (capture 2)
		"*([*^$|!~]?=)" + whitespace +

		// "Attribute values must be CSS identifiers [capture 5]
		// or strings [capture 3 or capture 4]"
		"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" +
		whitespace + "*\\]",

	pseudos = ":(" + identifier + ")(?:\\((" +

		// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
		// 1. quoted (capture 3; capture 4 or capture 5)
		"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +

		// 2. simple (capture 6)
		"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +

		// 3. anything else (capture 2)
		".*" +
		")\\)|)",

	// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
	rwhitespace = new RegExp( whitespace + "+", "g" ),
	rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" +
		whitespace + "+$", "g" ),

	rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
	rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace +
		"*" ),
	rdescend = new RegExp( whitespace + "|>" ),

	rpseudo = new RegExp( pseudos ),
	ridentifier = new RegExp( "^" + identifier + "$" ),

	matchExpr = {
		"ID": new RegExp( "^#(" + identifier + ")" ),
		"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
		"TAG": new RegExp( "^(" + identifier + "|[*])" ),
		"ATTR": new RegExp( "^" + attributes ),
		"PSEUDO": new RegExp( "^" + pseudos ),
		"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" +
			whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" +
			whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
		"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),

		// For use in libraries implementing .is()
		// We use this for POS matching in `select`
		"needsContext": new RegExp( "^" + whitespace +
			"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace +
			"*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
	},

	rhtml = /HTML$/i,
	rinputs = /^(?:input|select|textarea|button)$/i,
	rheader = /^h\d$/i,

	rnative = /^[^{]+\{\s*\[native \w/,

	// Easily-parseable/retrievable ID or TAG or CLASS selectors
	rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

	rsibling = /[+~]/,

	// CSS escapes
	// http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
	runescape = new RegExp( "\\\\[\\da-fA-F]{1,6}" + whitespace + "?|\\\\([^\\r\\n\\f])", "g" ),
	funescape = function( escape, nonHex ) {
		var high = "0x" + escape.slice( 1 ) - 0x10000;

		return nonHex ?

			// Strip the backslash prefix from a non-hex escape sequence
			nonHex :

			// Replace a hexadecimal escape sequence with the encoded Unicode code point
			// Support: IE <=11+
			// For values outside the Basic Multilingual Plane (BMP), manually construct a
			// surrogate pair
			high < 0 ?
				String.fromCharCode( high + 0x10000 ) :
				String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
	},

	// CSS string/identifier serialization
	// https://drafts.csswg.org/cssom/#common-serializing-idioms
	rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
	fcssescape = function( ch, asCodePoint ) {
		if ( asCodePoint ) {

			// U+0000 NULL becomes U+FFFD REPLACEMENT CHARACTER
			if ( ch === "\0" ) {
				return "\uFFFD";
			}

			// Control characters and (dependent upon position) numbers get escaped as code points
			return ch.slice( 0, -1 ) + "\\" +
				ch.charCodeAt( ch.length - 1 ).toString( 16 ) + " ";
		}

		// Other potentially-special ASCII characters get backslash-escaped
		return "\\" + ch;
	},

	// Used for iframes
	// See setDocument()
	// Removing the function wrapper causes a "Permission Denied"
	// error in IE
	unloadHandler = function() {
		setDocument();
	},

	inDisabledFieldset = addCombinator(
		function( elem ) {
			return elem.disabled === true && elem.nodeName.toLowerCase() === "fieldset";
		},
		{ dir: "parentNode", next: "legend" }
	);

// Optimize for push.apply( _, NodeList )
try {
	push.apply(
		( arr = slice.call( preferredDoc.childNodes ) ),
		preferredDoc.childNodes
	);

	// Support: Android<4.0
	// Detect silently failing push.apply
	// eslint-disable-next-line no-unused-expressions
	arr[ preferredDoc.childNodes.length ].nodeType;
} catch ( e ) {
	push = { apply: arr.length ?

		// Leverage slice if possible
		function( target, els ) {
			pushNative.apply( target, slice.call( els ) );
		} :

		// Support: IE<9
		// Otherwise append directly
		function( target, els ) {
			var j = target.length,
				i = 0;

			// Can't trust NodeList.length
			while ( ( target[ j++ ] = els[ i++ ] ) ) {}
			target.length = j - 1;
		}
	};
}

function Sizzle( selector, context, results, seed ) {
	var m, i, elem, nid, match, groups, newSelector,
		newContext = context && context.ownerDocument,

		// nodeType defaults to 9, since context defaults to document
		nodeType = context ? context.nodeType : 9;

	results = results || [];

	// Return early from calls with invalid selector or context
	if ( typeof selector !== "string" || !selector ||
		nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

		return results;
	}

	// Try to shortcut find operations (as opposed to filters) in HTML documents
	if ( !seed ) {
		setDocument( context );
		context = context || document;

		if ( documentIsHTML ) {

			// If the selector is sufficiently simple, try using a "get*By*" DOM method
			// (excepting DocumentFragment context, where the methods don't exist)
			if ( nodeType !== 11 && ( match = rquickExpr.exec( selector ) ) ) {

				// ID selector
				if ( ( m = match[ 1 ] ) ) {

					// Document context
					if ( nodeType === 9 ) {
						if ( ( elem = context.getElementById( m ) ) ) {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( elem.id === m ) {
								results.push( elem );
								return results;
							}
						} else {
							return results;
						}

					// Element context
					} else {

						// Support: IE, Opera, Webkit
						// TODO: identify versions
						// getElementById can match elements by name instead of ID
						if ( newContext && ( elem = newContext.getElementById( m ) ) &&
							contains( context, elem ) &&
							elem.id === m ) {

							results.push( elem );
							return results;
						}
					}

				// Type selector
				} else if ( match[ 2 ] ) {
					push.apply( results, context.getElementsByTagName( selector ) );
					return results;

				// Class selector
				} else if ( ( m = match[ 3 ] ) && support.getElementsByClassName &&
					context.getElementsByClassName ) {

					push.apply( results, context.getElementsByClassName( m ) );
					return results;
				}
			}

			// Take advantage of querySelectorAll
			if ( support.qsa &&
				!nonnativeSelectorCache[ selector + " " ] &&
				( !rbuggyQSA || !rbuggyQSA.test( selector ) ) &&

				// Support: IE 8 only
				// Exclude object elements
				( nodeType !== 1 || context.nodeName.toLowerCase() !== "object" ) ) {

				newSelector = selector;
				newContext = context;

				// qSA considers elements outside a scoping root when evaluating child or
				// descendant combinators, which is not what we want.
				// In such cases, we work around the behavior by prefixing every selector in the
				// list with an ID selector referencing the scope context.
				// The technique has to be used as well when a leading combinator is used
				// as such selectors are not recognized by querySelectorAll.
				// Thanks to Andrew Dupont for this technique.
				if ( nodeType === 1 &&
					( rdescend.test( selector ) || rcombinators.test( selector ) ) ) {

					// Expand context for sibling selectors
					newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
						context;

					// We can use :scope instead of the ID hack if the browser
					// supports it & if we're not changing the context.
					if ( newContext !== context || !support.scope ) {

						// Capture the context ID, setting it first if necessary
						if ( ( nid = context.getAttribute( "id" ) ) ) {
							nid = nid.replace( rcssescape, fcssescape );
						} else {
							context.setAttribute( "id", ( nid = expando ) );
						}
					}

					// Prefix every selector in the list
					groups = tokenize( selector );
					i = groups.length;
					while ( i-- ) {
						groups[ i ] = ( nid ? "#" + nid : ":scope" ) + " " +
							toSelector( groups[ i ] );
					}
					newSelector = groups.join( "," );
				}

				try {
					push.apply( results,
						newContext.querySelectorAll( newSelector )
					);
					return results;
				} catch ( qsaError ) {
					nonnativeSelectorCache( selector, true );
				} finally {
					if ( nid === expando ) {
						context.removeAttribute( "id" );
					}
				}
			}
		}
	}

	// All others
	return select( selector.replace( rtrim, "$1" ), context, results, seed );
}

/**
 * Create key-value caches of limited size
 * @returns {function(string, object)} Returns the Object data after storing it on itself with
 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
 *	deleting the oldest entry
 */
function createCache() {
	var keys = [];

	function cache( key, value ) {

		// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
		if ( keys.push( key + " " ) > Expr.cacheLength ) {

			// Only keep the most recent entries
			delete cache[ keys.shift() ];
		}
		return ( cache[ key + " " ] = value );
	}
	return cache;
}

/**
 * Mark a function for special use by Sizzle
 * @param {Function} fn The function to mark
 */
function markFunction( fn ) {
	fn[ expando ] = true;
	return fn;
}

/**
 * Support testing using an element
 * @param {Function} fn Passed the created element and returns a boolean result
 */
function assert( fn ) {
	var el = document.createElement( "fieldset" );

	try {
		return !!fn( el );
	} catch ( e ) {
		return false;
	} finally {

		// Remove from its parent by default
		if ( el.parentNode ) {
			el.parentNode.removeChild( el );
		}

		// release memory in IE
		el = null;
	}
}

/**
 * Adds the same handler for all of the specified attrs
 * @param {String} attrs Pipe-separated list of attributes
 * @param {Function} handler The method that will be applied
 */
function addHandle( attrs, handler ) {
	var arr = attrs.split( "|" ),
		i = arr.length;

	while ( i-- ) {
		Expr.attrHandle[ arr[ i ] ] = handler;
	}
}

/**
 * Checks document order of two siblings
 * @param {Element} a
 * @param {Element} b
 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
 */
function siblingCheck( a, b ) {
	var cur = b && a,
		diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
			a.sourceIndex - b.sourceIndex;

	// Use IE sourceIndex if available on both nodes
	if ( diff ) {
		return diff;
	}

	// Check if b follows a
	if ( cur ) {
		while ( ( cur = cur.nextSibling ) ) {
			if ( cur === b ) {
				return -1;
			}
		}
	}

	return a ? 1 : -1;
}

/**
 * Returns a function to use in pseudos for input types
 * @param {String} type
 */
function createInputPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return name === "input" && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for buttons
 * @param {String} type
 */
function createButtonPseudo( type ) {
	return function( elem ) {
		var name = elem.nodeName.toLowerCase();
		return ( name === "input" || name === "button" ) && elem.type === type;
	};
}

/**
 * Returns a function to use in pseudos for :enabled/:disabled
 * @param {Boolean} disabled true for :disabled; false for :enabled
 */
function createDisabledPseudo( disabled ) {

	// Known :disabled false positives: fieldset[disabled] > legend:nth-of-type(n+2) :can-disable
	return function( elem ) {

		// Only certain elements can match :enabled or :disabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-enabled
		// https://html.spec.whatwg.org/multipage/scripting.html#selector-disabled
		if ( "form" in elem ) {

			// Check for inherited disabledness on relevant non-disabled elements:
			// * listed form-associated elements in a disabled fieldset
			//   https://html.spec.whatwg.org/multipage/forms.html#category-listed
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-fe-disabled
			// * option elements in a disabled optgroup
			//   https://html.spec.whatwg.org/multipage/forms.html#concept-option-disabled
			// All such elements have a "form" property.
			if ( elem.parentNode && elem.disabled === false ) {

				// Option elements defer to a parent optgroup if present
				if ( "label" in elem ) {
					if ( "label" in elem.parentNode ) {
						return elem.parentNode.disabled === disabled;
					} else {
						return elem.disabled === disabled;
					}
				}

				// Support: IE 6 - 11
				// Use the isDisabled shortcut property to check for disabled fieldset ancestors
				return elem.isDisabled === disabled ||

					// Where there is no isDisabled, check manually
					/* jshint -W018 */
					elem.isDisabled !== !disabled &&
					inDisabledFieldset( elem ) === disabled;
			}

			return elem.disabled === disabled;

		// Try to winnow out elements that can't be disabled before trusting the disabled property.
		// Some victims get caught in our net (label, legend, menu, track), but it shouldn't
		// even exist on them, let alone have a boolean value.
		} else if ( "label" in elem ) {
			return elem.disabled === disabled;
		}

		// Remaining elements are neither :enabled nor :disabled
		return false;
	};
}

/**
 * Returns a function to use in pseudos for positionals
 * @param {Function} fn
 */
function createPositionalPseudo( fn ) {
	return markFunction( function( argument ) {
		argument = +argument;
		return markFunction( function( seed, matches ) {
			var j,
				matchIndexes = fn( [], seed.length, argument ),
				i = matchIndexes.length;

			// Match elements found at the specified indexes
			while ( i-- ) {
				if ( seed[ ( j = matchIndexes[ i ] ) ] ) {
					seed[ j ] = !( matches[ j ] = seed[ j ] );
				}
			}
		} );
	} );
}

/**
 * Checks a node for validity as a Sizzle context
 * @param {Element|Object=} context
 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
 */
function testContext( context ) {
	return context && typeof context.getElementsByTagName !== "undefined" && context;
}

// Expose support vars for convenience
support = Sizzle.support = {};

/**
 * Detects XML nodes
 * @param {Element|Object} elem An element or a document
 * @returns {Boolean} True iff elem is a non-HTML XML node
 */
isXML = Sizzle.isXML = function( elem ) {
	var namespace = elem && elem.namespaceURI,
		docElem = elem && ( elem.ownerDocument || elem ).documentElement;

	// Support: IE <=8
	// Assume HTML when documentElement doesn't yet exist, such as inside loading iframes
	// https://bugs.jquery.com/ticket/4833
	return !rhtml.test( namespace || docElem && docElem.nodeName || "HTML" );
};

/**
 * Sets document-related variables once based on the current document
 * @param {Element|Object} [doc] An element or document object to use to set the document
 * @returns {Object} Returns the current document
 */
setDocument = Sizzle.setDocument = function( node ) {
	var hasCompare, subWindow,
		doc = node ? node.ownerDocument || node : preferredDoc;

	// Return early if doc is invalid or already selected
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( doc == document || doc.nodeType !== 9 || !doc.documentElement ) {
		return document;
	}

	// Update global variables
	document = doc;
	docElem = document.documentElement;
	documentIsHTML = !isXML( document );

	// Support: IE 9 - 11+, Edge 12 - 18+
	// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( preferredDoc != document &&
		( subWindow = document.defaultView ) && subWindow.top !== subWindow ) {

		// Support: IE 11, Edge
		if ( subWindow.addEventListener ) {
			subWindow.addEventListener( "unload", unloadHandler, false );

		// Support: IE 9 - 10 only
		} else if ( subWindow.attachEvent ) {
			subWindow.attachEvent( "onunload", unloadHandler );
		}
	}

	// Support: IE 8 - 11+, Edge 12 - 18+, Chrome <=16 - 25 only, Firefox <=3.6 - 31 only,
	// Safari 4 - 5 only, Opera <=11.6 - 12.x only
	// IE/Edge & older browsers don't support the :scope pseudo-class.
	// Support: Safari 6.0 only
	// Safari 6.0 supports :scope but it's an alias of :root there.
	support.scope = assert( function( el ) {
		docElem.appendChild( el ).appendChild( document.createElement( "div" ) );
		return typeof el.querySelectorAll !== "undefined" &&
			!el.querySelectorAll( ":scope fieldset div" ).length;
	} );

	/* Attributes
	---------------------------------------------------------------------- */

	// Support: IE<8
	// Verify that getAttribute really returns attributes and not properties
	// (excepting IE8 booleans)
	support.attributes = assert( function( el ) {
		el.className = "i";
		return !el.getAttribute( "className" );
	} );

	/* getElement(s)By*
	---------------------------------------------------------------------- */

	// Check if getElementsByTagName("*") returns only elements
	support.getElementsByTagName = assert( function( el ) {
		el.appendChild( document.createComment( "" ) );
		return !el.getElementsByTagName( "*" ).length;
	} );

	// Support: IE<9
	support.getElementsByClassName = rnative.test( document.getElementsByClassName );

	// Support: IE<10
	// Check if getElementById returns elements by name
	// The broken getElementById methods don't pick up programmatically-set names,
	// so use a roundabout getElementsByName test
	support.getById = assert( function( el ) {
		docElem.appendChild( el ).id = expando;
		return !document.getElementsByName || !document.getElementsByName( expando ).length;
	} );

	// ID filter and find
	if ( support.getById ) {
		Expr.filter[ "ID" ] = function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				return elem.getAttribute( "id" ) === attrId;
			};
		};
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var elem = context.getElementById( id );
				return elem ? [ elem ] : [];
			}
		};
	} else {
		Expr.filter[ "ID" ] =  function( id ) {
			var attrId = id.replace( runescape, funescape );
			return function( elem ) {
				var node = typeof elem.getAttributeNode !== "undefined" &&
					elem.getAttributeNode( "id" );
				return node && node.value === attrId;
			};
		};

		// Support: IE 6 - 7 only
		// getElementById is not reliable as a find shortcut
		Expr.find[ "ID" ] = function( id, context ) {
			if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
				var node, i, elems,
					elem = context.getElementById( id );

				if ( elem ) {

					// Verify the id attribute
					node = elem.getAttributeNode( "id" );
					if ( node && node.value === id ) {
						return [ elem ];
					}

					// Fall back on getElementsByName
					elems = context.getElementsByName( id );
					i = 0;
					while ( ( elem = elems[ i++ ] ) ) {
						node = elem.getAttributeNode( "id" );
						if ( node && node.value === id ) {
							return [ elem ];
						}
					}
				}

				return [];
			}
		};
	}

	// Tag
	Expr.find[ "TAG" ] = support.getElementsByTagName ?
		function( tag, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( tag );

			// DocumentFragment nodes don't have gEBTN
			} else if ( support.qsa ) {
				return context.querySelectorAll( tag );
			}
		} :

		function( tag, context ) {
			var elem,
				tmp = [],
				i = 0,

				// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
				results = context.getElementsByTagName( tag );

			// Filter out possible comments
			if ( tag === "*" ) {
				while ( ( elem = results[ i++ ] ) ) {
					if ( elem.nodeType === 1 ) {
						tmp.push( elem );
					}
				}

				return tmp;
			}
			return results;
		};

	// Class
	Expr.find[ "CLASS" ] = support.getElementsByClassName && function( className, context ) {
		if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
			return context.getElementsByClassName( className );
		}
	};

	/* QSA/matchesSelector
	---------------------------------------------------------------------- */

	// QSA and matchesSelector support

	// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
	rbuggyMatches = [];

	// qSa(:focus) reports false when true (Chrome 21)
	// We allow this because of a bug in IE8/9 that throws an error
	// whenever `document.activeElement` is accessed on an iframe
	// So, we allow :focus to pass through QSA all the time to avoid the IE error
	// See https://bugs.jquery.com/ticket/13378
	rbuggyQSA = [];

	if ( ( support.qsa = rnative.test( document.querySelectorAll ) ) ) {

		// Build QSA regex
		// Regex strategy adopted from Diego Perini
		assert( function( el ) {

			var input;

			// Select is set to empty string on purpose
			// This is to test IE's treatment of not explicitly
			// setting a boolean content attribute,
			// since its presence should be enough
			// https://bugs.jquery.com/ticket/12359
			docElem.appendChild( el ).innerHTML = "<a id='" + expando + "'></a>" +
				"<select id='" + expando + "-\r\\' msallowcapture=''>" +
				"<option selected=''></option></select>";

			// Support: IE8, Opera 11-12.16
			// Nothing should be selected when empty strings follow ^= or $= or *=
			// The test attribute must be unknown in Opera but "safe" for WinRT
			// https://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
			if ( el.querySelectorAll( "[msallowcapture^='']" ).length ) {
				rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
			}

			// Support: IE8
			// Boolean attributes and "value" are not treated correctly
			if ( !el.querySelectorAll( "[selected]" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
			}

			// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
			if ( !el.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
				rbuggyQSA.push( "~=" );
			}

			// Support: IE 11+, Edge 15 - 18+
			// IE 11/Edge don't find elements on a `[name='']` query in some cases.
			// Adding a temporary attribute to the document before the selection works
			// around the issue.
			// Interestingly, IE 10 & older don't seem to have the issue.
			input = document.createElement( "input" );
			input.setAttribute( "name", "" );
			el.appendChild( input );
			if ( !el.querySelectorAll( "[name='']" ).length ) {
				rbuggyQSA.push( "\\[" + whitespace + "*name" + whitespace + "*=" +
					whitespace + "*(?:''|\"\")" );
			}

			// Webkit/Opera - :checked should return selected option elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			// IE8 throws error here and will not see later tests
			if ( !el.querySelectorAll( ":checked" ).length ) {
				rbuggyQSA.push( ":checked" );
			}

			// Support: Safari 8+, iOS 8+
			// https://bugs.webkit.org/show_bug.cgi?id=136851
			// In-page `selector#id sibling-combinator selector` fails
			if ( !el.querySelectorAll( "a#" + expando + "+*" ).length ) {
				rbuggyQSA.push( ".#.+[+~]" );
			}

			// Support: Firefox <=3.6 - 5 only
			// Old Firefox doesn't throw on a badly-escaped identifier.
			el.querySelectorAll( "\\\f" );
			rbuggyQSA.push( "[\\r\\n\\f]" );
		} );

		assert( function( el ) {
			el.innerHTML = "<a href='' disabled='disabled'></a>" +
				"<select disabled='disabled'><option/></select>";

			// Support: Windows 8 Native Apps
			// The type and name attributes are restricted during .innerHTML assignment
			var input = document.createElement( "input" );
			input.setAttribute( "type", "hidden" );
			el.appendChild( input ).setAttribute( "name", "D" );

			// Support: IE8
			// Enforce case-sensitivity of name attribute
			if ( el.querySelectorAll( "[name=d]" ).length ) {
				rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
			}

			// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
			// IE8 throws error here and will not see later tests
			if ( el.querySelectorAll( ":enabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: IE9-11+
			// IE's :disabled selector does not pick up the children of disabled fieldsets
			docElem.appendChild( el ).disabled = true;
			if ( el.querySelectorAll( ":disabled" ).length !== 2 ) {
				rbuggyQSA.push( ":enabled", ":disabled" );
			}

			// Support: Opera 10 - 11 only
			// Opera 10-11 does not throw on post-comma invalid pseudos
			el.querySelectorAll( "*,:x" );
			rbuggyQSA.push( ",.*:" );
		} );
	}

	if ( ( support.matchesSelector = rnative.test( ( matches = docElem.matches ||
		docElem.webkitMatchesSelector ||
		docElem.mozMatchesSelector ||
		docElem.oMatchesSelector ||
		docElem.msMatchesSelector ) ) ) ) {

		assert( function( el ) {

			// Check to see if it's possible to do matchesSelector
			// on a disconnected node (IE 9)
			support.disconnectedMatch = matches.call( el, "*" );

			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( el, "[s!='']:x" );
			rbuggyMatches.push( "!=", pseudos );
		} );
	}

	rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join( "|" ) );
	rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join( "|" ) );

	/* Contains
	---------------------------------------------------------------------- */
	hasCompare = rnative.test( docElem.compareDocumentPosition );

	// Element contains another
	// Purposefully self-exclusive
	// As in, an element does not contain itself
	contains = hasCompare || rnative.test( docElem.contains ) ?
		function( a, b ) {
			var adown = a.nodeType === 9 ? a.documentElement : a,
				bup = b && b.parentNode;
			return a === bup || !!( bup && bup.nodeType === 1 && (
				adown.contains ?
					adown.contains( bup ) :
					a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
			) );
		} :
		function( a, b ) {
			if ( b ) {
				while ( ( b = b.parentNode ) ) {
					if ( b === a ) {
						return true;
					}
				}
			}
			return false;
		};

	/* Sorting
	---------------------------------------------------------------------- */

	// Document order sorting
	sortOrder = hasCompare ?
	function( a, b ) {

		// Flag for duplicate removal
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		// Sort on method existence if only one input has compareDocumentPosition
		var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
		if ( compare ) {
			return compare;
		}

		// Calculate position if both inputs belong to the same document
		// Support: IE 11+, Edge 17 - 18+
		// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
		// two documents; shallow comparisons work.
		// eslint-disable-next-line eqeqeq
		compare = ( a.ownerDocument || a ) == ( b.ownerDocument || b ) ?
			a.compareDocumentPosition( b ) :

			// Otherwise we know they are disconnected
			1;

		// Disconnected nodes
		if ( compare & 1 ||
			( !support.sortDetached && b.compareDocumentPosition( a ) === compare ) ) {

			// Choose the first element that is related to our preferred document
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( a == document || a.ownerDocument == preferredDoc &&
				contains( preferredDoc, a ) ) {
				return -1;
			}

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			// eslint-disable-next-line eqeqeq
			if ( b == document || b.ownerDocument == preferredDoc &&
				contains( preferredDoc, b ) ) {
				return 1;
			}

			// Maintain original order
			return sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;
		}

		return compare & 4 ? -1 : 1;
	} :
	function( a, b ) {

		// Exit early if the nodes are identical
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		var cur,
			i = 0,
			aup = a.parentNode,
			bup = b.parentNode,
			ap = [ a ],
			bp = [ b ];

		// Parentless nodes are either documents or disconnected
		if ( !aup || !bup ) {

			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			return a == document ? -1 :
				b == document ? 1 :
				/* eslint-enable eqeqeq */
				aup ? -1 :
				bup ? 1 :
				sortInput ?
				( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
				0;

		// If the nodes are siblings, we can do a quick check
		} else if ( aup === bup ) {
			return siblingCheck( a, b );
		}

		// Otherwise we need full lists of their ancestors for comparison
		cur = a;
		while ( ( cur = cur.parentNode ) ) {
			ap.unshift( cur );
		}
		cur = b;
		while ( ( cur = cur.parentNode ) ) {
			bp.unshift( cur );
		}

		// Walk down the tree looking for a discrepancy
		while ( ap[ i ] === bp[ i ] ) {
			i++;
		}

		return i ?

			// Do a sibling check if the nodes have a common ancestor
			siblingCheck( ap[ i ], bp[ i ] ) :

			// Otherwise nodes in our document sort first
			// Support: IE 11+, Edge 17 - 18+
			// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
			// two documents; shallow comparisons work.
			/* eslint-disable eqeqeq */
			ap[ i ] == preferredDoc ? -1 :
			bp[ i ] == preferredDoc ? 1 :
			/* eslint-enable eqeqeq */
			0;
	};

	return document;
};

Sizzle.matches = function( expr, elements ) {
	return Sizzle( expr, null, null, elements );
};

Sizzle.matchesSelector = function( elem, expr ) {
	setDocument( elem );

	if ( support.matchesSelector && documentIsHTML &&
		!nonnativeSelectorCache[ expr + " " ] &&
		( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
		( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

		try {
			var ret = matches.call( elem, expr );

			// IE 9's matchesSelector returns false on disconnected nodes
			if ( ret || support.disconnectedMatch ||

				// As well, disconnected nodes are said to be in a document
				// fragment in IE 9
				elem.document && elem.document.nodeType !== 11 ) {
				return ret;
			}
		} catch ( e ) {
			nonnativeSelectorCache( expr, true );
		}
	}

	return Sizzle( expr, document, null, [ elem ] ).length > 0;
};

Sizzle.contains = function( context, elem ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( context.ownerDocument || context ) != document ) {
		setDocument( context );
	}
	return contains( context, elem );
};

Sizzle.attr = function( elem, name ) {

	// Set document vars if needed
	// Support: IE 11+, Edge 17 - 18+
	// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
	// two documents; shallow comparisons work.
	// eslint-disable-next-line eqeqeq
	if ( ( elem.ownerDocument || elem ) != document ) {
		setDocument( elem );
	}

	var fn = Expr.attrHandle[ name.toLowerCase() ],

		// Don't get fooled by Object.prototype properties (jQuery #13807)
		val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
			fn( elem, name, !documentIsHTML ) :
			undefined;

	return val !== undefined ?
		val :
		support.attributes || !documentIsHTML ?
			elem.getAttribute( name ) :
			( val = elem.getAttributeNode( name ) ) && val.specified ?
				val.value :
				null;
};

Sizzle.escape = function( sel ) {
	return ( sel + "" ).replace( rcssescape, fcssescape );
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Document sorting and removing duplicates
 * @param {ArrayLike} results
 */
Sizzle.uniqueSort = function( results ) {
	var elem,
		duplicates = [],
		j = 0,
		i = 0;

	// Unless we *know* we can detect duplicates, assume their presence
	hasDuplicate = !support.detectDuplicates;
	sortInput = !support.sortStable && results.slice( 0 );
	results.sort( sortOrder );

	if ( hasDuplicate ) {
		while ( ( elem = results[ i++ ] ) ) {
			if ( elem === results[ i ] ) {
				j = duplicates.push( i );
			}
		}
		while ( j-- ) {
			results.splice( duplicates[ j ], 1 );
		}
	}

	// Clear input after sorting to release objects
	// See https://github.com/jquery/sizzle/pull/225
	sortInput = null;

	return results;
};

/**
 * Utility function for retrieving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
getText = Sizzle.getText = function( elem ) {
	var node,
		ret = "",
		i = 0,
		nodeType = elem.nodeType;

	if ( !nodeType ) {

		// If no nodeType, this is expected to be an array
		while ( ( node = elem[ i++ ] ) ) {

			// Do not traverse comment nodes
			ret += getText( node );
		}
	} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {

		// Use textContent for elements
		// innerText usage removed for consistency of new lines (jQuery #11153)
		if ( typeof elem.textContent === "string" ) {
			return elem.textContent;
		} else {

			// Traverse its children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				ret += getText( elem );
			}
		}
	} else if ( nodeType === 3 || nodeType === 4 ) {
		return elem.nodeValue;
	}

	// Do not include comment or processing instruction nodes

	return ret;
};

Expr = Sizzle.selectors = {

	// Can be adjusted by the user
	cacheLength: 50,

	createPseudo: markFunction,

	match: matchExpr,

	attrHandle: {},

	find: {},

	relative: {
		">": { dir: "parentNode", first: true },
		" ": { dir: "parentNode" },
		"+": { dir: "previousSibling", first: true },
		"~": { dir: "previousSibling" }
	},

	preFilter: {
		"ATTR": function( match ) {
			match[ 1 ] = match[ 1 ].replace( runescape, funescape );

			// Move the given value to match[3] whether quoted or unquoted
			match[ 3 ] = ( match[ 3 ] || match[ 4 ] ||
				match[ 5 ] || "" ).replace( runescape, funescape );

			if ( match[ 2 ] === "~=" ) {
				match[ 3 ] = " " + match[ 3 ] + " ";
			}

			return match.slice( 0, 4 );
		},

		"CHILD": function( match ) {

			/* matches from matchExpr["CHILD"]
				1 type (only|nth|...)
				2 what (child|of-type)
				3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
				4 xn-component of xn+y argument ([+-]?\d*n|)
				5 sign of xn-component
				6 x of xn-component
				7 sign of y-component
				8 y of y-component
			*/
			match[ 1 ] = match[ 1 ].toLowerCase();

			if ( match[ 1 ].slice( 0, 3 ) === "nth" ) {

				// nth-* requires argument
				if ( !match[ 3 ] ) {
					Sizzle.error( match[ 0 ] );
				}

				// numeric x and y parameters for Expr.filter.CHILD
				// remember that false/true cast respectively to 0/1
				match[ 4 ] = +( match[ 4 ] ?
					match[ 5 ] + ( match[ 6 ] || 1 ) :
					2 * ( match[ 3 ] === "even" || match[ 3 ] === "odd" ) );
				match[ 5 ] = +( ( match[ 7 ] + match[ 8 ] ) || match[ 3 ] === "odd" );

				// other types prohibit arguments
			} else if ( match[ 3 ] ) {
				Sizzle.error( match[ 0 ] );
			}

			return match;
		},

		"PSEUDO": function( match ) {
			var excess,
				unquoted = !match[ 6 ] && match[ 2 ];

			if ( matchExpr[ "CHILD" ].test( match[ 0 ] ) ) {
				return null;
			}

			// Accept quoted arguments as-is
			if ( match[ 3 ] ) {
				match[ 2 ] = match[ 4 ] || match[ 5 ] || "";

			// Strip excess characters from unquoted arguments
			} else if ( unquoted && rpseudo.test( unquoted ) &&

				// Get excess from tokenize (recursively)
				( excess = tokenize( unquoted, true ) ) &&

				// advance to the next closing parenthesis
				( excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length ) ) {

				// excess is a negative index
				match[ 0 ] = match[ 0 ].slice( 0, excess );
				match[ 2 ] = unquoted.slice( 0, excess );
			}

			// Return only captures needed by the pseudo filter method (type and argument)
			return match.slice( 0, 3 );
		}
	},

	filter: {

		"TAG": function( nodeNameSelector ) {
			var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
			return nodeNameSelector === "*" ?
				function() {
					return true;
				} :
				function( elem ) {
					return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
				};
		},

		"CLASS": function( className ) {
			var pattern = classCache[ className + " " ];

			return pattern ||
				( pattern = new RegExp( "(^|" + whitespace +
					")" + className + "(" + whitespace + "|$)" ) ) && classCache(
						className, function( elem ) {
							return pattern.test(
								typeof elem.className === "string" && elem.className ||
								typeof elem.getAttribute !== "undefined" &&
									elem.getAttribute( "class" ) ||
								""
							);
				} );
		},

		"ATTR": function( name, operator, check ) {
			return function( elem ) {
				var result = Sizzle.attr( elem, name );

				if ( result == null ) {
					return operator === "!=";
				}
				if ( !operator ) {
					return true;
				}

				result += "";

				/* eslint-disable max-len */

				return operator === "=" ? result === check :
					operator === "!=" ? result !== check :
					operator === "^=" ? check && result.indexOf( check ) === 0 :
					operator === "*=" ? check && result.indexOf( check ) > -1 :
					operator === "$=" ? check && result.slice( -check.length ) === check :
					operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
					operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
					false;
				/* eslint-enable max-len */

			};
		},

		"CHILD": function( type, what, _argument, first, last ) {
			var simple = type.slice( 0, 3 ) !== "nth",
				forward = type.slice( -4 ) !== "last",
				ofType = what === "of-type";

			return first === 1 && last === 0 ?

				// Shortcut for :nth-*(n)
				function( elem ) {
					return !!elem.parentNode;
				} :

				function( elem, _context, xml ) {
					var cache, uniqueCache, outerCache, node, nodeIndex, start,
						dir = simple !== forward ? "nextSibling" : "previousSibling",
						parent = elem.parentNode,
						name = ofType && elem.nodeName.toLowerCase(),
						useCache = !xml && !ofType,
						diff = false;

					if ( parent ) {

						// :(first|last|only)-(child|of-type)
						if ( simple ) {
							while ( dir ) {
								node = elem;
								while ( ( node = node[ dir ] ) ) {
									if ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) {

										return false;
									}
								}

								// Reverse direction for :only-* (if we haven't yet done so)
								start = dir = type === "only" && !start && "nextSibling";
							}
							return true;
						}

						start = [ forward ? parent.firstChild : parent.lastChild ];

						// non-xml :nth-child(...) stores cache data on `parent`
						if ( forward && useCache ) {

							// Seek `elem` from a previously-cached index

							// ...in a gzip-friendly way
							node = parent;
							outerCache = node[ expando ] || ( node[ expando ] = {} );

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ node.uniqueID ] ||
								( outerCache[ node.uniqueID ] = {} );

							cache = uniqueCache[ type ] || [];
							nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
							diff = nodeIndex && cache[ 2 ];
							node = nodeIndex && parent.childNodes[ nodeIndex ];

							while ( ( node = ++nodeIndex && node && node[ dir ] ||

								// Fallback to seeking `elem` from the start
								( diff = nodeIndex = 0 ) || start.pop() ) ) {

								// When found, cache indexes on `parent` and break
								if ( node.nodeType === 1 && ++diff && node === elem ) {
									uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
									break;
								}
							}

						} else {

							// Use previously-cached element index if available
							if ( useCache ) {

								// ...in a gzip-friendly way
								node = elem;
								outerCache = node[ expando ] || ( node[ expando ] = {} );

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									( outerCache[ node.uniqueID ] = {} );

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex;
							}

							// xml :nth-child(...)
							// or :nth-last-child(...) or :nth(-last)?-of-type(...)
							if ( diff === false ) {

								// Use the same loop as above to seek `elem` from the start
								while ( ( node = ++nodeIndex && node && node[ dir ] ||
									( diff = nodeIndex = 0 ) || start.pop() ) ) {

									if ( ( ofType ?
										node.nodeName.toLowerCase() === name :
										node.nodeType === 1 ) &&
										++diff ) {

										// Cache the index of each encountered element
										if ( useCache ) {
											outerCache = node[ expando ] ||
												( node[ expando ] = {} );

											// Support: IE <9 only
											// Defend against cloned attroperties (jQuery gh-1709)
											uniqueCache = outerCache[ node.uniqueID ] ||
												( outerCache[ node.uniqueID ] = {} );

											uniqueCache[ type ] = [ dirruns, diff ];
										}

										if ( node === elem ) {
											break;
										}
									}
								}
							}
						}

						// Incorporate the offset, then check against cycle size
						diff -= last;
						return diff === first || ( diff % first === 0 && diff / first >= 0 );
					}
				};
		},

		"PSEUDO": function( pseudo, argument ) {

			// pseudo-class names are case-insensitive
			// http://www.w3.org/TR/selectors/#pseudo-classes
			// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
			// Remember that setFilters inherits from pseudos
			var args,
				fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
					Sizzle.error( "unsupported pseudo: " + pseudo );

			// The user may use createPseudo to indicate that
			// arguments are needed to create the filter function
			// just as Sizzle does
			if ( fn[ expando ] ) {
				return fn( argument );
			}

			// But maintain support for old signatures
			if ( fn.length > 1 ) {
				args = [ pseudo, pseudo, "", argument ];
				return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
					markFunction( function( seed, matches ) {
						var idx,
							matched = fn( seed, argument ),
							i = matched.length;
						while ( i-- ) {
							idx = indexOf( seed, matched[ i ] );
							seed[ idx ] = !( matches[ idx ] = matched[ i ] );
						}
					} ) :
					function( elem ) {
						return fn( elem, 0, args );
					};
			}

			return fn;
		}
	},

	pseudos: {

		// Potentially complex pseudos
		"not": markFunction( function( selector ) {

			// Trim the selector passed to compile
			// to avoid treating leading and trailing
			// spaces as combinators
			var input = [],
				results = [],
				matcher = compile( selector.replace( rtrim, "$1" ) );

			return matcher[ expando ] ?
				markFunction( function( seed, matches, _context, xml ) {
					var elem,
						unmatched = matcher( seed, null, xml, [] ),
						i = seed.length;

					// Match elements unmatched by `matcher`
					while ( i-- ) {
						if ( ( elem = unmatched[ i ] ) ) {
							seed[ i ] = !( matches[ i ] = elem );
						}
					}
				} ) :
				function( elem, _context, xml ) {
					input[ 0 ] = elem;
					matcher( input, null, xml, results );

					// Don't keep the element (issue #299)
					input[ 0 ] = null;
					return !results.pop();
				};
		} ),

		"has": markFunction( function( selector ) {
			return function( elem ) {
				return Sizzle( selector, elem ).length > 0;
			};
		} ),

		"contains": markFunction( function( text ) {
			text = text.replace( runescape, funescape );
			return function( elem ) {
				return ( elem.textContent || getText( elem ) ).indexOf( text ) > -1;
			};
		} ),

		// "Whether an element is represented by a :lang() selector
		// is based solely on the element's language value
		// being equal to the identifier C,
		// or beginning with the identifier C immediately followed by "-".
		// The matching of C against the element's language value is performed case-insensitively.
		// The identifier C does not have to be a valid language name."
		// http://www.w3.org/TR/selectors/#lang-pseudo
		"lang": markFunction( function( lang ) {

			// lang value must be a valid identifier
			if ( !ridentifier.test( lang || "" ) ) {
				Sizzle.error( "unsupported lang: " + lang );
			}
			lang = lang.replace( runescape, funescape ).toLowerCase();
			return function( elem ) {
				var elemLang;
				do {
					if ( ( elemLang = documentIsHTML ?
						elem.lang :
						elem.getAttribute( "xml:lang" ) || elem.getAttribute( "lang" ) ) ) {

						elemLang = elemLang.toLowerCase();
						return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
					}
				} while ( ( elem = elem.parentNode ) && elem.nodeType === 1 );
				return false;
			};
		} ),

		// Miscellaneous
		"target": function( elem ) {
			var hash = window.location && window.location.hash;
			return hash && hash.slice( 1 ) === elem.id;
		},

		"root": function( elem ) {
			return elem === docElem;
		},

		"focus": function( elem ) {
			return elem === document.activeElement &&
				( !document.hasFocus || document.hasFocus() ) &&
				!!( elem.type || elem.href || ~elem.tabIndex );
		},

		// Boolean properties
		"enabled": createDisabledPseudo( false ),
		"disabled": createDisabledPseudo( true ),

		"checked": function( elem ) {

			// In CSS3, :checked should return both checked and selected elements
			// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
			var nodeName = elem.nodeName.toLowerCase();
			return ( nodeName === "input" && !!elem.checked ) ||
				( nodeName === "option" && !!elem.selected );
		},

		"selected": function( elem ) {

			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				// eslint-disable-next-line no-unused-expressions
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		// Contents
		"empty": function( elem ) {

			// http://www.w3.org/TR/selectors/#empty-pseudo
			// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
			//   but not by others (comment: 8; processing instruction: 7; etc.)
			// nodeType < 6 works because attributes (2) do not appear as children
			for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
				if ( elem.nodeType < 6 ) {
					return false;
				}
			}
			return true;
		},

		"parent": function( elem ) {
			return !Expr.pseudos[ "empty" ]( elem );
		},

		// Element/input types
		"header": function( elem ) {
			return rheader.test( elem.nodeName );
		},

		"input": function( elem ) {
			return rinputs.test( elem.nodeName );
		},

		"button": function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === "button" || name === "button";
		},

		"text": function( elem ) {
			var attr;
			return elem.nodeName.toLowerCase() === "input" &&
				elem.type === "text" &&

				// Support: IE<8
				// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
				( ( attr = elem.getAttribute( "type" ) ) == null ||
					attr.toLowerCase() === "text" );
		},

		// Position-in-collection
		"first": createPositionalPseudo( function() {
			return [ 0 ];
		} ),

		"last": createPositionalPseudo( function( _matchIndexes, length ) {
			return [ length - 1 ];
		} ),

		"eq": createPositionalPseudo( function( _matchIndexes, length, argument ) {
			return [ argument < 0 ? argument + length : argument ];
		} ),

		"even": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 0;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"odd": createPositionalPseudo( function( matchIndexes, length ) {
			var i = 1;
			for ( ; i < length; i += 2 ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"lt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ?
				argument + length :
				argument > length ?
					length :
					argument;
			for ( ; --i >= 0; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} ),

		"gt": createPositionalPseudo( function( matchIndexes, length, argument ) {
			var i = argument < 0 ? argument + length : argument;
			for ( ; ++i < length; ) {
				matchIndexes.push( i );
			}
			return matchIndexes;
		} )
	}
};

Expr.pseudos[ "nth" ] = Expr.pseudos[ "eq" ];

// Add button/input type pseudos
for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
	Expr.pseudos[ i ] = createInputPseudo( i );
}
for ( i in { submit: true, reset: true } ) {
	Expr.pseudos[ i ] = createButtonPseudo( i );
}

// Easy API for creating new setFilters
function setFilters() {}
setFilters.prototype = Expr.filters = Expr.pseudos;
Expr.setFilters = new setFilters();

tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
	var matched, match, tokens, type,
		soFar, groups, preFilters,
		cached = tokenCache[ selector + " " ];

	if ( cached ) {
		return parseOnly ? 0 : cached.slice( 0 );
	}

	soFar = selector;
	groups = [];
	preFilters = Expr.preFilter;

	while ( soFar ) {

		// Comma and first run
		if ( !matched || ( match = rcomma.exec( soFar ) ) ) {
			if ( match ) {

				// Don't consume trailing commas as valid
				soFar = soFar.slice( match[ 0 ].length ) || soFar;
			}
			groups.push( ( tokens = [] ) );
		}

		matched = false;

		// Combinators
		if ( ( match = rcombinators.exec( soFar ) ) ) {
			matched = match.shift();
			tokens.push( {
				value: matched,

				// Cast descendant combinators to space
				type: match[ 0 ].replace( rtrim, " " )
			} );
			soFar = soFar.slice( matched.length );
		}

		// Filters
		for ( type in Expr.filter ) {
			if ( ( match = matchExpr[ type ].exec( soFar ) ) && ( !preFilters[ type ] ||
				( match = preFilters[ type ]( match ) ) ) ) {
				matched = match.shift();
				tokens.push( {
					value: matched,
					type: type,
					matches: match
				} );
				soFar = soFar.slice( matched.length );
			}
		}

		if ( !matched ) {
			break;
		}
	}

	// Return the length of the invalid excess
	// if we're just parsing
	// Otherwise, throw an error or return tokens
	return parseOnly ?
		soFar.length :
		soFar ?
			Sizzle.error( selector ) :

			// Cache the tokens
			tokenCache( selector, groups ).slice( 0 );
};

function toSelector( tokens ) {
	var i = 0,
		len = tokens.length,
		selector = "";
	for ( ; i < len; i++ ) {
		selector += tokens[ i ].value;
	}
	return selector;
}

function addCombinator( matcher, combinator, base ) {
	var dir = combinator.dir,
		skip = combinator.next,
		key = skip || dir,
		checkNonElements = base && key === "parentNode",
		doneName = done++;

	return combinator.first ?

		// Check against closest ancestor/preceding element
		function( elem, context, xml ) {
			while ( ( elem = elem[ dir ] ) ) {
				if ( elem.nodeType === 1 || checkNonElements ) {
					return matcher( elem, context, xml );
				}
			}
			return false;
		} :

		// Check against all ancestor/preceding elements
		function( elem, context, xml ) {
			var oldCache, uniqueCache, outerCache,
				newCache = [ dirruns, doneName ];

			// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
			if ( xml ) {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						if ( matcher( elem, context, xml ) ) {
							return true;
						}
					}
				}
			} else {
				while ( ( elem = elem[ dir ] ) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						outerCache = elem[ expando ] || ( elem[ expando ] = {} );

						// Support: IE <9 only
						// Defend against cloned attroperties (jQuery gh-1709)
						uniqueCache = outerCache[ elem.uniqueID ] ||
							( outerCache[ elem.uniqueID ] = {} );

						if ( skip && skip === elem.nodeName.toLowerCase() ) {
							elem = elem[ dir ] || elem;
						} else if ( ( oldCache = uniqueCache[ key ] ) &&
							oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

							// Assign to newCache so results back-propagate to previous elements
							return ( newCache[ 2 ] = oldCache[ 2 ] );
						} else {

							// Reuse newcache so results back-propagate to previous elements
							uniqueCache[ key ] = newCache;

							// A match means we're done; a fail means we have to keep checking
							if ( ( newCache[ 2 ] = matcher( elem, context, xml ) ) ) {
								return true;
							}
						}
					}
				}
			}
			return false;
		};
}

function elementMatcher( matchers ) {
	return matchers.length > 1 ?
		function( elem, context, xml ) {
			var i = matchers.length;
			while ( i-- ) {
				if ( !matchers[ i ]( elem, context, xml ) ) {
					return false;
				}
			}
			return true;
		} :
		matchers[ 0 ];
}

function multipleContexts( selector, contexts, results ) {
	var i = 0,
		len = contexts.length;
	for ( ; i < len; i++ ) {
		Sizzle( selector, contexts[ i ], results );
	}
	return results;
}

function condense( unmatched, map, filter, context, xml ) {
	var elem,
		newUnmatched = [],
		i = 0,
		len = unmatched.length,
		mapped = map != null;

	for ( ; i < len; i++ ) {
		if ( ( elem = unmatched[ i ] ) ) {
			if ( !filter || filter( elem, context, xml ) ) {
				newUnmatched.push( elem );
				if ( mapped ) {
					map.push( i );
				}
			}
		}
	}

	return newUnmatched;
}

function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
	if ( postFilter && !postFilter[ expando ] ) {
		postFilter = setMatcher( postFilter );
	}
	if ( postFinder && !postFinder[ expando ] ) {
		postFinder = setMatcher( postFinder, postSelector );
	}
	return markFunction( function( seed, results, context, xml ) {
		var temp, i, elem,
			preMap = [],
			postMap = [],
			preexisting = results.length,

			// Get initial elements from seed or context
			elems = seed || multipleContexts(
				selector || "*",
				context.nodeType ? [ context ] : context,
				[]
			),

			// Prefilter to get matcher input, preserving a map for seed-results synchronization
			matcherIn = preFilter && ( seed || !selector ) ?
				condense( elems, preMap, preFilter, context, xml ) :
				elems,

			matcherOut = matcher ?

				// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
				postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

					// ...intermediate processing is necessary
					[] :

					// ...otherwise use results directly
					results :
				matcherIn;

		// Find primary matches
		if ( matcher ) {
			matcher( matcherIn, matcherOut, context, xml );
		}

		// Apply postFilter
		if ( postFilter ) {
			temp = condense( matcherOut, postMap );
			postFilter( temp, [], context, xml );

			// Un-match failing elements by moving them back to matcherIn
			i = temp.length;
			while ( i-- ) {
				if ( ( elem = temp[ i ] ) ) {
					matcherOut[ postMap[ i ] ] = !( matcherIn[ postMap[ i ] ] = elem );
				}
			}
		}

		if ( seed ) {
			if ( postFinder || preFilter ) {
				if ( postFinder ) {

					// Get the final matcherOut by condensing this intermediate into postFinder contexts
					temp = [];
					i = matcherOut.length;
					while ( i-- ) {
						if ( ( elem = matcherOut[ i ] ) ) {

							// Restore matcherIn since elem is not yet a final match
							temp.push( ( matcherIn[ i ] = elem ) );
						}
					}
					postFinder( null, ( matcherOut = [] ), temp, xml );
				}

				// Move matched elements from seed to results to keep them synchronized
				i = matcherOut.length;
				while ( i-- ) {
					if ( ( elem = matcherOut[ i ] ) &&
						( temp = postFinder ? indexOf( seed, elem ) : preMap[ i ] ) > -1 ) {

						seed[ temp ] = !( results[ temp ] = elem );
					}
				}
			}

		// Add elements to results, through postFinder if defined
		} else {
			matcherOut = condense(
				matcherOut === results ?
					matcherOut.splice( preexisting, matcherOut.length ) :
					matcherOut
			);
			if ( postFinder ) {
				postFinder( null, results, matcherOut, xml );
			} else {
				push.apply( results, matcherOut );
			}
		}
	} );
}

function matcherFromTokens( tokens ) {
	var checkContext, matcher, j,
		len = tokens.length,
		leadingRelative = Expr.relative[ tokens[ 0 ].type ],
		implicitRelative = leadingRelative || Expr.relative[ " " ],
		i = leadingRelative ? 1 : 0,

		// The foundational matcher ensures that elements are reachable from top-level context(s)
		matchContext = addCombinator( function( elem ) {
			return elem === checkContext;
		}, implicitRelative, true ),
		matchAnyContext = addCombinator( function( elem ) {
			return indexOf( checkContext, elem ) > -1;
		}, implicitRelative, true ),
		matchers = [ function( elem, context, xml ) {
			var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
				( checkContext = context ).nodeType ?
					matchContext( elem, context, xml ) :
					matchAnyContext( elem, context, xml ) );

			// Avoid hanging onto element (issue #299)
			checkContext = null;
			return ret;
		} ];

	for ( ; i < len; i++ ) {
		if ( ( matcher = Expr.relative[ tokens[ i ].type ] ) ) {
			matchers = [ addCombinator( elementMatcher( matchers ), matcher ) ];
		} else {
			matcher = Expr.filter[ tokens[ i ].type ].apply( null, tokens[ i ].matches );

			// Return special upon seeing a positional matcher
			if ( matcher[ expando ] ) {

				// Find the next relative operator (if any) for proper handling
				j = ++i;
				for ( ; j < len; j++ ) {
					if ( Expr.relative[ tokens[ j ].type ] ) {
						break;
					}
				}
				return setMatcher(
					i > 1 && elementMatcher( matchers ),
					i > 1 && toSelector(

					// If the preceding token was a descendant combinator, insert an implicit any-element `*`
					tokens
						.slice( 0, i - 1 )
						.concat( { value: tokens[ i - 2 ].type === " " ? "*" : "" } )
					).replace( rtrim, "$1" ),
					matcher,
					i < j && matcherFromTokens( tokens.slice( i, j ) ),
					j < len && matcherFromTokens( ( tokens = tokens.slice( j ) ) ),
					j < len && toSelector( tokens )
				);
			}
			matchers.push( matcher );
		}
	}

	return elementMatcher( matchers );
}

function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
	var bySet = setMatchers.length > 0,
		byElement = elementMatchers.length > 0,
		superMatcher = function( seed, context, xml, results, outermost ) {
			var elem, j, matcher,
				matchedCount = 0,
				i = "0",
				unmatched = seed && [],
				setMatched = [],
				contextBackup = outermostContext,

				// We must always have either seed elements or outermost context
				elems = seed || byElement && Expr.find[ "TAG" ]( "*", outermost ),

				// Use integer dirruns iff this is the outermost matcher
				dirrunsUnique = ( dirruns += contextBackup == null ? 1 : Math.random() || 0.1 ),
				len = elems.length;

			if ( outermost ) {

				// Support: IE 11+, Edge 17 - 18+
				// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
				// two documents; shallow comparisons work.
				// eslint-disable-next-line eqeqeq
				outermostContext = context == document || context || outermost;
			}

			// Add elements passing elementMatchers directly to results
			// Support: IE<9, Safari
			// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
			for ( ; i !== len && ( elem = elems[ i ] ) != null; i++ ) {
				if ( byElement && elem ) {
					j = 0;

					// Support: IE 11+, Edge 17 - 18+
					// IE/Edge sometimes throw a "Permission denied" error when strict-comparing
					// two documents; shallow comparisons work.
					// eslint-disable-next-line eqeqeq
					if ( !context && elem.ownerDocument != document ) {
						setDocument( elem );
						xml = !documentIsHTML;
					}
					while ( ( matcher = elementMatchers[ j++ ] ) ) {
						if ( matcher( elem, context || document, xml ) ) {
							results.push( elem );
							break;
						}
					}
					if ( outermost ) {
						dirruns = dirrunsUnique;
					}
				}

				// Track unmatched elements for set filters
				if ( bySet ) {

					// They will have gone through all possible matchers
					if ( ( elem = !matcher && elem ) ) {
						matchedCount--;
					}

					// Lengthen the array for every element, matched or not
					if ( seed ) {
						unmatched.push( elem );
					}
				}
			}

			// `i` is now the count of elements visited above, and adding it to `matchedCount`
			// makes the latter nonnegative.
			matchedCount += i;

			// Apply set filters to unmatched elements
			// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
			// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
			// no element matchers and no seed.
			// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
			// case, which will result in a "00" `matchedCount` that differs from `i` but is also
			// numerically zero.
			if ( bySet && i !== matchedCount ) {
				j = 0;
				while ( ( matcher = setMatchers[ j++ ] ) ) {
					matcher( unmatched, setMatched, context, xml );
				}

				if ( seed ) {

					// Reintegrate element matches to eliminate the need for sorting
					if ( matchedCount > 0 ) {
						while ( i-- ) {
							if ( !( unmatched[ i ] || setMatched[ i ] ) ) {
								setMatched[ i ] = pop.call( results );
							}
						}
					}

					// Discard index placeholder values to get only actual matches
					setMatched = condense( setMatched );
				}

				// Add matches to results
				push.apply( results, setMatched );

				// Seedless set matches succeeding multiple successful matchers stipulate sorting
				if ( outermost && !seed && setMatched.length > 0 &&
					( matchedCount + setMatchers.length ) > 1 ) {

					Sizzle.uniqueSort( results );
				}
			}

			// Override manipulation of globals by nested matchers
			if ( outermost ) {
				dirruns = dirrunsUnique;
				outermostContext = contextBackup;
			}

			return unmatched;
		};

	return bySet ?
		markFunction( superMatcher ) :
		superMatcher;
}

compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
	var i,
		setMatchers = [],
		elementMatchers = [],
		cached = compilerCache[ selector + " " ];

	if ( !cached ) {

		// Generate a function of recursive functions that can be used to check each element
		if ( !match ) {
			match = tokenize( selector );
		}
		i = match.length;
		while ( i-- ) {
			cached = matcherFromTokens( match[ i ] );
			if ( cached[ expando ] ) {
				setMatchers.push( cached );
			} else {
				elementMatchers.push( cached );
			}
		}

		// Cache the compiled function
		cached = compilerCache(
			selector,
			matcherFromGroupMatchers( elementMatchers, setMatchers )
		);

		// Save selector and tokenization
		cached.selector = selector;
	}
	return cached;
};

/**
 * A low-level selection function that works with Sizzle's compiled
 *  selector functions
 * @param {String|Function} selector A selector or a pre-compiled
 *  selector function built with Sizzle.compile
 * @param {Element} context
 * @param {Array} [results]
 * @param {Array} [seed] A set of elements to match against
 */
select = Sizzle.select = function( selector, context, results, seed ) {
	var i, tokens, token, type, find,
		compiled = typeof selector === "function" && selector,
		match = !seed && tokenize( ( selector = compiled.selector || selector ) );

	results = results || [];

	// Try to minimize operations if there is only one selector in the list and no seed
	// (the latter of which guarantees us context)
	if ( match.length === 1 ) {

		// Reduce context if the leading compound selector is an ID
		tokens = match[ 0 ] = match[ 0 ].slice( 0 );
		if ( tokens.length > 2 && ( token = tokens[ 0 ] ).type === "ID" &&
			context.nodeType === 9 && documentIsHTML && Expr.relative[ tokens[ 1 ].type ] ) {

			context = ( Expr.find[ "ID" ]( token.matches[ 0 ]
				.replace( runescape, funescape ), context ) || [] )[ 0 ];
			if ( !context ) {
				return results;

			// Precompiled matchers will still verify ancestry, so step up a level
			} else if ( compiled ) {
				context = context.parentNode;
			}

			selector = selector.slice( tokens.shift().value.length );
		}

		// Fetch a seed set for right-to-left matching
		i = matchExpr[ "needsContext" ].test( selector ) ? 0 : tokens.length;
		while ( i-- ) {
			token = tokens[ i ];

			// Abort if we hit a combinator
			if ( Expr.relative[ ( type = token.type ) ] ) {
				break;
			}
			if ( ( find = Expr.find[ type ] ) ) {

				// Search, expanding context for leading sibling combinators
				if ( ( seed = find(
					token.matches[ 0 ].replace( runescape, funescape ),
					rsibling.test( tokens[ 0 ].type ) && testContext( context.parentNode ) ||
						context
				) ) ) {

					// If seed is empty or no tokens remain, we can return early
					tokens.splice( i, 1 );
					selector = seed.length && toSelector( tokens );
					if ( !selector ) {
						push.apply( results, seed );
						return results;
					}

					break;
				}
			}
		}
	}

	// Compile and execute a filtering function if one is not provided
	// Provide `match` to avoid retokenization if we modified the selector above
	( compiled || compile( selector, match ) )(
		seed,
		context,
		!documentIsHTML,
		results,
		!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
	);
	return results;
};

// One-time assignments

// Sort stability
support.sortStable = expando.split( "" ).sort( sortOrder ).join( "" ) === expando;

// Support: Chrome 14-35+
// Always assume duplicates if they aren't passed to the comparison function
support.detectDuplicates = !!hasDuplicate;

// Initialize against the default document
setDocument();

// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
// Detached nodes confoundingly follow *each other*
support.sortDetached = assert( function( el ) {

	// Should return 1, but returns 4 (following)
	return el.compareDocumentPosition( document.createElement( "fieldset" ) ) & 1;
} );

// Support: IE<8
// Prevent attribute/property "interpolation"
// https://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
if ( !assert( function( el ) {
	el.innerHTML = "<a href='#'></a>";
	return el.firstChild.getAttribute( "href" ) === "#";
} ) ) {
	addHandle( "type|href|height|width", function( elem, name, isXML ) {
		if ( !isXML ) {
			return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
		}
	} );
}

// Support: IE<9
// Use defaultValue in place of getAttribute("value")
if ( !support.attributes || !assert( function( el ) {
	el.innerHTML = "<input/>";
	el.firstChild.setAttribute( "value", "" );
	return el.firstChild.getAttribute( "value" ) === "";
} ) ) {
	addHandle( "value", function( elem, _name, isXML ) {
		if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
			return elem.defaultValue;
		}
	} );
}

// Support: IE<9
// Use getAttributeNode to fetch booleans when getAttribute lies
if ( !assert( function( el ) {
	return el.getAttribute( "disabled" ) == null;
} ) ) {
	addHandle( booleans, function( elem, name, isXML ) {
		var val;
		if ( !isXML ) {
			return elem[ name ] === true ? name.toLowerCase() :
				( val = elem.getAttributeNode( name ) ) && val.specified ?
					val.value :
					null;
		}
	} );
}

return Sizzle;

} )( window );



jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;

// Deprecated
jQuery.expr[ ":" ] = jQuery.expr.pseudos;
jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;
jQuery.escapeSelector = Sizzle.escape;




var dir = function( elem, dir, until ) {
	var matched = [],
		truncate = until !== undefined;

	while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
		if ( elem.nodeType === 1 ) {
			if ( truncate && jQuery( elem ).is( until ) ) {
				break;
			}
			matched.push( elem );
		}
	}
	return matched;
};


var siblings = function( n, elem ) {
	var matched = [];

	for ( ; n; n = n.nextSibling ) {
		if ( n.nodeType === 1 && n !== elem ) {
			matched.push( n );
		}
	}

	return matched;
};


var rneedsContext = jQuery.expr.match.needsContext;



function nodeName( elem, name ) {

	return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();

}
var rsingleTag = ( /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i );



// Implement the identical functionality for filter and not
function winnow( elements, qualifier, not ) {
	if ( isFunction( qualifier ) ) {
		return jQuery.grep( elements, function( elem, i ) {
			return !!qualifier.call( elem, i, elem ) !== not;
		} );
	}

	// Single element
	if ( qualifier.nodeType ) {
		return jQuery.grep( elements, function( elem ) {
			return ( elem === qualifier ) !== not;
		} );
	}

	// Arraylike of elements (jQuery, arguments, Array)
	if ( typeof qualifier !== "string" ) {
		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	// Filtered directly for both simple and complex selectors
	return jQuery.filter( qualifier, elements, not );
}

jQuery.filter = function( expr, elems, not ) {
	var elem = elems[ 0 ];

	if ( not ) {
		expr = ":not(" + expr + ")";
	}

	if ( elems.length === 1 && elem.nodeType === 1 ) {
		return jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [];
	}

	return jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
		return elem.nodeType === 1;
	} ) );
};

jQuery.fn.extend( {
	find: function( selector ) {
		var i, ret,
			len = this.length,
			self = this;

		if ( typeof selector !== "string" ) {
			return this.pushStack( jQuery( selector ).filter( function() {
				for ( i = 0; i < len; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			} ) );
		}

		ret = this.pushStack( [] );

		for ( i = 0; i < len; i++ ) {
			jQuery.find( selector, self[ i ], ret );
		}

		return len > 1 ? jQuery.uniqueSort( ret ) : ret;
	},
	filter: function( selector ) {
		return this.pushStack( winnow( this, selector || [], false ) );
	},
	not: function( selector ) {
		return this.pushStack( winnow( this, selector || [], true ) );
	},
	is: function( selector ) {
		return !!winnow(
			this,

			// If this is a positional/relative selector, check membership in the returned set
			// so $("p:first").is("p:last") won't return true for a doc with two "p".
			typeof selector === "string" && rneedsContext.test( selector ) ?
				jQuery( selector ) :
				selector || [],
			false
		).length;
	}
} );


// Initialize a jQuery object


// A central reference to the root jQuery(document)
var rootjQuery,

	// A simple way to check for HTML strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	// Strict HTML recognition (#11290: must start with <)
	// Shortcut simple #id case for speed
	rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,

	init = jQuery.fn.init = function( selector, context, root ) {
		var match, elem;

		// HANDLE: $(""), $(null), $(undefined), $(false)
		if ( !selector ) {
			return this;
		}

		// Method init() accepts an alternate rootjQuery
		// so migrate can support jQuery.sub (gh-2101)
		root = root || rootjQuery;

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			if ( selector[ 0 ] === "<" &&
				selector[ selector.length - 1 ] === ">" &&
				selector.length >= 3 ) {

				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = rquickExpr.exec( selector );
			}

			// Match html or make sure no context is specified for #id
			if ( match && ( match[ 1 ] || !context ) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[ 1 ] ) {
					context = context instanceof jQuery ? context[ 0 ] : context;

					// Option to run scripts is true for back-compat
					// Intentionally let the error be thrown if parseHTML is not present
					jQuery.merge( this, jQuery.parseHTML(
						match[ 1 ],
						context && context.nodeType ? context.ownerDocument || context : document,
						true
					) );

					// HANDLE: $(html, props)
					if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
						for ( match in context ) {

							// Properties of context are called as methods if possible
							if ( isFunction( this[ match ] ) ) {
								this[ match ]( context[ match ] );

							// ...and otherwise set as attributes
							} else {
								this.attr( match, context[ match ] );
							}
						}
					}

					return this;

				// HANDLE: $(#id)
				} else {
					elem = document.getElementById( match[ 2 ] );

					if ( elem ) {

						// Inject the element directly into the jQuery object
						this[ 0 ] = elem;
						this.length = 1;
					}
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || root ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(DOMElement)
		} else if ( selector.nodeType ) {
			this[ 0 ] = selector;
			this.length = 1;
			return this;

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( isFunction( selector ) ) {
			return root.ready !== undefined ?
				root.ready( selector ) :

				// Execute immediately if ready is not present
				selector( jQuery );
		}

		return jQuery.makeArray( selector, this );
	};

// Give the init function the jQuery prototype for later instantiation
init.prototype = jQuery.fn;

// Initialize central reference
rootjQuery = jQuery( document );


var rparentsprev = /^(?:parents|prev(?:Until|All))/,

	// Methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend( {
	has: function( target ) {
		var targets = jQuery( target, this ),
			l = targets.length;

		return this.filter( function() {
			var i = 0;
			for ( ; i < l; i++ ) {
				if ( jQuery.contains( this, targets[ i ] ) ) {
					return true;
				}
			}
		} );
	},

	closest: function( selectors, context ) {
		var cur,
			i = 0,
			l = this.length,
			matched = [],
			targets = typeof selectors !== "string" && jQuery( selectors );

		// Positional selectors never match, since there's no _selection_ context
		if ( !rneedsContext.test( selectors ) ) {
			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( targets ?
						targets.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}
		}

		return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
	},

	// Determine the position of an element within the set
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
		}

		// Index in selector
		if ( typeof elem === "string" ) {
			return indexOf.call( jQuery( elem ), this[ 0 ] );
		}

		// Locate the position of the desired element
		return indexOf.call( this,

			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[ 0 ] : elem
		);
	},

	add: function( selector, context ) {
		return this.pushStack(
			jQuery.uniqueSort(
				jQuery.merge( this.get(), jQuery( selector, context ) )
			)
		);
	},

	addBack: function( selector ) {
		return this.add( selector == null ?
			this.prevObject : this.prevObject.filter( selector )
		);
	}
} );

function sibling( cur, dir ) {
	while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
	return cur;
}

jQuery.each( {
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, _i, until ) {
		return dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return sibling( elem, "nextSibling" );
	},
	prev: function( elem ) {
		return sibling( elem, "previousSibling" );
	},
	nextAll: function( elem ) {
		return dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, _i, until ) {
		return dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, _i, until ) {
		return dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return siblings( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return siblings( elem.firstChild );
	},
	contents: function( elem ) {
		if ( elem.contentDocument != null &&

			// Support: IE 11+
			// <object> elements with no `data` attribute has an object
			// `contentDocument` with a `null` prototype.
			getProto( elem.contentDocument ) ) {

			return elem.contentDocument;
		}

		// Support: IE 9 - 11 only, iOS 7 only, Android Browser <=4.3 only
		// Treat the template element as a regular one in browsers that
		// don't support it.
		if ( nodeName( elem, "template" ) ) {
			elem = elem.content || elem;
		}

		return jQuery.merge( [], elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var matched = jQuery.map( this, fn, until );

		if ( name.slice( -5 ) !== "Until" ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			matched = jQuery.filter( selector, matched );
		}

		if ( this.length > 1 ) {

			// Remove duplicates
			if ( !guaranteedUnique[ name ] ) {
				jQuery.uniqueSort( matched );
			}

			// Reverse order for parents* and prev-derivatives
			if ( rparentsprev.test( name ) ) {
				matched.reverse();
			}
		}

		return this.pushStack( matched );
	};
} );
var rnothtmlwhite = ( /[^\x20\t\r\n\f]+/g );



// Convert String-formatted options into Object-formatted ones
function createOptions( options ) {
	var object = {};
	jQuery.each( options.match( rnothtmlwhite ) || [], function( _, flag ) {
		object[ flag ] = true;
	} );
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	options: an optional list of space-separated options that will change how
 *			the callback list behaves or a more traditional option object
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible options:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( options ) {

	// Convert options from String-formatted to Object-formatted if needed
	// (we check in cache first)
	options = typeof options === "string" ?
		createOptions( options ) :
		jQuery.extend( {}, options );

	var // Flag to know if list is currently firing
		firing,

		// Last fire value for non-forgettable lists
		memory,

		// Flag to know if list was already fired
		fired,

		// Flag to prevent firing
		locked,

		// Actual callback list
		list = [],

		// Queue of execution data for repeatable lists
		queue = [],

		// Index of currently firing callback (modified by add/remove as needed)
		firingIndex = -1,

		// Fire callbacks
		fire = function() {

			// Enforce single-firing
			locked = locked || options.once;

			// Execute callbacks for all pending executions,
			// respecting firingIndex overrides and runtime changes
			fired = firing = true;
			for ( ; queue.length; firingIndex = -1 ) {
				memory = queue.shift();
				while ( ++firingIndex < list.length ) {

					// Run callback and check for early termination
					if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
						options.stopOnFalse ) {

						// Jump to end and forget the data so .add doesn't re-fire
						firingIndex = list.length;
						memory = false;
					}
				}
			}

			// Forget the data if we're done with it
			if ( !options.memory ) {
				memory = false;
			}

			firing = false;

			// Clean up if we're done firing for good
			if ( locked ) {

				// Keep an empty list if we have data for future add calls
				if ( memory ) {
					list = [];

				// Otherwise, this object is spent
				} else {
					list = "";
				}
			}
		},

		// Actual Callbacks object
		self = {

			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {

					// If we have memory from a past run, we should fire after adding
					if ( memory && !firing ) {
						firingIndex = list.length - 1;
						queue.push( memory );
					}

					( function add( args ) {
						jQuery.each( args, function( _, arg ) {
							if ( isFunction( arg ) ) {
								if ( !options.unique || !self.has( arg ) ) {
									list.push( arg );
								}
							} else if ( arg && arg.length && toType( arg ) !== "string" ) {

								// Inspect recursively
								add( arg );
							}
						} );
					} )( arguments );

					if ( memory && !firing ) {
						fire();
					}
				}
				return this;
			},

			// Remove a callback from the list
			remove: function() {
				jQuery.each( arguments, function( _, arg ) {
					var index;
					while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
						list.splice( index, 1 );

						// Handle firing indexes
						if ( index <= firingIndex ) {
							firingIndex--;
						}
					}
				} );
				return this;
			},

			// Check if a given callback is in the list.
			// If no argument is given, return whether or not list has callbacks attached.
			has: function( fn ) {
				return fn ?
					jQuery.inArray( fn, list ) > -1 :
					list.length > 0;
			},

			// Remove all callbacks from the list
			empty: function() {
				if ( list ) {
					list = [];
				}
				return this;
			},

			// Disable .fire and .add
			// Abort any current/pending executions
			// Clear all callbacks and values
			disable: function() {
				locked = queue = [];
				list = memory = "";
				return this;
			},
			disabled: function() {
				return !list;
			},

			// Disable .fire
			// Also disable .add unless we have memory (since it would have no effect)
			// Abort any pending executions
			lock: function() {
				locked = queue = [];
				if ( !memory && !firing ) {
					list = memory = "";
				}
				return this;
			},
			locked: function() {
				return !!locked;
			},

			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( !locked ) {
					args = args || [];
					args = [ context, args.slice ? args.slice() : args ];
					queue.push( args );
					if ( !firing ) {
						fire();
					}
				}
				return this;
			},

			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},

			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};


function Identity( v ) {
	return v;
}
function Thrower( ex ) {
	throw ex;
}

function adoptValue( value, resolve, reject, noValue ) {
	var method;

	try {

		// Check for promise aspect first to privilege synchronous behavior
		if ( value && isFunction( ( method = value.promise ) ) ) {
			method.call( value ).done( resolve ).fail( reject );

		// Other thenables
		} else if ( value && isFunction( ( method = value.then ) ) ) {
			method.call( value, resolve, reject );

		// Other non-thenables
		} else {

			// Control `resolve` arguments by letting Array#slice cast boolean `noValue` to integer:
			// * false: [ value ].slice( 0 ) => resolve( value )
			// * true: [ value ].slice( 1 ) => resolve()
			resolve.apply( undefined, [ value ].slice( noValue ) );
		}

	// For Promises/A+, convert exceptions into rejections
	// Since jQuery.when doesn't unwrap thenables, we can skip the extra checks appearing in
	// Deferred#then to conditionally suppress rejection.
	} catch ( value ) {

		// Support: Android 4.0 only
		// Strict mode functions invoked without .call/.apply get global-object context
		reject.apply( undefined, [ value ] );
	}
}

jQuery.extend( {

	Deferred: function( func ) {
		var tuples = [

				// action, add listener, callbacks,
				// ... .then handlers, argument index, [final state]
				[ "notify", "progress", jQuery.Callbacks( "memory" ),
					jQuery.Callbacks( "memory" ), 2 ],
				[ "resolve", "done", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 0, "resolved" ],
				[ "reject", "fail", jQuery.Callbacks( "once memory" ),
					jQuery.Callbacks( "once memory" ), 1, "rejected" ]
			],
			state = "pending",
			promise = {
				state: function() {
					return state;
				},
				always: function() {
					deferred.done( arguments ).fail( arguments );
					return this;
				},
				"catch": function( fn ) {
					return promise.then( null, fn );
				},

				// Keep pipe for back-compat
				pipe: function( /* fnDone, fnFail, fnProgress */ ) {
					var fns = arguments;

					return jQuery.Deferred( function( newDefer ) {
						jQuery.each( tuples, function( _i, tuple ) {

							// Map tuples (progress, done, fail) to arguments (done, fail, progress)
							var fn = isFunction( fns[ tuple[ 4 ] ] ) && fns[ tuple[ 4 ] ];

							// deferred.progress(function() { bind to newDefer or newDefer.notify })
							// deferred.done(function() { bind to newDefer or newDefer.resolve })
							// deferred.fail(function() { bind to newDefer or newDefer.reject })
							deferred[ tuple[ 1 ] ]( function() {
								var returned = fn && fn.apply( this, arguments );
								if ( returned && isFunction( returned.promise ) ) {
									returned.promise()
										.progress( newDefer.notify )
										.done( newDefer.resolve )
										.fail( newDefer.reject );
								} else {
									newDefer[ tuple[ 0 ] + "With" ](
										this,
										fn ? [ returned ] : arguments
									);
								}
							} );
						} );
						fns = null;
					} ).promise();
				},
				then: function( onFulfilled, onRejected, onProgress ) {
					var maxDepth = 0;
					function resolve( depth, deferred, handler, special ) {
						return function() {
							var that = this,
								args = arguments,
								mightThrow = function() {
									var returned, then;

									// Support: Promises/A+ section 2.3.3.3.3
									// https://promisesaplus.com/#point-59
									// Ignore double-resolution attempts
									if ( depth < maxDepth ) {
										return;
									}

									returned = handler.apply( that, args );

									// Support: Promises/A+ section 2.3.1
									// https://promisesaplus.com/#point-48
									if ( returned === deferred.promise() ) {
										throw new TypeError( "Thenable self-resolution" );
									}

									// Support: Promises/A+ sections 2.3.3.1, 3.5
									// https://promisesaplus.com/#point-54
									// https://promisesaplus.com/#point-75
									// Retrieve `then` only once
									then = returned &&

										// Support: Promises/A+ section 2.3.4
										// https://promisesaplus.com/#point-64
										// Only check objects and functions for thenability
										( typeof returned === "object" ||
											typeof returned === "function" ) &&
										returned.then;

									// Handle a returned thenable
									if ( isFunction( then ) ) {

										// Special processors (notify) just wait for resolution
										if ( special ) {
											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special )
											);

										// Normal processors (resolve) also hook into progress
										} else {

											// ...and disregard older resolution values
											maxDepth++;

											then.call(
												returned,
												resolve( maxDepth, deferred, Identity, special ),
												resolve( maxDepth, deferred, Thrower, special ),
												resolve( maxDepth, deferred, Identity,
													deferred.notifyWith )
											);
										}

									// Handle all other returned values
									} else {

										// Only substitute handlers pass on context
										// and multiple values (non-spec behavior)
										if ( handler !== Identity ) {
											that = undefined;
											args = [ returned ];
										}

										// Process the value(s)
										// Default process is resolve
										( special || deferred.resolveWith )( that, args );
									}
								},

								// Only normal processors (resolve) catch and reject exceptions
								process = special ?
									mightThrow :
									function() {
										try {
											mightThrow();
										} catch ( e ) {

											if ( jQuery.Deferred.exceptionHook ) {
												jQuery.Deferred.exceptionHook( e,
													process.stackTrace );
											}

											// Support: Promises/A+ section 2.3.3.3.4.1
											// https://promisesaplus.com/#point-61
											// Ignore post-resolution exceptions
											if ( depth + 1 >= maxDepth ) {

												// Only substitute handlers pass on context
												// and multiple values (non-spec behavior)
												if ( handler !== Thrower ) {
													that = undefined;
													args = [ e ];
												}

												deferred.rejectWith( that, args );
											}
										}
									};

							// Support: Promises/A+ section 2.3.3.3.1
							// https://promisesaplus.com/#point-57
							// Re-resolve promises immediately to dodge false rejection from
							// subsequent errors
							if ( depth ) {
								process();
							} else {

								// Call an optional hook to record the stack, in case of exception
								// since it's otherwise lost when execution goes async
								if ( jQuery.Deferred.getStackHook ) {
									process.stackTrace = jQuery.Deferred.getStackHook();
								}
								window.setTimeout( process );
							}
						};
					}

					return jQuery.Deferred( function( newDefer ) {

						// progress_handlers.add( ... )
						tuples[ 0 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onProgress ) ?
									onProgress :
									Identity,
								newDefer.notifyWith
							)
						);

						// fulfilled_handlers.add( ... )
						tuples[ 1 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onFulfilled ) ?
									onFulfilled :
									Identity
							)
						);

						// rejected_handlers.add( ... )
						tuples[ 2 ][ 3 ].add(
							resolve(
								0,
								newDefer,
								isFunction( onRejected ) ?
									onRejected :
									Thrower
							)
						);
					} ).promise();
				},

				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					return obj != null ? jQuery.extend( obj, promise ) : promise;
				}
			},
			deferred = {};

		// Add list-specific methods
		jQuery.each( tuples, function( i, tuple ) {
			var list = tuple[ 2 ],
				stateString = tuple[ 5 ];

			// promise.progress = list.add
			// promise.done = list.add
			// promise.fail = list.add
			promise[ tuple[ 1 ] ] = list.add;

			// Handle state
			if ( stateString ) {
				list.add(
					function() {

						// state = "resolved" (i.e., fulfilled)
						// state = "rejected"
						state = stateString;
					},

					// rejected_callbacks.disable
					// fulfilled_callbacks.disable
					tuples[ 3 - i ][ 2 ].disable,

					// rejected_handlers.disable
					// fulfilled_handlers.disable
					tuples[ 3 - i ][ 3 ].disable,

					// progress_callbacks.lock
					tuples[ 0 ][ 2 ].lock,

					// progress_handlers.lock
					tuples[ 0 ][ 3 ].lock
				);
			}

			// progress_handlers.fire
			// fulfilled_handlers.fire
			// rejected_handlers.fire
			list.add( tuple[ 3 ].fire );

			// deferred.notify = function() { deferred.notifyWith(...) }
			// deferred.resolve = function() { deferred.resolveWith(...) }
			// deferred.reject = function() { deferred.rejectWith(...) }
			deferred[ tuple[ 0 ] ] = function() {
				deferred[ tuple[ 0 ] + "With" ]( this === deferred ? undefined : this, arguments );
				return this;
			};

			// deferred.notifyWith = list.fireWith
			// deferred.resolveWith = list.fireWith
			// deferred.rejectWith = list.fireWith
			deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
		} );

		// Make the deferred a promise
		promise.promise( deferred );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( singleValue ) {
		var

			// count of uncompleted subordinates
			remaining = arguments.length,

			// count of unprocessed arguments
			i = remaining,

			// subordinate fulfillment data
			resolveContexts = Array( i ),
			resolveValues = slice.call( arguments ),

			// the primary Deferred
			primary = jQuery.Deferred(),

			// subordinate callback factory
			updateFunc = function( i ) {
				return function( value ) {
					resolveContexts[ i ] = this;
					resolveValues[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
					if ( !( --remaining ) ) {
						primary.resolveWith( resolveContexts, resolveValues );
					}
				};
			};

		// Single- and empty arguments are adopted like Promise.resolve
		if ( remaining <= 1 ) {
			adoptValue( singleValue, primary.done( updateFunc( i ) ).resolve, primary.reject,
				!remaining );

			// Use .then() to unwrap secondary thenables (cf. gh-3000)
			if ( primary.state() === "pending" ||
				isFunction( resolveValues[ i ] && resolveValues[ i ].then ) ) {

				return primary.then();
			}
		}

		// Multiple arguments are aggregated like Promise.all array elements
		while ( i-- ) {
			adoptValue( resolveValues[ i ], updateFunc( i ), primary.reject );
		}

		return primary.promise();
	}
} );


// These usually indicate a programmer mistake during development,
// warn about them ASAP rather than swallowing them by default.
var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;

jQuery.Deferred.exceptionHook = function( error, stack ) {

	// Support: IE 8 - 9 only
	// Console exists when dev tools are open, which can happen at any time
	if ( window.console && window.console.warn && error && rerrorNames.test( error.name ) ) {
		window.console.warn( "jQuery.Deferred exception: " + error.message, error.stack, stack );
	}
};




jQuery.readyException = function( error ) {
	window.setTimeout( function() {
		throw error;
	} );
};




// The deferred used on DOM ready
var readyList = jQuery.Deferred();

jQuery.fn.ready = function( fn ) {

	readyList
		.then( fn )

		// Wrap jQuery.readyException in a function so that the lookup
		// happens at the time of error handling instead of callback
		// registration.
		.catch( function( error ) {
			jQuery.readyException( error );
		} );

	return this;
};

jQuery.extend( {

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Handle when the DOM is ready
	ready: function( wait ) {

		// Abort if there are pending holds or we're already ready
		if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
			return;
		}

		// Remember that the DOM is ready
		jQuery.isReady = true;

		// If a normal DOM Ready event fired, decrement, and wait if need be
		if ( wait !== true && --jQuery.readyWait > 0 ) {
			return;
		}

		// If there are functions bound, to execute
		readyList.resolveWith( document, [ jQuery ] );
	}
} );

jQuery.ready.then = readyList.then;

// The ready event handler and self cleanup method
function completed() {
	document.removeEventListener( "DOMContentLoaded", completed );
	window.removeEventListener( "load", completed );
	jQuery.ready();
}

// Catch cases where $(document).ready() is called
// after the browser event has already occurred.
// Support: IE <=9 - 10 only
// Older IE sometimes signals "interactive" too soon
if ( document.readyState === "complete" ||
	( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

	// Handle it asynchronously to allow scripts the opportunity to delay ready
	window.setTimeout( jQuery.ready );

} else {

	// Use the handy event callback
	document.addEventListener( "DOMContentLoaded", completed );

	// A fallback to window.onload, that will always work
	window.addEventListener( "load", completed );
}




// Multifunctional method to get and set values of a collection
// The value/s can optionally be executed if it's a function
var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
	var i = 0,
		len = elems.length,
		bulk = key == null;

	// Sets many values
	if ( toType( key ) === "object" ) {
		chainable = true;
		for ( i in key ) {
			access( elems, fn, i, key[ i ], true, emptyGet, raw );
		}

	// Sets one value
	} else if ( value !== undefined ) {
		chainable = true;

		if ( !isFunction( value ) ) {
			raw = true;
		}

		if ( bulk ) {

			// Bulk operations run against the entire set
			if ( raw ) {
				fn.call( elems, value );
				fn = null;

			// ...except when executing function values
			} else {
				bulk = fn;
				fn = function( elem, _key, value ) {
					return bulk.call( jQuery( elem ), value );
				};
			}
		}

		if ( fn ) {
			for ( ; i < len; i++ ) {
				fn(
					elems[ i ], key, raw ?
						value :
						value.call( elems[ i ], i, fn( elems[ i ], key ) )
				);
			}
		}
	}

	if ( chainable ) {
		return elems;
	}

	// Gets
	if ( bulk ) {
		return fn.call( elems );
	}

	return len ? fn( elems[ 0 ], key ) : emptyGet;
};


// Matches dashed string for camelizing
var rmsPrefix = /^-ms-/,
	rdashAlpha = /-([a-z])/g;

// Used by camelCase as callback to replace()
function fcamelCase( _all, letter ) {
	return letter.toUpperCase();
}

// Convert dashed to camelCase; used by the css and data modules
// Support: IE <=9 - 11, Edge 12 - 15
// Microsoft forgot to hump their vendor prefix (#9572)
function camelCase( string ) {
	return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
}
var acceptData = function( owner ) {

	// Accepts only:
	//  - Node
	//    - Node.ELEMENT_NODE
	//    - Node.DOCUMENT_NODE
	//  - Object
	//    - Any
	return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
};




function Data() {
	this.expando = jQuery.expando + Data.uid++;
}

Data.uid = 1;

Data.prototype = {

	cache: function( owner ) {

		// Check if the owner object already has a cache
		var value = owner[ this.expando ];

		// If not, create one
		if ( !value ) {
			value = {};

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( acceptData( owner ) ) {

				// If it is a node unlikely to be stringify-ed or looped over
				// use plain assignment
				if ( owner.nodeType ) {
					owner[ this.expando ] = value;

				// Otherwise secure it in a non-enumerable property
				// configurable must be true to allow the property to be
				// deleted when data is removed
				} else {
					Object.defineProperty( owner, this.expando, {
						value: value,
						configurable: true
					} );
				}
			}
		}

		return value;
	},
	set: function( owner, data, value ) {
		var prop,
			cache = this.cache( owner );

		// Handle: [ owner, key, value ] args
		// Always use camelCase key (gh-2257)
		if ( typeof data === "string" ) {
			cache[ camelCase( data ) ] = value;

		// Handle: [ owner, { properties } ] args
		} else {

			// Copy the properties one-by-one to the cache object
			for ( prop in data ) {
				cache[ camelCase( prop ) ] = data[ prop ];
			}
		}
		return cache;
	},
	get: function( owner, key ) {
		return key === undefined ?
			this.cache( owner ) :

			// Always use camelCase key (gh-2257)
			owner[ this.expando ] && owner[ this.expando ][ camelCase( key ) ];
	},
	access: function( owner, key, value ) {

		// In cases where either:
		//
		//   1. No key was specified
		//   2. A string key was specified, but no value provided
		//
		// Take the "read" path and allow the get method to determine
		// which value to return, respectively either:
		//
		//   1. The entire cache object
		//   2. The data stored at the key
		//
		if ( key === undefined ||
				( ( key && typeof key === "string" ) && value === undefined ) ) {

			return this.get( owner, key );
		}

		// When the key is not a string, or both a key and value
		// are specified, set or extend (existing objects) with either:
		//
		//   1. An object of properties
		//   2. A key and value
		//
		this.set( owner, key, value );

		// Since the "set" path can have two possible entry points
		// return the expected data based on which path was taken[*]
		return value !== undefined ? value : key;
	},
	remove: function( owner, key ) {
		var i,
			cache = owner[ this.expando ];

		if ( cache === undefined ) {
			return;
		}

		if ( key !== undefined ) {

			// Support array or space separated string of keys
			if ( Array.isArray( key ) ) {

				// If key is an array of keys...
				// We always set camelCase keys, so remove that.
				key = key.map( camelCase );
			} else {
				key = camelCase( key );

				// If a key with the spaces exists, use it.
				// Otherwise, create an array by matching non-whitespace
				key = key in cache ?
					[ key ] :
					( key.match( rnothtmlwhite ) || [] );
			}

			i = key.length;

			while ( i-- ) {
				delete cache[ key[ i ] ];
			}
		}

		// Remove the expando if there's no more data
		if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

			// Support: Chrome <=35 - 45
			// Webkit & Blink performance suffers when deleting properties
			// from DOM nodes, so set to undefined instead
			// https://bugs.chromium.org/p/chromium/issues/detail?id=378607 (bug restricted)
			if ( owner.nodeType ) {
				owner[ this.expando ] = undefined;
			} else {
				delete owner[ this.expando ];
			}
		}
	},
	hasData: function( owner ) {
		var cache = owner[ this.expando ];
		return cache !== undefined && !jQuery.isEmptyObject( cache );
	}
};
var dataPriv = new Data();

var dataUser = new Data();



//	Implementation Summary
//
//	1. Enforce API surface and semantic compatibility with 1.9.x branch
//	2. Improve the module's maintainability by reducing the storage
//		paths to a single mechanism.
//	3. Use the same single mechanism to support "private" and "user" data.
//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
//	5. Avoid exposing implementation details on user objects (eg. expando properties)
//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
	rmultiDash = /[A-Z]/g;

function getData( data ) {
	if ( data === "true" ) {
		return true;
	}

	if ( data === "false" ) {
		return false;
	}

	if ( data === "null" ) {
		return null;
	}

	// Only convert to a number if it doesn't change the string
	if ( data === +data + "" ) {
		return +data;
	}

	if ( rbrace.test( data ) ) {
		return JSON.parse( data );
	}

	return data;
}

function dataAttr( elem, key, data ) {
	var name;

	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {
		name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = getData( data );
			} catch ( e ) {}

			// Make sure we set the data so it isn't changed later
			dataUser.set( elem, key, data );
		} else {
			data = undefined;
		}
	}
	return data;
}

jQuery.extend( {
	hasData: function( elem ) {
		return dataUser.hasData( elem ) || dataPriv.hasData( elem );
	},

	data: function( elem, name, data ) {
		return dataUser.access( elem, name, data );
	},

	removeData: function( elem, name ) {
		dataUser.remove( elem, name );
	},

	// TODO: Now that all calls to _data and _removeData have been replaced
	// with direct calls to dataPriv methods, these can be deprecated.
	_data: function( elem, name, data ) {
		return dataPriv.access( elem, name, data );
	},

	_removeData: function( elem, name ) {
		dataPriv.remove( elem, name );
	}
} );

jQuery.fn.extend( {
	data: function( key, value ) {
		var i, name, data,
			elem = this[ 0 ],
			attrs = elem && elem.attributes;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = dataUser.get( elem );

				if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
					i = attrs.length;
					while ( i-- ) {

						// Support: IE 11 only
						// The attrs elements can be null (#14894)
						if ( attrs[ i ] ) {
							name = attrs[ i ].name;
							if ( name.indexOf( "data-" ) === 0 ) {
								name = camelCase( name.slice( 5 ) );
								dataAttr( elem, name, data[ name ] );
							}
						}
					}
					dataPriv.set( elem, "hasDataAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each( function() {
				dataUser.set( this, key );
			} );
		}

		return access( this, function( value ) {
			var data;

			// The calling jQuery object (element matches) is not empty
			// (and therefore has an element appears at this[ 0 ]) and the
			// `value` parameter was not undefined. An empty jQuery object
			// will result in `undefined` for elem = this[ 0 ] which will
			// throw an exception if an attempt to read a data cache is made.
			if ( elem && value === undefined ) {

				// Attempt to get data from the cache
				// The key will always be camelCased in Data
				data = dataUser.get( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// Attempt to "discover" the data in
				// HTML5 custom data-* attrs
				data = dataAttr( elem, key );
				if ( data !== undefined ) {
					return data;
				}

				// We tried really hard, but the data doesn't exist.
				return;
			}

			// Set the data...
			this.each( function() {

				// We always store the camelCased key
				dataUser.set( this, key, value );
			} );
		}, null, value, arguments.length > 1, null, true );
	},

	removeData: function( key ) {
		return this.each( function() {
			dataUser.remove( this, key );
		} );
	}
} );


jQuery.extend( {
	queue: function( elem, type, data ) {
		var queue;

		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			queue = dataPriv.get( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !queue || Array.isArray( data ) ) {
					queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
				} else {
					queue.push( data );
				}
			}
			return queue || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			startLength = queue.length,
			fn = queue.shift(),
			hooks = jQuery._queueHooks( elem, type ),
			next = function() {
				jQuery.dequeue( elem, type );
			};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
			startLength--;
		}

		if ( fn ) {

			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			// Clear up the last queue stop function
			delete hooks.stop;
			fn.call( elem, next, hooks );
		}

		if ( !startLength && hooks ) {
			hooks.empty.fire();
		}
	},

	// Not public - generate a queueHooks object, or return the current one
	_queueHooks: function( elem, type ) {
		var key = type + "queueHooks";
		return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
			empty: jQuery.Callbacks( "once memory" ).add( function() {
				dataPriv.remove( elem, [ type + "queue", key ] );
			} )
		} );
	}
} );

jQuery.fn.extend( {
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[ 0 ], type );
		}

		return data === undefined ?
			this :
			this.each( function() {
				var queue = jQuery.queue( this, type, data );

				// Ensure a hooks for this queue
				jQuery._queueHooks( this, type );

				if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			} );
	},
	dequeue: function( type ) {
		return this.each( function() {
			jQuery.dequeue( this, type );
		} );
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},

	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, obj ) {
		var tmp,
			count = 1,
			defer = jQuery.Deferred(),
			elements = this,
			i = this.length,
			resolve = function() {
				if ( !( --count ) ) {
					defer.resolveWith( elements, [ elements ] );
				}
			};

		if ( typeof type !== "string" ) {
			obj = type;
			type = undefined;
		}
		type = type || "fx";

		while ( i-- ) {
			tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
			if ( tmp && tmp.empty ) {
				count++;
				tmp.empty.add( resolve );
			}
		}
		resolve();
		return defer.promise( obj );
	}
} );
var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

var documentElement = document.documentElement;



	var isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem );
		},
		composed = { composed: true };

	// Support: IE 9 - 11+, Edge 12 - 18+, iOS 10.0 - 10.2 only
	// Check attachment across shadow DOM boundaries when possible (gh-3504)
	// Support: iOS 10.0-10.2 only
	// Early iOS 10 versions support `attachShadow` but not `getRootNode`,
	// leading to errors. We need to check for `getRootNode`.
	if ( documentElement.getRootNode ) {
		isAttached = function( elem ) {
			return jQuery.contains( elem.ownerDocument, elem ) ||
				elem.getRootNode( composed ) === elem.ownerDocument;
		};
	}
var isHiddenWithinTree = function( elem, el ) {

		// isHiddenWithinTree might be called from jQuery#filter function;
		// in that case, element will be second argument
		elem = el || elem;

		// Inline style trumps all
		return elem.style.display === "none" ||
			elem.style.display === "" &&

			// Otherwise, check computed style
			// Support: Firefox <=43 - 45
			// Disconnected elements can have computed display: none, so first confirm that elem is
			// in the document.
			isAttached( elem ) &&

			jQuery.css( elem, "display" ) === "none";
	};



function adjustCSS( elem, prop, valueParts, tween ) {
	var adjusted, scale,
		maxIterations = 20,
		currentValue = tween ?
			function() {
				return tween.cur();
			} :
			function() {
				return jQuery.css( elem, prop, "" );
			},
		initial = currentValue(),
		unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

		// Starting value computation is required for potential unit mismatches
		initialInUnit = elem.nodeType &&
			( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
			rcssNum.exec( jQuery.css( elem, prop ) );

	if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

		// Support: Firefox <=54
		// Halve the iteration target value to prevent interference from CSS upper bounds (gh-2144)
		initial = initial / 2;

		// Trust units reported by jQuery.css
		unit = unit || initialInUnit[ 3 ];

		// Iteratively approximate from a nonzero starting point
		initialInUnit = +initial || 1;

		while ( maxIterations-- ) {

			// Evaluate and update our best guess (doubling guesses that zero out).
			// Finish if the scale equals or crosses 1 (making the old*new product non-positive).
			jQuery.style( elem, prop, initialInUnit + unit );
			if ( ( 1 - scale ) * ( 1 - ( scale = currentValue() / initial || 0.5 ) ) <= 0 ) {
				maxIterations = 0;
			}
			initialInUnit = initialInUnit / scale;

		}

		initialInUnit = initialInUnit * 2;
		jQuery.style( elem, prop, initialInUnit + unit );

		// Make sure we update the tween properties later on
		valueParts = valueParts || [];
	}

	if ( valueParts ) {
		initialInUnit = +initialInUnit || +initial || 0;

		// Apply relative offset (+=/-=) if specified
		adjusted = valueParts[ 1 ] ?
			initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
			+valueParts[ 2 ];
		if ( tween ) {
			tween.unit = unit;
			tween.start = initialInUnit;
			tween.end = adjusted;
		}
	}
	return adjusted;
}


var defaultDisplayMap = {};

function getDefaultDisplay( elem ) {
	var temp,
		doc = elem.ownerDocument,
		nodeName = elem.nodeName,
		display = defaultDisplayMap[ nodeName ];

	if ( display ) {
		return display;
	}

	temp = doc.body.appendChild( doc.createElement( nodeName ) );
	display = jQuery.css( temp, "display" );

	temp.parentNode.removeChild( temp );

	if ( display === "none" ) {
		display = "block";
	}
	defaultDisplayMap[ nodeName ] = display;

	return display;
}

function showHide( elements, show ) {
	var display, elem,
		values = [],
		index = 0,
		length = elements.length;

	// Determine new display value for elements that need to change
	for ( ; index < length; index++ ) {
		elem = elements[ index ];
		if ( !elem.style ) {
			continue;
		}

		display = elem.style.display;
		if ( show ) {

			// Since we force visibility upon cascade-hidden elements, an immediate (and slow)
			// check is required in this first loop unless we have a nonempty display value (either
			// inline or about-to-be-restored)
			if ( display === "none" ) {
				values[ index ] = dataPriv.get( elem, "display" ) || null;
				if ( !values[ index ] ) {
					elem.style.display = "";
				}
			}
			if ( elem.style.display === "" && isHiddenWithinTree( elem ) ) {
				values[ index ] = getDefaultDisplay( elem );
			}
		} else {
			if ( display !== "none" ) {
				values[ index ] = "none";

				// Remember what we're overwriting
				dataPriv.set( elem, "display", display );
			}
		}
	}

	// Set the display of the elements in a second loop to avoid constant reflow
	for ( index = 0; index < length; index++ ) {
		if ( values[ index ] != null ) {
			elements[ index ].style.display = values[ index ];
		}
	}

	return elements;
}

jQuery.fn.extend( {
	show: function() {
		return showHide( this, true );
	},
	hide: function() {
		return showHide( this );
	},
	toggle: function( state ) {
		if ( typeof state === "boolean" ) {
			return state ? this.show() : this.hide();
		}

		return this.each( function() {
			if ( isHiddenWithinTree( this ) ) {
				jQuery( this ).show();
			} else {
				jQuery( this ).hide();
			}
		} );
	}
} );
var rcheckableType = ( /^(?:checkbox|radio)$/i );

var rtagName = ( /<([a-z][^\/\0>\x20\t\r\n\f]*)/i );

var rscriptType = ( /^$|^module$|\/(?:java|ecma)script/i );



( function() {
	var fragment = document.createDocumentFragment(),
		div = fragment.appendChild( document.createElement( "div" ) ),
		input = document.createElement( "input" );

	// Support: Android 4.0 - 4.3 only
	// Check state lost if the name is set (#11217)
	// Support: Windows Web Apps (WWA)
	// `name` and `type` must use .setAttribute for WWA (#14901)
	input.setAttribute( "type", "radio" );
	input.setAttribute( "checked", "checked" );
	input.setAttribute( "name", "t" );

	div.appendChild( input );

	// Support: Android <=4.1 only
	// Older WebKit doesn't clone checked state correctly in fragments
	support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Support: IE <=11 only
	// Make sure textarea (and checkbox) defaultValue is properly cloned
	div.innerHTML = "<textarea>x</textarea>";
	support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;

	// Support: IE <=9 only
	// IE <=9 replaces <option> tags with their contents when inserted outside of
	// the select element.
	div.innerHTML = "<option></option>";
	support.option = !!div.lastChild;
} )();


// We have to close these tags to support XHTML (#13200)
var wrapMap = {

	// XHTML parsers do not magically insert elements in the
	// same way that tag soup parsers do. So we cannot shorten
	// this by omitting <tbody> or other required elements.
	thead: [ 1, "<table>", "</table>" ],
	col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
	tr: [ 2, "<table><tbody>", "</tbody></table>" ],
	td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

	_default: [ 0, "", "" ]
};

wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// Support: IE <=9 only
if ( !support.option ) {
	wrapMap.optgroup = wrapMap.option = [ 1, "<select multiple='multiple'>", "</select>" ];
}


function getAll( context, tag ) {

	// Support: IE <=9 - 11 only
	// Use typeof to avoid zero-argument method invocation on host objects (#15151)
	var ret;

	if ( typeof context.getElementsByTagName !== "undefined" ) {
		ret = context.getElementsByTagName( tag || "*" );

	} else if ( typeof context.querySelectorAll !== "undefined" ) {
		ret = context.querySelectorAll( tag || "*" );

	} else {
		ret = [];
	}

	if ( tag === undefined || tag && nodeName( context, tag ) ) {
		return jQuery.merge( [ context ], ret );
	}

	return ret;
}


// Mark scripts as having already been evaluated
function setGlobalEval( elems, refElements ) {
	var i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		dataPriv.set(
			elems[ i ],
			"globalEval",
			!refElements || dataPriv.get( refElements[ i ], "globalEval" )
		);
	}
}


var rhtml = /<|&#?\w+;/;

function buildFragment( elems, context, scripts, selection, ignored ) {
	var elem, tmp, tag, wrap, attached, j,
		fragment = context.createDocumentFragment(),
		nodes = [],
		i = 0,
		l = elems.length;

	for ( ; i < l; i++ ) {
		elem = elems[ i ];

		if ( elem || elem === 0 ) {

			// Add nodes directly
			if ( toType( elem ) === "object" ) {

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

			// Convert non-html into a text node
			} else if ( !rhtml.test( elem ) ) {
				nodes.push( context.createTextNode( elem ) );

			// Convert html into DOM nodes
			} else {
				tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

				// Deserialize a standard representation
				tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
				wrap = wrapMap[ tag ] || wrapMap._default;
				tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

				// Descend through wrappers to the right content
				j = wrap[ 0 ];
				while ( j-- ) {
					tmp = tmp.lastChild;
				}

				// Support: Android <=4.0 only, PhantomJS 1 only
				// push.apply(_, arraylike) throws on ancient WebKit
				jQuery.merge( nodes, tmp.childNodes );

				// Remember the top-level container
				tmp = fragment.firstChild;

				// Ensure the created nodes are orphaned (#12392)
				tmp.textContent = "";
			}
		}
	}

	// Remove wrapper from fragment
	fragment.textContent = "";

	i = 0;
	while ( ( elem = nodes[ i++ ] ) ) {

		// Skip elements already in the context collection (trac-4087)
		if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
			if ( ignored ) {
				ignored.push( elem );
			}
			continue;
		}

		attached = isAttached( elem );

		// Append to fragment
		tmp = getAll( fragment.appendChild( elem ), "script" );

		// Preserve script evaluation history
		if ( attached ) {
			setGlobalEval( tmp );
		}

		// Capture executables
		if ( scripts ) {
			j = 0;
			while ( ( elem = tmp[ j++ ] ) ) {
				if ( rscriptType.test( elem.type || "" ) ) {
					scripts.push( elem );
				}
			}
		}
	}

	return fragment;
}


var rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

function returnTrue() {
	return true;
}

function returnFalse() {
	return false;
}

// Support: IE <=9 - 11+
// focus() and blur() are asynchronous, except when they are no-op.
// So expect focus to be synchronous when the element is already active,
// and blur to be synchronous when the element is not already active.
// (focus and blur are always synchronous in other supported browsers,
// this just defines when we can count on it).
function expectSync( elem, type ) {
	return ( elem === safeActiveElement() ) === ( type === "focus" );
}

// Support: IE <=9 only
// Accessing document.activeElement can throw unexpectedly
// https://bugs.jquery.com/ticket/13393
function safeActiveElement() {
	try {
		return document.activeElement;
	} catch ( err ) { }
}

function on( elem, types, selector, data, fn, one ) {
	var origFn, type;

	// Types can be a map of types/handlers
	if ( typeof types === "object" ) {

		// ( types-Object, selector, data )
		if ( typeof selector !== "string" ) {

			// ( types-Object, data )
			data = data || selector;
			selector = undefined;
		}
		for ( type in types ) {
			on( elem, type, selector, data, types[ type ], one );
		}
		return elem;
	}

	if ( data == null && fn == null ) {

		// ( types, fn )
		fn = selector;
		data = selector = undefined;
	} else if ( fn == null ) {
		if ( typeof selector === "string" ) {

			// ( types, selector, fn )
			fn = data;
			data = undefined;
		} else {

			// ( types, data, fn )
			fn = data;
			data = selector;
			selector = undefined;
		}
	}
	if ( fn === false ) {
		fn = returnFalse;
	} else if ( !fn ) {
		return elem;
	}

	if ( one === 1 ) {
		origFn = fn;
		fn = function( event ) {

			// Can use an empty set, since event contains the info
			jQuery().off( event );
			return origFn.apply( this, arguments );
		};

		// Use same guid so caller can remove using origFn
		fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
	}
	return elem.each( function() {
		jQuery.event.add( this, types, fn, data, selector );
	} );
}

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	global: {},

	add: function( elem, types, handler, data, selector ) {

		var handleObjIn, eventHandle, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.get( elem );

		// Only attach events to objects that accept data
		if ( !acceptData( elem ) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Ensure that invalid selectors throw exceptions at attach time
		// Evaluate against documentElement in case elem is a non-element node (e.g., document)
		if ( selector ) {
			jQuery.find.matchesSelector( documentElement, selector );
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		if ( !( events = elemData.events ) ) {
			events = elemData.events = Object.create( null );
		}
		if ( !( eventHandle = elemData.handle ) ) {
			eventHandle = elemData.handle = function( e ) {

				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
					jQuery.event.dispatch.apply( elem, arguments ) : undefined;
			};
		}

		// Handle multiple events separated by a space
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// There *must* be a type, no attaching namespace-only handlers
			if ( !type ) {
				continue;
			}

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend( {
				type: type,
				origType: origType,
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
				namespace: namespaces.join( "." )
			}, handleObjIn );

			// Init the event handler queue if we're the first
			if ( !( handlers = events[ type ] ) ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener if the special events handler returns false
				if ( !special.setup ||
					special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

	},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var j, origCount, tmp,
			events, t, handleObj,
			special, handlers, type, namespaces, origType,
			elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

		if ( !elemData || !( events = elemData.events ) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = ( types || "" ).match( rnothtmlwhite ) || [ "" ];
		t = types.length;
		while ( t-- ) {
			tmp = rtypenamespace.exec( types[ t ] ) || [];
			type = origType = tmp[ 1 ];
			namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector ? special.delegateType : special.bindType ) || type;
			handlers = events[ type ] || [];
			tmp = tmp[ 2 ] &&
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

			// Remove matching events
			origCount = j = handlers.length;
			while ( j-- ) {
				handleObj = handlers[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					( !handler || handler.guid === handleObj.guid ) &&
					( !tmp || tmp.test( handleObj.namespace ) ) &&
					( !selector || selector === handleObj.selector ||
						selector === "**" && handleObj.selector ) ) {
					handlers.splice( j, 1 );

					if ( handleObj.selector ) {
						handlers.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( origCount && !handlers.length ) {
				if ( !special.teardown ||
					special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove data and the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			dataPriv.remove( elem, "handle events" );
		}
	},

	dispatch: function( nativeEvent ) {

		var i, j, ret, matched, handleObj, handlerQueue,
			args = new Array( arguments.length ),

			// Make a writable jQuery.Event from the native event object
			event = jQuery.event.fix( nativeEvent ),

			handlers = (
				dataPriv.get( this, "events" ) || Object.create( null )
			)[ event.type ] || [],
			special = jQuery.event.special[ event.type ] || {};

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[ 0 ] = event;

		for ( i = 1; i < arguments.length; i++ ) {
			args[ i ] = arguments[ i ];
		}

		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers
		handlerQueue = jQuery.event.handlers.call( this, event, handlers );

		// Run delegates first; they may want to stop propagation beneath us
		i = 0;
		while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
			event.currentTarget = matched.elem;

			j = 0;
			while ( ( handleObj = matched.handlers[ j++ ] ) &&
				!event.isImmediatePropagationStopped() ) {

				// If the event is namespaced, then each handler is only invoked if it is
				// specially universal or its namespaces are a superset of the event's.
				if ( !event.rnamespace || handleObj.namespace === false ||
					event.rnamespace.test( handleObj.namespace ) ) {

					event.handleObj = handleObj;
					event.data = handleObj.data;

					ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
						handleObj.handler ).apply( matched.elem, args );

					if ( ret !== undefined ) {
						if ( ( event.result = ret ) === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	handlers: function( event, handlers ) {
		var i, handleObj, sel, matchedHandlers, matchedSelectors,
			handlerQueue = [],
			delegateCount = handlers.delegateCount,
			cur = event.target;

		// Find delegate handlers
		if ( delegateCount &&

			// Support: IE <=9
			// Black-hole SVG <use> instance trees (trac-13180)
			cur.nodeType &&

			// Support: Firefox <=42
			// Suppress spec-violating clicks indicating a non-primary pointer button (trac-3861)
			// https://www.w3.org/TR/DOM-Level-3-Events/#event-type-click
			// Support: IE 11 only
			// ...but not arrow key "clicks" of radio inputs, which can have `button` -1 (gh-2343)
			!( event.type === "click" && event.button >= 1 ) ) {

			for ( ; cur !== this; cur = cur.parentNode || this ) {

				// Don't check non-elements (#13208)
				// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
				if ( cur.nodeType === 1 && !( event.type === "click" && cur.disabled === true ) ) {
					matchedHandlers = [];
					matchedSelectors = {};
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];

						// Don't conflict with Object.prototype properties (#13203)
						sel = handleObj.selector + " ";

						if ( matchedSelectors[ sel ] === undefined ) {
							matchedSelectors[ sel ] = handleObj.needsContext ?
								jQuery( sel, this ).index( cur ) > -1 :
								jQuery.find( sel, this, null, [ cur ] ).length;
						}
						if ( matchedSelectors[ sel ] ) {
							matchedHandlers.push( handleObj );
						}
					}
					if ( matchedHandlers.length ) {
						handlerQueue.push( { elem: cur, handlers: matchedHandlers } );
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		cur = this;
		if ( delegateCount < handlers.length ) {
			handlerQueue.push( { elem: cur, handlers: handlers.slice( delegateCount ) } );
		}

		return handlerQueue;
	},

	addProp: function( name, hook ) {
		Object.defineProperty( jQuery.Event.prototype, name, {
			enumerable: true,
			configurable: true,

			get: isFunction( hook ) ?
				function() {
					if ( this.originalEvent ) {
						return hook( this.originalEvent );
					}
				} :
				function() {
					if ( this.originalEvent ) {
						return this.originalEvent[ name ];
					}
				},

			set: function( value ) {
				Object.defineProperty( this, name, {
					enumerable: true,
					configurable: true,
					writable: true,
					value: value
				} );
			}
		} );
	},

	fix: function( originalEvent ) {
		return originalEvent[ jQuery.expando ] ?
			originalEvent :
			new jQuery.Event( originalEvent );
	},

	special: {
		load: {

			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},
		click: {

			// Utilize native event to ensure correct state for checkable inputs
			setup: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Claim the first handler
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					// dataPriv.set( el, "click", ... )
					leverageNative( el, "click", returnTrue );
				}

				// Return false to allow normal processing in the caller
				return false;
			},
			trigger: function( data ) {

				// For mutual compressibility with _default, replace `this` access with a local var.
				// `|| data` is dead code meant only to preserve the variable through minification.
				var el = this || data;

				// Force setup before triggering a click
				if ( rcheckableType.test( el.type ) &&
					el.click && nodeName( el, "input" ) ) {

					leverageNative( el, "click" );
				}

				// Return non-false to allow normal event-path propagation
				return true;
			},

			// For cross-browser consistency, suppress native .click() on links
			// Also prevent it if we're currently inside a leveraged native-event stack
			_default: function( event ) {
				var target = event.target;
				return rcheckableType.test( target.type ) &&
					target.click && nodeName( target, "input" ) &&
					dataPriv.get( target, "click" ) ||
					nodeName( target, "a" );
			}
		},

		beforeunload: {
			postDispatch: function( event ) {

				// Support: Firefox 20+
				// Firefox doesn't alert if the returnValue field is not set.
				if ( event.result !== undefined && event.originalEvent ) {
					event.originalEvent.returnValue = event.result;
				}
			}
		}
	}
};

// Ensure the presence of an event listener that handles manually-triggered
// synthetic events by interrupting progress until reinvoked in response to
// *native* events that it fires directly, ensuring that state changes have
// already occurred before other listeners are invoked.
function leverageNative( el, type, expectSync ) {

	// Missing expectSync indicates a trigger call, which must force setup through jQuery.event.add
	if ( !expectSync ) {
		if ( dataPriv.get( el, type ) === undefined ) {
			jQuery.event.add( el, type, returnTrue );
		}
		return;
	}

	// Register the controller as a special universal handler for all event namespaces
	dataPriv.set( el, type, false );
	jQuery.event.add( el, type, {
		namespace: false,
		handler: function( event ) {
			var notAsync, result,
				saved = dataPriv.get( this, type );

			if ( ( event.isTrigger & 1 ) && this[ type ] ) {

				// Interrupt processing of the outer synthetic .trigger()ed event
				// Saved data should be false in such cases, but might be a leftover capture object
				// from an async native handler (gh-4350)
				if ( !saved.length ) {

					// Store arguments for use when handling the inner native event
					// There will always be at least one argument (an event object), so this array
					// will not be confused with a leftover capture object.
					saved = slice.call( arguments );
					dataPriv.set( this, type, saved );

					// Trigger the native event and capture its result
					// Support: IE <=9 - 11+
					// focus() and blur() are asynchronous
					notAsync = expectSync( this, type );
					this[ type ]();
					result = dataPriv.get( this, type );
					if ( saved !== result || notAsync ) {
						dataPriv.set( this, type, false );
					} else {
						result = {};
					}
					if ( saved !== result ) {

						// Cancel the outer synthetic event
						event.stopImmediatePropagation();
						event.preventDefault();

						// Support: Chrome 86+
						// In Chrome, if an element having a focusout handler is blurred by
						// clicking outside of it, it invokes the handler synchronously. If
						// that handler calls `.remove()` on the element, the data is cleared,
						// leaving `result` undefined. We need to guard against this.
						return result && result.value;
					}

				// If this is an inner synthetic event for an event with a bubbling surrogate
				// (focus or blur), assume that the surrogate already propagated from triggering the
				// native event and prevent that from happening again here.
				// This technically gets the ordering wrong w.r.t. to `.trigger()` (in which the
				// bubbling surrogate propagates *after* the non-bubbling base), but that seems
				// less bad than duplication.
				} else if ( ( jQuery.event.special[ type ] || {} ).delegateType ) {
					event.stopPropagation();
				}

			// If this is a native event triggered above, everything is now in order
			// Fire an inner synthetic event with the original arguments
			} else if ( saved.length ) {

				// ...and capture the result
				dataPriv.set( this, type, {
					value: jQuery.event.trigger(

						// Support: IE <=9 - 11+
						// Extend with the prototype to reset the above stopImmediatePropagation()
						jQuery.extend( saved[ 0 ], jQuery.Event.prototype ),
						saved.slice( 1 ),
						this
					)
				} );

				// Abort handling of the native event
				event.stopImmediatePropagation();
			}
		}
	} );
}

jQuery.removeEvent = function( elem, type, handle ) {

	// This "if" is needed for plain objects
	if ( elem.removeEventListener ) {
		elem.removeEventListener( type, handle );
	}
};

jQuery.Event = function( src, props ) {

	// Allow instantiation without the 'new' keyword
	if ( !( this instanceof jQuery.Event ) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = src.defaultPrevented ||
				src.defaultPrevented === undefined &&

				// Support: Android <=2.3 only
				src.returnValue === false ?
			returnTrue :
			returnFalse;

		// Create target properties
		// Support: Safari <=6 - 7 only
		// Target should not be a text node (#504, #13143)
		this.target = ( src.target && src.target.nodeType === 3 ) ?
			src.target.parentNode :
			src.target;

		this.currentTarget = src.currentTarget;
		this.relatedTarget = src.relatedTarget;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || Date.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// https://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	constructor: jQuery.Event,
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse,
	isSimulated: false,

	preventDefault: function() {
		var e = this.originalEvent;

		this.isDefaultPrevented = returnTrue;

		if ( e && !this.isSimulated ) {
			e.preventDefault();
		}
	},
	stopPropagation: function() {
		var e = this.originalEvent;

		this.isPropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopPropagation();
		}
	},
	stopImmediatePropagation: function() {
		var e = this.originalEvent;

		this.isImmediatePropagationStopped = returnTrue;

		if ( e && !this.isSimulated ) {
			e.stopImmediatePropagation();
		}

		this.stopPropagation();
	}
};

// Includes all common event props including KeyEvent and MouseEvent specific props
jQuery.each( {
	altKey: true,
	bubbles: true,
	cancelable: true,
	changedTouches: true,
	ctrlKey: true,
	detail: true,
	eventPhase: true,
	metaKey: true,
	pageX: true,
	pageY: true,
	shiftKey: true,
	view: true,
	"char": true,
	code: true,
	charCode: true,
	key: true,
	keyCode: true,
	button: true,
	buttons: true,
	clientX: true,
	clientY: true,
	offsetX: true,
	offsetY: true,
	pointerId: true,
	pointerType: true,
	screenX: true,
	screenY: true,
	targetTouches: true,
	toElement: true,
	touches: true,
	which: true
}, jQuery.event.addProp );

jQuery.each( { focus: "focusin", blur: "focusout" }, function( type, delegateType ) {
	jQuery.event.special[ type ] = {

		// Utilize native event if possible so blur/focus sequence is correct
		setup: function() {

			// Claim the first handler
			// dataPriv.set( this, "focus", ... )
			// dataPriv.set( this, "blur", ... )
			leverageNative( this, type, expectSync );

			// Return false to allow normal processing in the caller
			return false;
		},
		trigger: function() {

			// Force setup before trigger
			leverageNative( this, type );

			// Return non-false to allow normal event-path propagation
			return true;
		},

		// Suppress native focus or blur as it's already being fired
		// in leverageNative.
		_default: function() {
			return true;
		},

		delegateType: delegateType
	};
} );

// Create mouseenter/leave events using mouseover/out and event-time checks
// so that event delegation works in jQuery.
// Do the same for pointerenter/pointerleave and pointerover/pointerout
//
// Support: Safari 7 only
// Safari sends mouseenter too often; see:
// https://bugs.chromium.org/p/chromium/issues/detail?id=470258
// for the description of the bug (it existed in older Chrome versions as well).
jQuery.each( {
	mouseenter: "mouseover",
	mouseleave: "mouseout",
	pointerenter: "pointerover",
	pointerleave: "pointerout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var ret,
				target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj;

			// For mouseenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
} );

jQuery.fn.extend( {

	on: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn );
	},
	one: function( types, selector, data, fn ) {
		return on( this, types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		var handleObj, type;
		if ( types && types.preventDefault && types.handleObj ) {

			// ( event )  dispatched jQuery.Event
			handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ?
					handleObj.origType + "." + handleObj.namespace :
					handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {

			// ( types-object [, selector] )
			for ( type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {

			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each( function() {
			jQuery.event.remove( this, types, fn, selector );
		} );
	}
} );


var

	// Support: IE <=10 - 11, Edge 12 - 13 only
	// In IE/Edge using regex groups here causes severe slowdowns.
	// See https://connect.microsoft.com/IE/feedback/details/1736512/
	rnoInnerhtml = /<script|<style|<link/i,

	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

// Prefer a tbody over its parent table for containing new rows
function manipulationTarget( elem, content ) {
	if ( nodeName( elem, "table" ) &&
		nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ) {

		return jQuery( elem ).children( "tbody" )[ 0 ] || elem;
	}

	return elem;
}

// Replace/restore the type attribute of script elements for safe DOM manipulation
function disableScript( elem ) {
	elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
	return elem;
}
function restoreScript( elem ) {
	if ( ( elem.type || "" ).slice( 0, 5 ) === "true/" ) {
		elem.type = elem.type.slice( 5 );
	} else {
		elem.removeAttribute( "type" );
	}

	return elem;
}

function cloneCopyEvent( src, dest ) {
	var i, l, type, pdataOld, udataOld, udataCur, events;

	if ( dest.nodeType !== 1 ) {
		return;
	}

	// 1. Copy private data: events, handlers, etc.
	if ( dataPriv.hasData( src ) ) {
		pdataOld = dataPriv.get( src );
		events = pdataOld.events;

		if ( events ) {
			dataPriv.remove( dest, "handle events" );

			for ( type in events ) {
				for ( i = 0, l = events[ type ].length; i < l; i++ ) {
					jQuery.event.add( dest, type, events[ type ][ i ] );
				}
			}
		}
	}

	// 2. Copy user data
	if ( dataUser.hasData( src ) ) {
		udataOld = dataUser.access( src );
		udataCur = jQuery.extend( {}, udataOld );

		dataUser.set( dest, udataCur );
	}
}

// Fix IE bugs, see support tests
function fixInput( src, dest ) {
	var nodeName = dest.nodeName.toLowerCase();

	// Fails to persist the checked state of a cloned checkbox or radio button.
	if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
		dest.checked = src.checked;

	// Fails to return the selected option to the default selected state when cloning options
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;
	}
}

function domManip( collection, args, callback, ignored ) {

	// Flatten any nested arrays
	args = flat( args );

	var fragment, first, scripts, hasScripts, node, doc,
		i = 0,
		l = collection.length,
		iNoClone = l - 1,
		value = args[ 0 ],
		valueIsFunction = isFunction( value );

	// We can't cloneNode fragments that contain checked, in WebKit
	if ( valueIsFunction ||
			( l > 1 && typeof value === "string" &&
				!support.checkClone && rchecked.test( value ) ) ) {
		return collection.each( function( index ) {
			var self = collection.eq( index );
			if ( valueIsFunction ) {
				args[ 0 ] = value.call( this, index, self.html() );
			}
			domManip( self, args, callback, ignored );
		} );
	}

	if ( l ) {
		fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
		first = fragment.firstChild;

		if ( fragment.childNodes.length === 1 ) {
			fragment = first;
		}

		// Require either new content or an interest in ignored elements to invoke the callback
		if ( first || ignored ) {
			scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
			hasScripts = scripts.length;

			// Use the original fragment for the last item
			// instead of the first because it can end up
			// being emptied incorrectly in certain situations (#8070).
			for ( ; i < l; i++ ) {
				node = fragment;

				if ( i !== iNoClone ) {
					node = jQuery.clone( node, true, true );

					// Keep references to cloned scripts for later restoration
					if ( hasScripts ) {

						// Support: Android <=4.0 only, PhantomJS 1 only
						// push.apply(_, arraylike) throws on ancient WebKit
						jQuery.merge( scripts, getAll( node, "script" ) );
					}
				}

				callback.call( collection[ i ], node, i );
			}

			if ( hasScripts ) {
				doc = scripts[ scripts.length - 1 ].ownerDocument;

				// Reenable scripts
				jQuery.map( scripts, restoreScript );

				// Evaluate executable scripts on first document insertion
				for ( i = 0; i < hasScripts; i++ ) {
					node = scripts[ i ];
					if ( rscriptType.test( node.type || "" ) &&
						!dataPriv.access( node, "globalEval" ) &&
						jQuery.contains( doc, node ) ) {

						if ( node.src && ( node.type || "" ).toLowerCase()  !== "module" ) {

							// Optional AJAX dependency, but won't run scripts if not present
							if ( jQuery._evalUrl && !node.noModule ) {
								jQuery._evalUrl( node.src, {
									nonce: node.nonce || node.getAttribute( "nonce" )
								}, doc );
							}
						} else {
							DOMEval( node.textContent.replace( rcleanScript, "" ), node, doc );
						}
					}
				}
			}
		}
	}

	return collection;
}

function remove( elem, selector, keepData ) {
	var node,
		nodes = selector ? jQuery.filter( selector, elem ) : elem,
		i = 0;

	for ( ; ( node = nodes[ i ] ) != null; i++ ) {
		if ( !keepData && node.nodeType === 1 ) {
			jQuery.cleanData( getAll( node ) );
		}

		if ( node.parentNode ) {
			if ( keepData && isAttached( node ) ) {
				setGlobalEval( getAll( node, "script" ) );
			}
			node.parentNode.removeChild( node );
		}
	}

	return elem;
}

jQuery.extend( {
	htmlPrefilter: function( html ) {
		return html;
	},

	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var i, l, srcElements, destElements,
			clone = elem.cloneNode( true ),
			inPage = isAttached( elem );

		// Fix IE cloning issues
		if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
				!jQuery.isXMLDoc( elem ) ) {

			// We eschew Sizzle here for performance reasons: https://jsperf.com/getall-vs-sizzle/2
			destElements = getAll( clone );
			srcElements = getAll( elem );

			for ( i = 0, l = srcElements.length; i < l; i++ ) {
				fixInput( srcElements[ i ], destElements[ i ] );
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			if ( deepDataAndEvents ) {
				srcElements = srcElements || getAll( elem );
				destElements = destElements || getAll( clone );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					cloneCopyEvent( srcElements[ i ], destElements[ i ] );
				}
			} else {
				cloneCopyEvent( elem, clone );
			}
		}

		// Preserve script evaluation history
		destElements = getAll( clone, "script" );
		if ( destElements.length > 0 ) {
			setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
		}

		// Return the cloned set
		return clone;
	},

	cleanData: function( elems ) {
		var data, elem, type,
			special = jQuery.event.special,
			i = 0;

		for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
			if ( acceptData( elem ) ) {
				if ( ( data = elem[ dataPriv.expando ] ) ) {
					if ( data.events ) {
						for ( type in data.events ) {
							if ( special[ type ] ) {
								jQuery.event.remove( elem, type );

							// This is a shortcut to avoid jQuery.event.remove's overhead
							} else {
								jQuery.removeEvent( elem, type, data.handle );
							}
						}
					}

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataPriv.expando ] = undefined;
				}
				if ( elem[ dataUser.expando ] ) {

					// Support: Chrome <=35 - 45+
					// Assign undefined instead of using delete, see Data#remove
					elem[ dataUser.expando ] = undefined;
				}
			}
		}
	}
} );

jQuery.fn.extend( {
	detach: function( selector ) {
		return remove( this, selector, true );
	},

	remove: function( selector ) {
		return remove( this, selector );
	},

	text: function( value ) {
		return access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().each( function() {
					if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
						this.textContent = value;
					}
				} );
		}, null, value, arguments.length );
	},

	append: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.appendChild( elem );
			}
		} );
	},

	prepend: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
				var target = manipulationTarget( this, elem );
				target.insertBefore( elem, target.firstChild );
			}
		} );
	},

	before: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this );
			}
		} );
	},

	after: function() {
		return domManip( this, arguments, function( elem ) {
			if ( this.parentNode ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			}
		} );
	},

	empty: function() {
		var elem,
			i = 0;

		for ( ; ( elem = this[ i ] ) != null; i++ ) {
			if ( elem.nodeType === 1 ) {

				// Prevent memory leaks
				jQuery.cleanData( getAll( elem, false ) );

				// Remove any remaining nodes
				elem.textContent = "";
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function() {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		} );
	},

	html: function( value ) {
		return access( this, function( value ) {
			var elem = this[ 0 ] || {},
				i = 0,
				l = this.length;

			if ( value === undefined && elem.nodeType === 1 ) {
				return elem.innerHTML;
			}

			// See if we can take a shortcut and just use innerHTML
			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

				value = jQuery.htmlPrefilter( value );

				try {
					for ( ; i < l; i++ ) {
						elem = this[ i ] || {};

						// Remove element nodes and prevent memory leaks
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( getAll( elem, false ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch ( e ) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function() {
		var ignored = [];

		// Make the changes, replacing each non-ignored context element with the new content
		return domManip( this, arguments, function( elem ) {
			var parent = this.parentNode;

			if ( jQuery.inArray( this, ignored ) < 0 ) {
				jQuery.cleanData( getAll( this ) );
				if ( parent ) {
					parent.replaceChild( elem, this );
				}
			}

		// Force callback invocation
		}, ignored );
	}
} );

jQuery.each( {
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var elems,
			ret = [],
			insert = jQuery( selector ),
			last = insert.length - 1,
			i = 0;

		for ( ; i <= last; i++ ) {
			elems = i === last ? this : this.clone( true );
			jQuery( insert[ i ] )[ original ]( elems );

			// Support: Android <=4.0 only, PhantomJS 1 only
			// .get() because push.apply(_, arraylike) throws on ancient WebKit
			push.apply( ret, elems.get() );
		}

		return this.pushStack( ret );
	};
} );
var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

var getStyles = function( elem ) {

		// Support: IE <=11 only, Firefox <=30 (#15098, #14150)
		// IE throws on elements created in popups
		// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
		var view = elem.ownerDocument.defaultView;

		if ( !view || !view.opener ) {
			view = window;
		}

		return view.getComputedStyle( elem );
	};

var swap = function( elem, options, callback ) {
	var ret, name,
		old = {};

	// Remember the old values, and insert the new ones
	for ( name in options ) {
		old[ name ] = elem.style[ name ];
		elem.style[ name ] = options[ name ];
	}

	ret = callback.call( elem );

	// Revert the old values
	for ( name in options ) {
		elem.style[ name ] = old[ name ];
	}

	return ret;
};


var rboxStyle = new RegExp( cssExpand.join( "|" ), "i" );



( function() {

	// Executing both pixelPosition & boxSizingReliable tests require only one layout
	// so they're executed at the same time to save the second computation.
	function computeStyleTests() {

		// This is a singleton, we need to execute it only once
		if ( !div ) {
			return;
		}

		container.style.cssText = "position:absolute;left:-11111px;width:60px;" +
			"margin-top:1px;padding:0;border:0";
		div.style.cssText =
			"position:relative;display:block;box-sizing:border-box;overflow:scroll;" +
			"margin:auto;border:1px;padding:1px;" +
			"width:60%;top:1%";
		documentElement.appendChild( container ).appendChild( div );

		var divStyle = window.getComputedStyle( div );
		pixelPositionVal = divStyle.top !== "1%";

		// Support: Android 4.0 - 4.3 only, Firefox <=3 - 44
		reliableMarginLeftVal = roundPixelMeasures( divStyle.marginLeft ) === 12;

		// Support: Android 4.0 - 4.3 only, Safari <=9.1 - 10.1, iOS <=7.0 - 9.3
		// Some styles come back with percentage values, even though they shouldn't
		div.style.right = "60%";
		pixelBoxStylesVal = roundPixelMeasures( divStyle.right ) === 36;

		// Support: IE 9 - 11 only
		// Detect misreporting of content dimensions for box-sizing:border-box elements
		boxSizingReliableVal = roundPixelMeasures( divStyle.width ) === 36;

		// Support: IE 9 only
		// Detect overflow:scroll screwiness (gh-3699)
		// Support: Chrome <=64
		// Don't get tricked when zoom affects offsetWidth (gh-4029)
		div.style.position = "absolute";
		scrollboxSizeVal = roundPixelMeasures( div.offsetWidth / 3 ) === 12;

		documentElement.removeChild( container );

		// Nullify the div so it wouldn't be stored in the memory and
		// it will also be a sign that checks already performed
		div = null;
	}

	function roundPixelMeasures( measure ) {
		return Math.round( parseFloat( measure ) );
	}

	var pixelPositionVal, boxSizingReliableVal, scrollboxSizeVal, pixelBoxStylesVal,
		reliableTrDimensionsVal, reliableMarginLeftVal,
		container = document.createElement( "div" ),
		div = document.createElement( "div" );

	// Finish early in limited (non-browser) environments
	if ( !div.style ) {
		return;
	}

	// Support: IE <=9 - 11 only
	// Style of cloned element affects source element cloned (#8908)
	div.style.backgroundClip = "content-box";
	div.cloneNode( true ).style.backgroundClip = "";
	support.clearCloneStyle = div.style.backgroundClip === "content-box";

	jQuery.extend( support, {
		boxSizingReliable: function() {
			computeStyleTests();
			return boxSizingReliableVal;
		},
		pixelBoxStyles: function() {
			computeStyleTests();
			return pixelBoxStylesVal;
		},
		pixelPosition: function() {
			computeStyleTests();
			return pixelPositionVal;
		},
		reliableMarginLeft: function() {
			computeStyleTests();
			return reliableMarginLeftVal;
		},
		scrollboxSize: function() {
			computeStyleTests();
			return scrollboxSizeVal;
		},

		// Support: IE 9 - 11+, Edge 15 - 18+
		// IE/Edge misreport `getComputedStyle` of table rows with width/height
		// set in CSS while `offset*` properties report correct values.
		// Behavior in IE 9 is more subtle than in newer versions & it passes
		// some versions of this test; make sure not to make it pass there!
		//
		// Support: Firefox 70+
		// Only Firefox includes border widths
		// in computed dimensions. (gh-4529)
		reliableTrDimensions: function() {
			var table, tr, trChild, trStyle;
			if ( reliableTrDimensionsVal == null ) {
				table = document.createElement( "table" );
				tr = document.createElement( "tr" );
				trChild = document.createElement( "div" );

				table.style.cssText = "position:absolute;left:-11111px;border-collapse:separate";
				tr.style.cssText = "border:1px solid";

				// Support: Chrome 86+
				// Height set through cssText does not get applied.
				// Computed height then comes back as 0.
				tr.style.height = "1px";
				trChild.style.height = "9px";

				// Support: Android 8 Chrome 86+
				// In our bodyBackground.html iframe,
				// display for all div elements is set to "inline",
				// which causes a problem only in Android 8 Chrome 86.
				// Ensuring the div is display: block
				// gets around this issue.
				trChild.style.display = "block";

				documentElement
					.appendChild( table )
					.appendChild( tr )
					.appendChild( trChild );

				trStyle = window.getComputedStyle( tr );
				reliableTrDimensionsVal = ( parseInt( trStyle.height, 10 ) +
					parseInt( trStyle.borderTopWidth, 10 ) +
					parseInt( trStyle.borderBottomWidth, 10 ) ) === tr.offsetHeight;

				documentElement.removeChild( table );
			}
			return reliableTrDimensionsVal;
		}
	} );
} )();


function curCSS( elem, name, computed ) {
	var width, minWidth, maxWidth, ret,

		// Support: Firefox 51+
		// Retrieving style before computed somehow
		// fixes an issue with getting wrong values
		// on detached elements
		style = elem.style;

	computed = computed || getStyles( elem );

	// getPropertyValue is needed for:
	//   .css('filter') (IE 9 only, #12537)
	//   .css('--customProperty) (#3144)
	if ( computed ) {
		ret = computed.getPropertyValue( name ) || computed[ name ];

		if ( ret === "" && !isAttached( elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// Android Browser returns percentage for some values,
		// but width seems to be reliably pixels.
		// This is against the CSSOM draft spec:
		// https://drafts.csswg.org/cssom/#resolved-values
		if ( !support.pixelBoxStyles() && rnumnonpx.test( ret ) && rboxStyle.test( name ) ) {

			// Remember the original values
			width = style.width;
			minWidth = style.minWidth;
			maxWidth = style.maxWidth;

			// Put in the new values to get a computed value out
			style.minWidth = style.maxWidth = style.width = ret;
			ret = computed.width;

			// Revert the changed values
			style.width = width;
			style.minWidth = minWidth;
			style.maxWidth = maxWidth;
		}
	}

	return ret !== undefined ?

		// Support: IE <=9 - 11 only
		// IE returns zIndex value as an integer.
		ret + "" :
		ret;
}


function addGetHookIf( conditionFn, hookFn ) {

	// Define the hook, we'll check on the first run if it's really needed.
	return {
		get: function() {
			if ( conditionFn() ) {

				// Hook not needed (or it's not possible to use it due
				// to missing dependency), remove it.
				delete this.get;
				return;
			}

			// Hook needed; redefine it so that the support test is not executed again.
			return ( this.get = hookFn ).apply( this, arguments );
		}
	};
}


var cssPrefixes = [ "Webkit", "Moz", "ms" ],
	emptyStyle = document.createElement( "div" ).style,
	vendorProps = {};

// Return a vendor-prefixed property or undefined
function vendorPropName( name ) {

	// Check for vendor prefixed names
	var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
		i = cssPrefixes.length;

	while ( i-- ) {
		name = cssPrefixes[ i ] + capName;
		if ( name in emptyStyle ) {
			return name;
		}
	}
}

// Return a potentially-mapped jQuery.cssProps or vendor prefixed property
function finalPropName( name ) {
	var final = jQuery.cssProps[ name ] || vendorProps[ name ];

	if ( final ) {
		return final;
	}
	if ( name in emptyStyle ) {
		return name;
	}
	return vendorProps[ name ] = vendorPropName( name ) || name;
}


var

	// Swappable if display is none or starts with table
	// except "table", "table-cell", or "table-caption"
	// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
	rdisplayswap = /^(none|table(?!-c[ea]).+)/,
	rcustomProp = /^--/,
	cssShow = { position: "absolute", visibility: "hidden", display: "block" },
	cssNormalTransform = {
		letterSpacing: "0",
		fontWeight: "400"
	};

function setPositiveNumber( _elem, value, subtract ) {

	// Any relative (+/-) values have already been
	// normalized at this point
	var matches = rcssNum.exec( value );
	return matches ?

		// Guard against undefined "subtract", e.g., when used as in cssHooks
		Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
		value;
}

function boxModelAdjustment( elem, dimension, box, isBorderBox, styles, computedVal ) {
	var i = dimension === "width" ? 1 : 0,
		extra = 0,
		delta = 0;

	// Adjustment may not be necessary
	if ( box === ( isBorderBox ? "border" : "content" ) ) {
		return 0;
	}

	for ( ; i < 4; i += 2 ) {

		// Both box models exclude margin
		if ( box === "margin" ) {
			delta += jQuery.css( elem, box + cssExpand[ i ], true, styles );
		}

		// If we get here with a content-box, we're seeking "padding" or "border" or "margin"
		if ( !isBorderBox ) {

			// Add padding
			delta += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

			// For "border" or "margin", add border
			if ( box !== "padding" ) {
				delta += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );

			// But still keep track of it otherwise
			} else {
				extra += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}

		// If we get here with a border-box (content + padding + border), we're seeking "content" or
		// "padding" or "margin"
		} else {

			// For "content", subtract padding
			if ( box === "content" ) {
				delta -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
			}

			// For "content" or "padding", subtract border
			if ( box !== "margin" ) {
				delta -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
			}
		}
	}

	// Account for positive content-box scroll gutter when requested by providing computedVal
	if ( !isBorderBox && computedVal >= 0 ) {

		// offsetWidth/offsetHeight is a rounded sum of content, padding, scroll gutter, and border
		// Assuming integer scroll gutter, subtract the rest and round down
		delta += Math.max( 0, Math.ceil(
			elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
			computedVal -
			delta -
			extra -
			0.5

		// If offsetWidth/offsetHeight is unknown, then we can't determine content-box scroll gutter
		// Use an explicit zero to avoid NaN (gh-3964)
		) ) || 0;
	}

	return delta;
}

function getWidthOrHeight( elem, dimension, extra ) {

	// Start with computed style
	var styles = getStyles( elem ),

		// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-4322).
		// Fake content-box until we know it's needed to know the true value.
		boxSizingNeeded = !support.boxSizingReliable() || extra,
		isBorderBox = boxSizingNeeded &&
			jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
		valueIsBorderBox = isBorderBox,

		val = curCSS( elem, dimension, styles ),
		offsetProp = "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 );

	// Support: Firefox <=54
	// Return a confounding non-pixel value or feign ignorance, as appropriate.
	if ( rnumnonpx.test( val ) ) {
		if ( !extra ) {
			return val;
		}
		val = "auto";
	}


	// Support: IE 9 - 11 only
	// Use offsetWidth/offsetHeight for when box sizing is unreliable.
	// In those cases, the computed value can be trusted to be border-box.
	if ( ( !support.boxSizingReliable() && isBorderBox ||

		// Support: IE 10 - 11+, Edge 15 - 18+
		// IE/Edge misreport `getComputedStyle` of table rows with width/height
		// set in CSS while `offset*` properties report correct values.
		// Interestingly, in some cases IE 9 doesn't suffer from this issue.
		!support.reliableTrDimensions() && nodeName( elem, "tr" ) ||

		// Fall back to offsetWidth/offsetHeight when value is "auto"
		// This happens for inline elements with no explicit setting (gh-3571)
		val === "auto" ||

		// Support: Android <=4.1 - 4.3 only
		// Also use offsetWidth/offsetHeight for misreported inline dimensions (gh-3602)
		!parseFloat( val ) && jQuery.css( elem, "display", false, styles ) === "inline" ) &&

		// Make sure the element is visible & connected
		elem.getClientRects().length ) {

		isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

		// Where available, offsetWidth/offsetHeight approximate border box dimensions.
		// Where not available (e.g., SVG), assume unreliable box-sizing and interpret the
		// retrieved value as a content box dimension.
		valueIsBorderBox = offsetProp in elem;
		if ( valueIsBorderBox ) {
			val = elem[ offsetProp ];
		}
	}

	// Normalize "" and auto
	val = parseFloat( val ) || 0;

	// Adjust for the element's box model
	return ( val +
		boxModelAdjustment(
			elem,
			dimension,
			extra || ( isBorderBox ? "border" : "content" ),
			valueIsBorderBox,
			styles,

			// Provide the current computed size to request scroll gutter calculation (gh-3589)
			val
		)
	) + "px";
}

jQuery.extend( {

	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {

					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;
				}
			}
		}
	},

	// Don't automatically add "px" to these possibly-unitless properties
	cssNumber: {
		"animationIterationCount": true,
		"columnCount": true,
		"fillOpacity": true,
		"flexGrow": true,
		"flexShrink": true,
		"fontWeight": true,
		"gridArea": true,
		"gridColumn": true,
		"gridColumnEnd": true,
		"gridColumnStart": true,
		"gridRow": true,
		"gridRowEnd": true,
		"gridRowStart": true,
		"lineHeight": true,
		"opacity": true,
		"order": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {

		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name ),
			style = elem.style;

		// Make sure that we're working with the right name. We don't
		// want to query the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Gets hook for the prefixed version, then unprefixed version
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// Convert "+=" or "-=" to relative numbers (#7345)
			if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
				value = adjustCSS( elem, name, ret );

				// Fixes bug #9237
				type = "number";
			}

			// Make sure that null and NaN values aren't set (#7116)
			if ( value == null || value !== value ) {
				return;
			}

			// If a number was passed in, add the unit (except for certain CSS properties)
			// The isCustomProp check can be removed in jQuery 4.0 when we only auto-append
			// "px" to a few hardcoded values.
			if ( type === "number" && !isCustomProp ) {
				value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
			}

			// background-* props affect original clone's values
			if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
				style[ name ] = "inherit";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !( "set" in hooks ) ||
				( value = hooks.set( elem, value, extra ) ) !== undefined ) {

				if ( isCustomProp ) {
					style.setProperty( name, value );
				} else {
					style[ name ] = value;
				}
			}

		} else {

			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks &&
				( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra, styles ) {
		var val, num, hooks,
			origName = camelCase( name ),
			isCustomProp = rcustomProp.test( name );

		// Make sure that we're working with the right name. We don't
		// want to modify the value if it is a CSS custom property
		// since they are user-defined.
		if ( !isCustomProp ) {
			name = finalPropName( origName );
		}

		// Try prefixed name followed by the unprefixed name
		hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks ) {
			val = hooks.get( elem, true, extra );
		}

		// Otherwise, if a way to get the computed value exists, use that
		if ( val === undefined ) {
			val = curCSS( elem, name, styles );
		}

		// Convert "normal" to computed value
		if ( val === "normal" && name in cssNormalTransform ) {
			val = cssNormalTransform[ name ];
		}

		// Make numeric if forced or a qualifier was provided and val looks numeric
		if ( extra === "" || extra ) {
			num = parseFloat( val );
			return extra === true || isFinite( num ) ? num || 0 : val;
		}

		return val;
	}
} );

jQuery.each( [ "height", "width" ], function( _i, dimension ) {
	jQuery.cssHooks[ dimension ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {

				// Certain elements can have dimension info if we invisibly show them
				// but it must have a current display style that would benefit
				return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&

					// Support: Safari 8+
					// Table columns in Safari have non-zero offsetWidth & zero
					// getBoundingClientRect().width unless display is changed.
					// Support: IE <=11 only
					// Running getBoundingClientRect on a disconnected node
					// in IE throws an error.
					( !elem.getClientRects().length || !elem.getBoundingClientRect().width ) ?
					swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, dimension, extra );
					} ) :
					getWidthOrHeight( elem, dimension, extra );
			}
		},

		set: function( elem, value, extra ) {
			var matches,
				styles = getStyles( elem ),

				// Only read styles.position if the test has a chance to fail
				// to avoid forcing a reflow.
				scrollboxSizeBuggy = !support.scrollboxSize() &&
					styles.position === "absolute",

				// To avoid forcing a reflow, only fetch boxSizing if we need it (gh-3991)
				boxSizingNeeded = scrollboxSizeBuggy || extra,
				isBorderBox = boxSizingNeeded &&
					jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
				subtract = extra ?
					boxModelAdjustment(
						elem,
						dimension,
						extra,
						isBorderBox,
						styles
					) :
					0;

			// Account for unreliable border-box dimensions by comparing offset* to computed and
			// faking a content-box to get border and padding (gh-3699)
			if ( isBorderBox && scrollboxSizeBuggy ) {
				subtract -= Math.ceil(
					elem[ "offset" + dimension[ 0 ].toUpperCase() + dimension.slice( 1 ) ] -
					parseFloat( styles[ dimension ] ) -
					boxModelAdjustment( elem, dimension, "border", false, styles ) -
					0.5
				);
			}

			// Convert to pixels if value adjustment is needed
			if ( subtract && ( matches = rcssNum.exec( value ) ) &&
				( matches[ 3 ] || "px" ) !== "px" ) {

				elem.style[ dimension ] = value;
				value = jQuery.css( elem, dimension );
			}

			return setPositiveNumber( elem, value, subtract );
		}
	};
} );

jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
	function( elem, computed ) {
		if ( computed ) {
			return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
				elem.getBoundingClientRect().left -
					swap( elem, { marginLeft: 0 }, function() {
						return elem.getBoundingClientRect().left;
					} )
			) + "px";
		}
	}
);

// These hooks are used by animate to expand properties
jQuery.each( {
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {
	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i = 0,
				expanded = {},

				// Assumes a single number if not a string
				parts = typeof value === "string" ? value.split( " " ) : [ value ];

			for ( ; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};

	if ( prefix !== "margin" ) {
		jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
	}
} );

jQuery.fn.extend( {
	css: function( name, value ) {
		return access( this, function( elem, name, value ) {
			var styles, len,
				map = {},
				i = 0;

			if ( Array.isArray( name ) ) {
				styles = getStyles( elem );
				len = name.length;

				for ( ; i < len; i++ ) {
					map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
				}

				return map;
			}

			return value !== undefined ?
				jQuery.style( elem, name, value ) :
				jQuery.css( elem, name );
		}, name, value, arguments.length > 1 );
	}
} );


function Tween( elem, options, prop, end, easing ) {
	return new Tween.prototype.init( elem, options, prop, end, easing );
}
jQuery.Tween = Tween;

Tween.prototype = {
	constructor: Tween,
	init: function( elem, options, prop, end, easing, unit ) {
		this.elem = elem;
		this.prop = prop;
		this.easing = easing || jQuery.easing._default;
		this.options = options;
		this.start = this.now = this.cur();
		this.end = end;
		this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
	},
	cur: function() {
		var hooks = Tween.propHooks[ this.prop ];

		return hooks && hooks.get ?
			hooks.get( this ) :
			Tween.propHooks._default.get( this );
	},
	run: function( percent ) {
		var eased,
			hooks = Tween.propHooks[ this.prop ];

		if ( this.options.duration ) {
			this.pos = eased = jQuery.easing[ this.easing ](
				percent, this.options.duration * percent, 0, 1, this.options.duration
			);
		} else {
			this.pos = eased = percent;
		}
		this.now = ( this.end - this.start ) * eased + this.start;

		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		if ( hooks && hooks.set ) {
			hooks.set( this );
		} else {
			Tween.propHooks._default.set( this );
		}
		return this;
	}
};

Tween.prototype.init.prototype = Tween.prototype;

Tween.propHooks = {
	_default: {
		get: function( tween ) {
			var result;

			// Use a property on the element directly when it is not a DOM element,
			// or when there is no matching style property that exists.
			if ( tween.elem.nodeType !== 1 ||
				tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
				return tween.elem[ tween.prop ];
			}

			// Passing an empty string as a 3rd parameter to .css will automatically
			// attempt a parseFloat and fallback to a string if the parse fails.
			// Simple values such as "10px" are parsed to Float;
			// complex values such as "rotate(1rad)" are returned as-is.
			result = jQuery.css( tween.elem, tween.prop, "" );

			// Empty strings, null, undefined and "auto" are converted to 0.
			return !result || result === "auto" ? 0 : result;
		},
		set: function( tween ) {

			// Use step hook for back compat.
			// Use cssHook if its there.
			// Use .style if available and use plain properties where available.
			if ( jQuery.fx.step[ tween.prop ] ) {
				jQuery.fx.step[ tween.prop ]( tween );
			} else if ( tween.elem.nodeType === 1 && (
				jQuery.cssHooks[ tween.prop ] ||
					tween.elem.style[ finalPropName( tween.prop ) ] != null ) ) {
				jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
			} else {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	}
};

// Support: IE <=9 only
// Panic based approach to setting things on disconnected nodes
Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
	set: function( tween ) {
		if ( tween.elem.nodeType && tween.elem.parentNode ) {
			tween.elem[ tween.prop ] = tween.now;
		}
	}
};

jQuery.easing = {
	linear: function( p ) {
		return p;
	},
	swing: function( p ) {
		return 0.5 - Math.cos( p * Math.PI ) / 2;
	},
	_default: "swing"
};

jQuery.fx = Tween.prototype.init;

// Back compat <1.8 extension point
jQuery.fx.step = {};




var
	fxNow, inProgress,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rrun = /queueHooks$/;

function schedule() {
	if ( inProgress ) {
		if ( document.hidden === false && window.requestAnimationFrame ) {
			window.requestAnimationFrame( schedule );
		} else {
			window.setTimeout( schedule, jQuery.fx.interval );
		}

		jQuery.fx.tick();
	}
}

// Animations created synchronously will run synchronously
function createFxNow() {
	window.setTimeout( function() {
		fxNow = undefined;
	} );
	return ( fxNow = Date.now() );
}

// Generate parameters to create a standard animation
function genFx( type, includeWidth ) {
	var which,
		i = 0,
		attrs = { height: type };

	// If we include width, step value is 1 to do all cssExpand values,
	// otherwise step value is 2 to skip over Left and Right
	includeWidth = includeWidth ? 1 : 0;
	for ( ; i < 4; i += 2 - includeWidth ) {
		which = cssExpand[ i ];
		attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
	}

	if ( includeWidth ) {
		attrs.opacity = attrs.width = type;
	}

	return attrs;
}

function createTween( value, prop, animation ) {
	var tween,
		collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
		index = 0,
		length = collection.length;
	for ( ; index < length; index++ ) {
		if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

			// We're done with this property
			return tween;
		}
	}
}

function defaultPrefilter( elem, props, opts ) {
	var prop, value, toggle, hooks, oldfire, propTween, restoreDisplay, display,
		isBox = "width" in props || "height" in props,
		anim = this,
		orig = {},
		style = elem.style,
		hidden = elem.nodeType && isHiddenWithinTree( elem ),
		dataShow = dataPriv.get( elem, "fxshow" );

	// Queue-skipping animations hijack the fx hooks
	if ( !opts.queue ) {
		hooks = jQuery._queueHooks( elem, "fx" );
		if ( hooks.unqueued == null ) {
			hooks.unqueued = 0;
			oldfire = hooks.empty.fire;
			hooks.empty.fire = function() {
				if ( !hooks.unqueued ) {
					oldfire();
				}
			};
		}
		hooks.unqueued++;

		anim.always( function() {

			// Ensure the complete handler is called before this completes
			anim.always( function() {
				hooks.unqueued--;
				if ( !jQuery.queue( elem, "fx" ).length ) {
					hooks.empty.fire();
				}
			} );
		} );
	}

	// Detect show/hide animations
	for ( prop in props ) {
		value = props[ prop ];
		if ( rfxtypes.test( value ) ) {
			delete props[ prop ];
			toggle = toggle || value === "toggle";
			if ( value === ( hidden ? "hide" : "show" ) ) {

				// Pretend to be hidden if this is a "show" and
				// there is still data from a stopped show/hide
				if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
					hidden = true;

				// Ignore all other no-op show/hide data
				} else {
					continue;
				}
			}
			orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );
		}
	}

	// Bail out if this is a no-op like .hide().hide()
	propTween = !jQuery.isEmptyObject( props );
	if ( !propTween && jQuery.isEmptyObject( orig ) ) {
		return;
	}

	// Restrict "overflow" and "display" styles during box animations
	if ( isBox && elem.nodeType === 1 ) {

		// Support: IE <=9 - 11, Edge 12 - 15
		// Record all 3 overflow attributes because IE does not infer the shorthand
		// from identically-valued overflowX and overflowY and Edge just mirrors
		// the overflowX value there.
		opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

		// Identify a display type, preferring old show/hide data over the CSS cascade
		restoreDisplay = dataShow && dataShow.display;
		if ( restoreDisplay == null ) {
			restoreDisplay = dataPriv.get( elem, "display" );
		}
		display = jQuery.css( elem, "display" );
		if ( display === "none" ) {
			if ( restoreDisplay ) {
				display = restoreDisplay;
			} else {

				// Get nonempty value(s) by temporarily forcing visibility
				showHide( [ elem ], true );
				restoreDisplay = elem.style.display || restoreDisplay;
				display = jQuery.css( elem, "display" );
				showHide( [ elem ] );
			}
		}

		// Animate inline elements as inline-block
		if ( display === "inline" || display === "inline-block" && restoreDisplay != null ) {
			if ( jQuery.css( elem, "float" ) === "none" ) {

				// Restore the original display value at the end of pure show/hide animations
				if ( !propTween ) {
					anim.done( function() {
						style.display = restoreDisplay;
					} );
					if ( restoreDisplay == null ) {
						display = style.display;
						restoreDisplay = display === "none" ? "" : display;
					}
				}
				style.display = "inline-block";
			}
		}
	}

	if ( opts.overflow ) {
		style.overflow = "hidden";
		anim.always( function() {
			style.overflow = opts.overflow[ 0 ];
			style.overflowX = opts.overflow[ 1 ];
			style.overflowY = opts.overflow[ 2 ];
		} );
	}

	// Implement show/hide animations
	propTween = false;
	for ( prop in orig ) {

		// General show/hide setup for this element animation
		if ( !propTween ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", { display: restoreDisplay } );
			}

			// Store hidden/visible for toggle so `.stop().toggle()` "reverses"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}

			// Show elements before animating them
			if ( hidden ) {
				showHide( [ elem ], true );
			}

			/* eslint-disable no-loop-func */

			anim.done( function() {

				/* eslint-enable no-loop-func */

				// The final step of a "hide" animation is actually hiding the element
				if ( !hidden ) {
					showHide( [ elem ] );
				}
				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
		}

		// Per-property setup
		propTween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );
		if ( !( prop in dataShow ) ) {
			dataShow[ prop ] = propTween.start;
			if ( hidden ) {
				propTween.end = propTween.start;
				propTween.start = 0;
			}
		}
	}
}

function propFilter( props, specialEasing ) {
	var index, name, easing, value, hooks;

	// camelCase, specialEasing and expand cssHook pass
	for ( index in props ) {
		name = camelCase( index );
		easing = specialEasing[ name ];
		value = props[ index ];
		if ( Array.isArray( value ) ) {
			easing = value[ 1 ];
			value = props[ index ] = value[ 0 ];
		}

		if ( index !== name ) {
			props[ name ] = value;
			delete props[ index ];
		}

		hooks = jQuery.cssHooks[ name ];
		if ( hooks && "expand" in hooks ) {
			value = hooks.expand( value );
			delete props[ name ];

			// Not quite $.extend, this won't overwrite existing keys.
			// Reusing 'index' because we have the correct "name"
			for ( index in value ) {
				if ( !( index in props ) ) {
					props[ index ] = value[ index ];
					specialEasing[ index ] = easing;
				}
			}
		} else {
			specialEasing[ name ] = easing;
		}
	}
}

function Animation( elem, properties, options ) {
	var result,
		stopped,
		index = 0,
		length = Animation.prefilters.length,
		deferred = jQuery.Deferred().always( function() {

			// Don't match elem in the :animated selector
			delete tick.elem;
		} ),
		tick = function() {
			if ( stopped ) {
				return false;
			}
			var currentTime = fxNow || createFxNow(),
				remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

				// Support: Android 2.3 only
				// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
				temp = remaining / animation.duration || 0,
				percent = 1 - temp,
				index = 0,
				length = animation.tweens.length;

			for ( ; index < length; index++ ) {
				animation.tweens[ index ].run( percent );
			}

			deferred.notifyWith( elem, [ animation, percent, remaining ] );

			// If there's more to do, yield
			if ( percent < 1 && length ) {
				return remaining;
			}

			// If this was an empty animation, synthesize a final progress notification
			if ( !length ) {
				deferred.notifyWith( elem, [ animation, 1, 0 ] );
			}

			// Resolve the animation and report its conclusion
			deferred.resolveWith( elem, [ animation ] );
			return false;
		},
		animation = deferred.promise( {
			elem: elem,
			props: jQuery.extend( {}, properties ),
			opts: jQuery.extend( true, {
				specialEasing: {},
				easing: jQuery.easing._default
			}, options ),
			originalProperties: properties,
			originalOptions: options,
			startTime: fxNow || createFxNow(),
			duration: options.duration,
			tweens: [],
			createTween: function( prop, end ) {
				var tween = jQuery.Tween( elem, animation.opts, prop, end,
					animation.opts.specialEasing[ prop ] || animation.opts.easing );
				animation.tweens.push( tween );
				return tween;
			},
			stop: function( gotoEnd ) {
				var index = 0,

					// If we are going to the end, we want to run all the tweens
					// otherwise we skip this part
					length = gotoEnd ? animation.tweens.length : 0;
				if ( stopped ) {
					return this;
				}
				stopped = true;
				for ( ; index < length; index++ ) {
					animation.tweens[ index ].run( 1 );
				}

				// Resolve when we played the last frame; otherwise, reject
				if ( gotoEnd ) {
					deferred.notifyWith( elem, [ animation, 1, 0 ] );
					deferred.resolveWith( elem, [ animation, gotoEnd ] );
				} else {
					deferred.rejectWith( elem, [ animation, gotoEnd ] );
				}
				return this;
			}
		} ),
		props = animation.props;

	propFilter( props, animation.opts.specialEasing );

	for ( ; index < length; index++ ) {
		result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
		if ( result ) {
			if ( isFunction( result.stop ) ) {
				jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
					result.stop.bind( result );
			}
			return result;
		}
	}

	jQuery.map( props, createTween, animation );

	if ( isFunction( animation.opts.start ) ) {
		animation.opts.start.call( elem, animation );
	}

	// Attach callbacks from options
	animation
		.progress( animation.opts.progress )
		.done( animation.opts.done, animation.opts.complete )
		.fail( animation.opts.fail )
		.always( animation.opts.always );

	jQuery.fx.timer(
		jQuery.extend( tick, {
			elem: elem,
			anim: animation,
			queue: animation.opts.queue
		} )
	);

	return animation;
}

jQuery.Animation = jQuery.extend( Animation, {

	tweeners: {
		"*": [ function( prop, value ) {
			var tween = this.createTween( prop, value );
			adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
			return tween;
		} ]
	},

	tweener: function( props, callback ) {
		if ( isFunction( props ) ) {
			callback = props;
			props = [ "*" ];
		} else {
			props = props.match( rnothtmlwhite );
		}

		var prop,
			index = 0,
			length = props.length;

		for ( ; index < length; index++ ) {
			prop = props[ index ];
			Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
			Animation.tweeners[ prop ].unshift( callback );
		}
	},

	prefilters: [ defaultPrefilter ],

	prefilter: function( callback, prepend ) {
		if ( prepend ) {
			Animation.prefilters.unshift( callback );
		} else {
			Animation.prefilters.push( callback );
		}
	}
} );

jQuery.speed = function( speed, easing, fn ) {
	var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
		complete: fn || !fn && easing ||
			isFunction( speed ) && speed,
		duration: speed,
		easing: fn && easing || easing && !isFunction( easing ) && easing
	};

	// Go to the end state if fx are off
	if ( jQuery.fx.off ) {
		opt.duration = 0;

	} else {
		if ( typeof opt.duration !== "number" ) {
			if ( opt.duration in jQuery.fx.speeds ) {
				opt.duration = jQuery.fx.speeds[ opt.duration ];

			} else {
				opt.duration = jQuery.fx.speeds._default;
			}
		}
	}

	// Normalize opt.queue - true/undefined/null -> "fx"
	if ( opt.queue == null || opt.queue === true ) {
		opt.queue = "fx";
	}

	// Queueing
	opt.old = opt.complete;

	opt.complete = function() {
		if ( isFunction( opt.old ) ) {
			opt.old.call( this );
		}

		if ( opt.queue ) {
			jQuery.dequeue( this, opt.queue );
		}
	};

	return opt;
};

jQuery.fn.extend( {
	fadeTo: function( speed, to, easing, callback ) {

		// Show any hidden elements after setting opacity to 0
		return this.filter( isHiddenWithinTree ).css( "opacity", 0 ).show()

			// Animate to the value specified
			.end().animate( { opacity: to }, speed, easing, callback );
	},
	animate: function( prop, speed, easing, callback ) {
		var empty = jQuery.isEmptyObject( prop ),
			optall = jQuery.speed( speed, easing, callback ),
			doAnimation = function() {

				// Operate on a copy of prop so per-property easing won't be lost
				var anim = Animation( this, jQuery.extend( {}, prop ), optall );

				// Empty animations, or finishing resolves immediately
				if ( empty || dataPriv.get( this, "finish" ) ) {
					anim.stop( true );
				}
			};

		doAnimation.finish = doAnimation;

		return empty || optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},
	stop: function( type, clearQueue, gotoEnd ) {
		var stopQueue = function( hooks ) {
			var stop = hooks.stop;
			delete hooks.stop;
			stop( gotoEnd );
		};

		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue ) {
			this.queue( type || "fx", [] );
		}

		return this.each( function() {
			var dequeue = true,
				index = type != null && type + "queueHooks",
				timers = jQuery.timers,
				data = dataPriv.get( this );

			if ( index ) {
				if ( data[ index ] && data[ index ].stop ) {
					stopQueue( data[ index ] );
				}
			} else {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
						stopQueue( data[ index ] );
					}
				}
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this &&
					( type == null || timers[ index ].queue === type ) ) {

					timers[ index ].anim.stop( gotoEnd );
					dequeue = false;
					timers.splice( index, 1 );
				}
			}

			// Start the next in the queue if the last step wasn't forced.
			// Timers currently will call their complete callbacks, which
			// will dequeue but only if they were gotoEnd.
			if ( dequeue || !gotoEnd ) {
				jQuery.dequeue( this, type );
			}
		} );
	},
	finish: function( type ) {
		if ( type !== false ) {
			type = type || "fx";
		}
		return this.each( function() {
			var index,
				data = dataPriv.get( this ),
				queue = data[ type + "queue" ],
				hooks = data[ type + "queueHooks" ],
				timers = jQuery.timers,
				length = queue ? queue.length : 0;

			// Enable finishing flag on private data
			data.finish = true;

			// Empty the queue first
			jQuery.queue( this, type, [] );

			if ( hooks && hooks.stop ) {
				hooks.stop.call( this, true );
			}

			// Look for any active animations, and finish them
			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
					timers[ index ].anim.stop( true );
					timers.splice( index, 1 );
				}
			}

			// Look for any animations in the old queue and finish them
			for ( index = 0; index < length; index++ ) {
				if ( queue[ index ] && queue[ index ].finish ) {
					queue[ index ].finish.call( this );
				}
			}

			// Turn off finishing flag
			delete data.finish;
		} );
	}
} );

jQuery.each( [ "toggle", "show", "hide" ], function( _i, name ) {
	var cssFn = jQuery.fn[ name ];
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return speed == null || typeof speed === "boolean" ?
			cssFn.apply( this, arguments ) :
			this.animate( genFx( name, true ), speed, easing, callback );
	};
} );

// Generate shortcuts for custom animations
jQuery.each( {
	slideDown: genFx( "show" ),
	slideUp: genFx( "hide" ),
	slideToggle: genFx( "toggle" ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
} );

jQuery.timers = [];
jQuery.fx.tick = function() {
	var timer,
		i = 0,
		timers = jQuery.timers;

	fxNow = Date.now();

	for ( ; i < timers.length; i++ ) {
		timer = timers[ i ];

		// Run the timer and safely remove it when done (allowing for external removal)
		if ( !timer() && timers[ i ] === timer ) {
			timers.splice( i--, 1 );
		}
	}

	if ( !timers.length ) {
		jQuery.fx.stop();
	}
	fxNow = undefined;
};

jQuery.fx.timer = function( timer ) {
	jQuery.timers.push( timer );
	jQuery.fx.start();
};

jQuery.fx.interval = 13;
jQuery.fx.start = function() {
	if ( inProgress ) {
		return;
	}

	inProgress = true;
	schedule();
};

jQuery.fx.stop = function() {
	inProgress = null;
};

jQuery.fx.speeds = {
	slow: 600,
	fast: 200,

	// Default speed
	_default: 400
};


// Based off of the plugin by Clint Helfers, with permission.
// https://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
jQuery.fn.delay = function( time, type ) {
	time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
	type = type || "fx";

	return this.queue( type, function( next, hooks ) {
		var timeout = window.setTimeout( next, time );
		hooks.stop = function() {
			window.clearTimeout( timeout );
		};
	} );
};


( function() {
	var input = document.createElement( "input" ),
		select = document.createElement( "select" ),
		opt = select.appendChild( document.createElement( "option" ) );

	input.type = "checkbox";

	// Support: Android <=4.3 only
	// Default value for a checkbox should be "on"
	support.checkOn = input.value !== "";

	// Support: IE <=11 only
	// Must access selectedIndex to make default options select
	support.optSelected = opt.selected;

	// Support: IE <=11 only
	// An input loses its value after becoming a radio
	input = document.createElement( "input" );
	input.value = "t";
	input.type = "radio";
	support.radioValue = input.value === "t";
} )();


var boolHook,
	attrHandle = jQuery.expr.attrHandle;

jQuery.fn.extend( {
	attr: function( name, value ) {
		return access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each( function() {
			jQuery.removeAttr( this, name );
		} );
	}
} );

jQuery.extend( {
	attr: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set attributes on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		// Attribute hooks are determined by the lowercase version
		// Grab necessary hook if one is defined
		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
			hooks = jQuery.attrHooks[ name.toLowerCase() ] ||
				( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
		}

		if ( value !== undefined ) {
			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;
			}

			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			elem.setAttribute( name, value + "" );
			return value;
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		ret = jQuery.find.attr( elem, name );

		// Non-existent attributes return null, we normalize to undefined
		return ret == null ? undefined : ret;
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				if ( !support.radioValue && value === "radio" &&
					nodeName( elem, "input" ) ) {
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		}
	},

	removeAttr: function( elem, value ) {
		var name,
			i = 0,

			// Attribute names can contain non-HTML whitespace characters
			// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
			attrNames = value && value.match( rnothtmlwhite );

		if ( attrNames && elem.nodeType === 1 ) {
			while ( ( name = attrNames[ i++ ] ) ) {
				elem.removeAttribute( name );
			}
		}
	}
} );

// Hooks for boolean attributes
boolHook = {
	set: function( elem, value, name ) {
		if ( value === false ) {

			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			elem.setAttribute( name, name );
		}
		return name;
	}
};

jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( _i, name ) {
	var getter = attrHandle[ name ] || jQuery.find.attr;

	attrHandle[ name ] = function( elem, name, isXML ) {
		var ret, handle,
			lowercaseName = name.toLowerCase();

		if ( !isXML ) {

			// Avoid an infinite loop by temporarily removing this function from the getter
			handle = attrHandle[ lowercaseName ];
			attrHandle[ lowercaseName ] = ret;
			ret = getter( elem, name, isXML ) != null ?
				lowercaseName :
				null;
			attrHandle[ lowercaseName ] = handle;
		}
		return ret;
	};
} );




var rfocusable = /^(?:input|select|textarea|button)$/i,
	rclickable = /^(?:a|area)$/i;

jQuery.fn.extend( {
	prop: function( name, value ) {
		return access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		return this.each( function() {
			delete this[ jQuery.propFix[ name ] || name ];
		} );
	}
} );

jQuery.extend( {
	prop: function( elem, name, value ) {
		var ret, hooks,
			nType = elem.nodeType;

		// Don't get/set properties on text, comment and attribute nodes
		if ( nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks &&
				( ret = hooks.set( elem, value, name ) ) !== undefined ) {
				return ret;
			}

			return ( elem[ name ] = value );
		}

		if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
			return ret;
		}

		return elem[ name ];
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {

				// Support: IE <=9 - 11 only
				// elem.tabIndex doesn't always return the
				// correct value when it hasn't been explicitly set
				// https://web.archive.org/web/20141116233347/http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				// Use proper attribute retrieval(#12072)
				var tabindex = jQuery.find.attr( elem, "tabindex" );

				if ( tabindex ) {
					return parseInt( tabindex, 10 );
				}

				if (
					rfocusable.test( elem.nodeName ) ||
					rclickable.test( elem.nodeName ) &&
					elem.href
				) {
					return 0;
				}

				return -1;
			}
		}
	},

	propFix: {
		"for": "htmlFor",
		"class": "className"
	}
} );

// Support: IE <=11 only
// Accessing the selectedIndex property
// forces the browser to respect setting selected
// on the option
// The getter ensures a default option is selected
// when in an optgroup
// eslint rule "no-unused-expressions" is disabled for this code
// since it considers such accessions noop
if ( !support.optSelected ) {
	jQuery.propHooks.selected = {
		get: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent && parent.parentNode ) {
				parent.parentNode.selectedIndex;
			}
			return null;
		},
		set: function( elem ) {

			/* eslint no-unused-expressions: "off" */

			var parent = elem.parentNode;
			if ( parent ) {
				parent.selectedIndex;

				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
		}
	};
}

jQuery.each( [
	"tabIndex",
	"readOnly",
	"maxLength",
	"cellSpacing",
	"cellPadding",
	"rowSpan",
	"colSpan",
	"useMap",
	"frameBorder",
	"contentEditable"
], function() {
	jQuery.propFix[ this.toLowerCase() ] = this;
} );




	// Strip and collapse whitespace according to HTML spec
	// https://infra.spec.whatwg.org/#strip-and-collapse-ascii-whitespace
	function stripAndCollapse( value ) {
		var tokens = value.match( rnothtmlwhite ) || [];
		return tokens.join( " " );
	}


function getClass( elem ) {
	return elem.getAttribute && elem.getAttribute( "class" ) || "";
}

function classesToArray( value ) {
	if ( Array.isArray( value ) ) {
		return value;
	}
	if ( typeof value === "string" ) {
		return value.match( rnothtmlwhite ) || [];
	}
	return [];
}

jQuery.fn.extend( {
	addClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {
						if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
							cur += clazz + " ";
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classes, elem, cur, curValue, clazz, j, finalValue,
			i = 0;

		if ( isFunction( value ) ) {
			return this.each( function( j ) {
				jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
			} );
		}

		if ( !arguments.length ) {
			return this.attr( "class", "" );
		}

		classes = classesToArray( value );

		if ( classes.length ) {
			while ( ( elem = this[ i++ ] ) ) {
				curValue = getClass( elem );

				// This expression is here for better compressibility (see addClass)
				cur = elem.nodeType === 1 && ( " " + stripAndCollapse( curValue ) + " " );

				if ( cur ) {
					j = 0;
					while ( ( clazz = classes[ j++ ] ) ) {

						// Remove *all* instances
						while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
							cur = cur.replace( " " + clazz + " ", " " );
						}
					}

					// Only assign if different to avoid unneeded rendering.
					finalValue = stripAndCollapse( cur );
					if ( curValue !== finalValue ) {
						elem.setAttribute( "class", finalValue );
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isValidValue = type === "string" || Array.isArray( value );

		if ( typeof stateVal === "boolean" && isValidValue ) {
			return stateVal ? this.addClass( value ) : this.removeClass( value );
		}

		if ( isFunction( value ) ) {
			return this.each( function( i ) {
				jQuery( this ).toggleClass(
					value.call( this, i, getClass( this ), stateVal ),
					stateVal
				);
			} );
		}

		return this.each( function() {
			var className, i, self, classNames;

			if ( isValidValue ) {

				// Toggle individual class names
				i = 0;
				self = jQuery( this );
				classNames = classesToArray( value );

				while ( ( className = classNames[ i++ ] ) ) {

					// Check each className given, space separated list
					if ( self.hasClass( className ) ) {
						self.removeClass( className );
					} else {
						self.addClass( className );
					}
				}

			// Toggle whole class name
			} else if ( value === undefined || type === "boolean" ) {
				className = getClass( this );
				if ( className ) {

					// Store className if set
					dataPriv.set( this, "__className__", className );
				}

				// If the element has a class name or if we're passed `false`,
				// then remove the whole classname (if there was one, the above saved it).
				// Otherwise bring back whatever was previously saved (if anything),
				// falling back to the empty string if nothing was stored.
				if ( this.setAttribute ) {
					this.setAttribute( "class",
						className || value === false ?
							"" :
							dataPriv.get( this, "__className__" ) || ""
					);
				}
			}
		} );
	},

	hasClass: function( selector ) {
		var className, elem,
			i = 0;

		className = " " + selector + " ";
		while ( ( elem = this[ i++ ] ) ) {
			if ( elem.nodeType === 1 &&
				( " " + stripAndCollapse( getClass( elem ) ) + " " ).indexOf( className ) > -1 ) {
				return true;
			}
		}

		return false;
	}
} );




var rreturn = /\r/g;

jQuery.fn.extend( {
	val: function( value ) {
		var hooks, ret, valueIsFunction,
			elem = this[ 0 ];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] ||
					jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks &&
					"get" in hooks &&
					( ret = hooks.get( elem, "value" ) ) !== undefined
				) {
					return ret;
				}

				ret = elem.value;

				// Handle most common string cases
				if ( typeof ret === "string" ) {
					return ret.replace( rreturn, "" );
				}

				// Handle cases where value is null/undef or number
				return ret == null ? "" : ret;
			}

			return;
		}

		valueIsFunction = isFunction( value );

		return this.each( function( i ) {
			var val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( valueIsFunction ) {
				val = value.call( this, i, jQuery( this ).val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";

			} else if ( typeof val === "number" ) {
				val += "";

			} else if ( Array.isArray( val ) ) {
				val = jQuery.map( val, function( value ) {
					return value == null ? "" : value + "";
				} );
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		} );
	}
} );

jQuery.extend( {
	valHooks: {
		option: {
			get: function( elem ) {

				var val = jQuery.find.attr( elem, "value" );
				return val != null ?
					val :

					// Support: IE <=10 - 11 only
					// option.text throws exceptions (#14686, #14858)
					// Strip and collapse whitespace
					// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
					stripAndCollapse( jQuery.text( elem ) );
			}
		},
		select: {
			get: function( elem ) {
				var value, option, i,
					options = elem.options,
					index = elem.selectedIndex,
					one = elem.type === "select-one",
					values = one ? null : [],
					max = one ? index + 1 : options.length;

				if ( index < 0 ) {
					i = max;

				} else {
					i = one ? index : 0;
				}

				// Loop through all the selected options
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Support: IE <=9 only
					// IE8-9 doesn't update selected after form reset (#2551)
					if ( ( option.selected || i === index ) &&

							// Don't return options that are disabled or in a disabled optgroup
							!option.disabled &&
							( !option.parentNode.disabled ||
								!nodeName( option.parentNode, "optgroup" ) ) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				return values;
			},

			set: function( elem, value ) {
				var optionSet, option,
					options = elem.options,
					values = jQuery.makeArray( value ),
					i = options.length;

				while ( i-- ) {
					option = options[ i ];

					/* eslint-disable no-cond-assign */

					if ( option.selected =
						jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
					) {
						optionSet = true;
					}

					/* eslint-enable no-cond-assign */
				}

				// Force browsers to behave consistently when non-matching value is set
				if ( !optionSet ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	}
} );

// Radios and checkboxes getter/setter
jQuery.each( [ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = {
		set: function( elem, value ) {
			if ( Array.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
			}
		}
	};
	if ( !support.checkOn ) {
		jQuery.valHooks[ this ].get = function( elem ) {
			return elem.getAttribute( "value" ) === null ? "on" : elem.value;
		};
	}
} );




// Return jQuery for attributes-only inclusion


support.focusin = "onfocusin" in window;


var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	stopPropagationCallback = function( e ) {
		e.stopPropagation();
	};

jQuery.extend( jQuery.event, {

	trigger: function( event, data, elem, onlyHandlers ) {

		var i, cur, tmp, bubbleType, ontype, handle, special, lastElement,
			eventPath = [ elem || document ],
			type = hasOwn.call( event, "type" ) ? event.type : event,
			namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

		cur = lastElement = tmp = elem = elem || document;

		// Don't do events on text and comment nodes
		if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
			return;
		}

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "." ) > -1 ) {

			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split( "." );
			type = namespaces.shift();
			namespaces.sort();
		}
		ontype = type.indexOf( ":" ) < 0 && "on" + type;

		// Caller can pass in a jQuery.Event object, Object, or just an event type string
		event = event[ jQuery.expando ] ?
			event :
			new jQuery.Event( type, typeof event === "object" && event );

		// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
		event.isTrigger = onlyHandlers ? 2 : 3;
		event.namespace = namespaces.join( "." );
		event.rnamespace = event.namespace ?
			new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
			null;

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data == null ?
			[ event ] :
			jQuery.makeArray( data, [ event ] );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		if ( !onlyHandlers && !special.noBubble && !isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			if ( !rfocusMorph.test( bubbleType + type ) ) {
				cur = cur.parentNode;
			}
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push( cur );
				tmp = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( tmp === ( elem.ownerDocument || document ) ) {
				eventPath.push( tmp.defaultView || tmp.parentWindow || window );
			}
		}

		// Fire handlers on the event path
		i = 0;
		while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {
			lastElement = cur;
			event.type = i > 1 ?
				bubbleType :
				special.bindType || type;

			// jQuery handler
			handle = ( dataPriv.get( cur, "events" ) || Object.create( null ) )[ event.type ] &&
				dataPriv.get( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}

			// Native handler
			handle = ontype && cur[ ontype ];
			if ( handle && handle.apply && acceptData( cur ) ) {
				event.result = handle.apply( cur, data );
				if ( event.result === false ) {
					event.preventDefault();
				}
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( ( !special._default ||
				special._default.apply( eventPath.pop(), data ) === false ) &&
				acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name as the event.
				// Don't do default actions on window, that's where global variables be (#6170)
				if ( ontype && isFunction( elem[ type ] ) && !isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					tmp = elem[ ontype ];

					if ( tmp ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;

					if ( event.isPropagationStopped() ) {
						lastElement.addEventListener( type, stopPropagationCallback );
					}

					elem[ type ]();

					if ( event.isPropagationStopped() ) {
						lastElement.removeEventListener( type, stopPropagationCallback );
					}

					jQuery.event.triggered = undefined;

					if ( tmp ) {
						elem[ ontype ] = tmp;
					}
				}
			}
		}

		return event.result;
	},

	// Piggyback on a donor event to simulate a different one
	// Used only for `focus(in | out)` events
	simulate: function( type, elem, event ) {
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{
				type: type,
				isSimulated: true
			}
		);

		jQuery.event.trigger( e, null, elem );
	}

} );

jQuery.fn.extend( {

	trigger: function( type, data ) {
		return this.each( function() {
			jQuery.event.trigger( type, data, this );
		} );
	},
	triggerHandler: function( type, data ) {
		var elem = this[ 0 ];
		if ( elem ) {
			return jQuery.event.trigger( type, data, elem, true );
		}
	}
} );


// Support: Firefox <=44
// Firefox doesn't have focus(in | out) events
// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
//
// Support: Chrome <=48 - 49, Safari <=9.0 - 9.1
// focus(in | out) events fire after focus & blur events,
// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
// Related ticket - https://bugs.chromium.org/p/chromium/issues/detail?id=449857
if ( !support.focusin ) {
	jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler on the document while someone wants focusin/focusout
		var handler = function( event ) {
			jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
		};

		jQuery.event.special[ fix ] = {
			setup: function() {

				// Handle: regular nodes (via `this.ownerDocument`), window
				// (via `this.document`) & document (via `this`).
				var doc = this.ownerDocument || this.document || this,
					attaches = dataPriv.access( doc, fix );

				if ( !attaches ) {
					doc.addEventListener( orig, handler, true );
				}
				dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
			},
			teardown: function() {
				var doc = this.ownerDocument || this.document || this,
					attaches = dataPriv.access( doc, fix ) - 1;

				if ( !attaches ) {
					doc.removeEventListener( orig, handler, true );
					dataPriv.remove( doc, fix );

				} else {
					dataPriv.access( doc, fix, attaches );
				}
			}
		};
	} );
}
var location = window.location;

var nonce = { guid: Date.now() };

var rquery = ( /\?/ );



// Cross-browser xml parsing
jQuery.parseXML = function( data ) {
	var xml, parserErrorElem;
	if ( !data || typeof data !== "string" ) {
		return null;
	}

	// Support: IE 9 - 11 only
	// IE throws on parseFromString with invalid input.
	try {
		xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
	} catch ( e ) {}

	parserErrorElem = xml && xml.getElementsByTagName( "parsererror" )[ 0 ];
	if ( !xml || parserErrorElem ) {
		jQuery.error( "Invalid XML: " + (
			parserErrorElem ?
				jQuery.map( parserErrorElem.childNodes, function( el ) {
					return el.textContent;
				} ).join( "\n" ) :
				data
		) );
	}
	return xml;
};


var
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
	rsubmittable = /^(?:input|select|textarea|keygen)/i;

function buildParams( prefix, obj, traditional, add ) {
	var name;

	if ( Array.isArray( obj ) ) {

		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {

				// Treat each array item as a scalar.
				add( prefix, v );

			} else {

				// Item is non-scalar (array or object), encode its numeric index.
				buildParams(
					prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
					v,
					traditional,
					add
				);
			}
		} );

	} else if ( !traditional && toType( obj ) === "object" ) {

		// Serialize object item.
		for ( name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {

		// Serialize scalar item.
		add( prefix, obj );
	}
}

// Serialize an array of form elements or a set of
// key/values into a query string
jQuery.param = function( a, traditional ) {
	var prefix,
		s = [],
		add = function( key, valueOrFunction ) {

			// If value is a function, invoke it and use its return value
			var value = isFunction( valueOrFunction ) ?
				valueOrFunction() :
				valueOrFunction;

			s[ s.length ] = encodeURIComponent( key ) + "=" +
				encodeURIComponent( value == null ? "" : value );
		};

	if ( a == null ) {
		return "";
	}

	// If an array was passed in, assume that it is an array of form elements.
	if ( Array.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

		// Serialize the form elements
		jQuery.each( a, function() {
			add( this.name, this.value );
		} );

	} else {

		// If traditional, encode the "old" way (the way 1.3.2 or older
		// did it), otherwise encode params recursively.
		for ( prefix in a ) {
			buildParams( prefix, a[ prefix ], traditional, add );
		}
	}

	// Return the resulting serialization
	return s.join( "&" );
};

jQuery.fn.extend( {
	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},
	serializeArray: function() {
		return this.map( function() {

			// Can add propHook for "elements" to filter or add form elements
			var elements = jQuery.prop( this, "elements" );
			return elements ? jQuery.makeArray( elements ) : this;
		} ).filter( function() {
			var type = this.type;

			// Use .is( ":disabled" ) so that fieldset[disabled] works
			return this.name && !jQuery( this ).is( ":disabled" ) &&
				rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
				( this.checked || !rcheckableType.test( type ) );
		} ).map( function( _i, elem ) {
			var val = jQuery( this ).val();

			if ( val == null ) {
				return null;
			}

			if ( Array.isArray( val ) ) {
				return jQuery.map( val, function( val ) {
					return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
				} );
			}

			return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		} ).get();
	}
} );


var
	r20 = /%20/g,
	rhash = /#.*$/,
	rantiCache = /([?&])_=[^&]*/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = "*/".concat( "*" ),

	// Anchor tag for parsing the document origin
	originAnchor = document.createElement( "a" );

originAnchor.href = location.href;

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		var dataType,
			i = 0,
			dataTypes = dataTypeExpression.toLowerCase().match( rnothtmlwhite ) || [];

		if ( isFunction( func ) ) {

			// For each dataType in the dataTypeExpression
			while ( ( dataType = dataTypes[ i++ ] ) ) {

				// Prepend if requested
				if ( dataType[ 0 ] === "+" ) {
					dataType = dataType.slice( 1 ) || "*";
					( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

				// Otherwise append
				} else {
					( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
				}
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

	var inspected = {},
		seekingTransport = ( structure === transports );

	function inspect( dataType ) {
		var selected;
		inspected[ dataType ] = true;
		jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
			var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
			if ( typeof dataTypeOrTransport === "string" &&
				!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

				options.dataTypes.unshift( dataTypeOrTransport );
				inspect( dataTypeOrTransport );
				return false;
			} else if ( seekingTransport ) {
				return !( selected = dataTypeOrTransport );
			}
		} );
		return selected;
	}

	return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};

	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}

	return target;
}

/* Handles responses to an ajax request:
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var ct, type, finalDataType, firstDataType,
		contents = s.contents,
		dataTypes = s.dataTypes;

	// Remove auto dataType and get content-type in the process
	while ( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {

		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}

		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

/* Chain conversions given the request and the original response
 * Also sets the responseXXX fields on the jqXHR instance
 */
function ajaxConvert( s, response, jqXHR, isSuccess ) {
	var conv2, current, conv, tmp, prev,
		converters = {},

		// Work with a copy of dataTypes in case we need to modify it for conversion
		dataTypes = s.dataTypes.slice();

	// Create converters map with lowercased keys
	if ( dataTypes[ 1 ] ) {
		for ( conv in s.converters ) {
			converters[ conv.toLowerCase() ] = s.converters[ conv ];
		}
	}

	current = dataTypes.shift();

	// Convert to each sequential dataType
	while ( current ) {

		if ( s.responseFields[ current ] ) {
			jqXHR[ s.responseFields[ current ] ] = response;
		}

		// Apply the dataFilter if provided
		if ( !prev && isSuccess && s.dataFilter ) {
			response = s.dataFilter( response, s.dataType );
		}

		prev = current;
		current = dataTypes.shift();

		if ( current ) {

			// There's only work to do if current dataType is non-auto
			if ( current === "*" ) {

				current = prev;

			// Convert response if prev dataType is non-auto and differs from current
			} else if ( prev !== "*" && prev !== current ) {

				// Seek a direct converter
				conv = converters[ prev + " " + current ] || converters[ "* " + current ];

				// If none found, seek a pair
				if ( !conv ) {
					for ( conv2 in converters ) {

						// If conv2 outputs current
						tmp = conv2.split( " " );
						if ( tmp[ 1 ] === current ) {

							// If prev can be converted to accepted input
							conv = converters[ prev + " " + tmp[ 0 ] ] ||
								converters[ "* " + tmp[ 0 ] ];
							if ( conv ) {

								// Condense equivalence converters
								if ( conv === true ) {
									conv = converters[ conv2 ];

								// Otherwise, insert the intermediate dataType
								} else if ( converters[ conv2 ] !== true ) {
									current = tmp[ 0 ];
									dataTypes.unshift( tmp[ 1 ] );
								}
								break;
							}
						}
					}
				}

				// Apply converter (if not an equivalence)
				if ( conv !== true ) {

					// Unless errors are allowed to bubble, catch and return them
					if ( conv && s.throws ) {
						response = conv( response );
					} else {
						try {
							response = conv( response );
						} catch ( e ) {
							return {
								state: "parsererror",
								error: conv ? e : "No conversion from " + prev + " to " + current
							};
						}
					}
				}
			}
		}
	}

	return { state: "success", data: response };
}

jQuery.extend( {

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {},

	ajaxSettings: {
		url: location.href,
		type: "GET",
		isLocal: rlocalProtocol.test( location.protocol ),
		global: true,
		processData: true,
		async: true,
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",

		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		throws: false,
		traditional: false,
		headers: {},
		*/

		accepts: {
			"*": allTypes,
			text: "text/plain",
			html: "text/html",
			xml: "application/xml, text/xml",
			json: "application/json, text/javascript"
		},

		contents: {
			xml: /\bxml\b/,
			html: /\bhtml/,
			json: /\bjson\b/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText",
			json: "responseJSON"
		},

		// Data converters
		// Keys separate source (or catchall "*") and destination types with a single space
		converters: {

			// Convert anything to text
			"* text": String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": JSON.parse,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			url: true,
			context: true
		}
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		return settings ?

			// Building a settings object
			ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

			// Extending ajaxSettings
			ajaxExtend( jQuery.ajaxSettings, target );
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var transport,

			// URL without anti-cache param
			cacheURL,

			// Response headers
			responseHeadersString,
			responseHeaders,

			// timeout handle
			timeoutTimer,

			// Url cleanup var
			urlAnchor,

			// Request state (becomes false upon send and true upon completion)
			completed,

			// To know if global events are to be dispatched
			fireGlobals,

			// Loop variable
			i,

			// uncached part of the url
			uncached,

			// Create the final options object
			s = jQuery.ajaxSetup( {}, options ),

			// Callbacks context
			callbackContext = s.context || s,

			// Context for global events is callbackContext if it is a DOM node or jQuery collection
			globalEventContext = s.context &&
				( callbackContext.nodeType || callbackContext.jquery ) ?
				jQuery( callbackContext ) :
				jQuery.event,

			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),

			// Status-dependent callbacks
			statusCode = s.statusCode || {},

			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},

			// Default abort message
			strAbort = "canceled",

			// Fake xhr
			jqXHR = {
				readyState: 0,

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( completed ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[ 1 ].toLowerCase() + " " ] =
									( responseHeaders[ match[ 1 ].toLowerCase() + " " ] || [] )
										.concat( match[ 2 ] );
							}
						}
						match = responseHeaders[ key.toLowerCase() + " " ];
					}
					return match == null ? null : match.join( ", " );
				},

				// Raw string
				getAllResponseHeaders: function() {
					return completed ? responseHeadersString : null;
				},

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( completed == null ) {
						name = requestHeadersNames[ name.toLowerCase() ] =
							requestHeadersNames[ name.toLowerCase() ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( completed == null ) {
						s.mimeType = type;
					}
					return this;
				},

				// Status-dependent callbacks
				statusCode: function( map ) {
					var code;
					if ( map ) {
						if ( completed ) {

							// Execute the appropriate callbacks
							jqXHR.always( map[ jqXHR.status ] );
						} else {

							// Lazy-add the new callbacks in a way that preserves old ones
							for ( code in map ) {
								statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
							}
						}
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					var finalText = statusText || strAbort;
					if ( transport ) {
						transport.abort( finalText );
					}
					done( 0, finalText );
					return this;
				}
			};

		// Attach deferreds
		deferred.promise( jqXHR );

		// Add protocol if not provided (prefilters might expect it)
		// Handle falsy url in the settings object (#10093: consistency with old signature)
		// We also use the url parameter if available
		s.url = ( ( url || s.url || location.href ) + "" )
			.replace( rprotocol, location.protocol + "//" );

		// Alias method option to type as per ticket #12004
		s.type = options.method || options.type || s.method || s.type;

		// Extract dataTypes list
		s.dataTypes = ( s.dataType || "*" ).toLowerCase().match( rnothtmlwhite ) || [ "" ];

		// A cross-domain request is in order when the origin doesn't match the current origin.
		if ( s.crossDomain == null ) {
			urlAnchor = document.createElement( "a" );

			// Support: IE <=8 - 11, Edge 12 - 15
			// IE throws exception on accessing the href property if url is malformed,
			// e.g. http://example.com:80x/
			try {
				urlAnchor.href = s.url;

				// Support: IE <=8 - 11 only
				// Anchor's host property isn't correctly set when s.url is relative
				urlAnchor.href = urlAnchor.href;
				s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
					urlAnchor.protocol + "//" + urlAnchor.host;
			} catch ( e ) {

				// If there is an error parsing the URL, assume it is crossDomain,
				// it can be rejected by the transport if it is invalid
				s.crossDomain = true;
			}
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( completed ) {
			return jqXHR;
		}

		// We can fire global events as of now if asked to
		// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
		fireGlobals = jQuery.event && s.global;

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Save the URL in case we're toying with the If-Modified-Since
		// and/or If-None-Match header later on
		// Remove hash to simplify url manipulation
		cacheURL = s.url.replace( rhash, "" );

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// Remember the hash so we can put it back
			uncached = s.url.slice( cacheURL.length );

			// If data is available and should be processed, append data to url
			if ( s.data && ( s.processData || typeof s.data === "string" ) ) {
				cacheURL += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data;

				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Add or update anti-cache param if needed
			if ( s.cache === false ) {
				cacheURL = cacheURL.replace( rantiCache, "$1" );
				uncached = ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + ( nonce.guid++ ) +
					uncached;
			}

			// Put hash and anti-cache on the URL that will be requested (gh-1732)
			s.url = cacheURL + uncached;

		// Change '%20' to '+' if this is encoded form body content (gh-2658)
		} else if ( s.data && s.processData &&
			( s.contentType || "" ).indexOf( "application/x-www-form-urlencoded" ) === 0 ) {
			s.data = s.data.replace( r20, "+" );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			if ( jQuery.lastModified[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
			}
			if ( jQuery.etag[ cacheURL ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
				s.accepts[ s.dataTypes[ 0 ] ] +
					( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend &&
			( s.beforeSend.call( callbackContext, jqXHR, s ) === false || completed ) ) {

			// Abort if not done already and return
			return jqXHR.abort();
		}

		// Aborting is no longer a cancellation
		strAbort = "abort";

		// Install callbacks on deferreds
		completeDeferred.add( s.complete );
		jqXHR.done( s.success );
		jqXHR.fail( s.error );

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;

			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}

			// If request was aborted inside ajaxSend, stop there
			if ( completed ) {
				return jqXHR;
			}

			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = window.setTimeout( function() {
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				completed = false;
				transport.send( requestHeaders, done );
			} catch ( e ) {

				// Rethrow post-completion exceptions
				if ( completed ) {
					throw e;
				}

				// Propagate others as results
				done( -1, e );
			}
		}

		// Callback for when everything is done
		function done( status, nativeStatusText, responses, headers ) {
			var isSuccess, success, error, response, modified,
				statusText = nativeStatusText;

			// Ignore repeat invocations
			if ( completed ) {
				return;
			}

			completed = true;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				window.clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			// Determine if successful
			isSuccess = status >= 200 && status < 300 || status === 304;

			// Get response data
			if ( responses ) {
				response = ajaxHandleResponses( s, jqXHR, responses );
			}

			// Use a noop converter for missing script but not if jsonp
			if ( !isSuccess &&
				jQuery.inArray( "script", s.dataTypes ) > -1 &&
				jQuery.inArray( "json", s.dataTypes ) < 0 ) {
				s.converters[ "text script" ] = function() {};
			}

			// Convert no matter what (that way responseXXX fields are always set)
			response = ajaxConvert( s, response, jqXHR, isSuccess );

			// If successful, handle type chaining
			if ( isSuccess ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {
					modified = jqXHR.getResponseHeader( "Last-Modified" );
					if ( modified ) {
						jQuery.lastModified[ cacheURL ] = modified;
					}
					modified = jqXHR.getResponseHeader( "etag" );
					if ( modified ) {
						jQuery.etag[ cacheURL ] = modified;
					}
				}

				// if no content
				if ( status === 204 || s.type === "HEAD" ) {
					statusText = "nocontent";

				// if not modified
				} else if ( status === 304 ) {
					statusText = "notmodified";

				// If we have data, let's convert it
				} else {
					statusText = response.state;
					success = response.data;
					error = response.error;
					isSuccess = !error;
				}
			} else {

				// Extract error from statusText and normalize for non-aborts
				error = statusText;
				if ( status || !statusText ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = ( nativeStatusText || statusText ) + "";

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
					[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		return jqXHR;
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	}
} );

jQuery.each( [ "get", "post" ], function( _i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {

		// Shift arguments if data argument was omitted
		if ( isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		// The url can be an options object (which then must have .url)
		return jQuery.ajax( jQuery.extend( {
			url: url,
			type: method,
			dataType: type,
			data: data,
			success: callback
		}, jQuery.isPlainObject( url ) && url ) );
	};
} );

jQuery.ajaxPrefilter( function( s ) {
	var i;
	for ( i in s.headers ) {
		if ( i.toLowerCase() === "content-type" ) {
			s.contentType = s.headers[ i ] || "";
		}
	}
} );


jQuery._evalUrl = function( url, options, doc ) {
	return jQuery.ajax( {
		url: url,

		// Make this explicit, since user can override this through ajaxSetup (#11264)
		type: "GET",
		dataType: "script",
		cache: true,
		async: false,
		global: false,

		// Only evaluate the response if it is successful (gh-4126)
		// dataFilter is not invoked for failure responses, so using it instead
		// of the default converter is kludgy but it works.
		converters: {
			"text script": function() {}
		},
		dataFilter: function( response ) {
			jQuery.globalEval( response, options, doc );
		}
	} );
};


jQuery.fn.extend( {
	wrapAll: function( html ) {
		var wrap;

		if ( this[ 0 ] ) {
			if ( isFunction( html ) ) {
				html = html.call( this[ 0 ] );
			}

			// The elements to wrap the target around
			wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

			if ( this[ 0 ].parentNode ) {
				wrap.insertBefore( this[ 0 ] );
			}

			wrap.map( function() {
				var elem = this;

				while ( elem.firstElementChild ) {
					elem = elem.firstElementChild;
				}

				return elem;
			} ).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( isFunction( html ) ) {
			return this.each( function( i ) {
				jQuery( this ).wrapInner( html.call( this, i ) );
			} );
		}

		return this.each( function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		} );
	},

	wrap: function( html ) {
		var htmlIsFunction = isFunction( html );

		return this.each( function( i ) {
			jQuery( this ).wrapAll( htmlIsFunction ? html.call( this, i ) : html );
		} );
	},

	unwrap: function( selector ) {
		this.parent( selector ).not( "body" ).each( function() {
			jQuery( this ).replaceWith( this.childNodes );
		} );
		return this;
	}
} );


jQuery.expr.pseudos.hidden = function( elem ) {
	return !jQuery.expr.pseudos.visible( elem );
};
jQuery.expr.pseudos.visible = function( elem ) {
	return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
};




jQuery.ajaxSettings.xhr = function() {
	try {
		return new window.XMLHttpRequest();
	} catch ( e ) {}
};

var xhrSuccessStatus = {

		// File protocol always yields status code 0, assume 200
		0: 200,

		// Support: IE <=9 only
		// #1450: sometimes IE returns 1223 when it should be 204
		1223: 204
	},
	xhrSupported = jQuery.ajaxSettings.xhr();

support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
support.ajax = xhrSupported = !!xhrSupported;

jQuery.ajaxTransport( function( options ) {
	var callback, errorCallback;

	// Cross domain only allowed if supported through XMLHttpRequest
	if ( support.cors || xhrSupported && !options.crossDomain ) {
		return {
			send: function( headers, complete ) {
				var i,
					xhr = options.xhr();

				xhr.open(
					options.type,
					options.url,
					options.async,
					options.username,
					options.password
				);

				// Apply custom fields if provided
				if ( options.xhrFields ) {
					for ( i in options.xhrFields ) {
						xhr[ i ] = options.xhrFields[ i ];
					}
				}

				// Override mime type if needed
				if ( options.mimeType && xhr.overrideMimeType ) {
					xhr.overrideMimeType( options.mimeType );
				}

				// X-Requested-With header
				// For cross-domain requests, seeing as conditions for a preflight are
				// akin to a jigsaw puzzle, we simply never set it to be sure.
				// (it can always be set on a per-request basis or even using ajaxSetup)
				// For same-domain requests, won't change header if already provided.
				if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
					headers[ "X-Requested-With" ] = "XMLHttpRequest";
				}

				// Set headers
				for ( i in headers ) {
					xhr.setRequestHeader( i, headers[ i ] );
				}

				// Callback
				callback = function( type ) {
					return function() {
						if ( callback ) {
							callback = errorCallback = xhr.onload =
								xhr.onerror = xhr.onabort = xhr.ontimeout =
									xhr.onreadystatechange = null;

							if ( type === "abort" ) {
								xhr.abort();
							} else if ( type === "error" ) {

								// Support: IE <=9 only
								// On a manual native abort, IE9 throws
								// errors on any property access that is not readyState
								if ( typeof xhr.status !== "number" ) {
									complete( 0, "error" );
								} else {
									complete(

										// File: protocol always yields status 0; see #8605, #14207
										xhr.status,
										xhr.statusText
									);
								}
							} else {
								complete(
									xhrSuccessStatus[ xhr.status ] || xhr.status,
									xhr.statusText,

									// Support: IE <=9 only
									// IE9 has no XHR2 but throws on binary (trac-11426)
									// For XHR2 non-text, let the caller handle it (gh-2498)
									( xhr.responseType || "text" ) !== "text"  ||
									typeof xhr.responseText !== "string" ?
										{ binary: xhr.response } :
										{ text: xhr.responseText },
									xhr.getAllResponseHeaders()
								);
							}
						}
					};
				};

				// Listen to events
				xhr.onload = callback();
				errorCallback = xhr.onerror = xhr.ontimeout = callback( "error" );

				// Support: IE 9 only
				// Use onreadystatechange to replace onabort
				// to handle uncaught aborts
				if ( xhr.onabort !== undefined ) {
					xhr.onabort = errorCallback;
				} else {
					xhr.onreadystatechange = function() {

						// Check readyState before timeout as it changes
						if ( xhr.readyState === 4 ) {

							// Allow onerror to be called first,
							// but that will not handle a native abort
							// Also, save errorCallback to a variable
							// as xhr.onerror cannot be accessed
							window.setTimeout( function() {
								if ( callback ) {
									errorCallback();
								}
							} );
						}
					};
				}

				// Create the abort callback
				callback = callback( "abort" );

				try {

					// Do send the request (this may raise an exception)
					xhr.send( options.hasContent && options.data || null );
				} catch ( e ) {

					// #14683: Only rethrow if this hasn't been notified as an error yet
					if ( callback ) {
						throw e;
					}
				}
			},

			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




// Prevent auto-execution of scripts when no explicit dataType was provided (See gh-2432)
jQuery.ajaxPrefilter( function( s ) {
	if ( s.crossDomain ) {
		s.contents.script = false;
	}
} );

// Install script dataType
jQuery.ajaxSetup( {
	accepts: {
		script: "text/javascript, application/javascript, " +
			"application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /\b(?:java|ecma)script\b/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
} );

// Handle cache's special case and crossDomain
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
	}
} );

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function( s ) {

	// This transport only deals with cross domain or forced-by-attrs requests
	if ( s.crossDomain || s.scriptAttrs ) {
		var script, callback;
		return {
			send: function( _, complete ) {
				script = jQuery( "<script>" )
					.attr( s.scriptAttrs || {} )
					.prop( { charset: s.scriptCharset, src: s.url } )
					.on( "load error", callback = function( evt ) {
						script.remove();
						callback = null;
						if ( evt ) {
							complete( evt.type === "error" ? 404 : 200, evt.type );
						}
					} );

				// Use native DOM manipulation to avoid our domManip AJAX trickery
				document.head.appendChild( script[ 0 ] );
			},
			abort: function() {
				if ( callback ) {
					callback();
				}
			}
		};
	}
} );




var oldCallbacks = [],
	rjsonp = /(=)\?(?=&|$)|\?\?/;

// Default jsonp settings
jQuery.ajaxSetup( {
	jsonp: "callback",
	jsonpCallback: function() {
		var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce.guid++ ) );
		this[ callback ] = true;
		return callback;
	}
} );

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var callbackName, overwritten, responseContainer,
		jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
			"url" :
			typeof s.data === "string" &&
				( s.contentType || "" )
					.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
				rjsonp.test( s.data ) && "data"
		);

	// Handle iff the expected data type is "jsonp" or we have a parameter to set
	if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

		// Get callback name, remembering preexisting value associated with it
		callbackName = s.jsonpCallback = isFunction( s.jsonpCallback ) ?
			s.jsonpCallback() :
			s.jsonpCallback;

		// Insert callback into url or form data
		if ( jsonProp ) {
			s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
		} else if ( s.jsonp !== false ) {
			s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
		}

		// Use data converter to retrieve json after script execution
		s.converters[ "script json" ] = function() {
			if ( !responseContainer ) {
				jQuery.error( callbackName + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// Force json dataType
		s.dataTypes[ 0 ] = "json";

		// Install callback
		overwritten = window[ callbackName ];
		window[ callbackName ] = function() {
			responseContainer = arguments;
		};

		// Clean-up function (fires after converters)
		jqXHR.always( function() {

			// If previous value didn't exist - remove it
			if ( overwritten === undefined ) {
				jQuery( window ).removeProp( callbackName );

			// Otherwise restore preexisting value
			} else {
				window[ callbackName ] = overwritten;
			}

			// Save back as free
			if ( s[ callbackName ] ) {

				// Make sure that re-using the options doesn't screw things around
				s.jsonpCallback = originalSettings.jsonpCallback;

				// Save the callback name for future use
				oldCallbacks.push( callbackName );
			}

			// Call if it was a function and we have a response
			if ( responseContainer && isFunction( overwritten ) ) {
				overwritten( responseContainer[ 0 ] );
			}

			responseContainer = overwritten = undefined;
		} );

		// Delegate to script
		return "script";
	}
} );




// Support: Safari 8 only
// In Safari 8 documents created via document.implementation.createHTMLDocument
// collapse sibling forms: the second one becomes a child of the first one.
// Because of that, this security measure has to be disabled in Safari 8.
// https://bugs.webkit.org/show_bug.cgi?id=137337
support.createHTMLDocument = ( function() {
	var body = document.implementation.createHTMLDocument( "" ).body;
	body.innerHTML = "<form></form><form></form>";
	return body.childNodes.length === 2;
} )();


// Argument "data" should be string of html
// context (optional): If specified, the fragment will be created in this context,
// defaults to document
// keepScripts (optional): If true, will include scripts passed in the html string
jQuery.parseHTML = function( data, context, keepScripts ) {
	if ( typeof data !== "string" ) {
		return [];
	}
	if ( typeof context === "boolean" ) {
		keepScripts = context;
		context = false;
	}

	var base, parsed, scripts;

	if ( !context ) {

		// Stop scripts or inline event handlers from being executed immediately
		// by using document.implementation
		if ( support.createHTMLDocument ) {
			context = document.implementation.createHTMLDocument( "" );

			// Set the base href for the created document
			// so any parsed elements with URLs
			// are based on the document's URL (gh-2965)
			base = context.createElement( "base" );
			base.href = document.location.href;
			context.head.appendChild( base );
		} else {
			context = document;
		}
	}

	parsed = rsingleTag.exec( data );
	scripts = !keepScripts && [];

	// Single tag
	if ( parsed ) {
		return [ context.createElement( parsed[ 1 ] ) ];
	}

	parsed = buildFragment( [ data ], context, scripts );

	if ( scripts && scripts.length ) {
		jQuery( scripts ).remove();
	}

	return jQuery.merge( [], parsed.childNodes );
};


/**
 * Load a url into a page
 */
jQuery.fn.load = function( url, params, callback ) {
	var selector, type, response,
		self = this,
		off = url.indexOf( " " );

	if ( off > -1 ) {
		selector = stripAndCollapse( url.slice( off ) );
		url = url.slice( 0, off );
	}

	// If it's a function
	if ( isFunction( params ) ) {

		// We assume that it's the callback
		callback = params;
		params = undefined;

	// Otherwise, build a param string
	} else if ( params && typeof params === "object" ) {
		type = "POST";
	}

	// If we have elements to modify, make the request
	if ( self.length > 0 ) {
		jQuery.ajax( {
			url: url,

			// If "type" variable is undefined, then "GET" method will be used.
			// Make value of this field explicit since
			// user can override it through ajaxSetup method
			type: type || "GET",
			dataType: "html",
			data: params
		} ).done( function( responseText ) {

			// Save response for use in complete callback
			response = arguments;

			self.html( selector ?

				// If a selector was specified, locate the right elements in a dummy div
				// Exclude scripts to avoid IE 'Permission Denied' errors
				jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

				// Otherwise use the full result
				responseText );

		// If the request succeeds, this function gets "data", "status", "jqXHR"
		// but they are ignored because response was set above.
		// If it fails, this function gets "jqXHR", "status", "error"
		} ).always( callback && function( jqXHR, status ) {
			self.each( function() {
				callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
			} );
		} );
	}

	return this;
};




jQuery.expr.pseudos.animated = function( elem ) {
	return jQuery.grep( jQuery.timers, function( fn ) {
		return elem === fn.elem;
	} ).length;
};




jQuery.offset = {
	setOffset: function( elem, options, i ) {
		var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
			position = jQuery.css( elem, "position" ),
			curElem = jQuery( elem ),
			props = {};

		// Set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		curOffset = curElem.offset();
		curCSSTop = jQuery.css( elem, "top" );
		curCSSLeft = jQuery.css( elem, "left" );
		calculatePosition = ( position === "absolute" || position === "fixed" ) &&
			( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

		// Need to be able to calculate position if either
		// top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;

		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( isFunction( options ) ) {

			// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
			options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );

		} else {
			curElem.css( props );
		}
	}
};

jQuery.fn.extend( {

	// offset() relates an element's border box to the document origin
	offset: function( options ) {

		// Preserve chaining for setter
		if ( arguments.length ) {
			return options === undefined ?
				this :
				this.each( function( i ) {
					jQuery.offset.setOffset( this, options, i );
				} );
		}

		var rect, win,
			elem = this[ 0 ];

		if ( !elem ) {
			return;
		}

		// Return zeros for disconnected and hidden (display: none) elements (gh-2310)
		// Support: IE <=11 only
		// Running getBoundingClientRect on a
		// disconnected node in IE throws an error
		if ( !elem.getClientRects().length ) {
			return { top: 0, left: 0 };
		}

		// Get document-relative position by adding viewport scroll to viewport-relative gBCR
		rect = elem.getBoundingClientRect();
		win = elem.ownerDocument.defaultView;
		return {
			top: rect.top + win.pageYOffset,
			left: rect.left + win.pageXOffset
		};
	},

	// position() relates an element's margin box to its offset parent's padding box
	// This corresponds to the behavior of CSS absolute positioning
	position: function() {
		if ( !this[ 0 ] ) {
			return;
		}

		var offsetParent, offset, doc,
			elem = this[ 0 ],
			parentOffset = { top: 0, left: 0 };

		// position:fixed elements are offset from the viewport, which itself always has zero offset
		if ( jQuery.css( elem, "position" ) === "fixed" ) {

			// Assume position:fixed implies availability of getBoundingClientRect
			offset = elem.getBoundingClientRect();

		} else {
			offset = this.offset();

			// Account for the *real* offset parent, which can be the document or its root element
			// when a statically positioned element is identified
			doc = elem.ownerDocument;
			offsetParent = elem.offsetParent || doc.documentElement;
			while ( offsetParent &&
				( offsetParent === doc.body || offsetParent === doc.documentElement ) &&
				jQuery.css( offsetParent, "position" ) === "static" ) {

				offsetParent = offsetParent.parentNode;
			}
			if ( offsetParent && offsetParent !== elem && offsetParent.nodeType === 1 ) {

				// Incorporate borders into its offset, since they are outside its content origin
				parentOffset = jQuery( offsetParent ).offset();
				parentOffset.top += jQuery.css( offsetParent, "borderTopWidth", true );
				parentOffset.left += jQuery.css( offsetParent, "borderLeftWidth", true );
			}
		}

		// Subtract parent offsets and element margins
		return {
			top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
			left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
		};
	},

	// This method will return documentElement in the following cases:
	// 1) For the element inside the iframe without offsetParent, this method will return
	//    documentElement of the parent window
	// 2) For the hidden or detached element
	// 3) For body or html element, i.e. in case of the html node - it will return itself
	//
	// but those exceptions were never presented as a real life use-cases
	// and might be considered as more preferable results.
	//
	// This logic, however, is not guaranteed and can change at any point in the future
	offsetParent: function() {
		return this.map( function() {
			var offsetParent = this.offsetParent;

			while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
				offsetParent = offsetParent.offsetParent;
			}

			return offsetParent || documentElement;
		} );
	}
} );

// Create scrollLeft and scrollTop methods
jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
	var top = "pageYOffset" === prop;

	jQuery.fn[ method ] = function( val ) {
		return access( this, function( elem, method, val ) {

			// Coalesce documents and windows
			var win;
			if ( isWindow( elem ) ) {
				win = elem;
			} else if ( elem.nodeType === 9 ) {
				win = elem.defaultView;
			}

			if ( val === undefined ) {
				return win ? win[ prop ] : elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : win.pageXOffset,
					top ? val : win.pageYOffset
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length );
	};
} );

// Support: Safari <=7 - 9.1, Chrome <=37 - 49
// Add the top/left cssHooks using jQuery.fn.position
// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
// Blink bug: https://bugs.chromium.org/p/chromium/issues/detail?id=589347
// getComputedStyle returns percent when specified for top/left/bottom/right;
// rather than make the css module depend on the offset module, just check for it here
jQuery.each( [ "top", "left" ], function( _i, prop ) {
	jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
		function( elem, computed ) {
			if ( computed ) {
				computed = curCSS( elem, prop );

				// If curCSS returns percentage, fallback to offset
				return rnumnonpx.test( computed ) ?
					jQuery( elem ).position()[ prop ] + "px" :
					computed;
			}
		}
	);
} );


// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	jQuery.each( {
		padding: "inner" + name,
		content: type,
		"": "outer" + name
	}, function( defaultExtra, funcName ) {

		// Margin is only for outerHeight, outerWidth
		jQuery.fn[ funcName ] = function( margin, value ) {
			var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
				extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

			return access( this, function( elem, type, value ) {
				var doc;

				if ( isWindow( elem ) ) {

					// $( window ).outerWidth/Height return w/h including scrollbars (gh-1729)
					return funcName.indexOf( "outer" ) === 0 ?
						elem[ "inner" + name ] :
						elem.document.documentElement[ "client" + name ];
				}

				// Get document width or height
				if ( elem.nodeType === 9 ) {
					doc = elem.documentElement;

					// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
					// whichever is greatest
					return Math.max(
						elem.body[ "scroll" + name ], doc[ "scroll" + name ],
						elem.body[ "offset" + name ], doc[ "offset" + name ],
						doc[ "client" + name ]
					);
				}

				return value === undefined ?

					// Get width or height on the element, requesting but not forcing parseFloat
					jQuery.css( elem, type, extra ) :

					// Set width or height on the element
					jQuery.style( elem, type, value, extra );
			}, type, chainable ? margin : undefined, chainable );
		};
	} );
} );


jQuery.each( [
	"ajaxStart",
	"ajaxStop",
	"ajaxComplete",
	"ajaxError",
	"ajaxSuccess",
	"ajaxSend"
], function( _i, type ) {
	jQuery.fn[ type ] = function( fn ) {
		return this.on( type, fn );
	};
} );




jQuery.fn.extend( {

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {

		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length === 1 ?
			this.off( selector, "**" ) :
			this.off( types, selector || "**", fn );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
} );

jQuery.each(
	( "blur focus focusin focusout resize scroll click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup contextmenu" ).split( " " ),
	function( _i, name ) {

		// Handle event binding
		jQuery.fn[ name ] = function( data, fn ) {
			return arguments.length > 0 ?
				this.on( name, null, data, fn ) :
				this.trigger( name );
		};
	}
);




// Support: Android <=4.0 only
// Make sure we trim BOM and NBSP
var rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;

// Bind a function to a context, optionally partially applying any
// arguments.
// jQuery.proxy is deprecated to promote standards (specifically Function#bind)
// However, it is not slated for removal any time soon
jQuery.proxy = function( fn, context ) {
	var tmp, args, proxy;

	if ( typeof context === "string" ) {
		tmp = fn[ context ];
		context = fn;
		fn = tmp;
	}

	// Quick check to determine if target is callable, in the spec
	// this throws a TypeError, but we will just return undefined.
	if ( !isFunction( fn ) ) {
		return undefined;
	}

	// Simulated bind
	args = slice.call( arguments, 2 );
	proxy = function() {
		return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
	};

	// Set the guid of unique handler to the same of original handler, so it can be removed
	proxy.guid = fn.guid = fn.guid || jQuery.guid++;

	return proxy;
};

jQuery.holdReady = function( hold ) {
	if ( hold ) {
		jQuery.readyWait++;
	} else {
		jQuery.ready( true );
	}
};
jQuery.isArray = Array.isArray;
jQuery.parseJSON = JSON.parse;
jQuery.nodeName = nodeName;
jQuery.isFunction = isFunction;
jQuery.isWindow = isWindow;
jQuery.camelCase = camelCase;
jQuery.type = toType;

jQuery.now = Date.now;

jQuery.isNumeric = function( obj ) {

	// As of jQuery 3.0, isNumeric is limited to
	// strings and numbers (primitives or objects)
	// that can be coerced to finite numbers (gh-2662)
	var type = jQuery.type( obj );
	return ( type === "number" || type === "string" ) &&

		// parseFloat NaNs numeric-cast false positives ("")
		// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
		// subtraction forces infinities to NaN
		!isNaN( obj - parseFloat( obj ) );
};

jQuery.trim = function( text ) {
	return text == null ?
		"" :
		( text + "" ).replace( rtrim, "" );
};



// Register as a named AMD module, since jQuery can be concatenated with other
// files that may use define, but not via a proper concatenation script that
// understands anonymous AMD modules. A named AMD is safest and most robust
// way to register. Lowercase jquery is used because AMD module names are
// derived from file names, and jQuery is normally delivered in a lowercase
// file name. Do this after creating the global so that if an AMD module wants
// to call noConflict to hide this version of jQuery, it will work.

// Note that for maximum portability, libraries that are not jQuery should
// declare themselves as anonymous modules, and avoid setting a global if an
// AMD loader is present. jQuery is a special case. For more information, see
// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

if ( typeof define === "function" && define.amd ) {
	define( "jquery", [], function() {
		return jQuery;
	} );
}




var

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$;

jQuery.noConflict = function( deep ) {
	if ( window.$ === jQuery ) {
		window.$ = _$;
	}

	if ( deep && window.jQuery === jQuery ) {
		window.jQuery = _jQuery;
	}

	return jQuery;
};

// Expose jQuery and $ identifiers, even in AMD
// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
// and CommonJS for browser emulators (#13566)
if ( typeof noGlobal === "undefined" ) {
	window.jQuery = window.$ = jQuery;
}




return jQuery;
} );

},{}],8:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],9:[function(require,module,exports){
(function (setImmediate,clearImmediate){(function (){
var nextTick = require('process/browser.js').nextTick;
var apply = Function.prototype.apply;
var slice = Array.prototype.slice;
var immediateIds = {};
var nextImmediateId = 0;

// DOM APIs, for completeness

exports.setTimeout = function() {
  return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
};
exports.setInterval = function() {
  return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
};
exports.clearTimeout =
exports.clearInterval = function(timeout) { timeout.close(); };

function Timeout(id, clearFn) {
  this._id = id;
  this._clearFn = clearFn;
}
Timeout.prototype.unref = Timeout.prototype.ref = function() {};
Timeout.prototype.close = function() {
  this._clearFn.call(window, this._id);
};

// Does not start the time, just sets up the members needed.
exports.enroll = function(item, msecs) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = msecs;
};

exports.unenroll = function(item) {
  clearTimeout(item._idleTimeoutId);
  item._idleTimeout = -1;
};

exports._unrefActive = exports.active = function(item) {
  clearTimeout(item._idleTimeoutId);

  var msecs = item._idleTimeout;
  if (msecs >= 0) {
    item._idleTimeoutId = setTimeout(function onTimeout() {
      if (item._onTimeout)
        item._onTimeout();
    }, msecs);
  }
};

// That's not how node.js implements it but the exposed api is the same.
exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
  var id = nextImmediateId++;
  var args = arguments.length < 2 ? false : slice.call(arguments, 1);

  immediateIds[id] = true;

  nextTick(function onNextTick() {
    if (immediateIds[id]) {
      // fn.call() is faster so we optimize for the common use-case
      // @see http://jsperf.com/call-apply-segu
      if (args) {
        fn.apply(null, args);
      } else {
        fn.call(null);
      }
      // Prevent ids from leaking
      exports.clearImmediate(id);
    }
  });

  return id;
};

exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
  delete immediateIds[id];
};
}).call(this)}).call(this,require("timers").setImmediate,require("timers").clearImmediate)
},{"process/browser.js":8,"timers":9}],10:[function(require,module,exports){
/*!
 * Toastify js 1.11.1
 * https://github.com/apvarun/toastify-js
 * @license MIT licensed
 *
 * Copyright (C) 2018 Varun A P
 */
(function(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.Toastify = factory();
  }
})(this, function(global) {
  // Object initialization
  var Toastify = function(options) {
      // Returning a new init object
      return new Toastify.lib.init(options);
    },
    // Library version
    version = "1.11.1";

  // Set the default global options
  Toastify.defaults = {
    oldestFirst: true,
    text: "Toastify is awesome!",
    node: undefined,
    duration: 3000,
    selector: undefined,
    callback: function () {
    },
    destination: undefined,
    newWindow: false,
    close: false,
    gravity: "toastify-top",
    positionLeft: false,
    position: '',
    backgroundColor: '',
    avatar: "",
    className: "",
    stopOnFocus: true,
    onClick: function () {
    },
    offset: {x: 0, y: 0},
    escapeMarkup: true,
    style: {background: ''}
  };

  // Defining the prototype of the object
  Toastify.lib = Toastify.prototype = {
    toastify: version,

    constructor: Toastify,

    // Initializing the object with required parameters
    init: function(options) {
      // Verifying and validating the input object
      if (!options) {
        options = {};
      }

      // Creating the options object
      this.options = {};

      this.toastElement = null;

      // Validating the options
      this.options.text = options.text || Toastify.defaults.text; // Display message
      this.options.node = options.node || Toastify.defaults.node;  // Display content as node
      this.options.duration = options.duration === 0 ? 0 : options.duration || Toastify.defaults.duration; // Display duration
      this.options.selector = options.selector || Toastify.defaults.selector; // Parent selector
      this.options.callback = options.callback || Toastify.defaults.callback; // Callback after display
      this.options.destination = options.destination || Toastify.defaults.destination; // On-click destination
      this.options.newWindow = options.newWindow || Toastify.defaults.newWindow; // Open destination in new window
      this.options.close = options.close || Toastify.defaults.close; // Show toast close icon
      this.options.gravity = options.gravity === "bottom" ? "toastify-bottom" : Toastify.defaults.gravity; // toast position - top or bottom
      this.options.positionLeft = options.positionLeft || Toastify.defaults.positionLeft; // toast position - left or right
      this.options.position = options.position || Toastify.defaults.position; // toast position - left or right
      this.options.backgroundColor = options.backgroundColor || Toastify.defaults.backgroundColor; // toast background color
      this.options.avatar = options.avatar || Toastify.defaults.avatar; // img element src - url or a path
      this.options.className = options.className || Toastify.defaults.className; // additional class names for the toast
      this.options.stopOnFocus = options.stopOnFocus === undefined ? Toastify.defaults.stopOnFocus : options.stopOnFocus; // stop timeout on focus
      this.options.onClick = options.onClick || Toastify.defaults.onClick; // Callback after click
      this.options.offset = options.offset || Toastify.defaults.offset; // toast offset
      this.options.escapeMarkup = options.escapeMarkup !== undefined ? options.escapeMarkup : Toastify.defaults.escapeMarkup;
      this.options.style = options.style || Toastify.defaults.style;
      this.options.style.background = Toastify.defaults.backgroundColor || options.backgroundColor;

      // Returning the current object for chaining functions
      return this;
    },

    // Building the DOM element
    buildToast: function() {
      // Validating if the options are defined
      if (!this.options) {
        throw "Toastify is not initialized";
      }

      // Creating the DOM object
      var divElement = document.createElement("div");
      divElement.className = "toastify on " + this.options.className;

      // Positioning toast to left or right or center
      if (!!this.options.position) {
        divElement.className += " toastify-" + this.options.position;
      } else {
        // To be depreciated in further versions
        if (this.options.positionLeft === true) {
          divElement.className += " toastify-left";
          console.warn('Property `positionLeft` will be depreciated in further versions. Please use `position` instead.')
        } else {
          // Default position
          divElement.className += " toastify-right";
        }
      }

      // Assigning gravity of element
      divElement.className += " " + this.options.gravity;

      if (this.options.backgroundColor) {
        // This is being deprecated in favor of using the style HTML DOM property
        console.warn('DEPRECATION NOTICE: "backgroundColor" is being deprecated. Please use the "style.background" property.');
      }

      // Loop through our style object and apply styles to divElement
      for (var property in this.options.style) {
        divElement.style[property] = this.options.style[property];
      }

      // Adding the toast message/node
      if (this.options.node && this.options.node.nodeType === Node.ELEMENT_NODE) {
        // If we have a valid node, we insert it
        divElement.appendChild(this.options.node)
      } else {
        if (this.options.escapeMarkup) {
          divElement.innerText = this.options.text;
        } else {
          divElement.innerHTML = this.options.text;
        }

        if (this.options.avatar !== "") {
          var avatarElement = document.createElement("img");
          avatarElement.src = this.options.avatar;

          avatarElement.className = "toastify-avatar";

          if (this.options.position == "left" || this.options.positionLeft === true) {
            // Adding close icon on the left of content
            divElement.appendChild(avatarElement);
          } else {
            // Adding close icon on the right of content
            divElement.insertAdjacentElement("afterbegin", avatarElement);
          }
        }
      }

      // Adding a close icon to the toast
      if (this.options.close === true) {
        // Create a span for close element
        var closeElement = document.createElement("span");
        closeElement.innerHTML = "&#10006;";

        closeElement.className = "toast-close";

        // Triggering the removal of toast from DOM on close click
        closeElement.addEventListener(
          "click",
          function(event) {
            event.stopPropagation();
            this.removeElement(this.toastElement);
            window.clearTimeout(this.toastElement.timeOutValue);
          }.bind(this)
        );

        //Calculating screen width
        var width = window.innerWidth > 0 ? window.innerWidth : screen.width;

        // Adding the close icon to the toast element
        // Display on the right if screen width is less than or equal to 360px
        if ((this.options.position == "left" || this.options.positionLeft === true) && width > 360) {
          // Adding close icon on the left of content
          divElement.insertAdjacentElement("afterbegin", closeElement);
        } else {
          // Adding close icon on the right of content
          divElement.appendChild(closeElement);
        }
      }

      // Clear timeout while toast is focused
      if (this.options.stopOnFocus && this.options.duration > 0) {
        var self = this;
        // stop countdown
        divElement.addEventListener(
          "mouseover",
          function(event) {
            window.clearTimeout(divElement.timeOutValue);
          }
        )
        // add back the timeout
        divElement.addEventListener(
          "mouseleave",
          function() {
            divElement.timeOutValue = window.setTimeout(
              function() {
                // Remove the toast from DOM
                self.removeElement(divElement);
              },
              self.options.duration
            )
          }
        )
      }

      // Adding an on-click destination path
      if (typeof this.options.destination !== "undefined") {
        divElement.addEventListener(
          "click",
          function(event) {
            event.stopPropagation();
            if (this.options.newWindow === true) {
              window.open(this.options.destination, "_blank");
            } else {
              window.location = this.options.destination;
            }
          }.bind(this)
        );
      }

      if (typeof this.options.onClick === "function" && typeof this.options.destination === "undefined") {
        divElement.addEventListener(
          "click",
          function(event) {
            event.stopPropagation();
            this.options.onClick();
          }.bind(this)
        );
      }

      // Adding offset
      if(typeof this.options.offset === "object") {

        var x = getAxisOffsetAValue("x", this.options);
        var y = getAxisOffsetAValue("y", this.options);

        var xOffset = this.options.position == "left" ? x : "-" + x;
        var yOffset = this.options.gravity == "toastify-top" ? y : "-" + y;

        divElement.style.transform = "translate(" + xOffset + "," + yOffset + ")";

      }

      // Returning the generated element
      return divElement;
    },

    // Displaying the toast
    showToast: function() {
      // Creating the DOM object for the toast
      this.toastElement = this.buildToast();

      // Getting the root element to with the toast needs to be added
      var rootElement;
      if (typeof this.options.selector === "string") {
        rootElement = document.getElementById(this.options.selector);
      } else if (this.options.selector instanceof HTMLElement || this.options.selector instanceof ShadowRoot) {
        rootElement = this.options.selector;
      } else {
        rootElement = document.body;
      }

      // Validating if root element is present in DOM
      if (!rootElement) {
        throw "Root element is not defined";
      }

      // Adding the DOM element
      var elementToInsert = Toastify.defaults.oldestFirst ? rootElement.firstChild : rootElement.lastChild;
      rootElement.insertBefore(this.toastElement, elementToInsert);

      // Repositioning the toasts in case multiple toasts are present
      Toastify.reposition();

      if (this.options.duration > 0) {
        this.toastElement.timeOutValue = window.setTimeout(
          function() {
            // Remove the toast from DOM
            this.removeElement(this.toastElement);
          }.bind(this),
          this.options.duration
        ); // Binding `this` for function invocation
      }

      // Supporting function chaining
      return this;
    },

    hideToast: function() {
      if (this.toastElement.timeOutValue) {
        clearTimeout(this.toastElement.timeOutValue);
      }
      this.removeElement(this.toastElement);
    },

    // Removing the element from the DOM
    removeElement: function(toastElement) {
      // Hiding the element
      // toastElement.classList.remove("on");
      toastElement.className = toastElement.className.replace(" on", "");

      // Removing the element from DOM after transition end
      window.setTimeout(
        function() {
          // remove options node if any
          if (this.options.node && this.options.node.parentNode) {
            this.options.node.parentNode.removeChild(this.options.node);
          }

          // Remove the element from the DOM, only when the parent node was not removed before.
          if (toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
          }

          // Calling the callback function
          this.options.callback.call(toastElement);

          // Repositioning the toasts again
          Toastify.reposition();
        }.bind(this),
        400
      ); // Binding `this` for function invocation
    },
  };

  // Positioning the toasts on the DOM
  Toastify.reposition = function() {

    // Top margins with gravity
    var topLeftOffsetSize = {
      top: 15,
      bottom: 15,
    };
    var topRightOffsetSize = {
      top: 15,
      bottom: 15,
    };
    var offsetSize = {
      top: 15,
      bottom: 15,
    };

    // Get all toast messages on the DOM
    var allToasts = document.getElementsByClassName("toastify");

    var classUsed;

    // Modifying the position of each toast element
    for (var i = 0; i < allToasts.length; i++) {
      // Getting the applied gravity
      if (containsClass(allToasts[i], "toastify-top") === true) {
        classUsed = "toastify-top";
      } else {
        classUsed = "toastify-bottom";
      }

      var height = allToasts[i].offsetHeight;
      classUsed = classUsed.substr(9, classUsed.length-1)
      // Spacing between toasts
      var offset = 15;

      var width = window.innerWidth > 0 ? window.innerWidth : screen.width;

      // Show toast in center if screen with less than or equal to 360px
      if (width <= 360) {
        // Setting the position
        allToasts[i].style[classUsed] = offsetSize[classUsed] + "px";

        offsetSize[classUsed] += height + offset;
      } else {
        if (containsClass(allToasts[i], "toastify-left") === true) {
          // Setting the position
          allToasts[i].style[classUsed] = topLeftOffsetSize[classUsed] + "px";

          topLeftOffsetSize[classUsed] += height + offset;
        } else {
          // Setting the position
          allToasts[i].style[classUsed] = topRightOffsetSize[classUsed] + "px";

          topRightOffsetSize[classUsed] += height + offset;
        }
      }
    }

    // Supporting function chaining
    return this;
  };

  // Helper function to get offset.
  function getAxisOffsetAValue(axis, options) {

    if(options.offset[axis]) {
      if(isNaN(options.offset[axis])) {
        return options.offset[axis];
      }
      else {
        return options.offset[axis] + 'px';
      }
    }

    return '0px';

  }

  function containsClass(elem, yourClass) {
    if (!elem || typeof yourClass !== "string") {
      return false;
    } else if (
      elem.className &&
      elem.className
        .trim()
        .split(/\s+/gi)
        .indexOf(yourClass) > -1
    ) {
      return true;
    } else {
      return false;
    }
  }

  // Setting up the prototype for the init object
  Toastify.lib.init.prototype = Toastify.lib;

  // Returning the Toastify function to be assigned to the window object/module
  return Toastify;
});

},{}],11:[function(require,module,exports){
var $ = require('jquery');
var FroalaEditor = require('froala-editor');
// require('../node_modules/froala-editor/js/plugins/paragraph_format.min.js');
// require('../node_modules/froala-editor/js/plugins/paragraph_style.min.js');
var Toastify = require('toastify-js/src/toastify');
var Gun = require('gun/gun');
require('gun/sea');

var editor = new FroalaEditor('.editable', {
    toolbarButtons: ['bold', 'italic', 'underline', 'undo', 'redo']
});

var gun = Gun(['http://localhost:8765/gun']);
var user = gun.user().recall({ sessionStorage: true });

$('#said').hide();
$('#myjournal').hide();
$('#logout').hide();


$('#up').on('click', function (e) {
    user.create($('#alias').val(), $('#pass').val());
});

$('#logout').on('click', function (e) {
    user.leave();
    $('#said').hide();
    $('#myjournal').hide();
    $('#logout').hide();
    $('#sign').show();
});

$('#sign').on('submit', function (e) {
    e.preventDefault();
    user.auth($('#alias').val(), $('#pass').val());
});


$('#said').on('submit', function(e){
    e.preventDefault();
    if(!user.is){ return; }
    user.get('said').set(editor.html.get());
    Toastify({
        text: 'Your post has been saved!',
        duration: 2500,
        gravity: "top",
        position: "right"
    }).showToast();
  });

$(document).on('click', '.delete-button', function (e) {
    e.preventDefault();
    let deleteToast = Toastify({
        text: 'Are you sure you want to delete this journal entry? Click this notification to confirm.',
        gravity: "top",
        position: "right",
        duration: -1,
        backgroundColor: 'red',
        close: true,
        onClick: function(){
            user.get('said').get(e.target.id).put(null);
            if(deleteToast){
                deleteToast.hideToast();
            }
        }
    })
    
    deleteToast.showToast();
});

function UI(say, id) {
    console.log('loading')
    var li = $('#' + id).get(0) || $('<li>').attr('id', id).appendTo('#entries');
    if (say) {
        $(li).addClass("p-8 shadow");
        $(li).html(`<div><div id="${id}" class="float-right delete-button cursor-pointer">&times;</div><div>${say}</div></div>`);
    } else {
        $(li).hide();
    }
}

gun.on('auth', function () {
    $('#sign').hide();
    $('#said').show();
    $('#myjournal').show();
    $('#logout').show();
    user.get('said').map().on(UI);
});
},{"froala-editor":3,"gun/gun":4,"gun/sea":5,"jquery":7,"toastify-js/src/toastify":10}]},{},[11]);
