import { useState } from 'react';

type FooterMetaProps = {
  align?: 'left' | 'right';
};

export function FooterMeta({ align = 'right' }: FooterMetaProps) {
  const [isImprintOpen, setIsImprintOpen] = useState(false);
  const isLeftAligned = align === 'left';

  return (
    <div
      className={`absolute bottom-4 z-30 flex items-end gap-3 text-xs text-stone-500 ${
        isLeftAligned ? 'left-6 sm:left-8' : 'right-4'
      }`}
    >
      {isImprintOpen ? (
        <button
          aria-label="Close imprint"
          className="fixed inset-0 cursor-default bg-transparent"
          onClick={() => setIsImprintOpen(false)}
          type="button"
        />
      ) : null}
      <div className="relative">
        {isImprintOpen ? (
          <div
            className={`absolute bottom-8 w-[16rem] border border-stone-700 bg-stone-950/95 p-3 text-left leading-5 text-stone-200 shadow-xl ${
              isLeftAligned ? 'left-0' : 'right-0'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <p>Torsten Nordsiek</p>
            <p>Taigaweg 4</p>
            <p>33739 Bielefeld</p>
            <p>Kontakt +49 (0)521 1648447</p>
            <p>E-Mail: tnordsiek@web.de</p>
          </div>
        ) : null}
        <button
          className="relative z-10 text-stone-400 transition-colors hover:text-stone-200"
          onClick={() => setIsImprintOpen((current) => !current)}
          type="button"
        >
          Imprint
        </button>
      </div>
      <span>v1.0</span>
    </div>
  );
}
