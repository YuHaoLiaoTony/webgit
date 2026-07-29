import OpenAI from 'openai';

const FILE_TYPE_MAP = {
  js: 'javascript', jsx: 'react', ts: 'typescript', tsx: 'react-typescript',
  vue: 'vue', css: 'css', scss: 'scss', html: 'html',
  json: 'json', yml: 'yaml', yaml: 'yaml', md: 'markdown',
  py: 'python', rb: 'ruby', java: 'java', cs: 'csharp',
  go: 'go', rs: 'rust', php: 'php', swift: 'swift', kt: 'kotlin',
  sh: 'shell', bash: 'shell', sql: 'sql', xml: 'xml',
};

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg', 'ico']);
const BINARY_EXTS = new Set(['woff', 'woff2', 'ttf', 'otf', 'eot', 'pdf', 'zip', 'gz', 'tar', 'exe', 'dll', 'so', 'dylib', 'class', 'pyc', 'o']);

const MAX_DIFF_CHARS = 20000;
const MAX_TOOL_ITERATIONS = 15;

function getFileType(filePath) {
  const name = filePath.split('/').pop() || '';
  if (name === 'Dockerfile') return 'docker';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (IMAGE_EXTS.has(ext)) return 'image';
  if (BINARY_EXTS.has(ext)) return 'binary';
  return FILE_TYPE_MAP[ext] || 'text';
}

/**
 * Generate a commit message using AI.
 * AI reads diffs via tool calling, then outputs plain text commit message.
 * No response_format — pure prompt constraints, compatible with all models.
 *
 * @param {object} gitAPI
 * @param {Array<{path: string, status: string}>} stagedFiles
 * @param {string} repoPath
 * @param {string} [customPrompt]
 * @returns {Promise<{title: string, body: string}>}
 */
export async function generateCommitMessage(gitAPI, stagedFiles, repoPath, customPrompt) {
  const openai = new OpenAI({
    baseURL: process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1',
    apiKey: process.env.OPENCODE_API_KEY,
  });

  // ── 1. Gather context ──────────────────────────────────────────
  const status = await gitAPI.getStatus();
  const branch = status.current;
  const stats = await gitAPI.getStagedFileStats();
  const statsMap = {};
  for (const s of stats) statsMap[s.path] = s;

  // ── 2. Build file listing with stats ───────────────────────────
  const fileLines = stagedFiles.map(f => {
    const code = STATUS_MAP[f.status] || '?';
    const st = statsMap[f.path];
    let statStr;
    if (st?.binary) statStr = '(binary)';
    else if (st) statStr = `(+${st.ins}/-${st.del})`;
    else statStr = '(?)';
    const type = st?.binary ? 'binary' : getFileType(f.path);
    return `${code}\t${f.path}\t${statStr}\t${type}`;
  }).join('\n');

  // ── 3. Build prompt ────────────────────────────────────────────
  const promptParts = [
    'Generate a commit message (follow the rule of conventional commit message) for given git repository.',
    '- Read all given changed files before generating. Only binary files (such as images, audios ...) can be skipped.',
    '- Output the conventional commit message (with detail changes in list) directly. Do not explain your output nor introduce your answer.',
  ];

  if (customPrompt) {
    promptParts.push(`\n<Additional Prompt>\n${customPrompt}`);
  }

  promptParts.push(
    `Repository path: ${repoPath}`,
    `Current branch: ${branch}`,
    'Changed files (format: STATUS\\tPATH\\t(+INS/-DEL)\\tTYPE):',
    '  - STATUS: A=added, M=modified, D=deleted, T=type changed, R=renamed, C=copied',
    '  - (+INS/-DEL): added/deleted lines count. \'(binary)\' means binary file.',
    '  - TYPE: file type (javascript, typescript, vue, css, json, markdown, image, binary, ...)',
    '  - Call \'read_diff\' to read the full diff of a file.',
    '  - You may skip reading binary files or files whose stat already describes the change clearly.',
    '',
    fileLines,
  );

  const userMessage = promptParts.join('\n');

  const messages = [
    { role: 'system', content: 'You are a git commit message generator.' },
    { role: 'user', content: userMessage },
  ];

  // ── 4. Tool definition ──────────────────────────────────────────
  const tools = [
    {
      type: 'function',
      function: {
        name: 'read_diff',
        description: 'Read the full staged diff of a specific file.',
        parameters: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file to read the staged diff for (e.g. src/file.js)',
            },
          },
          required: ['filePath'],
        },
      },
    },
  ];

  // ── 5. Tool calling loop ────────────────────────────────────────
  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await openai.chat.completions.create({
      model: 'deepseek-v4-flash',
      messages,
      tools,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    const msg = choice.message;

    // No tool calls → this is the final commit message
    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return parseCommitMessage(msg.content || '');
    }

    // Push assistant message with tool calls
    messages.push({
      role: 'assistant',
      content: msg.content || null,
      tool_calls: msg.tool_calls.map(tc => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      })),
    });

    // Execute each tool call
    for (const toolCall of msg.tool_calls) {
      if (toolCall.function.name === 'read_diff') {
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: await readFileDiff(gitAPI, toolCall),
        });
      }
    }
  }

  return { title: 'AI commit generation timed out', body: '' };
}

// ── Helper: read a file's diff ──────────────────────────────────────
async function readFileDiff(gitAPI, toolCall) {
  try {
    const args = JSON.parse(toolCall.function.arguments);
    const rawDiff = await gitAPI.getDiff(args.filePath, true);
    if (!rawDiff || !rawDiff.trim()) return '[no diff content]';
    if (rawDiff.includes('Binary files') || rawDiff.includes('binary')) return '[binary file]';
    if (rawDiff.length > MAX_DIFF_CHARS) {
      return rawDiff.substring(0, MAX_DIFF_CHARS) +
        `\n[Diff truncated: ${rawDiff.length} chars. Use stat summary above for overview.]`;
    }
    return rawDiff;
  } catch (err) {
    return `[error reading diff: ${err.message}]`;
  }
}

// ── Helper: parse plain text commit message ─────────────────────────
function parseCommitMessage(text) {
  let content = text.trim();

  // Strip markdown code block (``` ... ```) if AI wrapped it
  const codeBlockMatch = content.match(/```(?:\w*)\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    content = codeBlockMatch[1].trim();
  }

  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length === 0) {
    return { title: '', body: '' };
  }

  // First non-empty line is the title
  const title = lines[0].trim().substring(0, 72);
  const body = lines.slice(1).join('\n').trim();

  return { title, body };
}

const STATUS_MAP = {
  added: 'A', modified: 'M', deleted: 'D', renamed: 'R',
  copied: 'C', 'type changed': 'T',
};
