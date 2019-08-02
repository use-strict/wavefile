/*
 * Copyright (c) 2017-2019 Rafael da Silva Rocha.
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 */

/**
 * @fileoverview The WaveFileParser class.
 * @see https://github.com/rochars/wavefile
 */

import {encode, decode} from 'base64-arraybuffer-es6';
import RIFFFile from './riff-file';
import writeString from './write-string';
import {packTo, packStringTo, packString, pack} from 'byte-data';

/**
 * A class to read and write wav files.
 */
export default class WaveFileParser extends RIFFFile {

  constructor() {
    super();
    /**
     * Audio formats.
     * Formats not listed here should be set to 65534,
     * the code for WAVE_FORMAT_EXTENSIBLE
     * @enum {number}
     * @private
     */
    this.WAV_AUDIO_FORMATS = {
      '4': 17,
      '8': 1,
      '8a': 6,
      '8m': 7,
      '16': 1,
      '24': 1,
      '32': 1,
      '32f': 3,
      '64': 3
    };
    /**
     * The data of the 'fmt' chunk.
     * @type {!Object<string, *>}
     */
    this.fmt = {
      /** @type {string} */
      chunkId: '',
      /** @type {number} */
      chunkSize: 0,
      /** @type {number} */
      audioFormat: 0,
      /** @type {number} */
      numChannels: 0,
      /** @type {number} */
      sampleRate: 0,
      /** @type {number} */
      byteRate: 0,
      /** @type {number} */
      blockAlign: 0,
      /** @type {number} */
      bitsPerSample: 0,
      /** @type {number} */
      cbSize: 0,
      /** @type {number} */
      validBitsPerSample: 0,
      /** @type {number} */
      dwChannelMask: 0,
      /**
       * 4 32-bit values representing a 128-bit ID
       * @type {!Array<number>}
       */
      subformat: []
    };
    /**
     * The data of the 'fact' chunk.
     * @type {!Object<string, *>}
     */
    this.fact = {
      /** @type {string} */
      chunkId: '',
      /** @type {number} */
      chunkSize: 0,
      /** @type {number} */
      dwSampleLength: 0
    };
    /**
     * The data of the 'cue ' chunk.
     * @type {!Object<string, *>}
     */
    this.cue = {
      /** @type {string} */
      chunkId: '',
      /** @type {number} */
      chunkSize: 0,
      /** @type {number} */
      dwCuePoints: 0,
      /** @type {!Array<!Object>} */
      points: [],
    };
    /**
     * The data of the 'smpl' chunk.
     * @type {!Object<string, *>}
     */
    this.smpl = {
      /** @type {string} */
      chunkId: '',
      /** @type {number} */
      chunkSize: 0,
      /** @type {number} */
      dwManufacturer: 0,
      /** @type {number} */
      dwProduct: 0,
      /** @type {number} */
      dwSamplePeriod: 0,
      /** @type {number} */
      dwMIDIUnityNote: 0,
      /** @type {number} */
      dwMIDIPitchFraction: 0,
      /** @type {number} */
      dwSMPTEFormat: 0,
      /** @type {number} */
      dwSMPTEOffset: 0,
      /** @type {number} */
      dwNumSampleLoops: 0,
      /** @type {number} */
      dwSamplerData: 0,
      /** @type {!Array<!Object>} */
      loops: []
    };
    /**
     * The data of the 'bext' chunk.
     * @type {!Object<string, *>}
     */
    this.bext = {
      /** @type {string} */
      chunkId: '',
      /** @type {number} */
      chunkSize: 0,
      /** @type {string} */
      description: '', //256
      /** @type {string} */
      originator: '', //32
      /** @type {string} */
      originatorReference: '', //32
      /** @type {string} */
      originationDate: '', //10
      /** @type {string} */
      originationTime: '', //8
      /**
       * 2 32-bit values, timeReference high and low
       * @type {!Array<number>}
       */
      timeReference: [0, 0],
      /** @type {number} */
      version: 0, //WORD
      /** @type {string} */
      UMID: '', // 64 chars
      /** @type {number} */
      loudnessValue: 0, //WORD
      /** @type {number} */
      loudnessRange: 0, //WORD
      /** @type {number} */
      maxTruePeakLevel: 0, //WORD
      /** @type {number} */
      maxMomentaryLoudness: 0, //WORD
      /** @type {number} */
      maxShortTermLoudness: 0, //WORD
      /** @type {string} */
      reserved: '', //180
      /** @type {string} */
      codingHistory: '' // string, unlimited
    };
    /**
     * The data of the 'ds64' chunk.
     * Used only with RF64 files.
     * @type {!Object<string, *>}
     */
    this.ds64 = {
      /** @type {string} */
      chunkId: '',
      /** @type {number} */
      chunkSize: 0,
      /** @type {number} */
      riffSizeHigh: 0, // DWORD
      /** @type {number} */
      riffSizeLow: 0, // DWORD
      /** @type {number} */
      dataSizeHigh: 0, // DWORD
      /** @type {number} */
      dataSizeLow: 0, // DWORD
      /** @type {number} */
      originationTime: 0, // DWORD
      /** @type {number} */
      sampleCountHigh: 0, // DWORD
      /** @type {number} */
      sampleCountLow: 0 // DWORD
      /** @type {number} */
      //'tableLength': 0, // DWORD
      /** @type {!Array<number>} */
      //'table': []
    };
    /**
     * The data of the 'data' chunk.
     * @type {!Object<string, *>}
     */
    this.data = {
      /** @type {string} */
      chunkId: '',
      /** @type {number} */
      chunkSize: 0,
      /** @type {!Uint8Array} */
      samples: new Uint8Array(0)
    };
    /**
     * The data of the 'LIST' chunks.
     * Each item in this list look like this:
     *  {
     *      chunkId: '',
     *      chunkSize: 0,
     *      format: '',
     *      subChunks: []
     *   }
     * @type {!Array<!Object>}
     */
    this.LIST = [];
    /**
     * The data of the 'junk' chunk.
     * @type {!Object<string, *>}
     */
    this.junk = {
      /** @type {string} */
      chunkId: '',
      /** @type {number} */
      chunkSize: 0,
      /** @type {!Array<number>} */
      chunkData: []
    };
    /**
     * The bit depth code according to the samples.
     * @type {string}
     */
    this.bitDepth = '0';
    /**
     * @type {!Object}
     * @private
     */
    this.dataType = {};
  }

