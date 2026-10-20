const LS_USER_KEY = "marabeh.user.v1";
const LS_PRODUCTS_KEY = "marabeh.products.v1";
const LS_AUDIT_KEY = "marabeh.audit-log.v1";
const LS_BANK_TEXT_KEY = "marabeh.bank.text.v1";

const sampleProducts = [
  { id: "p1", name: "مقوى بطارية 12V", supplier: "مصنع الغد", cost: 120.0, qty: 10 },
  { id: "p2", name: "كرتون تعبئة 50x30", supplier: "سامي للتغليف", cost: 45.5, qty: 20 },
  { id: "p3", name: "شاحن سريع USB-C", supplier: "الشرق للإلكترون", cost: 80.0, qty: 15 },
];

const bankTextSample = `2026-10-01 | تحصيل مبيعات | 2500|  
2026-10-02 | عمولة بطاقة | -145.50 | Visa
2026-10-03 | مشتريات شاحن USB-C | -240.00 | المورد: الشرق للإلكترون
2026-10-04 | خصم بنكي | -35.00 | رسوم`;

function $(selector) {
  return document.querySelector(selector);
}

function $all(selector) {
  return Array.from(document.querySelectorAll(selector));
}

const loginView = $("#login-view");
const mainView = $("#main-view");
const currentBusiness = $("#current-business");
const loginForm = $("#login-form");
const guestBtn = $("#guest-btn");
const logoutBtn = $("#logout");
const productsTableBody = $("#products-table tbody");
const modal = $("#modal-add-product");
const ocrModal = $("#modal-ocr");

function saveUser(user) {
  localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
}

function loadUser() {
  try {
    return JSON.parse(localStorage.getItem(LS_USER_KEY));
  } catch {
    return null;
  }
}

function saveProducts(list) {
  localStorage.setItem(LS_PRODUCTS_KEY, JSON.stringify(list));
}

function loadProducts() {
  const raw = localStorage.getItem(LS_PRODUCTS_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveBankText(list) {
  localStorage.setItem(LS_BANK_TEXT_KEY, JSON.stringify(list));
  renderBankTable();
}

function loadBankText() {
  const raw = localStorage.getItem(LS_BANK_TEXT_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
}

function addAudit(entry) {
  const list = JSON.parse(localStorage.getItem(LS_AUDIT_KEY) || "[]");
  list.unshift({ id: Date.now(), ...entry });
  localStorage.setItem(LS_AUDIT_KEY, JSON.stringify(list));
  renderAudit();
}

function renderAudit() {
  const list = JSON.parse(localStorage.getItem(LS_AUDIT_KEY) || "[]");
  const auditList = $("#audit-list");
  if (!auditList) return;

  auditList.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("li");
    empty.textContent = "لا توجد إجراءات مسجلة حتى الآن.";
    auditList.appendChild(empty);
    return;
  }

  list.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${item.title || "إجراء"}</strong><br>
      ${item.action || ""} • ${item.destination || ""}<br>
      <small>${new Date(item.executedAt || Date.now()).toLocaleString("ar-SA")}</small>
    `;
    auditList.appendChild(li);
  });
}

function showMain() {
  loginView.classList.add("hidden");
  mainView.classList.remove("hidden");

  const user = loadUser();
  currentBusiness.textContent = user ? `${user.business} • ${user.email}` : "زائر";

  const products = loadProducts() || sampleProducts;
  if (!loadProducts()) saveProducts(products);

  renderProducts();
  renderSummary();
  populateMarginProduct();
  renderBankTable();
  renderAudit();
  updateDashboardCards();
}

function logout() {
  localStorage.removeItem(LS_USER_KEY);
  loginView.classList.remove("hidden");
  mainView.classList.add("hidden");
}

loginForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = $("#business-name").value.trim();
  const email = $("#business-email").value.trim();

  let ok = true;
  $("#err-business-name").textContent = name ? "" : "مطلوب";
  $("#err-business-email").textContent = email ? "" : "مطلوب";

  if (!name || !email) ok = false;
  if (!ok) return;

  saveUser({ business: name, email, createdAt: new Date().toISOString() });
  addAudit({
    title: "تسجيل دخول",
    action: "login",
    destination: "app",
    metric: null,
    executedAt: new Date().toISOString(),
  });

  showMain();
});

guestBtn.addEventListener("click", () => {
  saveUser({ business: "زائر", email: "guest@example.com" });
  showMain();
});

logoutBtn.addEventListener("click", () => logout());

$all(".sidebar li").forEach((li) => {
  li.addEventListener("click", () => {
    $all(".sidebar li").forEach((x) => x.classList.remove("active"));
    li.classList.add("active");

    const tab = li.dataset.tab;
    $all(".panel").forEach((p) => p.classList.remove("active-panel"));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.add("active-panel");
  });
});

function renderProducts() {
  const list = loadProducts() || [];
  productsTableBody.innerHTML = "";

  list.forEach((p) => {
    const vat = +(p.cost * 0.15).toFixed(2);
    const total = +((p.cost + vat) * p.qty).toFixed(2);
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${p.name}</td>
      <td>${p.supplier}</td>
      <td>${Number(p.cost).toFixed(2)}</td>
      <td>${vat.toFixed(2)}</td>
      <td>${p.qty}</td>
      <td>${total.toFixed(2)}</td>
      <td>
        <button class="btn soft small edit" data-id="${p.id}">تعديل</button>
        <button class="btn secondary small del" data-id="${p.id}">حذف</button>
      </td>
    `;
    productsTableBody.appendChild(tr);
  });

  $all(".btn.small.del").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.dataset.id;
      let list = loadProducts() || [];
      list = list.filter((x) => x.id !== id);
      saveProducts(list);
      addAudit({
        title: "حذف منتج",
        action: "delete_product",
        destination: id,
        metric: null,
        executedAt: new Date().toISOString(),
      });
      renderProducts();
      renderSummary();
      populateMarginProduct();
      updateDashboardCards();
    });
  });
}

