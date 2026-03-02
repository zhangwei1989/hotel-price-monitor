import React from 'react';
import { DatePicker, InputNumber, Select, Space } from 'antd';

export type SortBy = 'checkIn' | 'lastPrice' | 'lastCheckedAt' | 'createdAt';
export type SortOrder = 'asc' | 'desc';

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
    <Space wrap>
      <Select
        allowClear
        placeholder="城市"
        style={{ width: 140 }}
        value={props.city}
        onChange={(v) => props.setCity(v)}
        options={props.cityOptions.map((c) => ({ label: c, value: c }))}
      />
      <Select
        allowClear
        placeholder="状态"
        style={{ width: 160 }}
        value={props.status}
        onChange={(v) => props.setStatus(v)}
        options={[
          { label: 'at_threshold', value: 'at_threshold' },
          { label: 'below_threshold', value: 'below_threshold' },
          { label: 'above_threshold', value: 'above_threshold' },
        ]}
      />
      <Select
        allowClear
        placeholder="启用/暂停"
        style={{ width: 140 }}
        value={props.enabled}
        onChange={(v) => props.setEnabled(v)}
        options={[
          { label: '启用', value: 'true' },
          { label: '暂停', value: 'false' },
        ]}
      />
      <RangePicker
        placeholder={['入住起', '入住止']}
        onChange={(v) => {
          if (!v || v.length !== 2 || !v[0] || !v[1]) return props.setCheckInRange(undefined);
          props.setCheckInRange([v[0].format('YYYY-MM-DD'), v[1].format('YYYY-MM-DD')]);
        }}
      />
      <InputNumber placeholder="当前价≥" min={0} value={props.priceMin} onChange={(v) => props.setPriceMin(v ?? undefined)} />
      <InputNumber placeholder="当前价≤" min={0} value={props.priceMax} onChange={(v) => props.setPriceMax(v ?? undefined)} />
      <Select
        allowClear
        placeholder="是否低于目标"
        style={{ width: 160 }}
        value={props.belowTarget}
        onChange={(v) => props.setBelowTarget(v)}
        options={[
          { label: '低于目标', value: 'true' },
          { label: '不低于目标', value: 'false' },
        ]}
      />
      <Select
        value={props.sortBy}
        style={{ width: 140 }}
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
        style={{ width: 110 }}
        onChange={(v) => props.setSortOrder(v)}
        options={[
          { label: '升序', value: 'asc' },
          { label: '降序', value: 'desc' },
        ]}
      />
    </Space>
  );
}
