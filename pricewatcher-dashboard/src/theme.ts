import type { ThemeConfig } from 'antd';
import { theme as antTheme } from 'antd';

export const theme: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: '#ffffff',
    colorBgBase: '#000000',
    colorBgContainer: '#111111',
    colorBgElevated: '#1a1a1a',
    colorBgLayout: '#0a0a0a',
    colorBorder: '#2a2a2a',
    colorBorderSecondary: '#1f1f1f',
    colorText: '#ededed',
    colorTextSecondary: '#888888',
    colorTextTertiary: '#555555',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Geist", "Segoe UI", Roboto, "PingFang SC", sans-serif',
  },
  components: {
    Layout: {
      headerBg: '#000000',
      bodyBg: '#0a0a0a',
    },
    Card: {
      colorBgContainer: '#111111',
      boxShadow: 'none',
      borderRadiusLG: 8,
    },
    Table: {
      headerBg: '#0a0a0a',
      headerColor: '#888888',
      borderColor: '#1f1f1f',
      rowHoverBg: '#1a1a1a',
      colorBgContainer: 'transparent',
    },
    Button: {
      defaultBg: '#1a1a1a',
      defaultColor: '#ededed',
      defaultBorderColor: '#2a2a2a',
      fontWeight: 500,
    },
    Input: {
      colorBgContainer: '#111111',
      colorBorder: '#2a2a2a',
      colorTextPlaceholder: '#555555',
    },
    Tag: {
      borderRadiusSM: 4,
    },
    Statistic: {
      titleFontSize: 13,
    },
  },
};
