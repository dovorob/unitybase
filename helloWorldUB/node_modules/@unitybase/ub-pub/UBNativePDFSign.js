/*
 @author pavel.mash
 */
const ubUtils = require('./utils')
const i18n = require('./i18n').i18n
const UBNativeMessage = require('./UBNativeMessage')

/**
 * @class UBNativePDFSign
 * Manage signatures in PDF. Require native messages feature 'pdfsigner' to be installed.
 * @constructor
 * Construct new pdf signing
 * @param {Object} config initial parameters
 * @param {Number} [config.waitTimeout=180000] Default timeout for signing operation (in ms)
 */
function UBNativePDFSign (config) {
  var
    signer = Object.create(UBNativePDFSign.prototype),
    nm,
    initialized = false,
    documentLoaded = false

  nm = new UBNativeMessage('pdfsigner')
    /**
     * Native messages plugin instance
     * @property {UBNativeMessage} plugin
     * @protected
     */
  signer.nm = nm
  signer.nm.callTimeOut = (config && config.waitTimeout) || 180000

    /**
     * Serial number of certificate for signing operation.
     *
     *   - If `certificateSerial` not passed to UBNativePDFSign.signDocument this one is used.
     *   - If `userCertificateSerial` is null - UBNativePDFSign.onUserCertificateSelection called with UBNativePDFSign.getCertificatesList params,
     *     in this case task of onUserCertificateSelection is to return certificate serial. We will memorize it for future signing operation.
     *
     * @property {String}
     */
  signer.userCertificateSerial = null
    /**
     * Return array of certificates from `Personal` certificates store. Only certificates with private key is returned.
     * @method getCertificatesList
     * @return {Promise} resolved to certificate info array
     */
  signer.getCertificatesList = function () {
    return nm.invoke('getCertList')
  }

    /**
     * Initialize
     * @method
     * @return {Promise} Resolved to self
     */
  signer.init = function () {
    if (initialized) {
      return Promise.resolve(signer)
    } else {
      return nm.connect().then(function () { // nm
        initialized = true
        return signer
      })
    }
  }

    /**
     * Set base46 representation of data for future signature operations
     * After signature operation finish caller must call {@link UBNativePDFSign#signOperationEnd} to free allocated memory.
     *
     * Warning: Only one signing process may be active on the same time.
     *
     * @method
     * @param {String} base64Data  base64 encoded PDf document
     * @returns {Promise}
     */
  signer.signOperationStart = function (base64Data) {
    if (documentLoaded) {
      throw new ubUtils.UBError('singOperationInProcess')
    }
    return nm.invoke('loadDocument', base64Data).then(function (result) {
      documentLoaded = true
      return result
    })
  }

  /**
   * End previously started signature operation. Free allocated memory for data, loaded into plugin
   * @method
   * @returns {Promise} bool
   */
  signer.signOperationEnd = function () {
    if (!documentLoaded) {
      return Promise.reject(new Error('UBNativePDFSign. Document not loaded'))
    } else {
      return nm.invoke('closeDocument').then(function () {
        documentLoaded = false
        return true
      })
    }
  }

    /**
     * Return document page count. Document must be previously loaded by {@link UBNativePDFSign#signOperationStart}
     * @method
     * @returns {Promise} number
     */
  signer.signDocumentPageCount = function () {
    if (!documentLoaded) {
      return Promise.reject(new Error('UBNativePDFSign. Document not loaded'))
    } else {
      return nm.invoke('getPageCount')
    }
  }

    /**
     * Sign PDF with digital signature. Document must be previously loaded by {@link UBNativePDFSign#signOperationStart}
     *
     *  **Warning!** `signatureName` passed to config MUST be unique for entire document, in other case Adobe display only first of the-same-name signature.
     *
     * @method
     * @param {Object} config
     * @param {String} [config.certificateSerial] Serial number of certificate for signature operation. If not passed -
     * @param {String} config.signatureName UNIQUE name of signature
     * @param {String} config.authorName Author (Any text)
     * @param {String} [config.contactInfo] Signature author contact info (any text)
     * @param {String} [config.location]  Use this property to specify the CPU host name or physical location of the signing.
     * @param {String} [config.reason] Reason of signing
     * @param {String} [config.signerCaption]
     * @param {String} [config.header]
     * @param {String} [config.signerInfo]
     *
     * @param {Boolean} [config.useTimestampServer] Default false
     * @param {String} [config.timestampServer] Timestamp server address
     * @param {Boolean} [config.print] Is this signature must be printable. Default true
     *
     * If this property value is True signature widget can't be moved by the user.
     * In fact, Adobe always treat this tag as True, i.e., independently of the tag value the signature widget can't be moved by user.
     * @param {Boolean} [config.locked] Default false
     *
     * If this property value is True the signature widget will not interact with the user (will not react on mouse, etc.)
     * @param {Boolean} [config.readOnly] Default false
     *
     * If this property value is True the signature widget will be displayed only when user is moving mouse over it.
     * @param {Boolean} [config.toggleNoView] Default false
     *
     * @param {Boolean} [config.invisible] Signature visualisation. Default false
     * @param {Number} [config.page] Page where to place visual signature. Zero based
     * @param {Number} [config.width] Width of visual signature
     * @param {Number} [config.height] Height of visual signature
     * @param {Number} [config.offsetX] X offset on page for visual signature
     * @param {Number} [config.offsetY] Y offset on page for visual signature
     *
     * @param {String} [config.imageDataBase64] Image for place on visual signature
     * @param {UBNativePDFSign.SIGN_IMAGE_TYPES} [config.imageType]
     * @param {Boolean} [config.imageHasTransparent] Default true
     *
     * @return {Promise} Promise resolved to base64signedDocument
     */
  signer.signDocument = function (config) {
    if (!documentLoaded) {
      return Promise.reject(new Error('UBNativePDFSign. Document not loaded'))
    } else {
      let promise = Promise.resolve(config)
      if (!config.certificateSerial) {
        promise = promise.then(function (config) {
          if (signer.userCertificateSerial) {
            config.certificateSerial = signer.userCertificateSerial
            return config
          } else {
            return signer.getCertificatesList().then(function (certList) {
              return UBNativePDFSign.onUserCertificateSelection(signer, certList)
            }).then(function (certSerial) {
              signer.userCertificateSerial = certSerial
              config.certificateSerial = certSerial
              return config
            })
          }
        })
      }
      return promise.then(function (config) {
        return nm.invoke('signDocument', config)
      })
    }
  }

    /**
     * Return information for specified page. Document must be previously loaded by {@link UBNativePDFSign#signOperationStart}.
     * Page is zero based.
     *
     * @method
     * @param {number} page
     * @returns {Promise}
     */
  signer.signDocumentPageInfo = function (page) {
    if (!documentLoaded) {
      return Promise.reject(new Error('UBNativePDFSign. Document not loaded'))
    } else {
      return nm.invoke('getPageInfo', page)
    }
  }

    /**
     * Validate certificates chain inside signed document.
     * ** Not signature itself, but only certificates chain **
     * @param {Object} config
     * @param {Number} [config.signatureIndex] (Optional) by default All signatures
     * @param {Number} [config.certificateIndex] (Optional) by default All certificates
     * @returns {Promise} resolved to certificates validation information.
     */
  signer.signaturesCertificateChainInfo = function (config) {
    var params = {
      signatureIndex: (config && config.signatureIndex) ? config.signatureIndex : -1,
      certificateIndex: (config && config.certificateIndex) ? config.certificateIndex : -1
    }

    if (!documentLoaded) {
      return Promise.reject(new Error('UBNativePDFSign. Document not loaded'))
    } else {
      return nm.invoke('validateSignatureCert', params)
    }
  }

    /**
     * Return promise resolved to integer value equal to document signatures count
     * @returns {Promise}
     */
  signer.signaturesCount = function () {
    return nm.invoke('getdocSignatureCount')
  }

    /**
     * Return promise resolved to `index` signature properties
     * @param {Number} index Signature number
     * @returns {Promise}
     */
  signer.signatures = function (index) {
    return nm.invoke('getSignature', index)  // JSON.parse(
  }

    /**
     * Return promise resolved to count of certificates inside `index` signature
     * @param {Number} index Signature number
     * @returns {Promise}
     */
  signer.signatureCertCount = function (index) {
    return nm.invoke('getSignatureCertCount', index)
  }

    /**
     * Return promise resolved signature certificate properties
     * @param {Number} signatureIndex Signature number
     * @param {Number} certificateIndex Certificate number inside signature
     * @returns {Promise}
     */
  signer.signatureCert = function (signatureIndex, certificateIndex) {
    return nm.invoke('getSignatureCert', {signatureIndex: signatureIndex, certificateIndex: certificateIndex}) // JSON.parse(
  }

    /**
     * Return promise, resolved to information about signatures in currently in form [{signature: {..signature information}, certificates: {..signature certificates info}}, []]
     * @return {Promise}
     */
  signer.getDocumentSignaturesInformation = function () {
    var me = this

    function getSignatureInfo (signatureIndex) {
      return me.signatures(signatureIndex).then(function (signatureInfo) {
        return me.signatureCertCount(signatureIndex).then(function (certCount) {
          return Promise.all(_.range(certCount).map(me.signatureCert.bind(me, signatureIndex)))
        }).then(function (certificatesInfo) {
          return {signature: signatureInfo, certificates: certificatesInfo}
        })
      })
    }

    return me.signaturesCount().then(function (signatureCount) {
      return Promise.all(_.range(signatureCount).map(getSignatureInfo))
    })
  }

    /**
     * Retrieve document from native
     * @return {Promise} resolved to base46 encoded PDF document
     */
  signer.getDocument = function () {
    if (!documentLoaded) {
      return Promise.reject(new Error('UBNativePDFSign. Document not loaded'))
    } else {
      return nm.invoke('getDocument')
    }
  }

    /**
     * Remove existed signature from document
     * Usage sample:
     *
     *      $App.pdfSigner().then(function (pdfSigner) {
                promise.then(function (base64PdfData) { // start signature operation
                    return pdfSigner.signOperationStart(base64PdfData);
                }).then(function(){
                    return pdfSigner.removeSignature(0);
                }).then(function () {
                    return pdfSigner.getDocument();
                }).then(function(base64) {
                    var
                        blb = new Blob(
                            [UB.base64toArrayBuffer(base64)],
                            {type: "application/pdf"}
                        ),
                        objURL = window.URL.createObjectURL(blb),
                        w = window.open(objURL);
                    // do not forgot revokeObjectURL! As a side effect - user can`t save the document :)
                    w.onload = function(){
                        window.URL.revokeObjectURL(objURL);
                    };
                }).fin(function () {
                    return pdfSigner.signOperationEnd();
                }).then();
            }).then();
     *
     * @param {Number} signatureIndex
     * @return {Promise} resolved to true
     */
  signer.removeSignature = function (signatureIndex) {
    if (!documentLoaded) {
      return Promise.reject(new Error('UBNativePDFSign. Document not loaded'))
    } else {
      return nm.invoke('removeSignature', signatureIndex)
    }
  }

  return signer
}

