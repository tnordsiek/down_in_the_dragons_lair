import { contactEmailDisplay } from './contact';
import type { LegalContent } from './types';

const contactPhone = ['+', '49', ' (0)521 ', '1648447'].join('');
const contactEmail = contactEmailDisplay;
const sectionSign = '§';

export const imprintContentDe: LegalContent = {
  sections: [
    {
      heading: `Angaben gemäß ${sectionSign} 5 DDG (Digitale-Dienste-Gesetz)`,
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Torsten Nordsiek',
            'Taigaweg 4',
            '33739 Bielefeld',
            'Deutschland',
          ],
        },
      ],
    },
    {
      heading: 'Kontakt',
      blocks: [
        {
          type: 'paragraph',
          lines: [`Telefon: ${contactPhone}`, `E-Mail: ${contactEmail}`],
        },
      ],
    },
    {
      heading: 'Hosting',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Dieses Browserspiel wird als statische Website über GitHub Pages gehostet.',
            'Anbieter ist die GitHub Inc., 88 Colin P. Kelly Jr. St, San Francisco, CA 94107, USA.',
          ],
        },
      ],
    },
  ],
};
