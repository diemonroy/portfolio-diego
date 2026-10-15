/**
 * Standalone TypeScript QR Code Generator
 * Based on Project Nayuki's QR Code generator library (MIT License)
 * Zero external dependencies, pure TypeScript implementation.
 */

export class Ecc {
  static readonly LOW = new Ecc(0, 1);
  static readonly MEDIUM = new Ecc(1, 0);
  static readonly QUARTILE = new Ecc(2, 3);
  static readonly HIGH = new Ecc(3, 2);

  private constructor(
    public readonly ordinal: number,
    public readonly formatBits: number
  ) {}
}

export class QrSegment {
  static makeBytes(data: number[]): QrSegment {
    const bb: number[] = [];
    for (const b of data) bb.push(...toBits(b, 8));
    return new QrSegment(QrSegment.Mode.BYTE, data.length, bb);
  }

  static getTotalBits(segs: QrSegment[], version: number): number {
    let res = 0;
    for (const seg of segs) {
      res += 4 + seg.mode.numCharCountBits(version) + seg.bitData.length;
    }
    return res;
  }

  private constructor(
    public readonly mode: QrSegment.Mode,
    public readonly numChars: number,
    private readonly bitData: number[]
  ) {}

  getData(): number[] {
    return this.bitData;
  }
}

export namespace QrSegment {
  export class Mode {
    static readonly BYTE = new Mode(0x4, [8, 16, 16]);

    constructor(
      public readonly modeBits: number,
      private readonly ccBits: [number, number, number]
    ) {}

    numCharCountBits(ver: number): number {
      return this.ccBits[Math.floor((ver + 7) / 17)];
    }
  }
}

export class QrCode {
  readonly size: number;
  private readonly modules: boolean[][];
  private readonly isFunction: boolean[][];

  static encodeText(text: string, ecl: Ecc = Ecc.MEDIUM): QrCode {
    const seg = QrSegment.makeBytes(toUtf8ByteArray(text));
    return QrCode.encodeSegments([seg], ecl);
  }

  static encodeSegments(
    segs: QrSegment[],
    ecl: Ecc,
    minVersion: number = 1,
    maxVersion: number = 40,
    mask: number = -1
  ): QrCode {
    for (let version = minVersion; ; version++) {
      const dataCapacityBits = QrCode.getNumDataCodewords(version, ecl) * 8;
      const dataUsedBits = QrSegment.getTotalBits(segs, version);
      if (dataUsedBits <= dataCapacityBits) {
        const bb: number[] = [];
        for (const seg of segs) {
          bb.push(...toBits(seg.mode.modeBits, 4));
          bb.push(...toBits(seg.numChars, seg.mode.numCharCountBits(version)));
          for (const b of seg.getData()) bb.push(b);
        }
        const numDataCodewords = QrCode.getNumDataCodewords(version, ecl);
        const padLen = Math.min(4, numDataCodewords * 8 - bb.length);
        for (let i = 0; i < padLen; i++) bb.push(0);
        while (bb.length % 8 !== 0) bb.push(0);
        for (let padByte = 0xec; bb.length < numDataCodewords * 8; padByte ^= 0xec ^ 0x11) {
          bb.push(...toBits(padByte, 8));
        }
        const dataCodewords: number[] = [];
        while (dataCodewords.length * 8 < bb.length) {
          dataCodewords.push(fromBits(bb.slice(dataCodewords.length * 8, dataCodewords.length * 8 + 8)));
        }
        return new QrCode(version, ecl, dataCodewords, mask);
      }
      if (version >= maxVersion) throw new Error('Data too long for QR Code');
    }
  }

  private constructor(
    public readonly version: number,
    public readonly errorCorrectionLevel: Ecc,
    dataCodewords: number[],
    msk: number
  ) {
    this.size = version * 4 + 17;
    this.modules = [];
    this.isFunction = [];
    for (let i = 0; i < this.size; i++) {
      this.modules.push(new Array(this.size).fill(false));
      this.isFunction.push(new Array(this.size).fill(false));
    }
    this.drawFunctionPatterns();
    const allCodewords = this.addEccAndInterleave(dataCodewords);
    this.drawCodewords(allCodewords);

    if (msk === -1) {
      let minPenalty = 1e9;
      let bestMask = 0;
      for (let m = 0; m < 8; m++) {
        this.applyMask(m);
        this.drawFormatBits(m);
        const penalty = this.getPenaltyScore();
        if (penalty < minPenalty) {
          minPenalty = penalty;
          bestMask = m;
        }
        this.applyMask(m);
      }
      msk = bestMask;
    }
    this.applyMask(msk);
    this.drawFormatBits(msk);
    this.isFunction = [];
  }

