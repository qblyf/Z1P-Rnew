'use client';

/**
 * [非业务组件] 内容
 * @author Lian Zheren <lzr@go0356.com>
 */
export const Content: React.FC<{ children: React.ReactNode }> = props => {
  return (
    <>
      <div className="content">{props.children}</div>
      <style jsx>{`
        .content {
          padding-left: 1em;
          padding-right: 1em;
        }
      `}</style>
    </>
  );
};
