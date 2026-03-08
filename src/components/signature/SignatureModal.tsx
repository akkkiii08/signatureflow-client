import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Pen, Type, Upload, Eraser } from 'lucide-react';

interface Props {
  onApply: (data: { type: 'typed' | 'drawn' | 'uploaded'; category: 'signature' | 'initials' | 'stamp'; data: string; fontStyle?: string; color?: string; }) => void;
  onClose: () => void;
  defaultCategory?: 'signature' | 'initials' | 'stamp';
  signerName?: string;
}

const FONTS = [
  { id: 'dancing', name: 'Dancing Script', style: 'italic', family: "'Dancing Script', cursive" },
  { id: 'pacifico', name: 'Pacifico', style: 'normal', family: "'Pacifico', cursive" },
  { id: 'satisfy', name: 'Satisfy', style: 'normal', family: "'Satisfy', cursive" },
  { id: 'allison', name: 'Allison', style: 'italic', family: "'Allison', cursive" },
];

const COLORS = ['#000000', '#1a1a2e', '#c0392b', '#2980b9', '#27ae60', '#8e44ad'];

type TabType = 'signature' | 'initials' | 'stamp';
type InputMode = 'type' | 'draw' | 'upload';

export default function SignatureModal({ onApply, onClose, defaultCategory = 'signature', signerName = '' }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>(defaultCategory);
  const [inputMode, setInputMode] = useState<InputMode>('type');
  const [typedText, setTypedText] = useState(defaultCategory === 'initials' ? signerName.split(' ').map(w => w[0]).join('') : signerName);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (inputMode === 'draw') {
      const timer = setTimeout(() => clearCanvas(), 100);
      return () => clearTimeout(timer);
    }
  }, [inputMode]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current; if (!canvas) return;
    setIsDrawing(true);
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    lastPos.current = pos;
    setHasDrawn(true);
  };

  const stopDraw = () => setIsDrawing(false);

  const getTypedSignatureData = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 120;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color;
    ctx.font = `${activeTab === 'initials' ? '56px' : '42px'} ${selectedFont.family}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
    return canvas.toDataURL('image/png');
  };

  const handleApply = () => {
    if (activeTab === 'stamp') {
      if (!uploadPreview) return;
      onApply({ type: 'uploaded', category: 'stamp', data: uploadPreview });
      return;
    }
    if (inputMode === 'type') {
      if (!typedText.trim()) return;
      onApply({ type: 'typed', category: activeTab, data: typedText, fontStyle: selectedFont.id, color });
    } else if (inputMode === 'draw') {
      if (!hasDrawn) return;
      const data = canvasRef.current!.toDataURL('image/png');
      onApply({ type: 'drawn', category: activeTab, data, color });
    } else {
      if (!uploadPreview) return;
      onApply({ type: 'uploaded', category: activeTab, data: uploadPreview });
    }
    onClose();
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'signature', label: 'Signature', icon: '✍️' },
    { key: 'initials', label: 'Initials', icon: 'AC' },
    { key: 'stamp', label: 'Company Stamp', icon: '🏢' },
  ];

  const modes: { key: InputMode; icon: any; label: string }[] = [
    { key: 'type', icon: Type, label: 'Type' },
    { key: 'draw', icon: Pen, label: 'Draw' },
    { key: 'upload', icon: Upload, label: 'Upload' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}>
      <div className="w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-scale-in" style={{ background: '#ffffff', color: '#1a1a2e' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Set your signature details</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Name fields */}
        <div className="px-8 py-4 grid grid-cols-3 gap-4 border-b border-gray-100">
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name:</label>
            <input type="text" value={typedText} onChange={e => setTypedText(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 text-sm" placeholder="Your name" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Initials:</label>
            <input type="text" value={typedText.split(' ').map((w: string) => w[0] || '').join('').toUpperCase()} readOnly
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 bg-gray-50 text-sm" placeholder="AC" />
          </div>
        </div>

        <div className="flex">
          {/* Left: Mode selector (not shown for stamp) */}
          {activeTab !== 'stamp' && (
            <div className="flex flex-col gap-2 p-4 border-r border-gray-100 bg-gray-50">
              {modes.map(mode => (
                <button key={mode.key} onClick={() => setInputMode(mode.key)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${inputMode === mode.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                  title={mode.label}>
                  <mode.icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          )}

          {/* Content area */}
          <div className="flex-1 p-6">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-5">
              {tabs.map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-all ${
                    activeTab === tab.key ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <span className="text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content based on tab and mode */}
            {activeTab === 'stamp' ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { const r = new FileReader(); r.onload = ev => setUploadPreview(ev.target?.result as string); r.readAsDataURL(f); } }}
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all"
                onClick={() => document.getElementById('stamp-upload')?.click()}>
                <input id="stamp-upload" type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleUpload} />
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Stamp preview" className="max-h-32 mx-auto object-contain" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <button className="text-red-600 font-semibold border border-red-400 rounded-lg px-4 py-1.5 text-sm hover:bg-red-50">Upload company stamp</button>
                    <p className="text-gray-400 mt-2 text-sm">or drop file here</p>
                    <p className="text-gray-400 text-xs mt-1">Accepted formats: <strong>PNG</strong>, <strong>JPG</strong> and <strong>SVG</strong></p>
                  </>
                )}
              </div>
            ) : inputMode === 'type' ? (
              <div>
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 max-h-52 overflow-y-auto">
                  {FONTS.map(font => (
                    <label key={font.id} className={`flex items-center gap-4 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${selectedFont.id === font.id ? 'bg-green-50' : ''}`}>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedFont.id === font.id ? 'border-green-600' : 'border-gray-300'}`}>
                        {selectedFont.id === font.id && <div className="w-3 h-3 rounded-full bg-green-600" />}
                      </div>
                      <input type="radio" name="font" className="hidden" checked={selectedFont.id === font.id} onChange={() => setSelectedFont(font)} />
                      <span style={{ fontFamily: font.family, fontSize: '22px', color }}>{typedText || (activeTab === 'initials' ? 'AC' : 'Signature')}</span>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Color:</span>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)}
                      style={{ background: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-gray-700 scale-110' : 'border-transparent'}`} />
                  ))}
                </div>
              </div>
            ) : inputMode === 'draw' ? (
              <div>
                <div className="relative border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                  <canvas ref={canvasRef} width={560} height={180}
                    className="w-full h-44 sig-canvas cursor-crosshair"
                    onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                    onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
                  {!hasDrawn && <p className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm pointer-events-none">Draw your signature here...</p>}
                  <button onClick={clearCanvas} className="absolute top-2 right-2 p-1.5 rounded-lg bg-white hover:bg-gray-100 text-gray-500 transition-colors">
                    <Eraser className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-sm font-medium text-gray-700">Color:</span>
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} style={{ background: c }}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'border-gray-700 scale-110' : 'border-transparent'}`} />
                  ))}
                </div>
              </div>
            ) : (
              <div
                onClick={() => document.getElementById('sig-upload')?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
                <input id="sig-upload" type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Signature preview" className="max-h-28 mx-auto object-contain" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Click to upload your signature image</p>
                    <p className="text-gray-400 text-xs mt-1">PNG, JPG up to 5MB</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end px-8 py-5 border-t border-gray-100">
          <button onClick={handleApply}
            disabled={
              activeTab === 'stamp' ? !uploadPreview :
              inputMode === 'type' ? !typedText.trim() :
              inputMode === 'draw' ? !hasDrawn :
              !uploadPreview
            }
            className="px-8 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold rounded-xl transition-colors text-sm disabled:cursor-not-allowed">
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
