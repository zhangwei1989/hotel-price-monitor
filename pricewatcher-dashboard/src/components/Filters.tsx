
import { DatePicker, InputNumber, Select, Space, Typography } from 'antd';

const { Text } = Typography;

export type SortBy = 'checkIn' | 'lastPrice' | 'lastCheckedAt' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

export const SortBy = {
  checkIn: 'checkIn',
  lastPrice: 'lastPrice',
  lastCheckedAt: 'lastCheckedAt',
  createdAt: 'createdAt',
} as const;

export function Filters(props: {
  city?: string;
  setCity: (v?: string) => void;
  status?: string;
  setStatus: (v?: string) => void;
  enabled?: string;
  setEnabled: (v?: string) => void;
  checkInRange?: [string, string];
  setCheckInRange: (v?: [string, string]) => void;
  priceMin?: number;
  setPriceMin: (v?: number) => void;
  priceMax?: number;
  setPriceMax: (v?: number) => void;
  belowTarget?: string;
  setBelowTarget: (v?: string) => void;
  sortBy: SortBy;
  setSortBy: (v: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (v: SortOrder) => void;
  cityOptions: string[];
}) {
  const { RangePicker } = DatePicker;

  return (
    <Space wrap size={[12, 12]} align="center">
      <Space size={4}>
        <Text type="secondary" style={{ fontSize: 13 }}>城市</Text>
        <Select
          allowClear
          placeholder="全部城市"
          style={{ width: 120 }}
          value={props.city}
          onChange={(v) => props.setCity(v)}
          options={props.cityOptions.map((c) => ({ label: c, value: c }))}
        />
      </Space>

      <Space size={4}>
        <Text type="secondary" style={{ fontSize: 13 }}>状态</Text>
        <Select
          allowClear
          placeholder="监控状态"
          style={{ width: 130 }}
          value={props.status}
          onChange={(v) => props.setStatus(v)}
          options={[
            { label: '等于目标', value: 'at_threshold' },
            { label: '低于目标', value: 'below_threshold' },
            { label: '高于目标', value: 'above_threshold' },
          ]}
        />
      </Space>

      <Space size={4}>
        <Text type="secondary" style={{ fontSize: 13 }}>启用</Text>
        <Select
          allowClear
          placeholder="运行状态"
          style={{ width: 100 }}
          value={props.enabled}
          onChange={(v) => props.setEnabled(v)}
          options={[
            { label: '启用中', value: 'true' },
            { label: '已暂停', value: 'false' },
          ]}
        />
      </Space>

      <RangePicker
        style={{ width: 240 }}
        placeholder={['入住日期', '退房日期']}
        onChange={(v) => {
          if (!v || v.length !== 2 || !v[0] || !v[1]) return props.setCheckInRange(undefined);
          props.setCheckInRange([v[0].format('YYYY-MM-DD'), v[1].format('YYYY-MM-DD')]);
        }}
      />

      <Space size={4}>
        <Text type="secondary" style={{ fontSize: 13 }}>价格</Text>
        <InputNumber 
          placeholder="Min" 
          min={0} 
          style={{ width: 80 }}
          value={props.priceMin} 
          onChange={(v) => props.setPriceMin(v ?? undefined)} 
        />
        <Text type="secondary">-</Text>
        <InputNumber 
          placeholder="Max" 
          min={0} 
          style={{ width: 80 }}
          value={props.priceMax} 
          onChange={(v) => props.setPriceMax(v ?? undefined)} 
        />
      </Space>

      <Space size={4}>
        <Text type="secondary" style={{ fontSize: 13 }}>排序</Text>
        <Select
          value={props.sortBy}
          style={{ width: 110 }}
          onChange={(v) => props.setSortBy(v)}
          options={[
            { label: '入住日期', value: 'checkIn' },
            { label: '当前价格', value: 'lastPrice' },
            { label: '最后检查', value: 'lastCheckedAt' },
            { label: '创建时间', value: 'createdAt' },
          ]}
        />
        <Select
          value={props.sortOrder}
          style={{ width: 80 }}
          onChange={(v) => props.setSortOrder(v)}
          options={[
            { label: '升序', value: 'asc' },
            { label: '降序', value: 'desc' },
          ]}
        />
      </Space>
    </Space>
  );
}
