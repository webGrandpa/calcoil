import { LANGS } from '../i18n';
import type { Lang, T } from '../i18n';
import type { ThemePref } from '../theme';
import { Segmented } from './Segmented';
import { ChoiceList, Sheet } from './Sheet';

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
  return (
    <Sheet open={open} title={t('settings')} closeLabel={t('close')} onClose={onClose}>
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
      <ChoiceList<Lang>
        name="lang"
        legend={t('language')}
        value={lang}
        onChange={onLang}
        options={LANGS.map((l) => ({ value: l.id, label: l.label }))}
      />
    </Sheet>
  );
}
