// Design tokens dùng chung. Đổi màu/bo góc ở đây, toàn bộ component antd sẽ theo.
const FONT = "'Be Vietnam Pro', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

const theme = {
  token: {
    colorPrimary: '#0F766E',
    colorInfo: '#0369A1',
    colorSuccess: '#15803D',
    colorWarning: '#B45309',
    colorError: '#DC2626',
    colorText: '#0F172A',
    colorTextSecondary: '#475569',
    colorTextTertiary: '#64748B',
    colorBorder: '#E2E8F0',
    colorBorderSecondary: '#EDF1F5',
    colorBgLayout: '#F4F6F9',
    fontFamily: FONT,
    fontSize: 14,
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 6,
    controlHeight: 40,
    controlOutline: 'rgba(15, 118, 110, 0.14)',
    controlOutlineWidth: 3,
    boxShadowTertiary: '0 1px 2px rgba(15, 23, 42, 0.04), 0 2px 8px rgba(15, 23, 42, 0.04)',
    motionDurationMid: '0.2s',
  },
  components: {
    Layout: { bodyBg: '#F4F6F9', siderBg: '#0B1220', headerBg: '#FFFFFF' },
    // Sidebar dùng <Menu theme="dark">: chữ sáng, mục đang chọn tô teal nhạt
    Menu: {
      itemHeight: 44,
      itemBorderRadius: 10,
      itemMarginInline: 12,
      iconSize: 18,
      darkItemBg: 'transparent',
      darkItemColor: '#A9B4C4',
      darkItemHoverColor: '#FFFFFF',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      darkItemSelectedBg: 'rgba(20, 184, 166, 0.16)',
      darkItemSelectedColor: '#5EEAD4',
      darkDangerItemColor: '#FCA5A5',
      darkDangerItemHoverColor: '#FECACA',
      darkDangerItemActiveBg: 'rgba(239, 68, 68, 0.14)',
    },
    Button: {
      fontWeight: 600,
      primaryShadow: '0 1px 2px rgba(15, 118, 110, 0.24)',
      defaultShadow: 'none',
      dangerShadow: 'none',
    },
    Card: { headerFontSize: 16, headerHeight: 60 },
    Table: {
      headerBg: '#F8FAFC',
      headerColor: '#64748B',
      headerSplitColor: 'transparent',
      rowHoverBg: '#F5FAF9',
      cellPaddingBlock: 14,
      borderColor: '#EDF1F5',
    },
    Modal: { titleFontSize: 18 },
    Tag: { defaultBg: '#F1F5F9' },
  },
};

export default theme;
