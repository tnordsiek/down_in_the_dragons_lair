import { useState } from 'react';

import type { LegalContent } from '../../legal/types';

type FooterMetaProps = {
  align?: 'left' | 'right';
  layout?: 'absolute' | 'flow';
  /** Flow layout only: span full width with legal links left and version right. */
  spread?: boolean;
  versionLabel?: string;
};

type LegalSectionId = 'imprint' | 'privacy';

const legalSectionLabels: Record<LegalSectionId, string> = {
  imprint: 'Imprint',
  privacy: 'Privacy Policy',
};

const legalContentLoaders: Record<LegalSectionId, () => Promise<LegalContent>> = {
  imprint: async () =>
    (await import('../../legal/imprintContent')).imprintContent,
  privacy: async () =>
    (await import('../../legal/privacyPolicyContent')).privacyPolicyContent,
};

export function FooterMeta({
  align = 'right',
  layout = 'absolute',
  spread = false,
  versionLabel = 'v1.5',
}: FooterMetaProps) {
  const [activeSection, setActiveSection] = useState<LegalSectionId | null>(null);
  const [loadedContent, setLoadedContent] = useState<
    Partial<Record<LegalSectionId, LegalContent>>
  >({});
  const [loadingSection, setLoadingSection] = useState<LegalSectionId | null>(null);
  const [loadErrorSection, setLoadErrorSection] =
    useState<LegalSectionId | null>(null);
  const isLeftAligned = align === 'left';

  const handleToggleSection = async (section: LegalSectionId) => {
    if (activeSection === section) {
      setActiveSection(null);
      setLoadingSection(null);
      setLoadErrorSection(null);
      return;
    }

    setActiveSection(section);
    setLoadErrorSection(null);

    if (loadedContent[section] || loadingSection === section) {
      return;
    }

    setLoadingSection(section);

    try {
      const content = await legalContentLoaders[section]();
      setLoadedContent((current) => ({ ...current, [section]: content }));
    } catch {
      setLoadErrorSection(section);
    } finally {
      setLoadingSection((current) => (current === section ? null : current));
    }
  };

  const closePanel = () => {
    setActiveSection(null);
    setLoadingSection(null);
    setLoadErrorSection(null);
  };

  const activeContent = activeSection ? loadedContent[activeSection] : undefined;
  const showLoading = activeSection !== null && loadingSection === activeSection;
  const showLoadError =
    activeSection !== null && loadErrorSection === activeSection;
  const isFlowLayout = layout === 'flow';
  const panelClassName = isLeftAligned
    ? 'fixed bottom-8 left-1/2 -translate-x-1/2 sm:absolute sm:bottom-8 sm:left-0 sm:translate-x-0'
    : 'fixed bottom-8 left-1/2 -translate-x-1/2 sm:absolute sm:bottom-8 sm:left-auto sm:right-0 sm:translate-x-0';
  const containerClassName = isFlowLayout
    ? `relative z-10 flex flex-wrap items-center gap-3 text-xs text-parchment-200 ${
        spread
          ? 'w-full justify-between'
          : isLeftAligned
            ? 'justify-start'
            : 'justify-end'
      }`
    : `absolute bottom-4 z-30 flex items-end gap-3 text-xs text-parchment-200 ${
        isLeftAligned ? 'left-6 sm:left-8' : 'right-4'
      }`;

  return (
    <div className={containerClassName}>
      {activeSection ? (
        <button
          aria-label={`Close ${legalSectionLabels[activeSection]}`}
          className="fixed inset-0 cursor-default bg-transparent"
          onClick={closePanel}
          type="button"
        />
      ) : null}
      <div className="relative">
        {activeSection ? (
          <div
            className={`${panelClassName} max-h-[min(75vh,36rem)] w-[min(92vw,36rem)] max-w-[36rem] overflow-y-auto rounded-forged border border-obsidian-700 bg-obsidian-900/95 p-3 text-left leading-5 text-parchment-100 shadow-forged`}
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-2 font-display text-sm font-semibold text-amber-100">
              {legalSectionLabels[activeSection]}
            </p>
            {showLoading ? <p>Loading legal notice...</p> : null}
            {showLoadError ? (
              <p>Unable to load this legal notice right now.</p>
            ) : null}
            {activeContent ? <LegalContentPanel content={activeContent} /> : null}
          </div>
        ) : null}
        <div className="relative z-10 flex items-center gap-3">
          {(
            Object.keys(legalSectionLabels) as LegalSectionId[]
          ).map((section) => (
            <button
              key={section}
              className="text-parchment-200 transition-colors hover:text-torch-200"
              onClick={() => {
                void handleToggleSection(section);
              }}
              type="button"
            >
              {legalSectionLabels[section]}
            </button>
          ))}
        </div>
      </div>
      <span>{versionLabel}</span>
    </div>
  );
}

function LegalContentPanel({ content }: { content: LegalContent }) {
  return (
    <div className="grid gap-3">
      {content.sections.map((section, sectionIndex) => (
        <section key={section.heading ?? `section-${sectionIndex}`}>
          {section.heading ? (
            <p className="text-xs font-semibold uppercase tracking-wide text-parchment-200">
              {section.heading}
            </p>
          ) : null}
          <div className={section.heading ? 'mt-1 grid gap-2' : 'grid gap-2'}>
            {section.blocks.map((block, blockIndex) => {
              if (block.type === 'list') {
                return (
                  <ul
                    key={`list-${sectionIndex}-${blockIndex}`}
                    className="list-disc space-y-1 pl-4"
                  >
                    {block.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                );
              }

              return (
                <div key={`paragraph-${sectionIndex}-${blockIndex}`}>
                  {block.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
