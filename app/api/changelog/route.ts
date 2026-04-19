import { NextResponse } from 'next/server';
import { execSync } from 'child_process';

interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  version?: string;
}

function parseVersionFromMessage(message: string): string | null {
  const match = message.match(/\[v?(\d+\.\d+\.\d+)\]/);
  return match ? match[1] : null;
}

function convertToHumanReadable(message: string): string {
  const lines = message.split('\n');
  const firstLine = lines[0];

  // 移除版本号前缀
  let cleaned = firstLine.replace(/^\[v?\d+\.\d+\.\d+\]\s*/, '');

  // 移除类型前缀如 feat:, fix:, perf:, chore:
  cleaned = cleaned.replace(/^(feat|fix|perf|chore|docs|style|refactor|test|build|ci|revert)(\([^)]+\))?:/, (match, type, parens) => {
    const typeMap: Record<string, string> = {
      feat: '新增',
      fix: '修复',
      perf: '优化性能',
      chore: '构建/工具',
      docs: '文档',
      style: '代码格式',
      refactor: '重构',
      test: '测试',
      build: '构建',
      ci: 'CI/CD',
      revert: '回滚',
    };
    const category = parens ? parens.slice(1, -1) : '';
    const prefix = typeMap[type] || type;
    return category ? `${prefix}(${category})` : prefix;
  });

  return cleaned.trim();
}

function getGitLog(): CommitInfo[] {
  try {
    const logOutput = execSync('git log --format="%H|%h|%s|%an|%ad|%cs" -50', {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    const lines = logOutput.trim().split('\n');
    return lines.map(line => {
      const [hash, shortHash, message, author, , date] = line.split('|');
      const version = parseVersionFromMessage(message) ?? undefined;
      const humanReadable = convertToHumanReadable(message);

      return {
        hash,
        shortHash,
        message,
        author,
        date,
        version,
        humanReadable,
      };
    });
  } catch (error) {
    console.error('Failed to get git log:', error);
    return [];
  }
}

export async function GET() {
  const commits = getGitLog();
  return NextResponse.json({ commits });
}