  /**
   * Set up the WaveFileParser object from a byte buffer.
   * @param {!Uint8Array} wavBuffer The buffer.
   * @param {boolean=} samples True if the samples should be loaded.
   * @throws {Error} If container is not RIFF, RIFX or RF64.
   * @throws {Error} If format is not WAVE.
   * @throws {Error} If no 'fmt ' chunk is found.
   * @throws {Error} If no 'data' chunk is found.
   * @protected
   */
  readBuffer(wavBuffer, samples=true) {
    this.clearHeader_();
    this.head_ = 0;
    this.readRIFFChunk(wavBuffer);
    if (this.format != 'WAVE') {
      throw Error('Could not find the "WAVE" format identifier');
    }
    this.setSignature(wavBuffer);
    this.readDs64Chunk_(wavBuffer);
    this.readFmtChunk_(wavBuffer);
    this.readFactChunk_(wavBuffer);
    this.readBextChunk_(wavBuffer);
    this.readCueChunk_(wavBuffer);
    this.readSmplChunk_(wavBuffer);
    this.readDataChunk_(wavBuffer, samples);
    this.readJunkChunk_(wavBuffer);
    this.readLISTChunk_(wavBuffer);
    this.bitDepthFromFmt_();
    this.updateDataType_();
  }

  /**
   * Return a byte buffer representig the WaveFileParser object as a .wav file.
   * The return value of this method can be written straight to disk.
   * @return {!Uint8Array} A wav file.
   * @throws {Error} If bit depth is invalid.
   * @throws {Error} If the number of channels is invalid.
   * @throws {Error} If the sample rate is invalid.
   * @protected
   */
  writeBuffer() {
    this.validateWavHeader_();
    return this.writeWavBuffer_();
  }

  /**
   * Set the string code of the bit depth based on the 'fmt ' chunk.
   * @private
   */
  bitDepthFromFmt_() {
    if (this.fmt.audioFormat === 3 && this.fmt.bitsPerSample === 32) {
      this.bitDepth = '32f';
    } else if (this.fmt.audioFormat === 6) {
      this.bitDepth = '8a';
    } else if (this.fmt.audioFormat === 7) {
      this.bitDepth = '8m';
    } else {
      this.bitDepth = this.fmt.bitsPerSample.toString();
    }
  }

  /**
   * Reset some attributes of the object.
   * @private
   */
  clearHeader_() {
    this.fmt.cbSize = 0;
    this.fmt.validBitsPerSample = 0;
    this.fact.chunkId = '';
    this.ds64.chunkId = '';
  }

