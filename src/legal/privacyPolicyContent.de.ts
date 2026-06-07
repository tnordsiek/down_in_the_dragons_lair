import { contactEmailDisplay } from './contact';
import type { LegalContent } from './types';

const controllerEmail = contactEmailDisplay;

export const privacyPolicyContentDe: LegalContent = {
  sections: [
    {
      heading: '1. Allgemeine Hinweise',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Diese Datenschutzerklärung informiert Sie über die Verarbeitung personenbezogener Daten, wenn Sie dieses Browserspiel spielen.',
            'Das Spiel ist kostenlos, enthält keine Werbung, keine In-App-Käufe und verfolgt Ihr Nutzerverhalten nicht.',
          ],
        },
      ],
    },
    {
      heading: '2. Verantwortlicher',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Verantwortlich für die Datenverarbeitung auf dieser Website ist:',
            'Torsten Nordsiek',
            'Taigaweg 4',
            '33739 Bielefeld',
            'Deutschland',
            `E-Mail: ${controllerEmail}`,
          ],
        },
      ],
    },
    {
      heading: '3. Datenerfassung und Hosting über GitHub Pages',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Unsere Website wird von der GitHub Inc. über GitHub Pages gehostet.',
            'Wenn Sie unsere Website besuchen, erfasst GitHub automatisch Server-Logfiles.',
            'Diese Daten sind technisch erforderlich, um die Website anzuzeigen sowie deren Sicherheit und Stabilität zu gewährleisten.',
            'Nach Angaben von GitHub können diese Daten Folgendes umfassen:',
          ],
        },
        {
          type: 'list',
          items: [
            'IP-Adresse des zugreifenden Geräts',
            'Datum und Uhrzeit der Serveranfrage',
            'Browsertyp und -version',
            'verwendetes Betriebssystem',
            'Referrer-URL (die zuvor besuchte Seite)',
          ],
        },
        {
          type: 'paragraph',
          lines: [
            'Rechtsgrundlage für diese vorübergehende Verarbeitung ist Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen).',
            'Wir selbst speichern, verknüpfen oder analysieren diese Daten nicht.',
            'Weitere Einzelheiten entnehmen Sie bitte der Datenschutzerklärung von GitHub auf github.com.',
          ],
        },
      ],
    },
    {
      heading: '4. Lokaler Speicher (Local Storage)',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Dieses Spiel verwendet keine Marketing-, Tracking- oder Analyse-Cookies.',
            'Um Ihren Spielfortschritt und Ihre Highscores zu speichern, nutzt das Spiel den „Local Storage“ des Browsers.',
            'Diese Daten werden ausschließlich lokal auf Ihrem Gerät gespeichert.',
            'Es werden keine Daten an uns oder Dritte übermittelt.',
            'Sie können diese Daten jederzeit löschen, indem Sie den Cache bzw. die Websitedaten Ihres Browsers leeren.',
          ],
        },
      ],
    },
    {
      heading: '5. Ihre Rechte',
      blocks: [
        {
          type: 'paragraph',
          lines: [
            'Nach der DSGVO haben Sie das Recht, Auskunft über die verarbeiteten personenbezogenen Daten zu verlangen sowie deren Berichtigung oder Löschung zu fordern.',
            'Da wir selbst keine personenbezogenen Daten speichern, wenden Sie sich bezüglich der Server-Logfiles bitte direkt an GitHub oder leeren Sie Ihren Browser-Cache, um lokale Spielstände zu löschen.',
            'Ihnen steht zudem das Recht zu, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.',
          ],
        },
      ],
    },
  ],
};
