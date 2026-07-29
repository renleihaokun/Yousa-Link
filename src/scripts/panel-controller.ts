export type PanelId = 'train' | 'gallery' | 'game';

const CLOSE_EVENT = 'yousa:panel-close';
type PanelListener = (current: PanelId | null, previous: PanelId | null) => void;
const listeners = new Set<PanelListener>();

export function getOpenPanel(): PanelId | null {
  return (document.body.dataset.openPanel as PanelId | undefined) ?? null;
}

function notifyPanelChange(current: PanelId | null, previous: PanelId | null) {
  listeners.forEach((listener) => listener(current, previous));
}

export function openPanel(id: PanelId) {
  const current = getOpenPanel();
  if (current && current !== id) {
    window.dispatchEvent(new CustomEvent(CLOSE_EVENT, { detail: { id: current } }));
  }

  document.body.dataset.openPanel = id;
  document.body.classList.add('panel-open');
  if (current !== id) notifyPanelChange(id, current);
}

export function closePanel(id: PanelId) {
  if (getOpenPanel() !== id) return;
  delete document.body.dataset.openPanel;
  document.body.classList.remove('panel-open');
  notifyPanelChange(null, id);
}

export function onPanelClose(id: PanelId, callback: () => void) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ id?: PanelId }>;
    if (customEvent.detail?.id === id) callback();
  };

  window.addEventListener(CLOSE_EVENT, handler);
  return () => window.removeEventListener(CLOSE_EVENT, handler);
}

export function subscribePanel(listener: PanelListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
