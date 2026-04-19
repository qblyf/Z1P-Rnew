'use client';

import { useEffect, useState } from 'react';
import { Tag, Card, Timeline, Spin, Empty } from 'antd';
import { GitCommit, User, Calendar } from 'lucide-react';
import PageWrap from '../../components/PageWrap';

interface CommitInfo {
  hash: string;
  shortHash: string;
  message: string;
  author: string;
  date: string;
  version?: string;
  humanReadable: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function ProductPlatformChangelog() {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/changelog')
      .then(res => res.json())
      .then(data => {
        setCommits(data.commits || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <PageWrap ppKey="product-manage">
        <div className="flex items-center justify-center h-64">
          <Spin size="large" />
        </div>
      </PageWrap>
    );
  }

  if (commits.length === 0) {
    return (
      <PageWrap ppKey="product-manage">
        <div className="flex items-center justify-center h-64">
          <Empty description="暂无更新日志" />
        </div>
      </PageWrap>
    );
  }

  // 按版本分组
  const versionGroups: { version: string; commits: CommitInfo[] }[] = [];
  let currentVersion = '';
  let currentGroup: CommitInfo[] = [];

  commits.forEach(commit => {
    if (commit.version && commit.version !== currentVersion) {
      if (currentGroup.length > 0) {
        versionGroups.push({ version: currentVersion, commits: currentGroup });
      }
      currentVersion = commit.version;
      currentGroup = [commit];
    } else {
      currentGroup.push(commit);
    }
  });

  if (currentGroup.length > 0) {
    versionGroups.push({ version: currentVersion, commits: currentGroup });
  }

  return (
    <PageWrap ppKey="product-manage">
      <div style={{ marginLeft: '40px', marginTop: '35px', paddingBottom: '32px' }}>
        <h3
          style={{
            lineHeight: '32px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'black',
            marginBottom: '24px',
          }}
        >
          商品平台更新日志
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {versionGroups.map(group => (
            <Card key={group.version} title={`v${group.version}`} size="small">
              <Timeline
                items={group.commits.map(commit => ({
                  color: 'blue',
                  children: (
                    <div key={commit.hash} style={{ paddingBottom: '8px' }}>
                      <div style={{ fontSize: '14px', color: '#333', marginBottom: '4px' }}>
                        {commit.humanReadable}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#999' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <GitCommit size={12} />
                          <a
                            href={`https://github.com/qblyf/Z1P-Rnew/commit/${commit.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#1890ff' }}
                          >
                            {commit.shortHash}
                          </a>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} />
                          {commit.author}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {formatDate(commit.date)}
                        </span>
                      </div>
                    </div>
                  ),
                }))}
              />
            </Card>
          ))}
        </div>
      </div>
    </PageWrap>
  );
}
