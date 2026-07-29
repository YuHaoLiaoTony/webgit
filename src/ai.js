import OpenAI from 'openai';

const STATUS_MAP = {
  added: 'A',
  modified: 'M',
  deleted: 'D',
  renamed: 'R',
};

const MAX_DIFF_LINES = 500;
const MAX_TOOL_ITERATIONS = 10;

/**
 * Generate a commit message using AI with tool calling.
 *
 * @param {object} gitAPI - The git API object from createGitAPI()
 * @param {Array<{path: string, status: string}>} stagedFiles - List of staged files
 * @param {string} repoPath - Absolute path to the repository
 * @returns {Promise<{title: string, body: string}>}
 */
export async function generateCommitMessage(gitAPI, stagedFiles, repoPath) {
  const openai = new OpenAI({
    baseURL: 'https://opencode.ai/zen/go/v1',
    apiKey: process.env.OPENCODE_API_KEY,
  });

  // Get current branch
  const status = await gitAPI.getStatus();
  const branch = status.current;

  // Build file list with status codes (A/M/D/R)
  const fileList = stagedFiles
    .map(f => {
      const code = STATUS_MAP[f.status] || '?';
      return `${code}\t${f.path}`;
    })
    .join('\n');

  // ── System prompt ──────────────────────────────────────────────
  const systemPrompt = [
    'You are a git commit message generator. Output in conventional commit format.',
    'Title must be one line, ≤72 characters. Body can be multiple lines as a bullet list.',
    'Output ONLY valid JSON with exactly this shape: { "title": "...", "body": "..." }',
    'No additional text, explanation, or markdown formatting.',
  ].join('\n');

  // ── User message ──────────────────────────────────────────────
  const userMessage = [
    `Repository path: ${repoPath}`,
    `Branch: ${branch}`,
    '',
    'Staged files:',
    fileList,
    '',
    'Please tell me which files\' diffs you need to see.',
  ].join('\n');

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  // ── Tool definition ────────────────────────────────────────────
  const tools = [
    {
      type: 'function',
      function: {
        name: 'read_diff',
        description: 'Read the staged diff of a specific file',
        parameters: {
          type: 'object',
          properties: {
            filePath: {
              type: 'string',
              description: 'Path to the file to read the staged diff for',
            },
          },
          required: ['filePath'],
        },
      },
    },
  ];

  // ── Tool calling loop ──────────────────────────────────────────
  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await openai.chat.completions.create({
      model: 'deepseek-v4-flash',
      messages,
      tools,
      tool_choice: 'auto',
    });

    const choice = response.choices[0];
    const message = choice.message;

    // No tool calls → this is the final commit message
    if (!message.tool_calls || message.tool_calls.length === 0) {
      const content = message.content || '';
      try {
        const parsed = JSON.parse(content);
        return {
          title: parsed.title || content.trim().substring(0, 72),
          body: parsed.body || '',
        };
      } catch {
        // JSON parse failed → fallback: use entire response as title
        return {
          title: content.trim().substring(0, 72),
          body: '',
        };
      }
    }

    // ── Execute tool calls ─────────────────────────────────────
    // Push assistant message with all tool calls
    messages.push({
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.tool_calls.map(tc => ({
        id: tc.id,
        type: tc.type,
        function: tc.function,
      })),
    });

    // Execute each tool call
    for (const toolCall of message.tool_calls) {
      if (toolCall.function.name === 'read_diff') {
        let diffContent = '';

        try {
          const args = JSON.parse(toolCall.function.arguments);
          const filePath = args.filePath;

          const rawDiff = await gitAPI.getDiff(filePath, true);
          const lines = rawDiff.split('\n');
          const totalLines = lines.length;

          // Detect binary file
          if (rawDiff.includes('Binary files') || rawDiff.includes('binary')) {
            diffContent = '[binary file]';
          } else if (totalLines > MAX_DIFF_LINES) {
            // Truncate long diffs
            diffContent = lines.slice(0, MAX_DIFF_LINES).join('\n') +
              `\n...(truncated, total ${totalLines} lines)`;
          } else {
            diffContent = rawDiff;
          }
        } catch (err) {
          diffContent = `[error reading diff: ${err.message}]`;
        }

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: diffContent,
        });
      }
    }
  }

  // Fallback if max iterations reached without a final message
  return {
    title: 'AI commit generation timed out',
    body: 'The AI was unable to generate a commit message within the maximum number of iterations.',
  };
}
