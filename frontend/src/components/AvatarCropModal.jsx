import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Check, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Canvas crop helper ───────────────────────────────────────────────
const getCroppedBlob = (imageSrc, pixelCrop) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(pixelCrop.width, pixelCrop.height);
      canvas.width  = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Circular clip
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        size,
        size,
      );

      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas is empty'));
      }, 'image/jpeg', 0.92);
    });
    image.addEventListener('error', reject);
    image.src = imageSrc;
  });

// ─── AvatarCropModal ─────────────────────────────────────────────────
const AvatarCropModal = ({ imageSrc, onConfirm, onCancel }) => {
  const [crop,       setCrop]       = useState({ x: 0, y: 0 });
  const [zoom,       setZoom]       = useState(1);
  const [rotation,   setRotation]   = useState(0);
  const [croppedArea, setCroppedArea] = useState(null);
  const [saving,     setSaving]     = useState(false);

  const onCropComplete = useCallback((_, croppedAreaPixels) => {
    setCroppedArea(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      await onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1,    opacity: 1 }}
          exit={{ scale: 0.92,    opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 260 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-bold text-gray-900">Adjust Profile Picture</h3>
              <p className="text-xs text-gray-400 mt-0.5">Drag to reframe · Pinch or scroll to zoom</p>
            </div>
            <button
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Crop area */}
          <div className="relative bg-gray-900" style={{ height: 320 }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{
                containerStyle: { borderRadius: 0 },
                cropAreaStyle: {
                  border: '3px solid white',
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                },
              }}
            />
          </div>

          {/* Controls */}
          <div className="px-6 py-4 space-y-3">
            {/* Zoom slider */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(1)))}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <ZoomOut size={14} className="text-gray-600" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-teal-500 h-1.5 cursor-pointer"
              />
              <button
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(1)))}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <ZoomIn size={14} className="text-gray-600" />
              </button>
            </div>

            {/* Rotation */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRotation((r) => r - 90)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
                style={{ transform: 'scaleX(-1)' }}
                title="Rotate left"
              >
                <RotateCw size={14} className="text-gray-600" />
              </button>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value))}
                className="flex-1 accent-teal-500 h-1.5 cursor-pointer"
              />
              <button
                onClick={() => setRotation((r) => r + 90)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
                title="Rotate right"
              >
                <RotateCw size={14} className="text-gray-600" />
              </button>
            </div>

            {/* Reset hint */}
            {(zoom !== 1 || rotation !== 0) && (
              <button
                onClick={() => { setZoom(1); setRotation(0); setCrop({ x: 0, y: 0 }); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 px-6 pb-6">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={saving}
              className="flex-1 py-2.5 bg-teal-600 rounded-xl text-sm font-semibold text-white hover:bg-teal-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check size={16} />
              )}
              {saving ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AvatarCropModal;