  /**
   * Update the type definition used to read and write the samples.
   * @private
   */
  updateDataType_() {
    this.dataType = {
      bits: ((parseInt(this.bitDepth, 10) - 1) | 7) + 1,
      fp: this.bitDepth == '32f' || this.bitDepth == '64',
      signed: this.bitDepth != '8',
      be: this.container == 'RIFX'
    };
    if (['4', '8a', '8m'].indexOf(this.bitDepth) > -1 ) {
      this.dataType.bits = 8;
      this.dataType.signed = false;
    }
  }

  /**
   * Return a .wav file byte buffer with the data from the WaveFileParser object.
   * The return value of this method can be written straight to disk.
   * @return {!Uint8Array} The wav file bytes.
   * @private
   */
  writeWavBuffer_() {
    this.uInt16_.be = this.container === 'RIFX';
    this.uInt32_.be = this.uInt16_.be;
    /** @type {!Array<!Array<number>>} */
    let fileBody = [
      this.getJunkBytes_(),
      this.getDs64Bytes_(),
      this.getBextBytes_(),
      this.getFmtBytes_(),
      this.getFactBytes_(),
      packString(this.data.chunkId),
      pack(this.data.samples.length, this.uInt32_),
      this.data.samples,
      this.getCueBytes_(),
      this.getSmplBytes_(),
      this.getLISTBytes_()
    ];
    /** @type {number} */
    let fileBodyLength = 0;
    for (let i=0; i<fileBody.length; i++) {
      fileBodyLength += fileBody[i].length;
    }
    /** @type {!Uint8Array} */
    let file = new Uint8Array(fileBodyLength + 12);
    /** @type {number} */
    let index = 0;
    index = packStringTo(this.container, file, index);
    index = packTo(fileBodyLength + 4, this.uInt32_, file, index);
    index = packStringTo(this.format, file, index);
    for (let i=0; i<fileBody.length; i++) {
      file.set(fileBody[i], index);
      index += fileBody[i].length;
    }
    return file;
  }

  /**
   * Return the bytes of the 'bext' chunk.
   * @private
   */
  getBextBytes_() {
    /** @type {!Array<number>} */
    let bytes = [];
    this.enforceBext_();
    if (this.bext.chunkId) {
      this.bext.chunkSize = 602 + this.bext.codingHistory.length;
      bytes = bytes.concat(
        packString(this.bext.chunkId),
        pack(602 + this.bext.codingHistory.length, this.uInt32_),
        writeString(this.bext.description, 256),
        writeString(this.bext.originator, 32),
        writeString(this.bext.originatorReference, 32),
        writeString(this.bext.originationDate, 10),
        writeString(this.bext.originationTime, 8),
        pack(this.bext.timeReference[0], this.uInt32_),
        pack(this.bext.timeReference[1], this.uInt32_),
        pack(this.bext.version, this.uInt16_),
        writeString(this.bext.UMID, 64),
        pack(this.bext.loudnessValue, this.uInt16_),
        pack(this.bext.loudnessRange, this.uInt16_),
        pack(this.bext.maxTruePeakLevel, this.uInt16_),
        pack(this.bext.maxMomentaryLoudness, this.uInt16_),
        pack(this.bext.maxShortTermLoudness, this.uInt16_),
        writeString(this.bext.reserved, 180),
        writeString(
          this.bext.codingHistory, this.bext.codingHistory.length));
    }
    return bytes;
  }

  /**
   * Make sure a 'bext' chunk is created if BWF data was created in a file.
   * @private
   */
  enforceBext_() {
    for (let prop in this.bext) {
      if (this.bext.hasOwnProperty(prop)) {
        if (this.bext[prop] && prop != 'timeReference') {
          this.bext.chunkId = 'bext';
          break;
        }
      }
    }
    if (this.bext.timeReference[0] || this.bext.timeReference[1]) {
      this.bext.chunkId = 'bext';
    }
  }

  /**
   * Return the bytes of the 'ds64' chunk.
   * @return {!Array<number>} The 'ds64' chunk bytes.
   * @private
   */
  getDs64Bytes_() {
    /** @type {!Array<number>} */
    let bytes = [];
    if (this.ds64.chunkId) {
      bytes = bytes.concat(
        packString(this.ds64.chunkId),
        pack(this.ds64.chunkSize, this.uInt32_),
        pack(this.ds64.riffSizeHigh, this.uInt32_),
        pack(this.ds64.riffSizeLow, this.uInt32_),
        pack(this.ds64.dataSizeHigh, this.uInt32_),
        pack(this.ds64.dataSizeLow, this.uInt32_),
        pack(this.ds64.originationTime, this.uInt32_),
        pack(this.ds64.sampleCountHigh, this.uInt32_),
        pack(this.ds64.sampleCountLow, this.uInt32_));
    }
    //if (this.ds64.tableLength) {
    //  ds64Bytes = ds64Bytes.concat(
    //    pack(this.ds64.tableLength, this.uInt32_),
    //    this.ds64.table);
    //}
    return bytes;
  }

