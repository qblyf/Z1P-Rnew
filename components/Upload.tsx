/*
 * File copied from z1/z1-pwa/src/components/Upload.tsx. Amended:
 * - few oss configs, and way to get oss-credentials
 * - do not need get token
 * - ant-upload-draggable-list-item height 100%
 * - timestamp in file name
 *
 * @author zhaoxuxu <zhaoxuxujc@gmail.com> (since 2023-3-22)
 */

import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import OSS from 'ali-oss';
import { Upload, Button, message, Tooltip } from 'antd';
import { RcFile, UploadProps } from 'antd/lib/upload';
import { UploadFile, UploadFileStatus } from 'antd/lib/upload/interface';
import * as _ from 'lodash';
import { DndProvider, DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import {
  byte2str,
  limitUploadImgSize,
  OSS_BUCKET,
  OSS_REGION,
  OSS_VISIT_DOMAIN,
} from '../constants';
import { OSSTempCredentials } from '../common/genOSSTempCredentials';
import { useCallback, useMemo, useRef, useState } from 'react';

const type = 'DragableUploadList';

export const upload = async (
  /** 要上传的文件 */
  file: File,
  /** 文件路径 */
  path: string,

  /** oss存储路径 */
  ossBucket: string,
  /** oss访问域名 */
  ossVisitDomain: string
): Promise<{ url: string; name: string }> => {
  const isLtSize = file.size < limitUploadImgSize;
  if (!isLtSize) {
    const msg = `超出最大体积限制, 仅允许 ${byte2str(
      limitUploadImgSize
    )} 大小以内的文件`;
    message.error(msg);
    throw new Error(msg);
  }

  const stored = sessionStorage.getItem('ossCredentials');
  if (!stored) {
    const msg = '无OSS验证信息，刷新页面试试？';
    message.error(msg);
    throw new Error(msg);
  }
  const ossCredentials: OSSTempCredentials = JSON.parse(stored);

  const client = new OSS({
    region: OSS_REGION,
    accessKeyId: ossCredentials.AccessKeyId,
    accessKeySecret: ossCredentials.AccessKeySecret,
    bucket: ossBucket,
    stsToken: ossCredentials.SecurityToken,
  });

  await client
    .put(path, file)
    .catch(error => console.error('图片上传出错', error));

  console.log(
    '图片上传有了结果',
    `https://${ossVisitDomain}/${path}?x-oss-process=style/normal`
  );
  return {
    url: `https://${ossVisitDomain}/${path}`,
    name: file.name,
  };
};

interface Props extends UploadProps {
  // eslint-disable-next-line react/require-default-props
  path?: string;
  dir?: string;
  imgList?: UploadFile[];
  setImgList?: (e: UploadFile[]) => void;
}

function isRcFile(v: unknown): v is RcFile {
  if (!(v instanceof File)) {
    return false;
  }
  return true;
}

const DragableUploadListItem: React.FC<{
  originNode: React.ReactElement;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  file: UploadFile;
  fileList: UploadFile[];
}> = ({ originNode, moveRow, file, fileList }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>();
  const index = fileList.indexOf(file);
  const [{ isOver, dropClassName }, drop] = useDrop({
    accept: type,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collect: (monitor: DropTargetMonitor<any>) => {
      const { index: dragIndex } = monitor.getItem() || {};
      if (dragIndex === index) {
        return {};
      }
      return {
        isOver: monitor.isOver(),
        dropClassName:
          dragIndex < index ? ' drop-over-downward' : ' drop-over-upward',
      };
    },
    drop: (item: { index: number }) => {
      moveRow(item.index, index);
    },
  });
  const [, drag] = useDrag({
    type,
    item: { index },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drop(drag(ref));
  const errorNode = (
    <Tooltip title="Upload Error">{originNode.props.children}</Tooltip>
  );
  return (
    <div
      ref={ref}
      className={`ant-upload-draggable-list-item ${
        isOver ? dropClassName : ''
      }`}
      style={{ cursor: 'move', height: '100%' }}
    >
      {file.status === 'error' ? errorNode : originNode}
    </div>
  );
};

function FileUpload(props: Props): JSX.Element {
  const { imgList, setImgList, ...restProps } = props;
  const [loading, setLoading] = useState(false);
  const [, setPendingImgToUpload] = useState<File[]>([]);

  const uploadButton =
    restProps.listType === 'picture-card' ? (
      <div>
        <PlusOutlined />
        <div style={{ marginTop: 8 }}>
          {restProps.multiple ? '批量上传' : '上传'}
        </div>
      </div>
    ) : (
      <Button loading={loading} disabled={loading}>
        {restProps.multiple ? '批量上传' : '上传'} <UploadOutlined />
      </Button>
    );

  const moveRow = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      if (imgList && setImgList) {
        const dragRow = imgList[dragIndex];
        if (!dragRow) {
          message.warning('不合法的排序方式!');
          return;
        }
        const newImg = imgList.filter(item => item.uid !== dragRow.uid);
        newImg.splice(hoverIndex, 0, dragRow);
        setImgList(newImg);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [imgList]
  );

  const batchUpload = useCallback(
    (files: File[]) => {
      const dir = restProps.dir || 'test/';
      
      Promise.all(
        files.map(file => {
          return upload(
            file,
            `${dir}${new Date().getTime()}-${String(Math.random()).slice(-5)}-${
              file.name
            }`,
            OSS_BUCKET,
            OSS_VISIT_DOMAIN
          );
        })
      ).then(resList => {
        message.success('操作成功.');
        setLoading(false);
        setPendingImgToUpload([]);
        if (
          imgList &&
          setImgList &&
          imgList.length < (restProps.maxCount || 1)
        ) {
          let newImgList = [
            ...imgList,
            ...resList.map(({ url, name }) => {
              const status: UploadFileStatus = 'done';
              return {
                uid: String(Math.random()).slice(2),
                name,
                status,
                url,
              };
            }),
          ];
          newImgList = newImgList.slice(0, restProps.maxCount || 1);
          setImgList(newImgList);
        }
      });
    },
    [imgList, restProps.dir, restProps.maxCount, setImgList]
  );

  const batchUploadDebounced = useMemo(() => {
    return _.debounce(batchUpload, 500);
  }, [batchUpload]);

  return (
    <DndProvider backend={HTML5Backend}>
      <Upload
        showUploadList={restProps.listType === 'picture-card' ? true : false}
        style={{
          width: '128px',
          height: '128px',
        }}
        customRequest={async ({ file }) => {
          if (!isRcFile(file)) {
            return;
          }
          setPendingImgToUpload(prev => {
            const next = prev.concat(file);
            batchUploadDebounced(next);
            return next;
          });
        }}
        fileList={imgList}
        itemRender={(originNode, file, currFileList) => (
          <DragableUploadListItem
            originNode={originNode}
            file={file}
            fileList={currFileList}
            moveRow={moveRow}
          />
        )}
        onRemove={e => {
          if (imgList && setImgList) {
            setImgList(imgList.filter(v => v.uid !== e.uid));
          }
        }}
        {...restProps}
      >
        {imgList && imgList.length >= (restProps.maxCount || 1)
          ? null
          : uploadButton}
      </Upload>
    </DndProvider>
  );
}

interface ImgProps extends Props {
  /** 图片地址前缀 */
  prefix: string;
  /** 图片地址后缀 */
  suffix: string;
  /** 图片标示符 */
  id: string;
  /** 上传图片区分路径 */
  path?: string;
}

export function ImgUpload(props: ImgProps): JSX.Element {
  const { prefix, suffix, id: key, path, ...restProps } = props;
  const uri = prefix + key + suffix;
  return (
    <>
      <div>
        <picture>
          <img width="100" height="100" src={uri} alt={key} title={key} />
        </picture>
        <FileUpload accept="image/*" path={path} {...restProps} />
      </div>
    </>
  );
}

// export const upload = async file => {
//   if (file.size > 1048576) {
//     throw new Error("超出最大体积限制, 仅允许 1MB 大小以内的文件");
//   }
//   await uploadPicture(file);
//   console.log("图片上传有了结果", file);
// };

export default FileUpload;
