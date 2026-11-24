import { useApp } from '../app/context';
import { applyUpdate, dismissUpdate, useUpdateState } from '../app/pwa';
import { CloseIcon } from './Icons';

/** Shown when a new version has downloaded and is waiting for the user's tap. */
export function UpdateBanner() {
  const { at, t } = useApp();
  if (useUpdateState() !== 'show') return null;
  return (
    <div className="update" role="status">
      <span className="update-dot" aria-hidden="true" />
      <p className="update-text">{at('updReady')}</p>
      <button type="button" className="update-go" onClick={applyUpdate}>
        {at('updApply')}
      </button>
      <button type="button" className="icon-btn update-x" aria-label={t('close')} onClick={dismissUpdate}>
        <CloseIcon />
      </button>
    </div>
  );
}