  /**
   * Return the bytes of the 'cue ' chunk.
   * @return {!Array<number>} The 'cue ' chunk bytes.
   * @private
   */
  getCueBytes_() {
    /** @type {!Array<number>} */
    let bytes = [];
    if (this.cue.chunkId) {
      /** @type {!Array<number>} */
      let cuePointsBytes = this.getCuePointsBytes_();
      bytes = bytes.concat(
        packString(this.cue.chunkId),
        pack(cuePointsBytes.length + 4, this.uInt32_),
        pack(this.cue.dwCuePoints, this.uInt32_),
        cuePointsBytes);
    }
    return bytes;
  }

  /**
   * Return the bytes of the 'cue ' points.
   * @return {!Array<number>} The 'cue ' points as an array of bytes.
   * @private
   */
  getCuePointsBytes_() {
    /** @type {!Array<number>} */
    let points = [];
    for (let i=0; i<this.cue.dwCuePoints; i++) {
      points = points.concat(
        pack(this.cue.points[i].dwName, this.uInt32_),
        pack(this.cue.points[i].dwPosition, this.uInt32_),
        packString(this.cue.points[i].fccChunk),
        pack(this.cue.points[i].dwChunkStart, this.uInt32_),
        pack(this.cue.points[i].dwBlockStart, this.uInt32_),
        pack(this.cue.points[i].dwSampleOffset, this.uInt32_));
    }
    return points;
  }

  /**
   * Return the bytes of the 'smpl' chunk.
   * @return {!Array<number>} The 'smpl' chunk bytes.
   * @private
   */
  getSmplBytes_() {
    /** @type {!Array<number>} */
    let bytes = [];
    if (this.smpl.chunkId) {
      /** @type {!Array<number>} */
      let smplLoopsBytes = this.getSmplLoopsBytes_();
      bytes = bytes.concat(
        packString(this.smpl.chunkId),
        pack(smplLoopsBytes.length + 36, this.uInt32_),
        pack(this.smpl.dwManufacturer, this.uInt32_),
        pack(this.smpl.dwProduct, this.uInt32_),
        pack(this.smpl.dwSamplePeriod, this.uInt32_),
        pack(this.smpl.dwMIDIUnityNote, this.uInt32_),
        pack(this.smpl.dwMIDIPitchFraction, this.uInt32_),
        pack(this.smpl.dwSMPTEFormat, this.uInt32_),
        pack(this.smpl.dwSMPTEOffset, this.uInt32_),
        pack(this.smpl.dwNumSampleLoops, this.uInt32_),
        pack(this.smpl.dwSamplerData, this.uInt32_),
        smplLoopsBytes);
    }
    return bytes;
  }

  /**
   * Return the bytes of the 'smpl' loops.
   * @return {!Array<number>} The 'smpl' loops as an array of bytes.
   * @private
   */
  getSmplLoopsBytes_() {
    /** @type {!Array<number>} */
    let loops = [];
    for (let i=0; i<this.smpl.dwNumSampleLoops; i++) {
      loops = loops.concat(
        pack(this.smpl.loops[i].dwName, this.uInt32_),
        pack(this.smpl.loops[i].dwType, this.uInt32_),
        pack(this.smpl.loops[i].dwStart, this.uInt32_),
        pack(this.smpl.loops[i].dwEnd, this.uInt32_),
        pack(this.smpl.loops[i].dwFraction, this.uInt32_),
        pack(this.smpl.loops[i].dwPlayCount, this.uInt32_));
    }
    return loops;
  }

  /**
   * Return the bytes of the 'fact' chunk.
   * @return {!Array<number>} The 'fact' chunk bytes.
   * @private
   */
  getFactBytes_() {
    /** @type {!Array<number>} */
    let bytes = [];
    if (this.fact.chunkId) {
      bytes = bytes.concat(
        packString(this.fact.chunkId),
        pack(this.fact.chunkSize, this.uInt32_),
        pack(this.fact.dwSampleLength, this.uInt32_));
    }
    return bytes;
  }

