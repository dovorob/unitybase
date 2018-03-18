var ubUtils = require('./utils')
var _ = require('lodash')
var UBNativeMessage = require('./UBNativeMessage')

/**
 * @typedef barCodeItemConfig
 * @property {string} [itemType="text'] One of Text, BarCode, Empty
 * @property {Number} column Column number to place item into
 * @property {String} value Item text
 * @property {String} fontName
 * @property {Number} fontSize
 * @property {Boolean} fontBold
 * @property {Boolean} fontItalic
 * @property {Boolean} fontUnderline
 * @property {Boolean} fontStrikeout
 * @property {String} textOrientation One of Horizontal, Vertical
 * @property {String} [barCodeSymbology="Ean13"] Barcode symbologie.
 *  Possible values are one of Ean8,Ean13,Codabar,Code39Standard,Code39Full,Code93Standard,Code93Full,
 * Code128,ACodabar, 25Datalogic,25Interleaved,25Matrix, 25Industrial,25IATA,25Invert,ITF, ISBN, ISSN, ISMN,
 * UPCA,UPCE0,UPCE1,UPCShipping,SCC14, JAN8, JAN13,MSIPlessey,PostNet,Planet,RoyalMail,4State,Dutch4StatePostal,
 * SwissPostal,Singapore4StatePostalCode,PostBar,PostbarCPC4State,OPC,UccEan128,25Coop, Code11,PZN,PDF417,
 * CodablockF,SSCC,SISAC,Code16K,CodabarMonarch,Fim, Telepen, IntelligentMail, AustraliaPost, DataMatrix,
 * QRCode, Aztec
 * @property {Number} barCodeWidth
 * @property {Number} barCodeHeight
 * @property {Array<Number>} margins
 */

/**
 * Scanner & BarCode printing. Require native messages feature 'scanner' to be installed.
 * @author pavel.mash
 * @class
 * @param {Object} config initial parameters
 * @param {Number} [config.waitTimeout=180000] Default timeout for scanner operation (in ms)
 */
function UBNativeScanner (config) {
  var
    nm,
    initialized = false

  nm = new UBNativeMessage('scanner')
    /**
     * Native messages plugin instance
     * @type {UBNativeMessage}
     * @protected
     */
  this.nm = nm
  this.nm.callTimeOut = (config && config.waitTimeout) || 180000

    /**
     * Initialize scanner
     * @return {Promise} resolved to self
     */
  this.init = function () {
    var me = this
    if (initialized) {
      return Promise.resolve(me)
    } else {
      return nm.connect().then(function () {
        initialized = true
        return me
      })
    }
  }

    /**
     * Get array of scanners, installed in OS
     * @returns {Promise} resolved to scanner array
     */
  this.getScanners = function () {
    return nm.invoke('GetScanners')
  }

    /**
     * Get array of printers, installed in OS
     * @returns {Promise} resolved to scanner array
     */
  this.getPrinters = function () {
    return nm.invoke('GetPrinters')
  }

    /**
     * Read scanner & printer settings stored in file system
     * @return {Promise}
     */
  this.getDefaultSettings = function () {
    return nm.invoke('GetDefaultSettings')
  }

    /**
     * Store scanner & printer settings to file system
     * @param {Object} settings
     * @return {Promise}
     */
  this.setDefaultSettings = function (settings) {
    return nm.invoke('SetDefaultSettings', settings)
  }

    /**
     * Begin scan process. Params is applied to UBNativeScanner.getDefaultSettings result
     * @param {Object} [params]
     * @return {Promise} resolved to number of scanned pages. In case 0 - no paper
     */
  this.startScan = function (params) {
    return this.getDefaultSettings().then(function (defaultParams) {
      var mergedParams = _.merge(defaultParams, params)
      return nm.invoke('StartScan', mergedParams)
    })
  }

    /**
     * Continue previously started scan process (scan more pages)
     * @return {Promise} Resolved to number of scanned pages. In case 0 - no paper.
     */
  this.continueScan = function () {
    return nm.invoke('ContinueScan')
  }

    /**
     * Finish previously started scan process. Return a promise resolved to scan result as base64 encoded string.
     *
     * Will free any memory and delete temporary files created by host application.
     *
     * @return {Promise} Result as base64 encoded string in case of one page, or array of base64 in case of many page
     */
  this.finishScan = function () {
    return nm.invoke('FinishScan')
  }

    /**
     * Cancel previously started scan process, free memory and delete temporary files created by host application.
     *
     * @return {Promise} Resolved to true
     */
  this.cancelScan = function () {
    return nm.invoke('CancelScan')
  }

    /**
     * Print Barcode
     *
     * @param {object} barcodeConfig
     * @param {object} barcodeConfig.betweenColumns Number of space (in pixel) between columns
     * @param {Array<barCodeItemConfig>} barcodeConfig.items
     * @param {object} [printerSettings] only BarcodeSettings section of config. If empty then use Default printer
     * @param {string} [printerSettings.SupplementType]
     * @param {string} [printerSettings.PrinterName]
     * @param {boolean} [printerSettings.UseDefaultPrinter]
     * @param {number} [printerSettings.LeftMargin]
     * @param {number} [printerSettings.TopMargin]
     * @param {number} [printerSettings.RightMargin]
     * @param {number} [printerSettings.BottomMargin]
     * @param {boolean} [printerSettings.Rotate180]
     * @param {string} [printerSettings.pagePosition="bcppBottomRight"] Barcode position on page. One of TopLeft, TopCenter, TopRight, BottomLeft, BottomCenter, BottomRight
     * @returns {Promise} Resolved to `true`
     */
  this.printBarCode = function (barcodeConfig, printerSettings) {
    return this.getDefaultSettings().then(function (settings) {
      if (!settings || !settings['BarcodeSettings']) {
        throw new ubUtils.UBError('emptyBarcodeSettings')
      }
      return settings['BarcodeSettings']
    }).then(function (defaultPrinterSettings) {
      if (printerSettings) {
        _.merge(defaultPrinterSettings, printerSettings)
      }
      return nm.invoke('PrintBarCode', {
        barcode: barcodeConfig,
        printerSettings: defaultPrinterSettings
      })
    })
  }
}

module.exports = UBNativeScanner
