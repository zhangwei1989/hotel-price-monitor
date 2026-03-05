/**
 * 订单统计分析路由
 * TASK-ORDER-API-03
 */
import express from 'express';
import { orderService } from '../services/OrderService';

const router = express.Router();

// GET /api/orders/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    res.json(await orderService.getSummary());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取统计概览失败' });
  }
});

// GET /api/orders/analytics/monthly
router.get('/monthly', async (req, res) => {
  try {
    res.json(await orderService.getMonthlyTrend());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取月度趋势失败' });
  }
});

// GET /api/orders/analytics/by-city
router.get('/by-city', async (req, res) => {
  try {
    res.json(await orderService.getByCity());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取城市统计失败' });
  }
});

// GET /api/orders/analytics/by-group
router.get('/by-group', async (req, res) => {
  try {
    res.json(await orderService.getByGroup());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取集团统计失败' });
  }
});

// GET /api/orders/analytics/by-type
router.get('/by-type', async (req, res) => {
  try {
    res.json(await orderService.getByType());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取类型统计失败' });
  }
});

// GET /api/orders/pre-auth/pending
router.get('/pre-auth/pending', async (req, res) => {
  try {
    res.json(await orderService.getPreAuthPending());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取待退预授权失败' });
  }
});

export default router;
