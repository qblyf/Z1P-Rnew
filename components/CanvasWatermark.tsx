"use client"

import { useEffect, useState } from 'react';

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
  useEffect(() => {
    // 初始化图片
    console.log('初始化图片');
    const canvasEl = document.createElement('canvas');
    const ctx = canvasEl.getContext('2d');
    if (ctx === null) {
      console.warn('系统不支持 2d canvas, 无法加载水印');
      return;
    }

    // 将图片按照物理像素缩放等级进行放大
    const dpi = window.devicePixelRatio;
    canvasEl.width = Math.floor(width * dpi);
    canvasEl.height = Math.floor(height * dpi);
    ctx.scale(dpi, dpi);

    // 将文字的定位点设为中心点
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 文字中心点 x 轴偏移.
    // 如果不旋转, 文字中心点即为图片中心点.
    // 如果 3 点开始顺时针旋转, 则因为之前的文字居中多增加半个字高以确保显示.
    const x = !isRotate ? width / 2 : (width + fontSize) / 2;
    // 文字中心点 y 轴偏移.
    // 如果不旋转, 文字中心点即为图片中心点.
    // 如果 3 点开始顺时针旋转, 则因为之前的文字居中所以下沉半个字高以确保显示.
    const y = !isRotate ? height / 2 : fontSize / 2;

    if (isRotate) {
      // 如果旋转, 则为对角线旋转.
      const rotate = isRotate ? 45 * (height / width) : 0;
      ctx.rotate((Math.PI / 180) * rotate);
    }

    // 填充文字颜色
    ctx.fillStyle = color;
    ctx.font = `${fontSize}px serif`;
    ctx.fillText(text, x, y);

    setURL(canvasEl.toDataURL());
  }, [color, fontSize, height, isRotate, text, width]);

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