  /**
   * Return the bytes of the 'fmt ' chunk.
   * @return {!Array<number>} The 'fmt' chunk bytes.
   * @throws {Error} if no 'fmt ' chunk is present.
   * @private
   */
  getFmtBytes_() {
    /** @type {!Array<number>} */
    let fmtBytes = [];
    if (this.fmt.chunkId) {
      return fmtBytes.concat(
        packString(this.fmt.chunkId),
        pack(this.fmt.chunkSize, this.uInt32_),
        pack(this.fmt.audioFormat, this.uInt16_),
        pack(this.fmt.numChannels, this.uInt16_),
        pack(this.fmt.sampleRate, this.uInt32_),
        pack(this.fmt.byteRate, this.uInt32_),
        pack(this.fmt.blockAlign, this.uInt16_),
        pack(this.fmt.bitsPerSample, this.uInt16_),
        this.getFmtExtensionBytes_());
    }
    throw Error('Could not find the "fmt " chunk');
  }

  /**
   * Return the bytes of the fmt extension fields.
   * @return {!Array<number>} The fmt extension bytes.
   * @private
   */
  getFmtExtensionBytes_() {
    /** @type {!Array<number>} */
    let extension = [];
    if (this.fmt.chunkSize > 16) {
      extension = extension.concat(
        pack(this.fmt.cbSize, this.uInt16_));
    }
    if (this.fmt.chunkSize > 18) {
      extension = extension.concat(
        pack(this.fmt.validBitsPerSample, this.uInt16_));
    }
    if (this.fmt.chunkSize > 20) {
      extension = extension.concat(
        pack(this.fmt.dwChannelMask, this.uInt32_));
    }
    if (this.fmt.chunkSize > 24) {
      extension = extension.concat(
        pack(this.fmt.subformat[0], this.uInt32_),
        pack(this.fmt.subformat[1], this.uInt32_),
        pack(this.fmt.subformat[2], this.uInt32_),
        pack(this.fmt.subformat[3], this.uInt32_));
    }
    return extension;
  }

  /**
   * Return the bytes of the 'LIST' chunk.
   * @return {!Array<number>} The 'LIST' chunk bytes.
   * @private
   */
  getLISTBytes_() {
    /** @type {!Array<number>} */
    let bytes = [];
    for (let i=0; i<this.LIST.length; i++) {
      /** @type {!Array<number>} */
      let subChunksBytes = this.getLISTSubChunksBytes_(
          this.LIST[i].subChunks, this.LIST[i].format);
      bytes = bytes.concat(
        packString(this.LIST[i].chunkId),
        pack(subChunksBytes.length + 4, this.uInt32_),
        packString(this.LIST[i].format),
        subChunksBytes);
    }
    return bytes;
  }

  /**
   * Return the bytes of the sub chunks of a 'LIST' chunk.
   * @param {!Array<!Object>} subChunks The 'LIST' sub chunks.
   * @param {string} format The format of the 'LIST' chunk.
   *    Currently supported values are 'adtl' or 'INFO'.
   * @return {!Array<number>} The sub chunk bytes.
   * @private
   */
  getLISTSubChunksBytes_(subChunks, format) {
    /** @type {!Array<number>} */
    let bytes = [];
    for (let i=0; i<subChunks.length; i++) {
      if (format == 'INFO') {
        bytes = bytes.concat(
          packString(subChunks[i].chunkId),
          pack(subChunks[i].value.length + 1, this.uInt32_),
          writeString(
            subChunks[i].value, subChunks[i].value.length));
        bytes.push(0);
      } else if (format == 'adtl') {
        if (['labl', 'note'].indexOf(subChunks[i].chunkId) > -1) {
          bytes = bytes.concat(
            packString(subChunks[i].chunkId),
            pack(
              subChunks[i].value.length + 4 + 1, this.uInt32_),
            pack(subChunks[i].dwName, this.uInt32_),
            writeString(
              subChunks[i].value,
              subChunks[i].value.length));
          bytes.push(0);
        } else if (subChunks[i].chunkId == 'ltxt') {
          bytes = bytes.concat(
            this.getLtxtChunkBytes_(subChunks[i]));
        }
      }
      if (bytes.length % 2) {
        bytes.push(0);
      }
    }
    return bytes;
  }

  /**
   * Return the bytes of a 'ltxt' chunk.
   * @param {!Object} ltxt the 'ltxt' chunk.
   * @private
   */
  getLtxtChunkBytes_(ltxt) {
    return [].concat(
      packString(ltxt.chunkId),
      pack(ltxt.value.length + 20, this.uInt32_),
      pack(ltxt.dwName, this.uInt32_),
      pack(ltxt.dwSampleLength, this.uInt32_),
      pack(ltxt.dwPurposeID, this.uInt32_),
      pack(ltxt.dwCountry, this.uInt16_),
      pack(ltxt.dwLanguage, this.uInt16_),
      pack(ltxt.dwDialect, this.uInt16_),
      pack(ltxt.dwCodePage, this.uInt16_),
      writeString(ltxt.value, ltxt.value.length));
  }

