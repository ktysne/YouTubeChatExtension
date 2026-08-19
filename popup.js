const SETTINGS_KEY = 'ycw_settings';
const DEFAULTS = { width: null, hideOnPopout: true };
let settings = { ...DEFAULTS };

const $hide = document.getElementById('hideOnPopout');
const $width = document.getElementById('width');
const $reset = document.getElementById('reset');

function save() {
  chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}
function render() {
  $hide.checked = !!settings.hideOnPopout;
  $width.value = settings.width ? settings.width : '';
}

chrome.storage.sync.get(SETTINGS_KEY, (res) => {
  if (res && res[SETTINGS_KEY]) settings = { ...DEFAULTS, ...res[SETTINGS_KEY] };
  render();
});

$hide.addEventListener('change', () => {
  settings.hideOnPopout = $hide.checked;
  save();
});
$width.addEventListener('change', () => {
  const v = parseInt($width.value, 10);
  settings.width = Number.isFinite(v) && v >= 250 ? v : null;
  render();
  save();
});
$reset.addEventListener('click', () => {
  settings.width = null;
  render();
  save();
});
