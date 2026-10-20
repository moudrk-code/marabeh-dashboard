const LS_USER_KEY = "marabeh.user.v1";
const LS_PRODUCTS_KEY = "marabeh.products.v1";
const LS_AUDIT_KEY = "marabeh.audit-log.v1";

const sampleProducts = [
  { id: "p1", name: "مقوى بطارية 12V", supplier: "مصنع الغد", cost: 120.0, qty: 10 },
  { id: "p2", name: "كرتون تعبئة 50x30", supplier: "سامي للتغليف", cost: 45.5, qty: 20 },
  { id: "p3", name: "شاحن سريع USB-C", supplier: "الشرق للإلكترون", cost: 80.0, qty: 15 },
];

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

logoutBtn.addEventListener("click", () => {
  logout();
});

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

$("#btn-upload-file").addEventListener("click", () => {
  $("#file-upload").click();
});

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
          <td>${row.date || "-"}</td>
          <td>${row.description || row["البيان"] || "-"}</td>
          <td>${row.amount || row["المبلغ"] || "0"}</td>
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

if (loadUser()) {
  showMain();
}

renderAudit();
updateDashboardCards();