  /**
   * Return the bytes of the 'junk' chunk.
   * @private
   */
  getJunkBytes_() {
    /** @type {!Array<number>} */
    let bytes = [];
    if (this.junk.chunkId) {
      return bytes.concat(
        packString(this.junk.chunkId),
        pack(this.junk.chunkData.length, this.uInt32_),
        this.junk.chunkData);
    }
    return bytes;
  }

  /**
   * Read the 'fmt ' chunk of a wave file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @throws {Error} If no 'fmt ' chunk is found.
   * @private
   */
  readFmtChunk_(buffer) {
    /** @type {?Object} */
    let chunk = this.findChunk('fmt ');
    if (chunk) {
      this.head_ = chunk.chunkData.start;
      this.fmt.chunkId = chunk.chunkId;
      this.fmt.chunkSize = chunk.chunkSize;
      this.fmt.audioFormat = this.readNumber(buffer, this.uInt16_);
      this.fmt.numChannels = this.readNumber(buffer, this.uInt16_);
      this.fmt.sampleRate = this.readNumber(buffer, this.uInt32_);
      this.fmt.byteRate = this.readNumber(buffer, this.uInt32_);
      this.fmt.blockAlign = this.readNumber(buffer, this.uInt16_);
      this.fmt.bitsPerSample = this.readNumber(buffer, this.uInt16_);
      this.readFmtExtension_(buffer);
    } else {
      throw Error('Could not find the "fmt " chunk');
    }
  }

  /**
   * Read the 'fmt ' chunk extension.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @private
   */
  readFmtExtension_(buffer) {
    if (this.fmt.chunkSize > 16) {
      this.fmt.cbSize = this.readNumber(buffer, this.uInt16_);
      if (this.fmt.chunkSize > 18) {
        this.fmt.validBitsPerSample = this.readNumber(buffer, this.uInt16_);
        if (this.fmt.chunkSize > 20) {
          this.fmt.dwChannelMask = this.readNumber(buffer, this.uInt32_);
          this.fmt.subformat = [
            this.readNumber(buffer, this.uInt32_),
            this.readNumber(buffer, this.uInt32_),
            this.readNumber(buffer, this.uInt32_),
            this.readNumber(buffer, this.uInt32_)];
        }
      }
    }
  }

  /**
   * Read the 'fact' chunk of a wav file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @private
   */
  readFactChunk_(buffer) {
    /** @type {?Object} */
    let chunk = this.findChunk('fact');
    if (chunk) {
      this.head_ = chunk.chunkData.start;
      this.fact.chunkId = chunk.chunkId;
      this.fact.chunkSize = chunk.chunkSize;
      this.fact.dwSampleLength = this.readNumber(buffer, this.uInt32_);
    }
  }

  /**
   * Read the 'cue ' chunk of a wave file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @private
   */
  readCueChunk_(buffer) {
    /** @type {?Object} */
    let chunk = this.findChunk('cue ');
    if (chunk) {
      this.head_ = chunk.chunkData.start;
      this.cue.chunkId = chunk.chunkId;
      this.cue.chunkSize = chunk.chunkSize;
      this.cue.dwCuePoints = this.readNumber(buffer, this.uInt32_);
      for (let i = 0; i < this.cue.dwCuePoints; i++) {
        this.cue.points.push({
          dwName: this.readNumber(buffer, this.uInt32_),
          dwPosition: this.readNumber(buffer, this.uInt32_),
          fccChunk: this.readString(buffer, 4),
          dwChunkStart: this.readNumber(buffer, this.uInt32_),
          dwBlockStart: this.readNumber(buffer, this.uInt32_),
          dwSampleOffset: this.readNumber(buffer, this.uInt32_),
        });
      }
    }
  }

  /**
   * Read the 'smpl' chunk of a wave file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @private
   */
  readSmplChunk_(buffer) {
    /** @type {?Object} */
    let chunk = this.findChunk('smpl');
    if (chunk) {
      this.head_ = chunk.chunkData.start;
      this.smpl.chunkId = chunk.chunkId;
      this.smpl.chunkSize = chunk.chunkSize;
      this.smpl.dwManufacturer = this.readNumber(buffer, this.uInt32_);
      this.smpl.dwProduct = this.readNumber(buffer, this.uInt32_);
      this.smpl.dwSamplePeriod = this.readNumber(buffer, this.uInt32_);
      this.smpl.dwMIDIUnityNote = this.readNumber(buffer, this.uInt32_);
      this.smpl.dwMIDIPitchFraction = this.readNumber(buffer, this.uInt32_);
      this.smpl.dwSMPTEFormat = this.readNumber(buffer, this.uInt32_);
      this.smpl.dwSMPTEOffset = this.readNumber(buffer, this.uInt32_);
      this.smpl.dwNumSampleLoops = this.readNumber(buffer, this.uInt32_);
      this.smpl.dwSamplerData = this.readNumber(buffer, this.uInt32_);
      for (let i = 0; i < this.smpl.dwNumSampleLoops; i++) {
        this.smpl.loops.push({
          dwName: this.readNumber(buffer, this.uInt32_),
          dwType: this.readNumber(buffer, this.uInt32_),
          dwStart: this.readNumber(buffer, this.uInt32_),
          dwEnd: this.readNumber(buffer, this.uInt32_),
          dwFraction: this.readNumber(buffer, this.uInt32_),
          dwPlayCount: this.readNumber(buffer, this.uInt32_),
        });
      }
    }
  }

