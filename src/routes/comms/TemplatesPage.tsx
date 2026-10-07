import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Section } from '../../components/chrome.js';
import { buildMessageTemplate, buildTitle, CHANNELS } from '../../domain/comms.js';
import { useAppStore } from '../../state/AppStore.js';
import { CommsNav } from './CommsNav.js';

/**
 * Templates — how the composer pre-fills passenger messages from validated
 * incident facts. Templates stay editable; this page documents the pattern.
 */
export function TemplatesPage(): React.JSX.Element {
  const { state, setRole } = useAppStore();

  useEffect(() => {
    setRole('CUSTOMER_INFORMATION');
  }, [setRole]);

  const example =
    state.incidents.find((i) => i.id === 'INC-1043') ??
    state.incidents.find((i) => i.operationalStatus !== 'REPORTED') ??
    state.incidents[0];

  return (
    <div>
      <div className="pagehead">
        <span className="eyebrow">AT Customer Information</span>
        <h1>Templates</h1>
        <p className="lede">
          Suggested passenger messages are generated from validated disruption
          information and remain fully editable before publishing.
        </p>
      </div>

      <CommsNav />

      <Section title="Default passenger message template">
        {example === undefined ? (
          <p className="muted">No incidents in this demo state.</p>
        ) : (
          <div className="preview">
            <p className="muted small">
              BUS SERVICE ALERT · DEMO · {['AT Mobile App', 'Website'].join(' + ')}
            </p>
            <h3>{buildTitle(example)}</h3>
            <p>{buildMessageTemplate(example)}</p>
          </div>
        )}
        <p className="muted small">
          Preview only — the same message pattern is used for all selected channels.
          Titles and messages can be edited in the composer.
        </p>
      </Section>

      <Section title="Prototype publication channels">
        <ul className="checklist">
          {CHANNELS.map((c) => (
            <li key={c} className={c !== 'Social Media' ? 'ok' : undefined}>
              <span aria-hidden="true">{c !== 'Social Media' ? '☑' : '☐'}</span> {c}
              {c !== 'Social Media' ? ' — selected by default' : ' — optional'}
            </li>
          ))}
        </ul>
        <div className="note">
          Prototype channel selections only — no message leaves this demo workspace.
        </div>
        <p>
          <Link className="btn" to="/comms/queue">
            Open communication queue
          </Link>
        </p>
      </Section>
    </div>
  );
}
