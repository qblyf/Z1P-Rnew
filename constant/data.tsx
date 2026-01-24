/**
 * SKU 使用的默认强制序列号的 SPU 分类
 * 
 * 这些分类下的 SKU 默认需要强制序列号
 * @see https://gitlab.com/zsqk/Zsqk/-/issues/4143#note_955902495
 * 
 * 分类 ID 说明：
 * - 1, 53, 54: 手机类
 * - 36, 37, 38: 其他需要序列号的设备
 */
export const withSNspuCateIDs = [1, 53, 54, 36, 37, 38];