function renderSummary() {
  const list = loadProducts() || [];
  const totalCost = list.reduce((sum, p) => sum + p.cost * p.qty, 0);
  const tax = totalCost * 0.15;

  const totalCostEl = $("#card-total-cost");
  const taxTotalEl = $("#card-tax-total");
  const countEl = $("#card-products-count");

  if (totalCostEl) totalCostEl.textContent = `${totalCost.toFixed(2)} SAR`;
  if (taxTotalEl) taxTotalEl.textContent = `${tax.toFixed(2)} SAR`;
  if (countEl) countEl.textContent = String(list.length);
}

function parseInvoiceText(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const productRegex = /(اسم\s*المنتج|product|item|اسم\s*الصنف)\s*[:\-]?\s*(.+)/i;
  const supplierRegex = /(المورد|supplier|vendor)\s*[:\-]?\s*(.+)/i;
  const qtyRegex = /(الكمية|qty|quantity|count|العدد)\s*[:\-]?\s*(\d+)/i;
  const priceRegex = /(السعر|unit price|price|سعر\s*الواحد|unit\s*price)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i;

  let detectedName = "";
  let detectedSupplier = "";
  let detectedQty = 1;
  let detectedPrice = 0;

  for (const line of lines) {
    const nameMatch = line.match(productRegex);
    if (nameMatch && nameMatch[2]) {
      detectedName = nameMatch[2].replace(/^[\-:]+|[\-:]+$/g, "").trim();
      break;
    }
  }

  for (const line of lines) {
    const supplierMatch = line.match(supplierRegex);
    if (supplierMatch && supplierMatch[2]) {
      detectedSupplier = supplierMatch[2].replace(/^[\-:]+|[\-:]+$/g, "").trim();
      break;
    }
  }

  for (const line of lines) {
    const qtyMatch = line.match(qtyRegex);
    if (qtyMatch && qtyMatch[2]) {
      detectedQty = Number(qtyMatch[2]);
      break;
    }
  }

  for (const line of lines) {
    const priceMatch = line.match(priceRegex);
    if (priceMatch && priceMatch[2]) {
      detectedPrice = Number(String(priceMatch[2]).replace(",", "."));
      break;
    }
  }

  if (!detectedName) {
    const fallback = lines.find((line) => !/(فاتورة|invoice|المجموع|total|الاجمالي|التاريخ)/i.test(line));
    detectedName = fallback ? fallback.replace(/[:\-]+$/, "").trim() : "منتج من الفاتورة";
  }

  if (!detectedSupplier) {
    detectedSupplier = "مورد غير محدد";
  }

  if (!Number.isFinite(detectedPrice) || detectedPrice <= 0) {
    const moneyMatches = [...text.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g)].map((m) => Number(m[1].replace(",", ".")));
    detectedPrice = moneyMatches.find((num) => num > 0) || 0;
  }

  if (!Number.isFinite(detectedQty) || detectedQty < 0) {
    detectedQty = 1;
  }

  if (!detectedPrice || detectedPrice <= 0) {
    return [];
  }

  return [{
    id: `p${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
    name: detectedName,
    supplier: detectedSupplier,
    cost: Number(detectedPrice.toFixed(2)),
    qty: Number(detectedQty),
  }];
}

function attachInvoiceText() {
  const input = $("#invoice-text-input");
  const status = $("#invoice-text-status");
  const rawText = input.value;
  const parsed = parseInvoiceText(rawText);

  if (!parsed.length) {
    status.textContent = "لم يتم العثور على بيانات منتج واضحة في النص. أضف اسم المنتج، المورد، السعر، والكمية.";
    status.className = "upload-status error-box";
    return;
  }

  const existing = loadProducts() || [];
  const merged = [...parsed, ...existing];
  saveProducts(merged);

  status.textContent = `تمت إضافة ${parsed.length} منتج من نص الفاتورة بنجاح.`;
  status.className = "upload-status";
  addAudit({
    title: "إدخال نص فاتورة",
    action: "invoice_text_import",
    destination: "manual_text",
    metric: { added: parsed.length },
    executedAt: new Date().toISOString(),
  });

  renderProducts();
  renderSummary();
  populateMarginProduct();
  updateDashboardCards();
}

function readInvoiceTextFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    $("#invoice-text-input").value = String(reader.result || "");
    attachInvoiceText();
  };
  reader.readAsText(file);
}

$("#btn-upload-file").addEventListener("click", () => $("#file-upload").click());

$("#file-upload").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const status = $("#upload-status");
  status.classList.remove("hidden");
  status.textContent = `جاري قراءة الملف ${file.name} ...`;

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

    const parsed = [];
    const excluded = [];

    rows.forEach((row, index) => {
      const name = row["name"] || row["اسم المنتج"] || row["product"] || row["Product"];
      const supplier = row["supplier"] || row["المورد"] || row["Supplier"];
      const cost = parseFloat(row["cost"] ?? row["سعر"] ?? row["price"] ?? "");
      const qty = parseInt(row["qty"] ?? row["كمية"] ?? row["quantity"] ?? "", 10);

      if (!name || !supplier || !Number.isFinite(cost) || cost <= 0 || !Number.isInteger(qty) || qty < 0) {
        excluded.push({ row: index + 2, raw: row });
      } else {
        parsed.push({
          id: `p${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
          name,
          supplier,
          cost,
          qty,
        });
      }
    });

    const existing = loadProducts() || [];
    const merged = [...existing, ...parsed];
    saveProducts(merged);

    status.innerHTML = `اكتملت المعالجة: ${parsed.length} صفوف مقبولة، ${excluded.length} مستبعدة.`;
    addAudit({
      title: "رفع ملف منتجات",
      action: "upload_products",
      destination: file.name,
      metric: { accepted: parsed.length, excluded: excluded.length },
      executedAt: new Date().toISOString(),
    });

    renderProducts();
    renderSummary();
    populateMarginProduct();
    updateDashboardCards();
  } catch (error) {
    status.textContent = `خطأ في قراءة الملف: ${error.message}`;
  }

  e.target.value = "";
});

