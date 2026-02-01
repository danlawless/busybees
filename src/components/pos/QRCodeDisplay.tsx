'use client';

import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDisplayProps {
  url?: string;
}

export function QRCodeDisplay({ url }: QRCodeDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const qrUrl = url || (typeof window !== 'undefined' ? `${window.location.origin}/pos` : '/pos');

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !qrRef.current) return;

    const svgElement = qrRef.current.querySelector('svg');
    if (!svgElement) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head><title>Busy Bees QR Code</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif">
          <h1 style="font-size:2rem;margin-bottom:1rem">Busy Bees Check-In</h1>
          <p style="font-size:1.2rem;color:#666;margin-bottom:2rem">Scan to check in!</p>
          ${svgElement.outerHTML}
          <p style="font-size:0.9rem;color:#999;margin-top:2rem">${qrUrl}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownload = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 512;
    canvas.height = 512;

    const img = new Image();
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      URL.revokeObjectURL(svgUrl);

      const link = document.createElement('a');
      link.download = 'busybees-checkin-qr.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = svgUrl;
  };

  return (
    <div className="flex flex-col items-center">
      <div ref={qrRef} className="bg-white p-4 rounded-lg border border-gray-200">
        <QRCodeSVG
          value={qrUrl}
          size={200}
          level="H"
          includeMargin
          bgColor="#ffffff"
          fgColor="#000000"
        />
      </div>

      <p className="text-sm text-gray-500 mt-3 text-center break-all max-w-[250px]">
        {qrUrl}
      </p>

      <div className="flex gap-3 mt-4">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium min-h-[44px]"
        >
          Print QR Code
        </button>
        <button
          onClick={handleDownload}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm font-medium min-h-[44px]"
        >
          Download PNG
        </button>
      </div>
    </div>
  );
}
