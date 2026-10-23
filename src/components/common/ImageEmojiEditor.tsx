import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from 'react';
import { useT } from '@/i18n';

interface Sticker {
  id: number;
  emoji: string;
  x: number;
  y: number;
  scale: number;
}

interface ImageEmojiEditorProps {
  onFileSelect: (file: File) => void;
  preview?: string | null;
  error?: string;
  disabled?: boolean;
}

const EMOJIS = ['😀', '😍', '😂', '😎', '❤️', '🔥', '⭐', '✨', '🌸', '👗', '👕', '👟', '👜', '🎀', '👑', '☀️', '🌈', '💎', '🦋', '💖'];

function fileFromCanvas(canvas: HTMLCanvasElement, name: string): Promise<File | null> {
  return new Promise(resolve => {
    canvas.toBlob(blob => {
      resolve(blob ? new File([blob], name, { type: 'image/jpeg' }) : null);
    }, 'image/jpeg', 0.92);
  });
}

export function ImageEmojiEditor({ onFileSelect, preview, error, disabled }: ImageEmojiEditorProps) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const onFileSelectRef = useRef(onFileSelect);
  const stickerRefs = useRef(new Map<number, HTMLDivElement>());
  const stickersRef = useRef<Sticker[]>([]);
  const [source, setSource] = useState<string | null>(preview || null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number; id: number } | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    onFileSelectRef.current = onFileSelect;
  }, [onFileSelect]);

  useEffect(() => {
    stickersRef.current = stickers;
  }, [stickers]);

  useEffect(() => {
    if (preview && preview !== source) setSource(preview);
    if (!preview) {
      setSource(null);
      setStickers([]);
      setSelectedId(null);
    }
  }, [preview]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        setSource(result);
        setStickers([]);
        setSelectedId(null);
      }
    };
    reader.readAsDataURL(file);
    onFileSelect(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
    event.target.value = '';
  };

  const addEmoji = (emoji: string) => {
    if (!source || disabled) return;
    const id = nextId.current++;
    setStickers(items => [...items, { id, emoji, x: 0.5, y: 0.5, scale: 1 }]);
    setSelectedId(id);
  };

  const updateSticker = (id: number, update: Partial<Sticker>) => {
    setStickers(items => items.map(item => item.id === id ? { ...item, ...update } : item));
  };

  const updateStickerDuringGesture = (id: number, update: Partial<Sticker>) => {
    const next = stickersRef.current.map(item => item.id === id ? { ...item, ...update } : item);
    stickersRef.current = next;
    const sticker = next.find(item => item.id === id);
    const element = stickerRefs.current.get(id);
    if (!sticker || !element) return;
    element.style.left = `${sticker.x * 100}%`;
    element.style.top = `${sticker.y * 100}%`;
    element.style.transform = `translate(-50%, -50%) scale(${sticker.scale})`;
  };

  const removeSelected = () => {
    if (selectedId === null) return;
    setStickers(items => items.filter(item => item.id !== selectedId));
    setSelectedId(null);
  };

  const zoomSelected = (amount: number) => {
    if (selectedId === null) return;
    const sticker = stickers.find(item => item.id === selectedId);
    if (sticker) updateSticker(selectedId, { scale: Math.min(4, Math.max(0.5, sticker.scale + amount)) });
  };

  const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>, id: number) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(id);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) {
      const points = Array.from(pointers.current.values());
      const sticker = stickersRef.current.find(item => item.id === id);
      if (sticker) pinch.current = { distance: distance(points[0], points[1]), scale: sticker.scale, id };
    } else {
      setIsDragging(true);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const point = pointers.current.get(event.pointerId);
    if (!point || !editorRef.current || selectedId === null) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const points = Array.from(pointers.current.values());
    if (points.length >= 2 && pinch.current) {
      const nextDistance = distance(points[0], points[1]);
      updateStickerDuringGesture(pinch.current.id, { scale: Math.min(4, Math.max(0.5, pinch.current.scale * (nextDistance / pinch.current.distance))) });
      return;
    }
    if (!isDragging) return;
    const rect = editorRef.current.getBoundingClientRect();
    const sticker = stickersRef.current.find(item => item.id === selectedId);
    if (!sticker) return;
    updateStickerDuringGesture(selectedId, {
      x: Math.min(1, Math.max(0, sticker.x + (event.clientX - point.x) / rect.width)),
      y: Math.min(1, Math.max(0, sticker.y + (event.clientY - point.y) / rect.height)),
    });
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      setIsDragging(false);
      setStickers(stickersRef.current);
    }
  };

  useEffect(() => {
    if (!source || stickers.length === 0) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const baseFontSize = Math.max(36, canvas.width * 0.14);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      stickers.forEach(sticker => {
        context.font = `${baseFontSize * sticker.scale}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
        context.fillText(sticker.emoji, sticker.x * canvas.width, sticker.y * canvas.height);
      });
      const file = await fileFromCanvas(canvas, `remy-emoji-${Date.now()}.jpg`);
      if (file) onFileSelectRef.current(file);
    };
    image.src = source;
  }, [source, stickers]);

  return (
    <div className="w-full space-y-3">
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={disabled} />
      {!source ? (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="flex w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 px-4 py-16 transition hover:border-primary-400 disabled:cursor-not-allowed disabled:opacity-50">
          <span className="mb-4 text-5xl">🖼️</span>
          <span className="text-base font-medium text-neutral-700">{t('imageUpload.selectImage')}</span>
          <span className="mt-2 text-sm text-neutral-500">{t('imageUpload.dropImage')}</span>
        </button>
      ) : (
        <>
          <div
            ref={editorRef}
            className="relative touch-none overflow-hidden rounded-lg bg-neutral-100 ring-1 ring-neutral-200"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <img src={source} alt="Image preview" crossOrigin="anonymous" className="block max-h-[28rem] w-full object-contain" />
            {stickers.map(sticker => (
              <div
                key={sticker.id}
                onPointerDown={event => handlePointerDown(event, sticker.id)}
                onClick={() => setSelectedId(sticker.id)}
                ref={element => {
                  if (element) stickerRefs.current.set(sticker.id, element);
                  else stickerRefs.current.delete(sticker.id);
                }}
                className={`absolute select-none text-[3.5rem] leading-none ${selectedId === sticker.id ? 'rounded-lg ring-2 ring-primary-400 ring-offset-2' : ''}`}
                style={{ left: `${sticker.x * 100}%`, top: `${sticker.y * 100}%`, transform: `translate(-50%, -50%) scale(${sticker.scale})`, transformOrigin: 'center', cursor: isDragging && selectedId === sticker.id ? 'grabbing' : 'grab' }}
              >
                {sticker.emoji}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Change image</button>
            {selectedId !== null && (
              <>
                <button type="button" onClick={() => zoomSelected(-0.25)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-bold" aria-label="Make emoji smaller">−</button>
                <button type="button" onClick={() => zoomSelected(0.25)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-bold" aria-label="Make emoji larger">+</button>
                <button type="button" onClick={removeSelected} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">Remove emoji</button>
              </>
            )}
          </div>
          <div className="rounded-lg bg-primary-50 p-2">
            <p className="mb-2 text-xs font-semibold text-primary-700">Add an emoji</p>
            <div className="grid grid-cols-10 gap-1 sm:grid-cols-20">
              {EMOJIS.map(emoji => (
                <button key={emoji} type="button" onClick={() => addEmoji(emoji)} disabled={disabled} className="flex h-8 items-center justify-center rounded-md text-lg transition hover:bg-white active:scale-90">{emoji}</button>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-primary-600">Drag an emoji to place it. Use +/− on PC or pinch with two fingers on your phone to resize.</p>
          </div>
        </>
      )}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  );
}