  /**
   * Read the 'data' chunk of a wave file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @param {boolean} samples True if the samples should be loaded.
   * @throws {Error} If no 'data' chunk is found.
   * @private
   */
  readDataChunk_(buffer, samples) {
    /** @type {?Object} */
    let chunk = this.findChunk('data');
    if (chunk) {
      this.data.chunkId = 'data';
      this.data.chunkSize = chunk.chunkSize;
      if (samples) {
        this.data.samples = buffer.slice(
          chunk.chunkData.start,
          chunk.chunkData.end);
      }
    } else {
      throw Error('Could not find the "data" chunk');
    }
  }

  /**
   * Read the 'bext' chunk of a wav file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @private
   */
  readBextChunk_(buffer) {
    /** @type {?Object} */
    let chunk = this.findChunk('bext');
    if (chunk) {
      this.head_ = chunk.chunkData.start;
      this.bext.chunkId = chunk.chunkId;
      this.bext.chunkSize = chunk.chunkSize;
      this.bext.description = this.readString(buffer, 256);
      this.bext.originator = this.readString(buffer, 32);
      this.bext.originatorReference = this.readString(buffer, 32);
      this.bext.originationDate = this.readString(buffer, 10);
      this.bext.originationTime = this.readString(buffer, 8);
      this.bext.timeReference = [
        this.readNumber(buffer, this.uInt32_),
        this.readNumber(buffer, this.uInt32_)];
      this.bext.version = this.readNumber(buffer, this.uInt16_);
      this.bext.UMID = this.readString(buffer, 64);
      this.bext.loudnessValue = this.readNumber(buffer, this.uInt16_);
      this.bext.loudnessRange = this.readNumber(buffer, this.uInt16_);
      this.bext.maxTruePeakLevel = this.readNumber(buffer, this.uInt16_);
      this.bext.maxMomentaryLoudness = this.readNumber(buffer, this.uInt16_);
      this.bext.maxShortTermLoudness = this.readNumber(buffer, this.uInt16_);
      this.bext.reserved = this.readString(buffer, 180);
      this.bext.codingHistory = this.readString(
        buffer, this.bext.chunkSize - 602);
    }
  }

  /**
   * Read the 'ds64' chunk of a wave file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @throws {Error} If no 'ds64' chunk is found and the file is RF64.
   * @private
   */
  readDs64Chunk_(buffer) {
    /** @type {?Object} */
    let chunk = this.findChunk('ds64');
    if (chunk) {
      this.head_ = chunk.chunkData.start;
      this.ds64.chunkId = chunk.chunkId;
      this.ds64.chunkSize = chunk.chunkSize;
      this.ds64.riffSizeHigh = this.readNumber(buffer, this.uInt32_);
      this.ds64.riffSizeLow = this.readNumber(buffer, this.uInt32_);
      this.ds64.dataSizeHigh = this.readNumber(buffer, this.uInt32_);
      this.ds64.dataSizeLow = this.readNumber(buffer, this.uInt32_);
      this.ds64.originationTime = this.readNumber(buffer, this.uInt32_);
      this.ds64.sampleCountHigh = this.readNumber(buffer, this.uInt32_);
      this.ds64.sampleCountLow = this.readNumber(buffer, this.uInt32_);
      //if (wav.ds64.chunkSize > 28) {
      //  wav.ds64.tableLength = unpack(
      //    chunkData.slice(28, 32), uInt32_);
      //  wav.ds64.table = chunkData.slice(
      //     32, 32 + wav.ds64.tableLength);
      //}
    } else {
      if (this.container == 'RF64') {
        throw Error('Could not find the "ds64" chunk');
      }
    }
  }