$("#btn-add-product").addEventListener("click", () => {
  modal.classList.remove("hidden");
});

$("#modal-close").addEventListener("click", () => {
  modal.classList.add("hidden");
});

$("#add-product-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const name = $("#prod-name").value.trim();
  const supplier = $("#prod-supplier").value.trim();
  const cost = parseFloat($("#prod-cost").value);
  const qty = parseInt($("#prod-qty").value, 10);

  let ok = true;
  $("#err-prod-name").textContent = name ? "" : "الاسم مطلوب";
  $("#err-prod-supplier").textContent = supplier ? "" : "اسم المورد مطلوب";
  $("#err-prod-cost").textContent = Number.isFinite(cost) && cost > 0 ? "" : "السعر يجب أن يكون رقمًا أكبر من صفر";
  $("#err-prod-qty").textContent = Number.isInteger(qty) && qty >= 0 ? "" : "الكمية يجب أن تكون عددًا صحيحًا غير سالب";

  if (!name || !supplier || !Number.isFinite(cost) || cost <= 0 || !Number.isInteger(qty) || qty < 0) ok = false;
  if (!ok) return;

  const list = loadProducts() || [];
  const id = `p${Date.now().toString(36).slice(4)}`;
  list.unshift({ id, name, supplier, cost, qty });
  saveProducts(list);

  addAudit({
    title: "أضف منتج",
    action: "add_product",
    destination: id,
    metric: { name, supplier, cost, qty },
    executedAt: new Date().toISOString(),
  });

  modal.classList.add("hidden");
  $("#add-product-form").reset();
  renderProducts();
  renderSummary();
  populateMarginProduct();
  updateDashboardCards();
});

