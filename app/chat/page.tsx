'use client'

import { Avatar, Button, Col, Input, List, Row } from 'antd';
import { PageHeader } from '@ant-design/pro-components';
import { type TextAreaRef } from 'antd/lib/input/TextArea';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import update from 'immutability-helper';
import { fromUnicodeStr } from '@zsqk/somefn/js/str';

const { TextArea } = Input;

const username = Math.random().toString().slice(8);

export default function () {
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<TextAreaRef>(null);
  const [chatContext, setChatContext] = useState<
    { question: string; answer: string; key: string }[]
  >([]);

  // 如果有新对话, 则在 UI 发生变化后滚动到最新的对话
  useEffect(() => {
    const div = chatBoxRef.current;
    if (div) {
      div.scrollTo({ top: div.scrollHeight - div.clientHeight });
      console.log({
        scrollTop: div.scrollTop,
        scrollHeight: div.scrollHeight,
        clientHeight: div.clientHeight,
      });
    }
  }, [chatContext]);

  const [loading, setLoading] = useState(false);

  return (
    <>
      <Head>
        <title>问答机器人</title>
      </Head>
      <PageHeader
        title="问答机器人"
        subTitle="调用 GPT 模型回答问题."
      ></PageHeader>
      <Row
        ref={chatBoxRef}
        id="chatbox"
        style={{ height: '100%', maxHeight: '70vh', overflow: 'auto' }}
      >
        <Col flex="auto">
          <List
            loading={loading}
            itemLayout="horizontal"
            dataSource={chatContext}
            renderItem={item => (
              <>
                <List.Item key={`${item.key}-q`}>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={`https://xsgames.co/randomusers/avatar.php?g=pixel&key=you${username}`}
                      />
                    }
                    title="你"
                    description={item.question}
                  />
                </List.Item>
                <List.Item key={`${item.key}-a`}>
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        src={`https://xsgames.co/randomusers/avatar.php?g=pixel&key=bot`}
                      />
                    }
                    title="智能助手"
                    description={renderText(item.answer)}
                  />
                </List.Item>
              </>
            )}
          />
        </Col>
      </Row>
      <Row>
        <Col flex="auto" style={{ margin: '0.5em' }}>
          <TextArea
            ref={inputRef}
            rows={4}
            placeholder="在这里提问."
            maxLength={50}
          />
          <Row style={{ paddingTop: '0.5em' }}>
            <Col flex="auto">
              <Button
                loading={loading}
                type={'primary'}
                onClick={() => {
                  const ele = inputRef.current;
                  if (!ele || !ele.resizableTextArea) {
                    return;
                  }
                  if (chatContext.length > 10) {
                    alert('抱歉, 我们本次只能聊这么多了');
                    return;
                  }
                  const str = ele.resizableTextArea.textArea.value;
                  console.log('str', str);
                  setLoading(true);
                  fetch(`https://chat.zsqk.com.cn/?zsqk=${str}`, {
                    method: 'POST',
                    body: JSON.stringify([
                      { question: '请说中文', answer: '是的，我可以说中文' },
                      ...chatContext.map(({ question, answer }) => ({
                        question,
                        answer,
                      })),
                    ]),
                  })
                    .then(v => v.text())
                    .then(v =>
                      v
                        .replaceAll('YouBot', 'Bot')
                        .replaceAll('You.com', 'Zsqk')
                    )
                    .then(fromUnicodeStr)
                    .then(v => {
                      setChatContext(
                        update(chatContext, {
                          $push: [
                            {
                              question: `${str}`,
                              answer: v,
                              key: Date.now().toString(),
                            },
                          ],
                        })
                      );
                      console.log(v);
                    })
                    .catch(err => {
                      alert(`暂无法回答 ${err}`);
                    })
                    .finally(() => {
                      setLoading(false);
                    });
                }}
              >
                提问
              </Button>
            </Col>
            <Col>
              <Button
                onClick={() => {
                  setChatContext([]);
                }}
              >
                创建新聊天
              </Button>
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  );
}

function renderText(str: string) {
  return [...str].reduce((pre, v) => {
    if (v === '\n') {
      return (
        <>
          {pre}
          <br />
        </>
      );
    }
    return (
      <>
        {pre}
        {v}
      </>
    );
  }, <></>);
}