  getModule(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size && this.modules[y][x];
  }

  toSvgString(border: number = 4, lightColor: string = '#ffffff', darkColor: string = '#090a0f'): string {
    const parts: string[] = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.getModule(x, y)) {
          parts.push(`M${x + border},${y + border}h1v1h-1z`);
        }
      }
    }
    const fullSize = this.size + border * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullSize} ${fullSize}" shape-rendering="crispEdges">
      <rect width="${fullSize}" height="${fullSize}" fill="${lightColor}" rx="1"/>
      <path d="${parts.join('')}" fill="${darkColor}"/>
    </svg>`;
  }

  drawToCanvas(canvas: HTMLCanvasElement, scale: number = 8, border: number = 4, lightColor: string = '#ffffff', darkColor: string = '#090a0f') {
    const fullSize = this.size + border * 2;
    canvas.width = fullSize * scale;
    canvas.height = fullSize * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = darkColor;
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (this.getModule(x, y)) {
          ctx.fillRect((x + border) * scale, (y + border) * scale, scale, scale);
        }
      }
    }
  }

  private drawFunctionPatterns() {
    for (let i = 0; i < this.size; i++) {
      this.setFunctionModule(6, i, i % 2 === 0);
      this.setFunctionModule(i, 6, i % 2 === 0);
    }
    this.drawFinderPattern(3, 3);
    this.drawFinderPattern(this.size - 4, 3);
    this.drawFinderPattern(3, this.size - 4);
    const alignPatPos = QrCode.getAlignmentPatternPositions(this.version);
    const numAlign = alignPatPos.length;
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0)) continue;
        this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
      }
    }
    this.drawFormatBits(0);
    this.drawVersion();
  }

  private drawFinderPattern(x: number, y: number) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size) {
          this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
        }
      }
    }
  }

  private drawAlignmentPattern(x: number, y: number) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }
    }
  }

  private setFunctionModule(x: number, y: number, isDark: boolean) {
    this.modules[y][x] = isDark;
    this.isFunction[y][x] = true;
  }

  private drawFormatBits(mask: number) {
    const data = (this.errorCorrectionLevel.formatBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) this.setFunctionModule(8, i, getBit(bits, i));
    this.setFunctionModule(8, 7, getBit(bits, 6));
    this.setFunctionModule(8, 8, getBit(bits, 7));
    this.setFunctionModule(7, 8, getBit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunctionModule(14 - i, 8, getBit(bits, i));
    for (let i = 0; i < 8; i++) this.setFunctionModule(this.size - 1 - i, 8, getBit(bits, i));
    for (let i = 8; i < 15; i++) this.setFunctionModule(8, this.size - 15 + i, getBit(bits, i));
    this.setFunctionModule(8, this.size - 8, true);
  }

  private drawVersion() {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = getBit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunctionModule(a, b, bit);
      this.setFunctionModule(b, a, bit);
    }
  }

  private addEccAndInterleave(data: number[]): number[] {
    const ver = this.version, ecl = this.errorCorrectionLevel;
    const numBlocks = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
    const blockEccLen = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
    const rawCodewords = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);
    const blocks: { data: number[]; ecc: number[] }[] = [];
    const rsDiv = QrCode.reedSolomonComputeDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
      const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i >= numShortBlocks ? 1 : 0));
      k += dat.length;
      const ecc = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
      blocks.push({ data: dat, ecc: ecc });
    }
    const res: number[] = [];
    for (let i = 0; i < blocks[0].data.length; i++) {
      for (let j = 0; j < blocks.length; j++) {
        if (i < blocks[j].data.length) res.push(blocks[j].data[i]);
      }
    }
    for (let i = 0; i < blockEccLen; i++) {
      for (let j = 0; j < blocks.length; j++) res.push(blocks[j].ecc[i]);
    }
    return res;
  }

  private drawCodewords(data: number[]) {
    let i = 0;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < this.size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? this.size - 1 - vert : vert;
          if (!this.isFunction[y][x] && i < data.length * 8) {
            this.modules[y][x] = getBit(data[Math.floor(i / 8)], 7 - (i % 8));
            i++;
          }
        }
      }
    }
  }

  private applyMask(mask: number) {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert: boolean;
        switch (mask) {
          case 0: invert = (x + y) % 2 === 0; break;
          case 1: invert = y % 2 === 0; break;
          case 2: invert = x % 3 === 0; break;
          case 3: invert = (x + y) % 3 === 0; break;
          case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
          case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
          case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
          default: throw new Error('Invalid mask: ' + mask);
        }
        if (!this.isFunction[y][x] && invert) {
          this.modules[y][x] = !this.modules[y][x];
        }
      }
    }
  }

  private getPenaltyScore(): number {
    let result = 0;
    for (let y = 0; y < this.size; y++) {
      let runColor = false, runVal = 0;
      for (let x = 0; x < this.size; x++) {
        const color = this.modules[y][x];
        if (color === runColor) {
          runVal++;
          if (runVal === 5) result += 3;
          else if (runVal > 5) result++;
        } else {
          runColor = color;
          runVal = 1;
        }
      }
    }
    for (let x = 0; x < this.size; x++) {
      let runColor = false, runVal = 0;
      for (let y = 0; y < this.size; y++) {
        const color = this.modules[y][x];
        if (color === runColor) {
          runVal++;
          if (runVal === 5) result += 3;
          else if (runVal > 5) result++;
        } else {
          runColor = color;
          runVal = 1;
        }
      }
    }
    for (let y = 0; y < this.size - 1; y++) {
      for (let x = 0; x < this.size - 1; x++) {
        const color = this.modules[y][x];
        if (color === this.modules[y][x + 1] && color === this.modules[y + 1][x] && color === this.modules[y + 1][x + 1]) {
          result += 3;
        }
      }
    }
    return result;
  }

  private static getAlignmentPatternPositions(ver: number): number[] {
    if (ver === 1) return [];
    const num = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (num * 2 - 2)) * 2;
    const res = [6];
    for (let pos = ver * 4 + 10; res.length < num; pos -= step) res.splice(1, 0, pos);
    return res;
  }

  private static getNumRawDataModules(ver: number): number {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      const numAlign = Math.floor(ver / 7) + 2;
      result -= (25 * numAlign - 10) * numAlign - 55;
      if (ver >= 7) result -= 36;
    }
    return result;
  }

  private static getNumDataCodewords(ver: number, ecl: Ecc): number {
    return Math.floor(QrCode.getNumRawDataModules(ver) / 8) -
      QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] *
      QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
  }

  private static reedSolomonComputeDivisor(degree: number): number[] {
    const res: number[] = new Array(degree).fill(0);
    res[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < degree; j++) {
        res[j] = QrCode.reedSolomonMultiply(res[j], root);
        if (j + 1 < degree) res[j] ^= res[j + 1];
      }
      root = QrCode.reedSolomonMultiply(root, 0x02);
    }
    return res;
  }

  private static reedSolomonComputeRemainder(data: number[], divisor: number[]): number[] {
    const res: number[] = new Array(divisor.length).fill(0);
    for (const b of data) {
      const factor = b ^ (res.shift() as number);
      res.push(0);
      for (let i = 0; i < divisor.length; i++) {
        res[i] ^= QrCode.reedSolomonMultiply(divisor[i], factor);
      }
    }
    return res;
  }

  private static reedSolomonMultiply(x: number, y: number): number {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11d);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }

  private static readonly ECC_CODEWORDS_PER_BLOCK: number[][] = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];

  private static readonly NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];
}

function toUtf8ByteArray(str: string): number[] {
  str = encodeURI(str);
  const res: number[] = [];
  for (let i = 0; i < str.length; i++) {
    if (str.charAt(i) !== '%') res.push(str.charCodeAt(i));
    else {
      res.push(parseInt(str.substr(i + 1, 2), 16));
      i += 2;
    }
  }
  return res;
}

function toBits(val: number, len: number): number[] {
  const res: number[] = [];
  for (let i = len - 1; i >= 0; i--) res.push((val >>> i) & 1);
  return res;
}

function fromBits(bits: number[]): number {
  let res = 0;
  for (const b of bits) res = (res << 1) | b;
  return res;
}

function getBit(x: number, i: number): boolean {
  return ((x >>> i) & 1) !== 0;
}