$("#btn-upload-invoice").addEventListener("click", () => ocrModal.classList.remove("hidden"));
$("#ocr-close").addEventListener("click", () => ocrModal.classList.add("hidden"));

$("#send-ocr").addEventListener("click", async () => {
  const file = $("#ocr-image").files[0];
  if (!file) return alert("اختر صورة أولاً");

  $("#ocr-result").textContent = "جاري الإرسال إلى الخادم (محاكاة) ...";

  await new Promise((resolve) => setTimeout(resolve, 900));

  const simulated = {
    products: [
      { name: "شاحن سريع USB-C", supplier: "الشرق للإلكترون", unitPrice: 80.0, qty: 2, confidence: 0.92, notes: "" },
    ],
    message: "تم استخراج 1 منتج (محاكاة)",
  };

  $("#ocr-result").textContent = JSON.stringify(simulated, null, 2);

  const p = simulated.products[0];
  $("#prod-name").value = p.name;
  $("#prod-supplier").value = p.supplier;
  $("#prod-cost").value = p.unitPrice;
  $("#prod-qty").value = p.qty;

  addAudit({
    title: "OCR image",
    action: "ocr_extract",
    destination: file.name,
    metric: { extracted: simulated.products.length },
    executedAt: new Date().toISOString(),
  });
});

