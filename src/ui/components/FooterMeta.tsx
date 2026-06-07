import { useCallback, useEffect, useState } from 'react';

import { useSetupStore } from '../../state/setupStore';
import { useTranslation } from '../../i18n/useTranslation';
import type { Locale } from '../../i18n/types';
import type { LegalContent } from '../../legal/types';

type FooterMetaProps = {
  align?: 'left' | 'right';
  layout?: 'absolute' | 'flow';
  /** Flow layout only: span full width with legal links left and version right. */
  spread?: boolean;
  versionLabel?: string;
};

type LegalSectionId = 'imprint' | 'privacy';

const legalContentLoaders: Record<
  LegalSectionId,
  Record<Locale, () => Promise<LegalContent>>
> = {
  imprint: {
    en: async () =>
      (await import('../../legal/imprintContent')).imprintContent,
    de: async () =>
      (await import('../../legal/imprintContent.de')).imprintContentDe,
  },
  privacy: {
    en: async () =>
      (await import('../../legal/privacyPolicyContent')).privacyPolicyContent,
    de: async () =>
      (await import('../../legal/privacyPolicyContent.de'))
        .privacyPolicyContentDe,
  },
};

export function FooterMeta({
  align = 'right',
  layout = 'absolute',
  spread = false,
  versionLabel = 'v1.6',
}: FooterMetaProps) {
  const t = useTranslation();
  const locale = useSetupStore((state) => state.locale);
  const [activeSection, setActiveSection] = useState<LegalSectionId | null>(
    null,
  );
  const [loadedContent, setLoadedContent] = useState<
    Partial<Record<string, LegalContent>>
  >({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [loadErrorKey, setLoadErrorKey] = useState<string | null>(null);
  const isLeftAligned = align === 'left';
  const openFeedbackModal = useSetupStore((state) => state.openFeedbackModal);

  const legalSectionLabels: Record<LegalSectionId, string> = {
    imprint: t.footerMeta.imprint,
    privacy: t.footerMeta.privacyPolicy,
  };

  const cacheKey = (section: LegalSectionId, sectionLocale: Locale) =>
    `${section}:${sectionLocale}`;

  const loadSection = useCallback(
    async (section: LegalSectionId, sectionLocale: Locale) => {
      const key = cacheKey(section, sectionLocale);

      setLoadErrorKey((current) => (current === key ? null : current));
      setLoadingKey(key);

      try {
        const content = await legalContentLoaders[section][sectionLocale]();
        setLoadedContent((current) => ({ ...current, [key]: content }));
      } catch {
        setLoadErrorKey(key);
      } finally {
        setLoadingKey((current) => (current === key ? null : current));
      }
    },
    [],
  );

  // Fetch the active section's content for the current locale on open and on
  // language switch (so a toggle while the panel is open swaps the language).
  useEffect(() => {
    if (!activeSection) {
      return;
    }

    const key = cacheKey(activeSection, locale);
    if (loadedContent[key] || loadingKey === key) {
      return;
    }

    void loadSection(activeSection, locale);
  }, [activeSection, locale, loadedContent, loadingKey, loadSection]);

  const handleToggleSection = (section: LegalSectionId) => {
    setActiveSection((current) => (current === section ? null : section));
  };

  const closePanel = () => {
    setActiveSection(null);
  };

  const activeKey = activeSection ? cacheKey(activeSection, locale) : null;
  const activeContent = activeKey ? loadedContent[activeKey] : undefined;
  const showLoading = activeKey !== null && loadingKey === activeKey;
  const showLoadError = activeKey !== null && loadErrorKey === activeKey;
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
          aria-label={t.footerMeta.closeSection(legalSectionLabels[activeSection])}
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
            {showLoading ? <p>{t.footerMeta.loading}</p> : null}
            {showLoadError ? (
              <p>{t.footerMeta.loadError}</p>
            ) : null}
            {activeContent ? (
              <LegalContentPanel content={activeContent} />
            ) : null}
          </div>
        ) : null}
        <div className="relative z-10 flex items-center gap-3">
          {(Object.keys(legalSectionLabels) as LegalSectionId[]).map(
            (section) => (
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
            ),
          )}
          <button
            className="text-parchment-200 transition-colors hover:text-torch-200"
            onClick={openFeedbackModal}
            type="button"
          >
            {t.footerMeta.bugReport}
          </button>
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