/**
 * Task of this `static` handler is to filter certificate array and return promise, resolved to current user certificate serial number.
 * Default behavior is throw exception in case available VALID BY DATE certificate with PRIVATE KEY EXISTS count is !== 1.
 * Additionally can filter only certificates, created by issuer with CommonName === UBAppConfig.filterCertificatesByIssuer parameter of application configuration
 *
 * Real application must redefine this function in proper way.
 * Redefine example:
 *
 *
 *
 * @static
 * @param {UBNativePDFSign} PDFSigner
 * @param {Array} certificatesArray
 * @param {string} [issuerForFilter]
 * @returns {Promise}
 */
UBNativePDFSign.onUserCertificateSelection = function (PDFSigner, certificatesArray, issuerForFilter) {
  let now = new Date()
  // TODO - pass connection here to resolve a parameter from appInfo
  //let issuerForFilter = UB.appConfig['filterCertificatesByIssuer']
  let certsForSign = _.filter(certificatesArray, function (certificate) {
    let result = ((certificate['PrivateKeyExists'] === true) || (certificate['PrivateKeyExists'] === -1)) // -1 for OS X Clients
    result = result && certificate['ValidFrom'] && certificate['ValidTo'] && (new Date(certificate['ValidFrom']) < now) && (new Date(certificate['ValidTo']) > now)
    result = result && (!issuerForFilter || (certificate && certificate['IssuerName'] && (certificate['IssuerName']['CommonName'] === issuerForFilter)))
    return result
  })
  if (certsForSign.length !== 1) {
    return Promise.reject(new ubUtils.UBError(i18n('invalidPrivateKeyCertificateSelection')))
  } else {
    return Promise.resolve(certsForSign[0]['serialNumber'])
  }
}

/**
 * Possible image types for visual signatures
 * @static
 * @property {Object.<String, String>}
 */
UBNativePDFSign.SIGN_IMAGE_TYPES = {
  JPEG: 'JPEG',
  JPGTOBMP: 'JPGTOBMP',
  PNGTOBMP: 'PNGTOBMP',
  BMP: 'BMP'
}

module.exports = UBNativePDFSign