function populateMarginProduct() {
  const sel = $("#margin-product");
  if (!sel) return;

  sel.innerHTML = "";
  const list = loadProducts() || [];

  list.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.name} — ${p.supplier} — ${Number(p.cost).toFixed(2)} SAR`;
    sel.appendChild(opt);
  });

  if (!list.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "لا توجد منتجات";
    sel.appendChild(opt);
  }
}

function getSelectedProductForMargin() {
  const sel = $("#margin-product");
  if (!sel) return { cost: 0, qty: 0 };

  const id = sel.value;
  const list = loadProducts() || [];
  return list.find((x) => x.id === id) || list[0] || { cost: 0, qty: 0 };
}

function computeSale(cost, opts) {
  const shipping = opts.shipping || 0;
  const base = cost + shipping;
  const gatewayPercent = opts.includeGateway ? 0.025 : 0;
  const margin = opts.marginPercent / 100;
  const gatewayFee = base * gatewayPercent;
  const priceBeforeVat = margin < 0.999 ? (base + gatewayFee) / (1 - margin) : base + gatewayFee;
  const vat = opts.includeVAT ? priceBeforeVat * 0.15 : 0;
  const saleFinal = priceBeforeVat + vat;
  const netProfit = priceBeforeVat - cost - shipping - gatewayFee;

  return {
    priceBeforeVat: +priceBeforeVat.toFixed(2),
    vat: +vat.toFixed(2),
    saleFinal: +saleFinal.toFixed(2),
    netProfit: +netProfit.toFixed(2),
    gatewayFee: +gatewayFee.toFixed(2),
  };
}

function renderMarginResult() {
  const p = getSelectedProductForMargin();
  const margin = parseFloat($("#margin-slider").value);
  $("#margin-val").textContent = margin;

  const includeShipping = $("#include-shipping").checked;
  const shipping = includeShipping ? parseFloat($("#shipping-cost").value || 0) : 0;
  const includeGateway = $("#include-gateway").checked;
  const includeVAT = $("#include-vat").checked;
  const fixedProfit = parseFloat($("#fixed-profit").value || 0);

  let result = computeSale(p.cost, { marginPercent: margin, shipping, includeGateway, includeVAT });

  if (fixedProfit && fixedProfit > 0) {
    const gatewayFee = includeGateway ? (p.cost + shipping) * 0.025 : 0;
    result.saleFinal = +((p.cost + shipping + gatewayFee + fixedProfit) * (includeVAT ? 1.15 : 1)).toFixed(2);
    result.priceBeforeVat = +(result.saleFinal / (includeVAT ? 1.15 : 1)).toFixed(2);
    result.netProfit = +(result.priceBeforeVat - p.cost - shipping - gatewayFee).toFixed(2);
    result.vat = +(includeVAT ? result.priceBeforeVat * 0.15 : 0).toFixed(2);
  }

  $("#sale-price").textContent = `${result.saleFinal.toFixed(2)} SAR`;
  $("#price-before-vat").textContent = `${result.priceBeforeVat.toFixed(2)} SAR`;
  $("#net-profit").textContent = `${result.netProfit.toFixed(2)} SAR`;
  $("#vat-value").textContent = `${result.vat.toFixed(2)} SAR`;

  const compareMargins = [5, margin, 30, 40, 50];
  const tbody = $("#margins-compare tbody");
  tbody.innerHTML = "";

  compareMargins.forEach((m) => {
    const res = computeSale(p.cost, { marginPercent: m, shipping, includeGateway, includeVAT: false });
    const saleWithVAT = includeVAT ? +(res.priceBeforeVat * 1.15).toFixed(2) : res.priceBeforeVat;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${m}%</td><td>${Number(p.cost).toFixed(2)}</td><td>${res.priceBeforeVat.toFixed(2)}</td><td>${res.netProfit.toFixed(2)}</td><td>${saleWithVAT.toFixed(2)}</td>`;
    tbody.appendChild(tr);
  });
}

$all("#margin-slider,#include-shipping,#shipping-cost,#include-gateway,#include-vat,#fixed-profit,#margin-product").forEach((el) => {
  el.addEventListener("input", renderMarginResult);
  el.addEventListener("change", renderMarginResult);
});

