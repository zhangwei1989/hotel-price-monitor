/**
 * 订单 CRUD 路由
 * TASK-ORDER-API-02
 */
import express from 'express';
import { orderService } from '../services/OrderService';
import { OrderFilter } from '../types';

const router = express.Router();

// GET /api/orders
router.get('/', async (req, res) => {
  try {
    const {
      q, status, orderType, city, hotelGroup,
      checkInFrom, checkInTo, preAuthPending,
      page, pageSize, sortBy, sortOrder,
    } = req.query as any;

    const filter: OrderFilter = {
      q,
      status,
      orderType,
      city,
      hotelGroup,
      checkInFrom,
      checkInTo,
      preAuthPending: preAuthPending === 'true' ? true : undefined,
      page:     page     ? Number(page)     : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      sortBy,
      sortOrder,
    };

    const result = await orderService.listOrders(filter);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取订单列表失败' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await orderService.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: '订单不存在' });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取订单详情失败' });
  }
});

// POST /api/orders
router.post('/', async (req, res) => {
  try {
    const { customerName, customerContact, city, hotelName, roomType, checkIn, checkOut, costPrice, salePrice, orderType } = req.body;

    // 基础校验
    const errs: string[] = [];
    if (!customerName?.trim()) errs.push('客户姓名不能为空');
    if (!customerContact?.trim()) errs.push('联系方式不能为空');
    if (!city?.trim()) errs.push('城市不能为空');
    if (!hotelName?.trim()) errs.push('酒店名称不能为空');
    if (!roomType?.trim()) errs.push('房型不能为空');
    if (!checkIn) errs.push('入住日期不能为空');
    if (!checkOut) errs.push('退房日期不能为空');
    if (checkIn && checkOut && checkOut <= checkIn) errs.push('退房日期须晚于入住日期');
    if (costPrice == null || Number(costPrice) < 0) errs.push('代订成本价不能为空');
    if (salePrice == null || Number(salePrice) < 0) errs.push('售价不能为空');
    if (!orderType) errs.push('代订类型不能为空');

    if (errs.length > 0) {
      return res.status(400).json({ error: errs[0], errors: errs });
    }

    const order = await orderService.createOrder({
      ...req.body,
      costPrice: Number(req.body.costPrice),
      salePrice: Number(req.body.salePrice),
      preAuth:       req.body.preAuth       ? Number(req.body.preAuth)       : undefined,
      preAuthRefund: req.body.preAuthRefund ? Number(req.body.preAuthRefund) : undefined,
      pointsEarned:  req.body.pointsEarned  ? Number(req.body.pointsEarned)  : undefined,
      pointsValue:   req.body.pointsValue   ? Number(req.body.pointsValue)   : undefined,
    });
    res.status(201).json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建订单失败' });
  }
});

// PUT /api/orders/:id
router.put('/:id', async (req, res) => {
  try {
    const data = {
      ...req.body,
      costPrice: req.body.costPrice != null ? Number(req.body.costPrice) : undefined,
      salePrice: req.body.salePrice != null ? Number(req.body.salePrice) : undefined,
      preAuth:       req.body.preAuth       != null ? Number(req.body.preAuth)       : undefined,
      preAuthRefund: req.body.preAuthRefund != null ? Number(req.body.preAuthRefund) : undefined,
      pointsEarned:  req.body.pointsEarned  != null ? Number(req.body.pointsEarned)  : undefined,
      pointsValue:   req.body.pointsValue   != null ? Number(req.body.pointsValue)   : undefined,
    };
    const updated = await orderService.updateOrder(req.params.id, data);
    if (!updated) return res.status(404).json({ error: '订单不存在' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '更新订单失败' });
  }
});

// DELETE /api/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const ok = await orderService.deleteOrder(req.params.id);
    if (!ok) return res.status(404).json({ error: '订单不存在' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除订单失败' });
  }
});

export default router;
