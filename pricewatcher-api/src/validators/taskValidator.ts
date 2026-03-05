/**
 * 任务创建/更新字段校验
 * TASK-API-02
 */

export interface TaskValidationError {
  field: string;
  message: string;
}

export function validateCreateTask(body: any): TaskValidationError[] {
  const errors: TaskValidationError[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // hotelName
  if (!body.hotelName || typeof body.hotelName !== 'string' || !body.hotelName.trim()) {
    errors.push({ field: 'hotelName', message: '酒店名称不能为空' });
  }

  // city
  if (!body.city || typeof body.city !== 'string' || !body.city.trim()) {
    errors.push({ field: 'city', message: '城市不能为空' });
  }

  // roomName
  if (!body.roomName || typeof body.roomName !== 'string' || !body.roomName.trim()) {
    errors.push({ field: 'roomName', message: '房型名称不能为空' });
  }

  // checkIn
  if (!body.checkIn) {
    errors.push({ field: 'checkIn', message: '入住日期不能为空' });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(body.checkIn)) {
    errors.push({ field: 'checkIn', message: '入住日期格式必须为 YYYY-MM-DD' });
  } else if (body.checkIn < today) {
    errors.push({ field: 'checkIn', message: '入住日期不能早于今天' });
  }

  // checkOut
  if (!body.checkOut) {
    errors.push({ field: 'checkOut', message: '退房日期不能为空' });
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(body.checkOut)) {
    errors.push({ field: 'checkOut', message: '退房日期格式必须为 YYYY-MM-DD' });
  } else if (body.checkIn && body.checkOut <= body.checkIn) {
    errors.push({ field: 'checkOut', message: '退房日期必须晚于入住日期' });
  }

  // threshold.value
  const thresholdValue = body.threshold?.value ?? body.thresholdValue;
  if (thresholdValue == null) {
    errors.push({ field: 'threshold.value', message: '目标价不能为空' });
  } else if (typeof thresholdValue !== 'number' || thresholdValue <= 0) {
    errors.push({ field: 'threshold.value', message: '目标价必须为正数' });
  }

  // frequencyMinutes
  if (body.frequencyMinutes == null) {
    errors.push({ field: 'frequencyMinutes', message: '检查频率不能为空' });
  } else if (typeof body.frequencyMinutes !== 'number' || body.frequencyMinutes < 10 || !Number.isInteger(body.frequencyMinutes)) {
    errors.push({ field: 'frequencyMinutes', message: '检查频率最小为 10 分钟，且须为整数' });
  }

  // autoStopDate（可选）
  if (body.autoStopDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.autoStopDate)) {
      errors.push({ field: 'autoStopDate', message: '自动停止日期格式必须为 YYYY-MM-DD' });
    } else if (body.checkOut && body.autoStopDate < body.checkOut) {
      errors.push({ field: 'autoStopDate', message: '自动停止日期不能早于退房日期' });
    }
  }

  // link（可选，有值则校验 URL 格式）
  if (body.link && typeof body.link === 'string' && body.link.trim()) {
    try {
      new URL(body.link);
    } catch {
      errors.push({ field: 'link', message: '携程链接格式不正确' });
    }
  }

  return errors;
}
