import type { LegalContent } from './types';

const controllerEmail = ['tnordsiek', ' [at] ', 'web', ' [dot] ', 'de'].join('');

export const privacyPolicyContent: LegalContent = {
  sections: [
    {
      heading: '1. General Information',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'This Privacy Policy informs you about the processing of personal data when you play this browser game.',
            'The game is free of charge, contains no advertising, no in-app purchases, and does not track your user behavior.',
          ],
        },
      ],
    },
    {
      heading: '2. Controller',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'The entity responsible for data processing on this website is:',
            'Torsten Nordsiek',
            'Taigaweg 4',
            '33739 Bielefeld',
            'Germany',
            `E-mail: ${controllerEmail}`,
          ],
        },
      ],
    },
    {
      heading: '3. Data Collection and Hosting via GitHub Pages',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Our website is hosted by GitHub Inc. using GitHub Pages.',
            'When you visit our website, GitHub automatically collects server log files.',
            'This data is technically necessary to display the website and ensure security and stability.',
            'According to GitHub, this data may include:',
          ],
        },
        {
          type: 'list',
          items: [
            'IP address of the accessing device',
            'Date and time of the server request',
            'Browser type and version',
            'Operating system used',
            'Referrer URL (the page visited before)',
          ],
        },
        {
          type: 'paragraph',
          lines: [
            'The legal basis for this temporary data processing is Art. 6 (1) lit. f GDPR (Legitimate Interests).',
            'We do not store, combine, or analyze this data ourselves.',
            'For more details, please review the GitHub Privacy Statement on github.com.',
          ],
        },
      ],
    },
    {
      heading: '4. Local Storage',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'This game does not use marketing, tracking, or analytical cookies.',
            `To save your game progress and highscores, the game uses the browser's "Local Storage".`,
            'This data is stored exclusively on your local device.',
            'No data is transmitted to us or any third parties.',
            "You can delete this data at any time by clearing your browser's cache or website data.",
          ],
        },
      ],
    },
    {
      heading: '5. Your Rights',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Under the GDPR, you have the right to request access to, rectification of, or erasure of any personal data processed.',
            'Since we do not store any personal data ourselves, please contact GitHub directly regarding server logs, or clear your browser cache to delete local game saves.',
            'You also have the right to lodge a complaint with a data protection supervisory authority.',
          ],
        },
      ],
    },
  ],
};
