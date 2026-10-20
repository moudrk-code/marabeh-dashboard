const appState = {
  currentBusiness: localStorage.getItem('marabeh-business') || 'منشأة تجريبية',
  products: [
    { id: 1, name: 'مياه شرب 1.5L', supplier: 'مورد الخليج', cost: 5.5, qty: 120 },
    { id: 2, name: 'أرز كسر', supplier: 'المنارة للتجهيز', cost: 8.75, qty: 80 },
    { id: 3, name: 'زيت نباتي 5L', supplier: 'المتحد للتجارة', cost: 24.0, qty: 45 }
  ],
  bankRows: [
    { date: '2026-10-02', description: 'تحويل من العميل', amount: 1850, matched: true },
    { date: '2026-10-03', description: 'فاتورة شراء من المورد', amount: -620, matched: true },
    { date: '2026-10-05', description: 'إيداع نقدي', amount: 940, matched: false },
    { date: '2026-10-07', description: 'رسوم بنك', amount: -18.5, matched: false }
  ],
  recommendations: [
    'رفع سعر بيع المنتج الأول بنسبة 12% لتحسين هامش الربح.',
    'مراجعة المورد الثاني بسبب ارتفاع تكلفة الشراء مقارنة بالمتوسط.',
    'التوسع في تجميع الطلبات الشهرية لتقليل تكلفة الشحن.'
  ],
  auditList: [
    'تمت إضافة منتج جديد إلى قائمة المشتريات.',
    'تم رفع كشف حساب بنكي بنجاح.',
    'تم حساب هامش ربح افتراضي بنسبة 25%.',
    'تمت مراجعة التوصيات الذكية للموردين.'
  ]
};

const refs = {
  loginView: document.getElementById('login-view'),
  mainView: document.getElementById('main-view'),
  loginForm: document.getElementById('login-form'),
  businessName: document.getElementById('business-name'),
  businessEmail: document.getElementById('business-email'),
  currentBusiness: document.getElementById('current-business'),
  guestBtn: document.getElementById('guest-btn'),
  logout: document.getElementById('logout'),
  productsTableBody: document.getElementById('products-table-body'),
  marginProduct: document.getElementById('margin-product'),
  marginSlider: document.getElementById('margin-slider'),
  marginVal: document.getElementById('margin-val'),
  fixedProfit: document.getElementById('fixed-profit'),
  includeShipping: document.getElementById('include-shipping'),
  shippingCost: document.getElementById('shipping-cost'),
  includeGateway: document.getElementById('include-gateway'),
  includeVat: document.getElementById('include-vat'),
  salePrice: document.getElementById('sale-price'),
  priceBeforeVat: document.getElementById('price-before-vat'),
  netProfit: document.getElementById('net-profit'),
  vatValue: document.getElementById('vat-value'),
  marginsCompare: document.getElementById('margins-compare'),
  bankTableBody: document.getElementById('bank-table-body'),
  bankStatus: document.getElementById('bank-status'),
  recommendations: document.getElementById('recommendations'),
  auditList: document.getElementById('audit-list'),
  addProductModal: document.getElementById('modal-add-product'),
  addProductForm: document.getElementById('add-product-form'),
  uploadStatus: document.getElementById('upload-status'),
  btnUploadFile: document.getElementById('btn-upload-file'),
  fileUpload: document.getElementById('file-upload'),
  btnAddProduct: document.getElementById('btn-add-product'),
  btnUploadInvoice: document.getElementById('btn-upload-invoice'),
  modalClose: document.getElementById('modal-close'),
  ocrModal: document.getElementById('modal-ocr'),
  sendOcr: document.getElementById('send-ocr'),
  ocrClose: document.getElementById('ocr-close'),
  ocrResult: document.getElementById('ocr-result'),
  bankFile: document.getElementById('bank-file'),
  btnBankFile: document.getElementById('btn-bank-file')
};

