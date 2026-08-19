import 'server-only'
import QRCode from 'qrcode'

// QR codes for the public COA verification pages printed on physical vial
// labels. High error correction since labels can get scuffed/dirty in
// storage and transit.

export async function qrPngBuffer(url: string, sizePx = 1000): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: 'png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: sizePx,
  })
}

export async function qrSvgString(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
  })
}
