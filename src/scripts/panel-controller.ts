export type PanelId = 'train' | 'gallery' | 'game';

const CLOSE_EVENT = 'yousa:panel-close';

export function openPanel(id: PanelId) {
  const current = document.body.dataset.openPanel as PanelId | undefined;
  if (current && current !== id) {
    window.dispatchEvent(new CustomEvent(CLOSE_EVENT, { detail: { id: current } }));
  }

  document.body.dataset.openPanel = id;
  document.body.classList.add('panel-open');
}

export function closePanel(id: PanelId) {
  if (document.body.dataset.openPanel !== id) return;
  delete document.body.dataset.openPanel;
  document.body.classList.remove('panel-open');
}

export function onPanelClose(id: PanelId, callback: () => void) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ id?: PanelId }>;
    if (customEvent.detail?.id === id) callback();
  };

  window.addEventListener(CLOSE_EVENT, handler);
  return () => window.removeEventListener(CLOSE_EVENT, handler);
}
