import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  subtitle?: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  subtitle,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('event-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="qr-modal-container"
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm leading-tight">Código QR de Registro</h3>
              <p className="text-xs text-indigo-200/80">Acceso rápido para invitados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center text-center">
          <p className="text-xs font-medium text-slate-600 mb-1 max-w-[260px] truncate">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mb-4">{subtitle}</p>}

          <div className="p-4 bg-white rounded-xl shadow-inner border border-slate-100 mb-5">
            <QRCodeSVG
              id="event-qr-svg"
              value={url}
              size={190}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z'/%3E%3C/svg%3E",
                x: undefined,
                y: undefined,
                height: 32,
                width: 32,
                excavate: true,
              }}
            />
          </div>

          <div className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-slate-700 font-mono mb-4">
            <span className="truncate mr-2 max-w-[200px]">{url}</span>
            <button
              onClick={handleCopy}
              className="text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-sans font-semibold shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
            <button
              onClick={handleDownloadQR}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar PNG</span>
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1.5 border border-indigo-200"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Abrir URL</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
