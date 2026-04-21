"use client"

import { useEffect, useState, useMemo } from 'react';

/**
 * [通用组件] 水印
 *
 * 1. 如果想要旋转, `isRotate` 值为 `false` 即可.
 *
 * @author Lian Zheren <lzr@go0356.com>
 */
export function CanvasWatermark({
  width = 200,
  height = 100,
  fontSize = 20,
  isRotate = false,
  color = 'rgba(240, 240, 240, 0.2)',
  text = '水印',
} = {}) {
  const [url, setURL] = useState('');
  
  // 使用 useMemo 缓存配置，避免不必要的重新生成
  const config = useMemo(() => ({
    width, height, fontSize, isRotate, color, text
  }), [width, height, fontSize, isRotate, color, text]);
  
  useEffect(() => {
    // 初始化图片
    const canvasEl = document.createElement('canvas');
    const ctx = canvasEl.getContext('2d');
    if (ctx === null) {
      return;
    }

    // 将图片按照物理像素缩放等级进行放大
    const dpi = window.devicePixelRatio;
    canvasEl.width = Math.floor(config.width * dpi);
    canvasEl.height = Math.floor(config.height * dpi);
    ctx.scale(dpi, dpi);

    // 将文字的定位点设为中心点
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 文字中心点 x 轴偏移.
    // 如果不旋转, 文字中心点即为图片中心点.
    // 如果 3 点开始顺时针旋转, 则因为之前的文字居中多增加半个字高以确保显示.
    const x = !config.isRotate ? config.width / 2 : (config.width + config.fontSize) / 2;
    // 文字中心点 y 轴偏移.
    // 如果不旋转, 文字中心点即为图片中心点.
    // 如果 3 点开始顺时针旋转, 则因为之前的文字居中所以下沉半个字高以确保显示.
    const y = !config.isRotate ? config.height / 2 : config.fontSize / 2;

    if (config.isRotate) {
      // 如果旋转, 则为对角线旋转.
      const rotate = config.isRotate ? 45 * (config.height / config.width) : 0;
      ctx.rotate((Math.PI / 180) * rotate);
    }

    // 填充文字颜色
    ctx.fillStyle = config.color;
    ctx.font = `${config.fontSize}px serif`;
    ctx.fillText(config.text, x, y);

    setURL(canvasEl.toDataURL());
  }, [config]);

  return (
    <div
      style={{
        backgroundSize: `${width}px ${height}px`,
        backgroundImage: `url('${url}')`,
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '100%',
        zIndex: '55555',
        pointerEvents: 'none',
        backgroundRepeat: 'repeat',
      }}
    ></div>
  );
}
