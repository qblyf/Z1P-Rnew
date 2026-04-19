import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  version?: string;
  humanReadable: string;
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

function getGitLog(limit: number = 100): CommitInfo[] {
  try {
    // 尝试多个可能的路径
    const possiblePaths = [
      process.cwd(),
      '/var/task',
      '/app',
    ];

    let logOutput = '';
    let workDir = '';

    for (const dir of possiblePaths) {
      try {
        logOutput = execSync(`git log --format="%H|%h|%s|%an|%ad|%cs" -${limit}`, {
          encoding: 'utf-8',
          cwd: dir,
        });
        workDir = dir;
        break;
      } catch {
        continue;
      }
    }

    if (!logOutput) {
      console.error('Could not find git repository in any of:', possiblePaths);
      return [];
    }

    console.log('Git log fetched from:', workDir);

    const lines = logOutput.trim().split('\n');
    return lines.map(line => {
      const parts = line.split('|');
      if (parts.length < 6) return null;
      const [hash, shortHash, message, author, , date] = parts;
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
    }).filter(Boolean) as CommitInfo[];
  } catch (error) {
    console.error('Failed to get git log:', error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);

  const commits = getGitLog(limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedCommits = commits.slice(start, end);

  return NextResponse.json({
    commits: paginatedCommits,
    total: commits.length,
    page,
    limit,
    totalPages: Math.ceil(commits.length / limit),
  });
}
