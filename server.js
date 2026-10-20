import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = process.env.PORT || 3000;

const products = [
  { id: 1, name: 'مياه شرب 1.5L', supplier: 'مورد الخليج', cost: 5.5, qty: 120, tax: 0.825 },
  { id: 2, name: 'أرز كسر', supplier: 'المنارة للتجهيز', cost: 8.75, qty: 80, tax: 1.3125 },
  { id: 3, name: 'زيت نباتي 5L', supplier: 'المتحد للتجارة', cost: 24.0, qty: 45, tax: 3.6 }
];

const bankRows = [
  { date: '2026-10-02', description: 'تحويل من العميل', amount: 1850, matched: true },
  { date: '2026-10-03', description: 'فاتورة شراء من المورد', amount: -620, matched: true },
  { date: '2026-10-05', description: 'إيداع نقدي', amount: 940, matched: false },
  { date: '2026-10-07', description: 'رسوم بنك', amount: -18.5, matched: false }
];

const recommendations = [
  'رفع سعر بيع المنتج الأول بنسبة 12% لتحسين هامش الربح.',
  'مراجعة المورد الثاني بسبب ارتفاع تكلفة الشراء مقارنة بالمتوسط.',
  'التوسع في تجميع الطلبات الشهرية لتقليل تكلفة الشحن.'
];

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'marabeh-dashboard' });
});

app.get('/api/dashboard', (_req, res) => {
  const totalCost = products.reduce((sum, item) => sum + (item.cost * item.qty), 0);
  const taxTotal = products.reduce((sum, item) => sum + ((item.cost * item.qty) * 0.15), 0);

  res.json({
    businessName: 'منشأة تجريبية',
    totalCost,
    taxTotal,
    productsCount: products.length,
    expectedProfit: totalCost * 0.25,
    actualProfit: 725,
    recommendations
  });
});

app.get('/api/products', (_req, res) => {
  res.json(products);
});

app.post('/api/products', (req, res) => {
  const { name, supplier, cost, qty } = req.body || {};

  if (!name || !supplier || !cost || !qty) {
    return res.status(400).json({ error: 'بيانات المنتج غير مكتملة' });
  }

  const item = {
    id: Date.now(),
    name,
    supplier,
    cost: Number(cost),
    qty: Number(qty),
    tax: Number(cost) * 0.15
  };

  products.push(item);
  res.status(201).json(item);
});

app.get('/api/bank-report', (_req, res) => {
  res.json(bankRows);
});

app.get('/api/audit', (_req, res) => {
  res.json([
    'تمت إضافة منتج جديد إلى قائمة المشتريات.',
    'تم رفع كشف حساب بنكي بنجاح.',
    'تم حساب هامش ربح افتراضي بنسبة 25%.',
    'تمت مراجعة التوصيات الذكية للموردين.'
  ]);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Marabeh Dashboard running on http://localhost:${port}`);
});