function parseBankText(rawText) {
  const lines = String(rawText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows = [];

  lines.forEach((line) => {
    const dateMatch = line.match(/(\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
    const amountMatch = line.match(/(-?\d+(?:[.,]\d+)?)\s*(?:SAR|ريال|ريال سعودي|ر\.س\.?|SR)?/i);
    const desc = line
      .replace(dateMatch ? dateMatch[0] : "", "")
      .replace(amountMatch ? amountMatch[0] : "", "")
      .replace(/\|/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!dateMatch || !amountMatch) return;

    const amount = Number(String(amountMatch[1]).replace(",", "."));
    const direction = amount >= 0 ? "إيداع" : "سحب";

    rows.push({
      date: dateMatch[1],
      description: desc || "حوالة بنكية",
      amount: Math.abs(amount),
      direction,
    });
  });

  return rows;
}

function renderBankTable() {
  const rows = loadBankText();
  const tbody = $("#bank-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!rows.length) {
    const emptyRow = document.createElement("tr");
    emptyRow.innerHTML = '<td colspan="4">لا توجد بيانات بنكية مرفقة بعد.</td>';
    tbody.appendChild(emptyRow);
    return;
  }

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.date || "-"}</td>
      <td>${row.description || "-"}</td>
      <td>${Number(row.amount || 0).toFixed(2)}</td>
      <td>${row.direction || "مراجعة"}</td>
    `;
    tbody.appendChild(tr);
  });
}

$("#btn-bank-file").addEventListener("click", () => $("#bank-file").click());

$("#bank-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const status = $("#bank-status");
  status.textContent = "جارٍ قراءة كشف الحساب (تجريبي) ...";

  try {
    if (file.type === "application/pdf") {
      status.textContent = "PDF مدعوم (محاكاة) — سيتم تحليل الملف لاحقاً في الخادم الحقيقي.";
    } else {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: null });
      const tbody = $("#bank-table tbody");
      tbody.innerHTML = "";

      rows.slice(0, 5).forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.date || row["التاريخ"] || "-"}</td>
          <td>${row.description || row["البيان"] || "-"}</td>
          <td>${Number(row.amount || row["المبلغ"] || 0).toFixed(2)}</td>
          <td>مطابقة</td>
        `;
        tbody.appendChild(tr);
      });

      status.textContent = `تمت قراءة ${rows.length} سجلًا بنجاح (محاكاة).`;
    }
  } catch (error) {
    status.textContent = `خطأ في قراءة الملف: ${error.message}`;
  }

  e.target.value = "";
});

$("#btn-parse-invoice-text").addEventListener("click", attachInvoiceText);
$("#invoice-text-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  readInvoiceTextFile(file);
  e.target.value = "";
});

$("#btn-attach-bank-text").addEventListener("click", () => {
  const text = $("#bank-text-input").value;
  const parsed = parseBankText(text);
  const status = $("#bank-text-status");

  if (!parsed.length) {
    status.textContent = "لم يتم التعرف على أي حركات بنكية في النص. مثال: 2026-10-01 | شراء | 240.00";
    return;
  }

  saveBankText(parsed);
  status.textContent = `تم إرفاق ${parsed.length} حركة بنكية من النص بنجاح.`;
  addAudit({
    title: "إرفاق نص كشف بنكي",
    action: "bank_text_attach",
    destination: "manual_bank_text",
    metric: { rows: parsed.length },
    executedAt: new Date().toISOString(),
  });
});

function updateDashboardCards() {
  const list = loadProducts() || [];
  const totalCost = list.reduce((sum, p) => sum + p.cost * p.qty, 0);
  const expectedProfit = totalCost * 0.25;
  const actualProfit = totalCost * 0.18;

  $("#dash-total-cost").textContent = `${totalCost.toFixed(2)} SAR`;
  $("#dash-expected-profit").textContent = `${expectedProfit.toFixed(2)} SAR`;
  $("#dash-actual-profit").textContent = `${actualProfit.toFixed(2)} SAR`;

  const recs = $("#recommendations");
  if (!recs) return;

  recs.innerHTML = "";
  const recommendations = [
    { title: "خفض الرسوم البنكية", action: "تفعيل خصم أقل", value: "-12.5%" },
    { title: "إعادة تجميع المخزون", action: "تحديث الكميات", value: "+15%" },
    { title: "تحسين هامش الربح", action: "رفع الهامش إلى 30%", value: "+4.2%" },
  ];

  recommendations.forEach((item) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${item.title}</span><strong>${item.value}</strong>`;
    recs.appendChild(li);
  });
}

if (!loadBankText().length) {
  saveBankText(parseBankText(bankTextSample));
}

if (loadUser()) {
  showMain();
}

renderAudit();
renderBankTable();
updateDashboardCards();