  /**
   * Read the 'LIST' chunks of a wave file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @private
   */
  readLISTChunk_(buffer) {
    /** @type {?Object} */
    let listChunks = this.findChunk('LIST', true);
    if (listChunks !== null) {
      for (let j=0; j < listChunks.length; j++) {
        /** @type {!Object} */
        let subChunk = listChunks[j];
        this.LIST.push({
          chunkId: subChunk.chunkId,
          chunkSize: subChunk.chunkSize,
          format: subChunk.format,
          subChunks: []});
        for (let x=0; x<subChunk.subChunks.length; x++) {
          this.readLISTSubChunks_(subChunk.subChunks[x],
            subChunk.format, buffer);
        }
      }
    }
  }

  /**
   * Read the sub chunks of a 'LIST' chunk.
   * @param {!Object} subChunk The 'LIST' subchunks.
   * @param {string} format The 'LIST' format, 'adtl' or 'INFO'.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @private
   */
  readLISTSubChunks_(subChunk, format, buffer) {
    if (format == 'adtl') {
      if (['labl', 'note','ltxt'].indexOf(subChunk.chunkId) > -1) {
        this.head_ = subChunk.chunkData.start;
        /** @type {!Object<string, string|number>} */
        let item = {
          chunkId: subChunk.chunkId,
          chunkSize: subChunk.chunkSize,
          dwName: this.readNumber(buffer, this.uInt32_)
        };
        if (subChunk.chunkId == 'ltxt') {
          item.dwSampleLength = this.readNumber(buffer, this.uInt32_);
          item.dwPurposeID = this.readNumber(buffer, this.uInt32_);
          item.dwCountry = this.readNumber(buffer, this.uInt16_);
          item.dwLanguage = this.readNumber(buffer, this.uInt16_);
          item.dwDialect = this.readNumber(buffer, this.uInt16_);
          item.dwCodePage = this.readNumber(buffer, this.uInt16_);
        }
        item.value = this.readZSTR(buffer, this.head_);
        this.LIST[this.LIST.length - 1].subChunks.push(item);
      }
    // RIFF INFO tags like ICRD, ISFT, ICMT
    } else if(format == 'INFO') {
      this.head_ = subChunk.chunkData.start;
      this.LIST[this.LIST.length - 1].subChunks.push({
        chunkId: subChunk.chunkId,
        chunkSize: subChunk.chunkSize,
        value: this.readZSTR(buffer, this.head_)
      });
    }
  }

  /**
   * Read the 'junk' chunk of a wave file.
   * @param {!Uint8Array} buffer The wav file buffer.
   * @private
   */
  readJunkChunk_(buffer) {
    /** @type {?Object} */
    let chunk = this.findChunk('junk');
    if (chunk) {
      this.junk = {
        chunkId: chunk.chunkId,
        chunkSize: chunk.chunkSize,
        chunkData: [].slice.call(buffer.slice(
          chunk.chunkData.start,
          chunk.chunkData.end))
      };
    }
  }

  /**
   * Validate the header of the file.
   * @throws {Error} If bit depth is invalid.
   * @throws {Error} If the number of channels is invalid.
   * @throws {Error} If the sample rate is invalid.
   * @private
   */
  validateWavHeader_() {
    this.validateBitDepth_();
    this.validateNumChannels_();
    this.validateSampleRate_();
  }

  /**
   * Validate the bit depth.
   * @return {boolean} True is the bit depth is valid.
   * @throws {Error} If bit depth is invalid.
   * @private
   */
  validateBitDepth_() {
    if (!this.WAV_AUDIO_FORMATS[this.bitDepth]) {
      if (parseInt(this.bitDepth, 10) > 8 &&
          parseInt(this.bitDepth, 10) < 54) {
        return true;
      }
      throw new Error('Invalid bit depth.');
    }
    return true;
  }

  /**
   * Validate the number of channels.
   * @return {boolean} True is the number of channels is valid.
   * @throws {Error} If the number of channels is invalid.
   * @private
   */
  validateNumChannels_() {
    /** @type {number} */
    let blockAlign = this.fmt.numChannels * this.fmt.bitsPerSample / 8;
    if (this.fmt.numChannels < 1 || blockAlign > 65535) {
      throw new Error('Invalid number of channels.');
    }
    return true;
  }

  /**
   * Validate the sample rate value.
   * @return {boolean} True is the sample rate is valid.
   * @throws {Error} If the sample rate is invalid.
   * @private
   */
  validateSampleRate_() {
    /** @type {number} */
    let byteRate = this.fmt.numChannels *
      (this.fmt.bitsPerSample / 8) * this.fmt.sampleRate;
    if (this.fmt.sampleRate < 1 || byteRate > 4294967295) {
      throw new Error('Invalid sample rate.');
    }
    return true;
  }
}