import { contactEmailDisplay } from './contact';
import type { LegalContent } from './types';

const contactPhone = ['+', '49', ' (0)521 ', '1648447'].join('');
const contactEmail = contactEmailDisplay;
const sectionSign = '\u00A7';

export const imprintContent: LegalContent = {
  sections: [
    {
      heading: `Information pursuant to ${sectionSign} 5 DDG (German Digital Services Act)`,
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Torsten Nordsiek',
            'Taigaweg 4',
            '33739 Bielefeld',
            'Germany',
          ],
        },
      ],
    },
    {
      heading: 'Contact',
      blocks: [
        {
          type: 'paragraph',
          lines: [`Phone: ${contactPhone}`, `E-mail: ${contactEmail}`],
        },
      ],
    },
    {
      heading: 'Hosting',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'This browser game is hosted as a static website using GitHub Pages.',
            'The provider is GitHub Inc., 88 Colin P. Kelly Jr. St, San Francisco, CA 94107, USA.',
          ],
        },
      ],
    },
  ],
};
