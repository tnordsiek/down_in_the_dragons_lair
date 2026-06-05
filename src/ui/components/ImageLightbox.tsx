import { useEffect } from 'react';

export type LightboxImage = {
  src: string;
  alt: string;
  title?: string;
  caption?: string;
};

export function ImageLightbox({
  image,
  onClose,
}: {
  image: LightboxImage | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!image) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose]);

  if (!image) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={[image.title, image.alt, image.caption]
        .filter(Boolean)
        .join('. ')}
      data-testid="image-lightbox"
    >
      <button
        aria-label="Close enlarged image"
        className="absolute inset-0 cursor-default bg-transparent"
        onClick={onClose}
        type="button"
      />
      <section className="relative z-10 flex max-h-[90vh] max-w-2xl flex-col items-center gap-4 rounded-forged border border-torch-300 bg-obsidian-900 p-5 shadow-[0_0_40px_rgba(224,165,52,0.2),inset_0_1px_0_rgba(247,240,223,0.1)]">
        <img
          className="max-h-[40vh] max-w-full object-contain"
          src={image.src}
          alt={image.alt}
        />
        {image.title ? (
          <h3
            className="font-display text-xl text-amber-100"
            data-testid="image-lightbox-title"
          >
            {image.title}
          </h3>
        ) : null}
        {image.caption ? (
          <p
            className="max-w-prose text-center text-sm leading-relaxed text-parchment-200"
            data-testid="image-lightbox-caption"
          >
            {image.caption}
          </p>
        ) : null}
      </section>
    </div>
  );
}