function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} SAR`;
}

function calculateTotals() {
  const totalCost = appState.products.reduce((sum, p) => sum + (p.cost * p.qty), 0);
  const taxTotal = totalCost * 0.15;
  const count = appState.products.length;

  document.getElementById('card-total-cost').textContent = formatMoney(totalCost);
  document.getElementById('card-tax-total').textContent = formatMoney(taxTotal);
  document.getElementById('card-products-count').textContent = count;
  document.getElementById('dash-total-cost').textContent = formatMoney(totalCost);
  document.getElementById('dash-expected-profit').textContent = formatMoney(totalCost * 0.25);
  document.getElementById('dash-actual-profit').textContent = formatMoney(725);
}

function renderProducts() {
  refs.productsTableBody.innerHTML = appState.products.map((product) => {
    const total = product.cost * product.qty;
    const tax = total * 0.15;
    return `
      <tr>
        <td>${product.name}</td>
        <td>${product.supplier}</td>
        <td>${product.cost.toFixed(2)}</td>
        <td>${tax.toFixed(2)}</td>
        <td>${product.qty}</td>
        <td>${total.toFixed(2)}</td>
        <td><button class="table-action" data-delete="${product.id}">حذف</button></td>
      </tr>
    `;
  }).join('');

  refs.marginProduct.innerHTML = appState.products.map((product) => `
    <option value="${product.id}">${product.name}</option>
  `).join('');

  if (appState.products.length) {
    updateMarginResult();
  }
}

function renderBankRows() {
  refs.bankTableBody.innerHTML = appState.bankRows.map((row) => `
    <tr>
      <td>${row.date}</td>
      <td>${row.description}</td>
      <td>${Math.abs(row.amount).toFixed(2)}</td>
      <td>${row.matched ? 'مطابق' : 'قيد المراجعة'}</td>
    </tr>
  `).join('');

  refs.bankStatus.innerHTML = `
    <h4>ملخص كشف الحساب</h4>
    <div>المعاملات: <strong>${appState.bankRows.length}</strong></div>
    <div>المطابقة المتوقعة: <strong>${appState.bankRows.filter(r => r.matched).length}</strong></div>
    <div>الوضع: <span class="success-text">جيد</span></div>
  `;
}

function renderRecommendations() {
  refs.recommendations.innerHTML = appState.recommendations.map((item) => `<li>${item}</li>`).join('');
  refs.auditList.innerHTML = appState.auditList.map((item) => `<li>${item}</li>`).join('');
}

function updateMarginResult() {
  const selectedId = refs.marginProduct.value;
  const product = appState.products.find((p) => String(p.id) === String(selectedId)) || appState.products[0];
  const wholesaleCost = Number(product?.cost || 0);
  const marginRate = Number(refs.marginSlider.value || 25) / 100;
  const fixedProfit = Number(refs.fixedProfit.value || 0);
  const shipping = refs.includeShipping.checked ? Number(refs.shippingCost.value || 0) : 0;
  const gateway = refs.includeGateway.checked ? wholesaleCost * 0.025 : 0;
  const vat = refs.includeVat.checked ? wholesaleCost * 0.15 : 0;

  const baseCost = wholesaleCost + shipping + gateway + vat;
  const totalBeforeVat = baseCost / (1 - marginRate);
  const netProfit = totalBeforeVat - baseCost;
  const finalPrice = totalBeforeVat + fixedProfit;

  refs.marginVal.textContent = refs.marginSlider.value;
  refs.salePrice.textContent = formatMoney(finalPrice);
  refs.priceBeforeVat.textContent = formatMoney(totalBeforeVat);
  refs.netProfit.textContent = formatMoney(netProfit + fixedProfit);
  refs.vatValue.textContent = formatMoney(totalBeforeVat * 0.15);

  const tbody = [5, 10, 15, 25, 35, 45].map((m) => {
    const rate = m / 100;
    const calcPrice = (wholesaleCost + shipping + gateway + vat) / (1 - rate);
    const profit = calcPrice - (wholesaleCost + shipping + gateway + vat);
    const includeTax = calcPrice * 1.15;
    return `
      <tr>
        <td>${m}%</td>
        <td>${wholesaleCost.toFixed(2)}</td>
        <td>${calcPrice.toFixed(2)}</td>
        <td>${profit.toFixed(2)}</td>
        <td>${includeTax.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  refs.marginsCompare.innerHTML = tbody;
}

function showView(view) {
  const isMain = view === 'main';
  refs.loginView.classList.toggle('hidden', isMain);
  refs.mainView.classList.toggle('hidden', !isMain);
}

function loginUser(event) {
  event.preventDefault();

  const business = refs.businessName.value.trim();
  const email = refs.businessEmail.value.trim();

  let valid = true;
  if (!business) {
    document.getElementById('err-business-name').textContent = 'يرجى إدخال اسم المنشأة';
    valid = false;
  } else {
    document.getElementById('err-business-name').textContent = '';
  }

  if (!email || !email.includes('@')) {
    document.getElementById('err-business-email').textContent = 'يرجى إدخال بريد إلكتروني صحيح';
    valid = false;
  } else {
    document.getElementById('err-business-email').textContent = '';
  }

  if (!valid) return;

  localStorage.setItem('marabeh-business', business);
  appState.currentBusiness = business;
  refs.currentBusiness.textContent = business;
  showView('main');
}

function logoutUser() {
  localStorage.removeItem('marabeh-business');
  refs.businessName.value = '';
  refs.businessEmail.value = '';
  refs.currentBusiness.textContent = 'منشأة تجريبية';
  showView('login');
}

function openProductModal() {
  refs.addProductModal.classList.remove('hidden');
}

function closeProductModal() {
  refs.addProductModal.classList.add('hidden');
  refs.addProductForm.reset();
  document.querySelectorAll('.error').forEach((el) => el.textContent = '');
}

