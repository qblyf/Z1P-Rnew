import { Form, Input, Button, DatePicker } from 'antd';
import { UpdateLog } from '@zsqk/z1-sdk/es/z1p/alltypes';
import { editUpdateLog } from '@zsqk/z1-sdk/es/z1p/update-log';
import { postAwait } from '../error';
import { useState } from 'react';
import dayjs from 'dayjs';
import { useTokenContext } from '../datahooks/auth';

const { TextArea } = Input;
const FormItem = Form.Item;
const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 18 },
};

/**
 * 更新日志编辑
 * @param props
 * @returns JSX.Element
 * @author zhaoxuxu<zhaoxuxujc@gmail.com>
 */
function EditLog(props: {
  close: () => void;
  editLog: UpdateLog | undefined;
  updateList: () => void;
}): JSX.Element {
  const { editLog, updateList, close } = props;
  const { token } = useTokenContext();

  const [version, setVersion] = useState<string | undefined>(
    editLog ? editLog.version : undefined
  );
  const [date, setDate] = useState<number | undefined>(
    editLog ? Number(editLog.date) : undefined
  );
  const [content, setContent] = useState<string | undefined>(
    editLog ? editLog.content : undefined
  );

  return (
    <>
      <div style={{ padding: '1rem' }}>
        <Form>
          <FormItem label="版本发布" {...formItemLayout}>
            <Input value={version} onChange={e => setVersion(e.target.value)} />
          </FormItem>
          <FormItem label="更新日期" {...formItemLayout}>
            <DatePicker
              style={{ width: '100%' }}
              allowClear={false}
              value={date ? dayjs.unix(date) : undefined}
              onChange={v => {
                setDate(v ? v.unix() : undefined);
              }}
            />
          </FormItem>
          <FormItem label="更新内容" {...formItemLayout}>
            <TextArea
              rows={4}
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
            onClick={postAwait(async () => {
              if (!editLog) {
                throw new Error('没有找到日志信息');
              }
              if (!version) {
                throw new Error('版本发布不能为空');
              }
              if (typeof date !== 'number') {
                throw new Error('更新日期不能为空');
              }
              if (!content) {
                throw new Error('内容不能为空');
              }

              const data = {
                id: editLog.id,
                content,
                date,
                version,
              };

              // 编辑系统更新日志
              await editUpdateLog(editLog.id, data, {
                auth: token,
              });
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

export default EditLog;
