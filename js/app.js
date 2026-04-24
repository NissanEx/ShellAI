// ── ELEMENTS ──
const terminal            = document.getElementById('terminal');
const cmdInput            = document.getElementById('cmdInput');
const suggestions         = document.getElementById('suggestions');
const outputPanel         = document.getElementById('outputPanel');
const codeDisplay         = document.getElementById('codeDisplay');
const codeLang            = document.getElementById('codeLang');
const previewFrame        = document.getElementById('previewFrame');
const imageBody           = document.getElementById('imageBody');
const generatingOverlay   = document.getElementById('generatingOverlay');
const imgPlaceholder      = document.getElementById('imgPlaceholder');

// ── STATE ──
let cmdHistory   = [];
let histIdx      = -1;
let isLoading    = false;
let currentCode  = '';
let currentLang  = 'python';
let currentSvg   = '';

// ── INPUT ──
cmdInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !isLoading) {
    const cmd = cmdInput.value.trim();
    if (!cmd) return;
    cmdHistory.unshift(cmd);
    histIdx = -1;
    cmdInput.value = '';
    suggestions.style.display = 'none';
    await handleCommand(cmd);
  }
  if (e.key === 'ArrowUp') {
    histIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
    cmdInput.value = cmdHistory[histIdx] || '';
    e.preventDefault();
  }
  if (e.key === 'ArrowDown') {
    histIdx = Math.max(histIdx - 1, -1);
    cmdInput.value = histIdx === -1 ? '' : cmdHistory[histIdx];
    e.preventDefault();
  }
});

function useSug(el) {
  cmdInput.value = el.textContent;
  cmdInput.focus();
}

document.body.addEventListener('click', (e) => {
  if (!e.target.closest('.output-panel') && !e.target.closest('.sug') && !e.target.closest('.code-btn')) {
    cmdInput.focus();
  }
});

// ── PANEL ──
function switchTab(tab) {
  ['code', 'preview', 'image'].forEach(t => {
    document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', t === tab);
    document.getElementById(t + 'View').classList.toggle('active', t === tab);
  });
}

function openPanel(tab) {
  if (!outputPanel.classList.contains('open')) {
    outputPanel.style.width = '';
    outputPanel.style.transition = '';
  }
  outputPanel.classList.add('open');
  switchTab(tab);
}

function closePanel() {
  outputPanel.classList.remove('open');
  outputPanel.style.width = '';
  outputPanel.style.transition = '';
}

// ── RESIZE ──
const resizeHandle = document.getElementById('resizeHandle');
const workspace    = document.getElementById('workspace');
let isResizing = false;