function addProduct(event) {
  event.preventDefault();

  const name = document.getElementById('prod-name').value.trim();
  const supplier = document.getElementById('prod-supplier').value.trim();
  const cost = Number(document.getElementById('prod-cost').value);
  const qty = Number(document.getElementById('prod-qty').value);

  let valid = true;
  if (!name) {
    document.getElementById('err-prod-name').textContent = 'اسم المنتج مطلوب';
    valid = false;
  } else {
    document.getElementById('err-prod-name').textContent = '';
  }

  if (!supplier) {
    document.getElementById('err-prod-supplier').textContent = 'اسم المورد مطلوب';
    valid = false;
  } else {
    document.getElementById('err-prod-supplier').textContent = '';
  }

  if (!cost || cost <= 0) {
    document.getElementById('err-prod-cost').textContent = 'سعر الجملة يجب أن يكون أكبر من صفر';
    valid = false;
  } else {
    document.getElementById('err-prod-cost').textContent = '';
  }

  if (!qty || qty <= 0) {
    document.getElementById('err-prod-qty').textContent = 'الكمية يجب أن تكون أكبر من صفر';
    valid = false;
  } else {
    document.getElementById('err-prod-qty').textContent = '';
  }

  if (!valid) return;

  appState.products.push({
    id: Date.now(),
    name,
    supplier,
    cost,
    qty
  });

  appState.auditList.unshift(`تمت إضافة المنتج: ${name}`);
  renderAll();
  closeProductModal();
}

function renderAll() {
  refs.currentBusiness.textContent = appState.currentBusiness;
  calculateTotals();
  renderProducts();
  renderBankRows();
  renderRecommendations();
}

function attachTabEvents() {
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((el) => el.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active-panel'));
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active-panel');
    });
  });
}

function handleUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  refs.uploadStatus.textContent = `تم رفع الملف: ${file.name}`;
  refs.uploadStatus.classList.remove('hidden');
  setTimeout(() => refs.uploadStatus.classList.add('hidden'), 2200);
}

function handleBankUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  refs.bankStatus.innerHTML = `<h4>كشف الحساب</h4><div>تم رفع الملف: <strong>${file.name}</strong></div><div>حالة المعالجة: <span class="success-text">تمت المعالجة بنجاح</span></div>`;
}

function handleOcrSimulation() {
  const input = document.getElementById('ocr-image');
  const file = input.files?.[0];
  refs.ocrResult.textContent = file
    ? `تمت محاكاة OCR للفاتورة: ${file.name}\nتم استخراج: سلة مواد 3 عناصر، إجمالي 1,250.00 SAR`
    : 'لم يتم اختيار أي ملف.';
}

function setupEvents() {
  refs.loginForm.addEventListener('submit', loginUser);
  refs.guestBtn.addEventListener('click', () => {
    localStorage.setItem('marabeh-business', 'زائر');
    appState.currentBusiness = 'زائر';
    refs.currentBusiness.textContent = 'زائر';
    showView('main');
  });
  refs.logout.addEventListener('click', logoutUser);
  refs.btnAddProduct.addEventListener('click', openProductModal);
  refs.modalClose.addEventListener('click', closeProductModal);
  refs.addProductForm.addEventListener('submit', addProduct);
  refs.fileUpload.addEventListener('change', handleUpload);
  refs.btnUploadFile.addEventListener('click', () => refs.fileUpload.click());
  refs.btnUploadInvoice.addEventListener('click', () => refs.ocrModal.classList.remove('hidden'));
  refs.ocrClose.addEventListener('click', () => refs.ocrModal.classList.add('hidden'));
  refs.sendOcr.addEventListener('click', handleOcrSimulation);
  refs.btnBankFile.addEventListener('click', () => refs.bankFile.click());
  refs.bankFile.addEventListener('change', handleBankUpload);
  refs.marginSlider.addEventListener('input', updateMarginResult);
  refs.fixedProfit.addEventListener('input', updateMarginResult);
  refs.includeShipping.addEventListener('change', updateMarginResult);
  refs.shippingCost.addEventListener('input', updateMarginResult);
  refs.includeGateway.addEventListener('change', updateMarginResult);
  refs.includeVat.addEventListener('change', updateMarginResult);
  refs.marginProduct.addEventListener('change', updateMarginResult);

  document.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('[data-delete]');
    if (!deleteBtn) return;
    const id = Number(deleteBtn.getAttribute('data-delete'));
    appState.products = appState.products.filter((p) => p.id !== id);
    appState.auditList.unshift(`تم حذف منتج برقم ${id}`);
    renderAll();
  });
}

function init() {
  refs.currentBusiness.textContent = appState.currentBusiness;
  attachTabEvents();
  setupEvents();
  renderAll();
  showView('login');
}

init();
