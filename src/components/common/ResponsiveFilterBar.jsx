import { useState, useEffect } from 'react';
import { Input, Select, Button, Drawer, Badge, Grid } from 'antd';
import { Filter, RotateCcw, Check, Search } from 'lucide-react';
import { countActiveFilters } from '../../utils/responsiveFilters';

const { useBreakpoint } = Grid;

/**
 * ResponsiveFilterBar - Thanh lọc đáp ứng chuẩn UI/UX Pro Max
 * - Desktop (>= 768px): Dàn ngang tất cả ô tìm kiếm và select (.desktop-filter-bar)
 * - Mobile (< 768px): Rút gọn thành 1 hàng gồm Ô tìm kiếm + Nút "Bộ lọc" kèm Badge đếm số lượng (.mobile-filter-bar)
 *   Bấm nút sẽ mở Bottom Sheet Drawer để chọn bộ lọc chi tiết mà không chiếm diện tích màn hình.
 */
export default function ResponsiveFilterBar({
  search,
  filters = [],
  extra = null,
  onReset = null,
  className = '',
  style = {}
}) {
  const screens = useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Xác định màn hình mobile: ưu tiên useBreakpoint md, fallback window.innerWidth
  const isMobile = isClient && (screens.md === false || (typeof window !== 'undefined' && window.innerWidth < 768));

  // Tạo map giá trị các bộ lọc để đếm số lượng đang active
  const filterValues = {};
  filters.forEach((f) => {
    filterValues[f.key] = f.value;
  });
  const activeCount = countActiveFilters(filterValues);

  return (
    <div className={`responsive-filter-bar-wrapper ${className}`} style={{ marginBottom: 16, ...style }}>
      {/* 1. Màn hình Desktop (>= 768px) */}
      {!isMobile && (
        <div className="desktop-filter-bar toolbar-wrap">
          {search && (
            <Input
              allowClear
              prefix={<Search size={16} style={{ color: '#64748B', marginRight: 6, flexShrink: 0 }} aria-hidden="true" />}
              data-testid={search['data-testid'] || 'filter-search-input'}
              placeholder={search.placeholder || 'Tìm kiếm...'}
              aria-label={search['aria-label'] || search.placeholder || 'Tìm kiếm'}
              value={search.value}
              onChange={search.onChange}
              onPressEnter={search.onPressEnter}
              style={{ width: search.width || 260, minHeight: 40, height: 40, display: 'inline-flex', alignItems: 'center', ...search.style }}
            />
          )}
          {filters.map((f) => (
            <Select
              key={f.key}
              data-testid={f['data-testid'] || `filter-${f.key}`}
              aria-label={f['aria-label'] || f.label}
              allowClear={f.allowClear !== false}
              placeholder={f.placeholder || f.label}
              value={f.value}
              onChange={f.onChange}
              options={f.options}
              style={{ width: f.width || 160, ...f.style }}
            />
          ))}
          {extra}
        </div>
      )}

      {/* 2. Màn hình Điện thoại (< 768px) */}
      {isMobile && (
        <div className="mobile-filter-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
            {search && (
              <Input
                allowClear
                className="mobile-filter-search"
                prefix={<Search size={18} style={{ color: '#64748B', marginRight: 6, flexShrink: 0 }} aria-hidden="true" />}
                data-testid={search['data-testid'] || 'mobile-filter-search-input'}
                placeholder={search.placeholder || 'Tìm kiếm...'}
                aria-label={search['aria-label'] || search.placeholder || 'Tìm kiếm'}
                value={search.value}
                onChange={search.onChange}
                onPressEnter={search.onPressEnter}
                style={{ flex: 1, minWidth: 0, minHeight: 40, height: 40, display: 'inline-flex', alignItems: 'center', ...search.style }}
              />
            )}
            {filters.length > 0 && (
              <Badge count={activeCount} offset={[-2, 2]}>
                <Button
                  data-testid="open-mobile-filter"
                  icon={<Filter size={15} />}
                  onClick={() => setDrawerOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    borderColor: activeCount > 0 ? '#0F766E' : undefined,
                    color: activeCount > 0 ? '#0F766E' : undefined,
                    fontWeight: activeCount > 0 ? 600 : 400,
                    minHeight: 40
                  }}
                >
                  Bộ lọc
                </Button>
              </Badge>
            )}
          </div>

          {extra && <div style={{ marginTop: 8 }}>{extra}</div>}
        </div>
      )}

      {/* Bottom Sheet Drawer chứa danh sách bộ lọc chi tiết cho mobile */}
      <Drawer
        title="Bộ lọc nâng cao"
        placement="bottom"
        height="auto"
        zIndex={1050}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        data-testid="mobile-filter-drawer"
        styles={{
          body: { padding: '16px 20px 24px' }
        }}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <Button
              icon={<RotateCcw size={14} />}
              onClick={() => {
                if (onReset) onReset();
                setDrawerOpen(false);
              }}
              style={{ flex: 1, minHeight: 44 }}
            >
              Đặt lại
            </Button>
            <Button
              type="primary"
              icon={<Check size={14} />}
              data-testid="apply-mobile-filter"
              onClick={() => setDrawerOpen(false)}
              style={{ flex: 1, minHeight: 44, background: '#0F766E', borderColor: '#0F766E' }}
            >
              Áp dụng
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filters.map((f) => (
            <div key={f.key}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                {f.label}
              </div>
              <Select
                data-testid={f['data-testid'] ? `drawer-${f['data-testid']}` : `drawer-filter-${f.key}`}
                allowClear={f.allowClear !== false}
                placeholder={f.placeholder || `Tất cả ${f.label.toLowerCase()}`}
                value={f.value}
                onChange={f.onChange}
                options={f.options}
                style={{ width: '100%', minHeight: 40 }}
              />
            </div>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
