import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';

export default function BarcodeScanner({ onDetected, onClose }) {
  const video = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let stream;
    let timer;
    let detecting = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('Camera access is not available in this browser or page context.');
        return;
      }
      const Detector = window.BarcodeDetector;
      if (!Detector) {
        setError('Barcode scanning is not supported by this browser. Enter the barcode manually.');
        return;
      }
      try {
        const formats = Detector.getSupportedFormats
          ? await Detector.getSupportedFormats()
          : ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];
        const detector = new Detector({ formats });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        video.current.srcObject = stream;
        await video.current.play();
        timer = window.setInterval(async () => {
          if (detecting || !active || video.current?.readyState < 2) return;
          detecting = true;
          try {
            const results = await detector.detect(video.current);
            const value = results[0]?.rawValue?.trim();
            if (value) {
              active = false;
              onDetected(value);
            }
          } catch {
            if (active) setError('Could not read the barcode. Try adjusting the lighting and camera position.');
          } finally {
            detecting = false;
          }
        }, 180);
      } catch (err) {
        if (!active) return;
        setError(err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow camera access in your browser settings and try again.'
          : `Could not start the camera${err?.message ? `: ${err.message}` : '.'}`);
      }
    };

    start();
    return () => {
      active = false;
      window.clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
      if (video.current) video.current.srcObject = null;
    };
  }, [onDetected]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Scan product barcode">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 className="section-title" style={{ margin: 0 }}><Camera size={18} /> Scan product barcode</h3>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close barcode scanner"><X size={16} /></button>
        </div>
        <p className="text-muted">Allow camera access and hold the product barcode inside the frame.</p>
        <video ref={video} playsInline muted style={{ display: 'block', width: '100%', maxHeight: 360, background: '#111', borderRadius: 8 }} />
        {error && <p className="notice notice-warn" role="alert">{error}</p>}
      </div>
    </div>
  );
}