resizeHandle.addEventListener('mousedown', () => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const rect   = workspace.getBoundingClientRect();
  const fromRight = rect.width - (e.clientX - rect.left);
  const newW   = Math.min(Math.max(fromRight, 260), rect.width * 0.72);
  outputPanel.style.transition = 'none';
  outputPanel.style.width = newW + 'px';
  outputPanel.classList.add('open');
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// ── HELPERS ──
function escHtml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function scrollBottom() {
  terminal.scrollTop = terminal.scrollHeight;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function addPromptLine(cmd) {
  const entry = document.createElement('div');
  entry.className = 'entry';
  entry.innerHTML = `
    <div class="prompt-line">
      <span class="ps1-user">san</span><span class="ps1-at">@</span><span class="ps1-host">ai-shell</span><span class="ps1-colon">:</span><span class="ps1-path">~</span><span class="ps1-sign"> $ </span><span class="cmd-text">${escHtml(cmd)}</span>
    </div>`;
  terminal.appendChild(entry);
  return entry;
}

function addResBlock(entry, borderColor, tagColor, tagText) {
  borderColor = borderColor || 'var(--cyan)';
  tagColor    = tagColor    || 'var(--cyan)';
  tagText     = tagText     || 'AI OUTPUT';
  const res   = document.createElement('div');
  res.className = 'response';
  res.style.borderColor = borderColor;
  res.innerHTML = `<span class="ai-tag" style="color:${tagColor}">» ${tagText}</span><span class="blink"></span>`;
  entry.appendChild(res);
  scrollBottom();
  return res;
}

// ── SYNTAX HIGHLIGHT ──
function highlight(code, lang) {
  let c = escHtml(code);
  if (lang === 'html' || lang === 'xml') {
    c = c.replace(/(&lt;\/?[a-zA-Z][^&\n]*?&gt;)/g, '<span class="kw">$1</span>');
    c = c.replace(/(["'])([^"'\n]*)\1/g, '<span class="str">$1$2$1</span>');
  } else {
    const kws = /\b(def|class|import|from|return|if|else|elif|for|while|in|not|and|or|True|False|None|function|const|let|var|async|await|try|catch|new|this|export|default|throw|print|int|str|float|list|dict|bool|extends|func|signal|enum|export|onready|static|null|true|false|pass|break|continue|match|yield|preload|load|Vector2|Vector3|Node|Node2D|Spatial|KinematicBody|RigidBody|Area2D|gdscript)\b/g;
    c = c.replace(kws, '<span class="kw">$1</span>');
    c = c.replace(/(["'`])((?:[^\\]|\\.)*?)\1/g, '<span class="str">$1$2$1</span>');
    c = c.replace(/(#[^\n]*|\/\/[^\n]*)/g, '<span class="cmt">$1</span>');
    c = c.replace(/\b(\d+\.?\d*)\b/g, '<span class="num">$1</span>');
    c = c.replace(/\b([a-zA-Z_]\w*)\s*(?=\()/g, '<span class="fn">$1</span>');
  }
  return c;
}

// ── CODE ACTIONS ──
function copyCode() {
  if (!currentCode) return;
  navigator.clipboard.writeText(currentCode).then(() => showToast('✓ Copied to clipboard'));
}

function runPreview() {
  if (!currentCode) return;
  switchTab('preview');
  previewFrame.srcdoc = currentCode;
}

function reloadPreview() {
  const s = previewFrame.srcdoc;
  previewFrame.srcdoc = '';
  setTimeout(() => previewFrame.srcdoc = s, 50);
}

// ── IMAGE / SVG ──
function downloadSvg() {
  if (!currentSvg) return;
  const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'illustration.svg';
  a.click();
}

async function generateImage(prompt) {
  openPanel('image');
  document.getElementById('imagePromptLabel').textContent = prompt;
  document.getElementById('imgDownload').style.display = 'none';
  generatingOverlay.classList.add('show');
  imgPlaceholder.style.display = 'none';
  const oldImg = imageBody.querySelector('img');
  if (oldImg) oldImg.remove();

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: `You are a creative SVG illustration generator. The user will give a description.
Create a beautiful, detailed SVG illustration (600x420) with vibrant colors, gradients, and atmosphere.
Use creative shapes, layering, and artistic composition.
ONLY output the raw SVG code starting with <svg and ending with </svg>. No other text.`,
        messages: [{ role: 'user', content: `Generate SVG illustration: ${prompt}` }]
      })
    });

    const data    = await resp.json();
    const svgText = data?.content?.[0]?.text || '';
    const match   = svgText.match(/<svg[\s\S]*<\/svg>/i);

    generatingOverlay.classList.remove('show');

    if (match) {
      currentSvg = match[0];
      const blob = new Blob([currentSvg], { type: 'image/svg+xml' });
      const url  = URL.createObjectURL(blob);
      const img  = document.createElement('img');
      img.src    = url;
      img.alt    = prompt;
      imageBody.appendChild(img);
      document.getElementById('imgDownload').style.display = 'inline';
    } else {
      imgPlaceholder.style.display = 'flex';
      imgPlaceholder.querySelector('div:last-child').textContent = 'Gagal parse SVG dari respons AI.';
    }
  } catch (err) {
    generatingOverlay.classList.remove('show');
    imgPlaceholder.style.display = 'flex';
    imgPlaceholder.querySelector('div:last-child').textContent = 'Error: ' + err.message;
  }
}

// ── BUILT-IN COMMANDS ──
function builtIn(cmd) {
  const c = cmd.toLowerCase().trim();

  if (c === 'clear' || c === 'cls') {
    terminal.innerHTML = '';
    return true;
  }

  if (c === 'help') {
    const entry = addPromptLine(cmd);
    const res   = addResBlock(entry);
    res.innerHTML = `<span class="ai-tag">» HELP</span>Perintah tersedia:
  clear             — bersihkan terminal
  help              — tampilkan bantuan ini
  code: [desk]      — generate kode, tampil di panel kanan
  image: [desk]     — generate ilustrasi SVG, tampil di panel kanan
  [pertanyaan]      — tanya apa saja ke AI`;
    scrollBottom();
    return true;
  }

  return false;
}

// ── MAIN HANDLER ──
async function handleCommand(cmd) {
  if (builtIn(cmd)) return;

  const lc      = cmd.toLowerCase();
  const isCode  = lc.startsWith('code:');
  const isImage = lc.startsWith('image:');

  isLoading = true;

  if (isImage) {
    const prompt = cmd.slice(6).trim();
    const entry  = addPromptLine(cmd);
    const res    = addResBlock(entry, 'var(--yellow)', 'var(--yellow)', 'IMAGE GEN');
    res.innerHTML = `<span class="ai-tag" style="color:var(--yellow)">» IMAGE GEN</span>Generating SVG illustration: "<span style="color:var(--white)">${escHtml(prompt)}</span>"\nHasil akan muncul di panel kanan →`;
    scrollBottom();
    await generateImage(prompt);
    isLoading = false;
    cmdInput.focus();
    return;
  }

  const entry    = addPromptLine(cmd);
  const resBlock = isCode
    ? addResBlock(entry, 'var(--purple)', 'var(--purple)', 'CODE GEN')
    : addResBlock(entry);

  const systemPrompt = isCode
    ? `You are a code generator. Output ONLY in this exact format:
LANG: <language_name>
\`\`\`
<code here>
\`\`\`
No extra explanation.`
    : `Kamu adalah asisten AI. Jawab dengan singkat dan jelas dalam Bahasa Indonesia. Teks biasa, tanpa markdown berlebihan.`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: isCode ? cmd.slice(5).trim() : cmd }]
      })
    });

    const data = await resp.json();
    const text = data?.content?.[0]?.text || '[no response]';

    if (isCode) {
      const langMatch = text.match(/LANG:\s*(\w+)/i);
      const codeMatch = text.match(/```[\w]*\s*\n?([\s\S]*?)```/);
      const fenceLang = text.match(/```(\w+)/)?.[1]?.toLowerCase();
      const lang      = (langMatch ? langMatch[1].toLowerCase() : null) || fenceLang || 'code';
      const code      = codeMatch
        ? codeMatch[1].trim()
        : text.replace(/LANG:\s*\w+\s*/gi, '').replace(/```\w*/g, '').trim();

      currentCode = code;
      currentLang = lang;
      codeLang.textContent = lang.toUpperCase();
      codeDisplay.innerHTML = highlight(code, lang);

      const runBtn       = document.querySelector('.code-btn.run');
      const isHtmlLang   = ['html', 'htm', 'css'].includes(lang);
      runBtn.style.display = isHtmlLang ? 'inline-block' : 'none';

      openPanel('code');

      const hint = isHtmlLang
        ? `Gunakan <span style="color:var(--yellow)">▶ run</span> untuk preview, atau <span style="color:var(--cyan)">copy</span> untuk salin.`
        : `Gunakan <span style="color:var(--cyan)">copy</span> untuk salin kode ke editor/IDE kamu.`;

      resBlock.innerHTML = `<span class="ai-tag" style="color:var(--purple)">» CODE GEN</span>Kode <span style="color:var(--purple)">${lang}</span> siap → panel kanan\n${hint}`;
    } else {
      resBlock.innerHTML = `<span class="ai-tag">» AI OUTPUT</span>${escHtml(text)}`;
    }
  } catch (err) {
    resBlock.className = 'response error';
    resBlock.innerHTML = `<span class="ai-tag">» ERROR</span>Gagal terhubung ke server.\n${escHtml(String(err))}`;
  }

  isLoading = false;
  scrollBottom();
  cmdInput.focus();
}
