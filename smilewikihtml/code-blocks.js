import ClipboardJS from 'clipboard';

const resetTimers = new WeakMap();
const clipboard = new ClipboardJS('[data-copy-code]', {
  text: (button) => button.closest('[data-code-block]').querySelector('pre code').textContent,
});

function showCopyStatus(button, message, copied = false) {
  clearTimeout(resetTimers.get(button));
  const status = button.closest('[data-code-block]').querySelector('[data-copy-status]');
  button.textContent = copied ? 'Скопировано!' : 'Копировать';
  status.textContent = message;
  resetTimers.set(button, setTimeout(() => {
    button.textContent = 'Копировать';
    status.textContent = '';
    resetTimers.delete(button);
  }, 4000));
}

clipboard.on('success', (event) => {
  event.clearSelection();
  showCopyStatus(event.trigger, 'Код скопирован в буфер обмена.', true);
});
clipboard.on('error', (event) => {
  const code = event.trigger.closest('[data-code-block]').querySelector('pre code');
  const range = document.createRange();
  range.selectNodeContents(code);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  showCopyStatus(event.trigger, 'Не удалось скопировать автоматически. Код выделен — нажмите Ctrl+C или ⌘C.');
});
