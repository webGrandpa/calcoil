import { useEffect, useRef } from 'react';
import { LANGS } from '../i18n';
import type { Lang, T } from '../i18n';
import type { ThemePref } from '../theme';
import { CloseIcon } from './Icons';
import { Segmented } from './Segmented';

interface Props {
  open: boolean;
  onClose: () => void;
  t: T;
  lang: Lang;
  theme: ThemePref;
  onLang: (l: Lang) => void;
  onTheme: (t: ThemePref) => void;
}

export function SettingsDialog({ open, onClose, t, lang, theme, onLang, onTheme }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="settings-title"
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id="settings-title">{t('settings')}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('close')}>
            <CloseIcon />
          </button>
        </div>

        <Segmented<ThemePref>
          label={t('theme')}
          value={theme}
          onChange={onTheme}
          options={[
            { value: 'system', label: t('themeSystem') },
            { value: 'light', label: t('themeLight') },
            { value: 'dark', label: t('themeDark') },
          ]}
        />

        <fieldset className="lang-list">
          <legend className="field-label">{t('language')}</legend>
          {LANGS.map((l) => (
            <label key={l.id} className="lang-row" lang={l.id}>
              <input type="radio" name="lang" value={l.id} checked={lang === l.id} onChange={() => onLang(l.id)} />
              <span>{l.label}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </dialog>
  );
}
