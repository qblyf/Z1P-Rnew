'use client';

import { Button, DatePicker, Form, Input, TimePicker } from 'antd';
import { useState } from 'react';
import { postAwait } from '../error';
import { useTokenContext } from '../datahooks/auth';
import dayjs, { Dayjs } from 'dayjs';
import { sysSettingEditBatch } from '@zsqk/z1-sdk/es/z1p/sys-setting';
import { UnixTimestamp } from '@zsqk/z1-sdk/es/types/basetypes';

/** 后端商品数据返回类型 */
type Data = {
  key: number;
  routineMaintenanceStartTime?: UnixTimestamp | null;
  routineMaintenanceEndTime?: UnixTimestamp | null;
  specialMaintenanceStartTime?: UnixTimestamp | null;
  specialMaintenanceEndTime?: UnixTimestamp | null;
  clientName: string;
  remarks: string;
};

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 },
  style: { width: '100%', marginBottom: '21px' },
};
const { RangePicker } = DatePicker;

/**
 * 编辑系统维护时间
 * @param props
 * @returns JSX.Element
 * @author Cheng Yan <1748872910@qq.com>
 */
export function EditSystemMaintenanceTime(props: {
  onOk: (e: 'ok' | 'cancel') => void;
  editInfo: Data;
}): JSX.Element {
  const { token } = useTokenContext();
  const { onOk, editInfo } = props;

  // 文字说明
  const [remarks, setRemarks] = useState<string | undefined>(editInfo?.remarks);
  // 例行维护时段
  const [routinemaintenancewindowTime, setRoutinemaintenancewindowTime] =
    useState<[Dayjs | null, Dayjs | null]>([
      editInfo?.routineMaintenanceStartTime
        ? dayjs(editInfo.routineMaintenanceStartTime * 1000)
        : null,
      editInfo?.routineMaintenanceEndTime
        ? dayjs(editInfo.routineMaintenanceEndTime * 1000)
        : null,
    ]);
  // 特殊维护时段
  const [specialmaintenancewindowTime, setSpecialmaintenancewindowTime] =
    useState<[Dayjs | null, Dayjs | null]>([
      editInfo?.specialMaintenanceStartTime
        ? dayjs(editInfo.specialMaintenanceStartTime * 1000)
        : null,
      editInfo?.specialMaintenanceEndTime
        ? dayjs(editInfo.specialMaintenanceEndTime * 1000)
        : null,
    ]);

  if (!token) {
    throw new Error('因外层组件处理, 所以不该到达此处');
  }

  return (
    <div
      style={{
        paddingBottom: '50px',
        paddingTop: '22px',
      }}
    >
      <Form>
        <Form.Item label="例行维护时段" {...formItemLayout}>
          <TimePicker.RangePicker
            style={{ width: '100%' }}
            placeholder={['最小时段', '最大时段']}
            format="HH:mm"
            value={routinemaintenancewindowTime}
            onChange={v => {
              if (v) {
                setRoutinemaintenancewindowTime(v);
              } else {
                setRoutinemaintenancewindowTime([null, null]);
              }
            }}
          />
        </Form.Item>
        <Form.Item label="特殊维护时段" {...formItemLayout}>
          <RangePicker
            style={{
              width: '100%',
            }}
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            value={specialmaintenancewindowTime}
            onChange={v => {
              if (v) {
                setSpecialmaintenancewindowTime(v);
              } else {
                setSpecialmaintenancewindowTime([null, null]);
              }
            }}
          />
        </Form.Item>
        <Form.Item label="文字说明:" {...formItemLayout}>
          <Input.TextArea
            rows={6}
            value={remarks}
            placeholder="请输入"
            onChange={e => setRemarks(e.target.value)}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Form>

      <div
        style={{
          borderTop: '1px solid #E8E8E8',
          textAlign: 'right',
          padding: '12px 24px',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
        }}
      >
        <Button style={{ marginRight: '30px' }} onClick={() => onOk('cancel')}>
          取消
        </Button>
        <Button
          type="primary"
          onClick={postAwait(async () => {
            const [
              minRoutinemaintenancewindowTime,
              maxRoutinemaintenancewindowTime,
            ] =
              routinemaintenancewindowTime &&
              routinemaintenancewindowTime[0] &&
              routinemaintenancewindowTime[1]
                ? [
                    routinemaintenancewindowTime[0].unix(),
                    routinemaintenancewindowTime[1].unix(),
                  ]
                : [null, null];
            const [
              minSpecialmaintenancewindowTime,
              maxSpecialmaintenancewindowTime,
            ] =
              specialmaintenancewindowTime &&
              specialmaintenancewindowTime[0] &&
              specialmaintenancewindowTime[1]
                ? [
                    specialmaintenancewindowTime[0].unix(),
                    specialmaintenancewindowTime[1].unix(),
                  ]
                : [null, null];
            if (!editInfo) {
              throw new Error('未获取到账套维护时间信息');
            }
            if (
              editInfo.remarks === remarks &&
              editInfo.routineMaintenanceStartTime ===
                minRoutinemaintenancewindowTime &&
              editInfo.routineMaintenanceEndTime ===
                maxRoutinemaintenancewindowTime &&
              editInfo.specialMaintenanceStartTime ===
                minSpecialmaintenancewindowTime &&
              editInfo.specialMaintenanceEndTime ===
                maxSpecialmaintenancewindowTime
            ) {
              throw new Error('没有数据变动 不需要提交');
            }
            await sysSettingEditBatch(
              [
                {
                  routineMaintenanceStartTime: minRoutinemaintenancewindowTime,
                  routineMaintenanceEndTime: maxRoutinemaintenancewindowTime,
                  specialMaintenanceStartTime: minSpecialmaintenancewindowTime,
                  specialMaintenanceEndTime: maxSpecialmaintenancewindowTime,
                  remarks: remarks,
                  clientName: editInfo.clientName,
                },
              ],
              { auth: token }
            );
            onOk('ok');
          })}
        >
          保存
        </Button>
      </div>
    </div>
  );
}
