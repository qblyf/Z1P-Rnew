import dayjs from 'dayjs';
import { Form, Input, Button, DatePicker } from 'antd';
import { addUpdateLog } from '@zsqk/z1-sdk/es/z1p/update-log';
import { postAwait } from '../error';
import { useState } from 'react';
import { useTokenContext } from '../datahooks/auth';

const { TextArea } = Input;
const FormItem = Form.Item;
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};

/**
 * 更新日志添加
 * @param props
 * @returns JSX.Element
 * @author zhaoxuxu<zhaoxuxujc@gmail.com>
 */
function AddLog(props: {
  close: () => void;
  updateList: () => void;
}): JSX.Element {
  const { updateList, close } = props;
  const { token } = useTokenContext();

  const [version, setVersion] = useState<string>();
  const [date, setDate] = useState<number>();
  const [content, setContent] = useState<string>();

  return (
    <>
      <div style={{ padding: '1rem', height: '100%' }}>
        <Form>
          <FormItem label="版本发布" {...formItemLayout}>
            <Input value={version} onChange={e => setVersion(e.target.value)} />
          </FormItem>
          <FormItem label="更新日期" {...formItemLayout}>
            <DatePicker
              style={{ width: '100%' }}
              allowClear={false}
              value={date ? dayjs.unix(date) : undefined}
              onChange={v => setDate(v ? v.unix() : undefined)}
            />
          </FormItem>
          <FormItem label="更新内容" {...formItemLayout}>
            <TextArea
              autoSize={{ minRows: 10, maxRows: 20 }}
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </FormItem>
        </Form>
        <div
          style={{
            marginLeft: '93px',
          }}
        >
          <Button
            type="primary"
            style={{
              backgroundColor: '#108ee9',
              color: 'white',
            }}
            onClick={postAwait(async () => {
              if (!version) {
                throw new Error('版本发布不能为空');
              }
              if (typeof date !== 'number') {
                throw new Error('更新日期不能为空');
              }
              if (!content) {
                throw new Error('内容不能为空');
              }
              if (!token) {
                throw new Error('未登录，无法添加日志');
              }
              // 新增系统更新日志
              await addUpdateLog(
                {
                  type: 3,
                  content,
                  date: date,
                  version,
                },
                {
                  auth: token,
                }
              );
              await updateList();
              close();
            })}
          >
            提交
          </Button>
        </div>
      </div>
    </>
  );
}

export default AddLog;
