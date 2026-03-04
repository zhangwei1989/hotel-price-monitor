import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0066FF', // 更纯净的品牌蓝
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif',
    
    // 中性色调优
    colorTextBase: '#1d1d1f',
    colorBgLayout: '#f5f5f7', // 苹果风的背景灰
    
    // 成功/警告/错误色
    colorSuccess: '#34c759',
    colorWarning: '#ff9500',
    colorError: '#ff3b30',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      headerColor: '#1d1d1f',
      headerHeight: 64,
    },
    Card: {
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      borderRadiusLG: 12,
    },
    Table: {
      headerBg: '#fbfbfb',
      headerBorderRadius: 8,
    },
    Button: {
      fontWeight: 500,
      borderRadius: 6,
    },
    Input: {
      borderRadius: 6,
    },
    Select: {
      borderRadius: 6,
    },
    Tag: {
      borderRadius: 4,
    },
  },
};
