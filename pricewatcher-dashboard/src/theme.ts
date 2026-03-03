import type { ThemeConfig } from 'antd';

// B 风格：简洁现代（Notion/Linear），留白更多、层级更克制
export const theme: ThemeConfig = {
  token: {
    // 主色：干净的蓝
    colorPrimary: '#3B82F6',

    // 字体
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", Inter, "PingFang SC", "Microsoft YaHei", sans-serif',

    // 圆角
    borderRadius: 10,

    // 控件高度
    controlHeight: 36,
    controlHeightSM: 32,

    // 文本与背景
    colorText: '#111827',
    colorTextSecondary: '#6B7280',
    colorTextTertiary: '#9CA3AF',

    colorBgLayout: '#F7F8FA',
    colorBgContainer: '#FFFFFF',
    colorBorder: '#E6E8EB',

    // 表格/分割线更轻
    lineWidth: 1,
  },
  components: {
    Layout: {
      headerBg: '#111827',
      headerColor: '#FFFFFF',
      headerHeight: 56,
      bodyBg: '#F7F8FA',
    },
    Card: {
      borderRadiusLG: 12,
      paddingLG: 16,
    },
    Table: {
      headerBg: '#F9FAFB',
      headerColor: '#6B7280',
      rowHoverBg: '#F3F4F6',
      borderColor: '#E6E8EB',
    },
    Tag: {
      borderRadiusSM: 999,
    },
    Button: {
      borderRadius: 10,
      controlHeight: 36,
      controlHeightSM: 32,
    },
    Input: {
      borderRadius: 10,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 10,
      controlHeight: 36,
    },
    DatePicker: {
      borderRadius: 10,
      controlHeight: 36,
    },
  },
};
